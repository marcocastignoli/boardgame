import { randomBytes } from 'crypto'
import { join } from 'path'
import Nedb from '@seald-io/nedb'
import { dices, roll } from '../../classes/Dice.js'
import Mod from '../../classes/Mod.js'
import Gem, { GEM_TYPES } from '../../classes/Gem.js'
import { Weapon, Armor } from '../../classes/Items.js'
import Spell from '../../classes/Spell.js'
import Character from '../../classes/Character.js'
import Game from '../../classes/Game.js'
import modifiers from '../../var/modifiers.js'
import spellDamages from '../../var/damages.js'
import map from '../../../maps/test.js'

const games = new Map()

// ===== SSE broadcast =====
const sseClients = new Map() // gameId -> Set of res objects

export function addSseClient(gameId, res) {
    if (!sseClients.has(gameId)) sseClients.set(gameId, new Set())
    sseClients.get(gameId).add(res)
}

export function removeSseClient(gameId, res) {
    sseClients.get(gameId)?.delete(res)
}

export function broadcastState(gameId) {
    const clients = sseClients.get(gameId)
    if (!clients || clients.size === 0) return
    try {
        const state = getGameState(gameId)
        const data = JSON.stringify(state)
        for (const res of clients) {
            try { res.write(`data: ${data}\n\n`) } catch {}
        }
    } catch {}
}

// ===== DB =====
let catalogDbWeapons, catalogDbArmors, catalogDbGems, catalogDbSpells, gamesDb

export async function initDb(dataDir) {
    catalogDbWeapons = new Nedb({ filename: join(dataDir, 'catalog_weapons.db'), autoload: true })
    catalogDbArmors  = new Nedb({ filename: join(dataDir, 'catalog_armors.db'),  autoload: true })
    catalogDbGems    = new Nedb({ filename: join(dataDir, 'catalog_gems.db'),    autoload: true })
    catalogDbSpells  = new Nedb({ filename: join(dataDir, 'catalog_spells.db'),  autoload: true })
    gamesDb          = new Nedb({ filename: join(dataDir, 'games.db'),            autoload: true })

    // Load catalog (gems first, then weapons/armors that may reference gems)
    const [gems, weapons, armors, spells] = await Promise.all([
        catalogDbGems.findAsync({}),
        catalogDbWeapons.findAsync({}),
        catalogDbArmors.findAsync({}),
        catalogDbSpells.findAsync({})
    ])
    for (const g of gems)    registerGem(g,    false)
    for (const w of weapons) registerWeapon(w, false)
    for (const a of armors)  registerArmor(a,  false)
    for (const s of spells)  registerSpell(s,  false)

    // Restore saved games
    const savedGames = await gamesDb.findAsync({})
    for (const saved of savedGames) {
        try { restoreGame(saved) }
        catch (e) { console.warn(`Failed to restore game ${saved.gameId}:`, e.message) }
    }
    console.log(`DB loaded: ${gems.length} gems, ${weapons.length} weapons, ${armors.length} armors, ${spells.length} spells, ${savedGames.length} games`)
}

// ===== Mod builder from plain JSON descriptors =====
const VALID_ATTRS = ['hp','mana','maxMana','parry','dodge','meleeDamage','spellPower','rangeDamage','hit','actions','endTurnMana','speed']

function parseValue(desc) {
    if (!desc) throw new Error('Missing value descriptor')
    if (desc.type === 'fixed') return () => desc.value
    if (desc.type === 'dice')  return () => roll([...dices(desc.count, desc.faces)])
    throw new Error(`Unknown value type "${desc.type}". Use "fixed" or "dice".`)
}

function buildModFromDescriptor(desc) {
    const attrs = {}
    for (const [attr, valDesc] of Object.entries(desc.attributes || {})) {
        if (!VALID_ATTRS.includes(attr)) throw new Error(`Unknown attribute "${attr}". Valid: ${VALID_ATTRS.join(', ')}`)
        attrs[attr] = parseValue(valDesc)
    }
    return new Mod(attrs, 0, desc.key || `mod_${randomBytes(4).toString('hex')}`, desc.label || '')
}

// ===== Catalog =====
const CATALOG = {
    gems: {
        t0_spell_power: () => new Gem(
            "t0_spell_power", "Gem of the mage", GEM_TYPES.BLUE,
            [modifiers.find(m => m.key === "_1d3_spellPower")]
        )
    },
    weapons: {
        t0_mage_sword: () => new Weapon({
            key: "t0_mage_sword", label: "Sword of the mage",
            mods: [modifiers.find(m => m.key === "_15_mana"), modifiers.find(m => m.key === "sword_mage_damage")],
            gemSlots: [GEM_TYPES.BLUE], gems: [CATALOG.gems.t0_spell_power()]
        }),
        t0_bow: () => new Weapon({
            key: "t0_bow", label: "Bow",
            mods: [modifiers.find(m => m.key === "bow_damage")],
            gemSlots: [], gems: []
        })
    },
    armors: {
        t0_cloth: () => new Armor({
            key: "t0_cloth", label: "Robe of the mage",
            mods: [modifiers.find(m => m.key === "_5_endTurnMana")],
            gemSlots: [GEM_TYPES.BLUE], gems: [CATALOG.gems.t0_spell_power()]
        })
    },
    spells: {
        t0_fire_armor: () => new Spell(
            "t0_fire_armor", "Fire Armor",
            [modifiers.find(m => m.key === "_5_parry")],
            true, null, 1, 5
        ),
        t0_fireball: () => new Spell(
            "t0_fireball", "Fireball",
            [modifiers.find(m => m.key === "_minus_1_hit")],
            false, spellDamages.find(d => d.key === "t0_fireball_damage").damage, 1, 6
        )
    }
}

export function getRoster() {
    return {
        weapons: Object.values(CATALOG.weapons).map(f => {
            const i = f()
            return {
                key: i.key, label: i.label,
                modLabels: i.mods.filter(Boolean).map(m => m.label).filter(Boolean),
                gemSlots: i.gemSlots,
                gems: i.gems.map(g => ({ key: g.key, label: g.label, color: g.color }))
            }
        }),
        armors: Object.values(CATALOG.armors).map(f => {
            const i = f()
            return {
                key: i.key, label: i.label,
                modLabels: i.mods.filter(Boolean).map(m => m.label).filter(Boolean),
                gemSlots: i.gemSlots,
                gems: i.gems.map(g => ({ key: g.key, label: g.label, color: g.color }))
            }
        }),
        spells: Object.values(CATALOG.spells).map(f => {
            const s = f()
            return {
                key: s.key, label: s.label, mana: s.mana, friendly: s.friendly, duration: s.duration,
                modLabels: s.mods.filter(Boolean).map(m => m.label).filter(Boolean)
            }
        }),
        gems: Object.values(CATALOG.gems).map(f => {
            const g = f()
            return {
                key: g.key, label: g.label, color: g.color,
                modLabels: g.mods.filter(Boolean).map(m => m.label).filter(Boolean)
            }
        })
    }
}

// ===== Catalog registration =====
export function registerWeapon({ key, label, mods = [], gemSlots = [], gemKeys = [] }, persist = true) {
    if (!key || !label) throw new Error('key and label are required')
    if (CATALOG.weapons[key]) throw new Error(`Weapon "${key}" already exists`)
    const builtMods = mods.map(buildModFromDescriptor)
    CATALOG.weapons[key] = () => new Weapon({
        key, label, mods: builtMods, gemSlots,
        gems: gemKeys.map(gk => {
            if (!CATALOG.gems[gk]) throw new Error(`Unknown gem: ${gk}`)
            return CATALOG.gems[gk]()
        })
    })
    if (persist && catalogDbWeapons) {
        catalogDbWeapons.updateAsync({ key }, { key, label, mods, gemSlots, gemKeys }, { upsert: true }).catch(console.error)
    }
    return { key, label }
}

export function registerArmor({ key, label, mods = [], gemSlots = [], gemKeys = [] }, persist = true) {
    if (!key || !label) throw new Error('key and label are required')
    if (CATALOG.armors[key]) throw new Error(`Armor "${key}" already exists`)
    const builtMods = mods.map(buildModFromDescriptor)
    CATALOG.armors[key] = () => new Armor({
        key, label, mods: builtMods, gemSlots,
        gems: gemKeys.map(gk => {
            if (!CATALOG.gems[gk]) throw new Error(`Unknown gem: ${gk}`)
            return CATALOG.gems[gk]()
        })
    })
    if (persist && catalogDbArmors) {
        catalogDbArmors.updateAsync({ key }, { key, label, mods, gemSlots, gemKeys }, { upsert: true }).catch(console.error)
    }
    return { key, label }
}

export function registerGem({ key, label, color, mods = [] }, persist = true) {
    if (!key || !label || !color) throw new Error('key, label and color are required')
    if (!GEM_TYPES[color]) throw new Error(`Unknown gem color "${color}". Valid: ${Object.keys(GEM_TYPES).join(', ')}`)
    if (CATALOG.gems[key]) throw new Error(`Gem "${key}" already exists`)
    const builtMods = mods.map(buildModFromDescriptor)
    CATALOG.gems[key] = () => new Gem(key, label, GEM_TYPES[color], builtMods)
    if (persist && catalogDbGems) {
        catalogDbGems.updateAsync({ key }, { key, label, color, mods }, { upsert: true }).catch(console.error)
    }
    return { key, label, color }
}

export function registerSpell({ key, label, mods = [], friendly = false, damage = null, duration = 1, mana }, persist = true) {
    if (!key || !label) throw new Error('key and label are required')
    if (mana === undefined) throw new Error('mana cost is required')
    if (CATALOG.spells[key]) throw new Error(`Spell "${key}" already exists`)
    const builtMods = mods.map(buildModFromDescriptor)
    const damageFn = damage ? parseValue(damage) : null
    CATALOG.spells[key] = () => new Spell(key, label, builtMods, friendly, damageFn, duration, mana)
    if (persist && catalogDbSpells) {
        catalogDbSpells.updateAsync({ key }, { key, label, mods, friendly, damage, duration, mana }, { upsert: true }).catch(console.error)
    }
    return { key, label, mana, friendly }
}

// ===== Character builder =====
function buildCharacter({ key, label, weap1Key, weap2Key, armorKey, spellKeys = [], cell = [0, 0] }) {
    if (!key || !label) throw new Error('key and label are required')
    const weap1  = weap1Key  ? (CATALOG.weapons[weap1Key]  ?? (() => { throw new Error(`Unknown weapon: ${weap1Key}`) }))()   : null
    const weap2  = weap2Key  ? (CATALOG.weapons[weap2Key]  ?? (() => { throw new Error(`Unknown weapon: ${weap2Key}`) }))()   : null
    const armor  = armorKey  ? (CATALOG.armors[armorKey]   ?? (() => { throw new Error(`Unknown armor: ${armorKey}`) }))()    : null
    const spells = spellKeys.map(sk => {
        const f = CATALOG.spells[sk]
        if (!f) throw new Error(`Unknown spell: ${sk}`)
        return f()
    })
    return new Character(
        key, label,
        [modifiers.find(m => m.key === "baseMods")],
        weap1, weap2, armor, spells, cell
    )
}

const TEST_SPECS = [
    { key: "theon", label: "Theon", weap1Key: "t0_mage_sword", weap2Key: null,      armorKey: "t0_cloth", spellKeys: ["t0_fire_armor", "t0_fireball"], cell: [3, 7] },
    { key: "rheon", label: "Rheon", weap1Key: "t0_mage_sword", weap2Key: "t0_bow",  armorKey: "t0_cloth", spellKeys: [],                               cell: [4, 8] }
]

// ===== Dynamic mod serialization =====
function serializeDynamicMods(character) {
    return character.mods.slice(1).map(mod => {
        const attrs = {}
        for (const attr of VALID_ATTRS) {
            const val = mod[attr]()
            if (val !== 0) attrs[attr] = val
        }
        return {
            key: mod.key,
            label: mod.label,
            startsAt: mod.startsAt,
            expiresAt: mod.expiresAt === Infinity ? null : mod.expiresAt,
            attrs
        }
    })
}

function restoreDynamicMod(savedMod) {
    const attrFns = {}
    for (const [attr, val] of Object.entries(savedMod.attrs)) {
        attrFns[attr] = () => val
    }
    const mod = new Mod(attrFns, savedMod.startsAt, savedMod.key, savedMod.label)
    mod.expiresAt = savedMod.expiresAt === null ? Infinity : savedMod.expiresAt
    return mod
}

// ===== Game DB persistence =====
function serializeGameForDb(gameId) {
    const data = games.get(gameId)
    if (!data) return null
    const { game, players, logs, playerSpecs } = data
    return {
        gameId,
        turn: game.turn,
        activePlayerKey: game.activePlayer ? game.activePlayer.key : null,
        actionsActivePlayer: game.actionsActivePlayer,
        logs: logs.slice(-50),
        turnOrder: data.turnOrder || players.map(p => p.key),
        turnOrderIndex: data.turnOrderIndex !== undefined ? data.turnOrderIndex : -1,
        players: players.map(p => ({
            ...playerSpecs[p.key],
            cell: p.cell,
            turns: p.turns,
            dynamicMods: serializeDynamicMods(p)
        }))
    }
}

async function saveGameToDb(gameId) {
    if (!gamesDb) return
    const serialized = serializeGameForDb(gameId)
    if (!serialized) return
    await gamesDb.updateAsync({ gameId }, serialized, { upsert: true })
}

function restoreGame(saved) {
    const playerSpecsList = saved.players
    const players = playerSpecsList.map(ps => {
        const char = buildCharacter(ps)
        char.cell = ps.cell
        char.turns = ps.turns
        for (const savedMod of (ps.dynamicMods || [])) {
            char.mods.push(restoreDynamicMod(savedMod))
        }
        return char
    })
    const activePlayer = players.find(p => p.key === saved.activePlayerKey) || null
    const game = new Game(players, saved.turn, saved.actionsActivePlayer, activePlayer, map)
    const playerSpecs = {}
    playerSpecsList.forEach(ps => {
        playerSpecs[ps.key] = { key: ps.key, label: ps.label, weap1Key: ps.weap1Key, weap2Key: ps.weap2Key, armorKey: ps.armorKey, spellKeys: ps.spellKeys }
    })
    games.set(saved.gameId, { game, players, logs: saved.logs || [], playerSpecs, turnOrder: saved.turnOrder || players.map(p => p.key), turnOrderIndex: saved.turnOrderIndex !== undefined ? saved.turnOrderIndex : -1 })
}

// ===== Log capture =====
function captureLog(fn, allLogs) {
    const captured = []
    const originalLog = console.log
    console.log = (...args) => {
        const msg = args.map(a => String(a)).join(' ')
        captured.push(msg)
        originalLog(...args)
    }
    let result, error
    try {
        result = fn()
    } catch (e) {
        error = typeof e === 'string' ? e : e.message
        captured.push(`Error: ${error}`)
        originalLog('Error:', error)
    } finally {
        console.log = originalLog
    }
    allLogs.push(...captured)
    return { result, error, logs: captured }
}

// ===== State serialization =====
function serializeState(gameId, game, players, logs, turnOrder = [], turnOrderIndex = -1) {
    const wall = game.map.layers.find(l => l.name === "wall")
    return {
        gameId,
        turn: game.turn,
        activePlayerKey: game.activePlayer ? game.activePlayer.key : null,
        actionsActivePlayer: game.actionsActivePlayer,
        players: players.map(p => {
            const hp = p.getAttr('hp', true)
            return {
                key: p.key,
                label: p.label,
                cell: p.cell,
                alive: hp > 0,
                hp,
                mana: p.getAttr('mana', true),
                maxMana: p.getAttr('maxMana', true),
                parry: p.getAttr('parry', true),
                dodge: p.getAttr('dodge', true),
                actions: p.getAttr('actions', true),
                speed: p.getAttr('speed', true),
                spells: p.spells.map(s => ({
                    key: s.key,
                    label: s.label,
                    mana: s.mana,
                    friendly: s.friendly
                })),
                equipment: {
                    weap1: p.weap1 ? { key: p.weap1.key, label: p.weap1.label } : null,
                    weap2: p.weap2 ? { key: p.weap2.key, label: p.weap2.label } : null,
                    armor: p.armor ? { key: p.armor.key, label: p.armor.label } : null
                }
            }
        }),
        map: {
            width: game.map.width,
            height: game.map.height,
            walls: wall.data
        },
        logs: logs.slice(-30),
        turnOrder: turnOrder.map(key => {
            const p = players.find(pl => pl.key === key)
            return { key, label: p?.label || key, alive: p ? p.getAttr('hp', true) > 0 : false }
        }),
        turnOrderIndex
    }
}

// ===== Public API =====
export async function createGame() {
    const players = TEST_SPECS.map(spec => buildCharacter(spec))
    const game = new Game(players, 0, 0, null, map)
    const gameId = randomBytes(8).toString('hex')
    const logs = ['Game created. Set an active player to begin.']
    const playerSpecs = {}
    TEST_SPECS.forEach(spec => { playerSpecs[spec.key] = spec })
    games.set(gameId, { game, players, logs, playerSpecs, turnOrder: players.map(p => p.key), turnOrderIndex: -1 })
    await saveGameToDb(gameId)
    return gameId
}

export function listGames() {
    return Array.from(games.entries()).map(([gameId, { game, players, logs }]) => ({
        gameId,
        turn: game.turn,
        playerCount: players.length,
        players: players.map(p => ({ key: p.key, label: p.label, hp: p.getAttr('hp', true), alive: p.getAttr('hp', true) > 0 })),
        lastLog: logs[logs.length - 1] || ''
    }))
}

export function getGameState(gameId) {
    const data = games.get(gameId)
    if (!data) throw new Error('Game not found')
    return serializeState(gameId, data.game, data.players, data.logs, data.turnOrder, data.turnOrderIndex)
}

export async function performAction(gameId, action) {
    const data = games.get(gameId)
    if (!data) throw new Error('Game not found')
    const { game, players, logs } = data

    const findPlayer = key => players.find(p => p.key === key)

    let actionLogs, error

    switch (action.type) {
        case 'set-active-player': {
            const player = findPlayer(action.playerKey)
            if (!player) throw new Error('Player not found')
            ;({ logs: actionLogs, error } = captureLog(() => game.setActivePlayer(player), logs))
            break
        }
        case 'move': {
            ;({ logs: actionLogs, error } = captureLog(() => game.activePlayerMove(action.coords), logs))
            break
        }
        case 'attack-melee': {
            const defender = findPlayer(action.targetKey)
            if (!defender) throw new Error('Target not found')
            ;({ logs: actionLogs, error } = captureLog(() => game.activePlayerAttackMelee(defender), logs))
            break
        }
        case 'attack-range': {
            const defender = findPlayer(action.targetKey)
            if (!defender) throw new Error('Target not found')
            ;({ logs: actionLogs, error } = captureLog(() => game.activePlayerAttackRange(defender), logs))
            break
        }
        case 'cast-spell': {
            const target = findPlayer(action.targetKey)
            if (!target) throw new Error('Target not found')
            ;({ logs: actionLogs, error } = captureLog(() => game.activePlayerCastSpell(action.spellKey, target), logs))
            break
        }
        case 'next-turn': {
            ;({ logs: actionLogs, error } = captureLog(() => game.nextTurn(), logs))
            data.turnOrderIndex = -1
            break
        }
        case 'set-player-actions': {
            const player = findPlayer(action.playerKey)
            if (!player) throw new Error('Player not found')
            const overrideKey = `actionsOverride_${action.playerKey}`
            player.mods = player.mods.filter(m => m.key !== overrideKey)
            const currentActions = player.getAttr('actions', true)
            const target = parseInt(action.actions)
            if (isNaN(target) || target < 1) throw new Error('Invalid actions value')
            const delta = target - currentActions
            if (delta !== 0) {
                const overrideMod = new Mod({ actions: () => delta }, 0, overrideKey, 'GM actions override')
                player.mods.push(overrideMod)
            }
            actionLogs = [`${player.label}'s actions set to ${target}.`]
            logs.push(...actionLogs)
            break
        }
        case 'end-player-turn': {
            const { turnOrder } = data
            const alivePlayers = players.filter(p => p.getAttr('hp', true) > 0)
            if (alivePlayers.length === 0) { actionLogs = ['No alive players.']; break }

            let nextIndex = (data.turnOrderIndex + 1) % turnOrder.length
            let roundEnded = nextIndex === 0 && data.turnOrderIndex !== -1

            // Skip dead players
            let attempts = 0
            while (attempts < turnOrder.length) {
                const candidate = findPlayer(turnOrder[nextIndex])
                if (candidate && candidate.getAttr('hp', true) > 0) break
                nextIndex = (nextIndex + 1) % turnOrder.length
                if (nextIndex === 0) roundEnded = true
                attempts++
            }

            const nextPlayer = findPlayer(turnOrder[nextIndex])
            if (!nextPlayer) { actionLogs = ['No alive players found.']; break }

            actionLogs = []
            if (roundEnded) {
                const { logs: ntLogs } = captureLog(() => game.nextTurn(), logs)
                actionLogs.push(...ntLogs)
            }
            data.turnOrderIndex = nextIndex
            const { logs: setLogs } = captureLog(() => game.setActivePlayer(nextPlayer), logs)
            actionLogs.push(...setLogs)
            break
        }
        default:
            throw new Error(`Unknown action: ${action.type}`)
    }

    await saveGameToDb(gameId)
    broadcastState(gameId)
    return {
        success: !error,
        error,
        actionLogs,
        state: serializeState(gameId, game, players, logs, data.turnOrder, data.turnOrderIndex)
    }
}

export async function spawnPlayer(gameId, spec) {
    const data = games.get(gameId)
    if (!data) throw new Error('Game not found')
    const { game, players, logs, playerSpecs } = data
    if (players.find(p => p.key === spec.key)) throw new Error(`Player key "${spec.key}" already exists`)
    const character = buildCharacter(spec)
    players.push(character)
    playerSpecs[spec.key] = { key: spec.key, label: spec.label, weap1Key: spec.weap1Key || null, weap2Key: spec.weap2Key || null, armorKey: spec.armorKey || null, spellKeys: spec.spellKeys || [] }
    data.turnOrder.push(character.key)
    logs.push(`${character.label} joined the game at [${character.cell}].`)
    await saveGameToDb(gameId)
    broadcastState(gameId)
    return serializeState(gameId, game, players, logs, data.turnOrder, data.turnOrderIndex)
}

export async function removePlayer(gameId, playerKey) {
    const data = games.get(gameId)
    if (!data) throw new Error('Game not found')
    const { game, players, logs, playerSpecs } = data
    const idx = players.findIndex(p => p.key === playerKey)
    if (idx === -1) throw new Error(`Player "${playerKey}" not found`)
    const [removed] = players.splice(idx, 1)
    delete playerSpecs[playerKey]
    if (game.activePlayer && game.activePlayer.key === playerKey) {
        game.activePlayer = null
        game.actionsActivePlayer = 0
    }
    const tIdx = data.turnOrder.indexOf(playerKey)
    if (tIdx !== -1) {
        data.turnOrder.splice(tIdx, 1)
        if (data.turnOrderIndex >= tIdx) data.turnOrderIndex = Math.max(-1, data.turnOrderIndex - 1)
    }
    logs.push(`${removed.label} was removed from the game.`)
    await saveGameToDb(gameId)
    broadcastState(gameId)
    return serializeState(gameId, game, players, logs, data.turnOrder, data.turnOrderIndex)
}

export function buildGeminiContext(state, roster) {
    const active = state.players.find(p => p.key === state.activePlayerKey)
    const playerKeys = state.players.map(p => `"${p.key}"`).join(', ')

    const playerDesc = state.players.map(p =>
        `  - ${p.label} (key: "${p.key}"): HP=${p.hp}, Mana=${p.mana}/${p.maxMana}, Cell=[${p.cell}], Alive=${p.alive}` +
        (p.spells.length ? `\n    Spells: ${p.spells.map(s => `${s.label} (key:"${s.key}", mana:${s.mana}, ${s.friendly ? 'friendly' : 'hostile'})`).join(', ')}` : '')
    ).join('\n')

    const rosterDesc = roster ? [
        `  Weapons: ${roster.weapons.map(w => `${w.label} (key:"${w.key}")`).join(', ')}`,
        `  Armors:  ${roster.armors.map(a => `${a.label} (key:"${a.key}")`).join(', ')}`,
        `  Spells:  ${roster.spells.map(s => `${s.label} (key:"${s.key}", mana:${s.mana})`).join(', ')}`,
        `  Gems:    ${roster.gems.map(g => `${g.label} (key:"${g.key}", color:${g.color})`).join(', ')}`
    ].join('\n') : '  (not available)'

    return `
You are a game master assistant for Chronicles of Proxima, a tactical turn-based RPG.
You can BOTH manage the game world (create items, spells, spawn characters) AND control in-game actions.

## Current Game State
Turn: ${state.turn}
Active player: ${active ? `${active.label} (key:"${active.key}")` : 'none'}
Actions used this turn: ${state.actionsActivePlayer}/${active ? active.actions : '?'}

## Players in game
${playerDesc}

## Map
10x10 grid. Walls run vertically at columns 4-5, rows 1-7.

## Available roster (items/spells you can use when spawning characters)
${rosterDesc}

---
## HOW TO RESPOND

Always respond with ONLY a single JSON object (no markdown, no explanation):
{
  "description": "One sentence summarising the full intent",
  "actions": [
    { "category": "<category>", "action": { ...params } },
    ...
  ]
}

You may include MULTIPLE actions in the array when needed.
Example: if the user wants to spawn a character that uses a spell not yet in the roster,
first register the spell, then spawn the character — in that order.
Always check the roster before referencing item/spell keys in a spawn-player action.

---
## CATEGORIES AND THEIR ACTION PARAMS

### "game-action" — control the active player
action.type = one of:
  "set-active-player"  → { "playerKey": one of [${playerKeys}] }
  "move"               → { "coords": [dx, dy] }   (dx/dy are integers, e.g. [-1,0] moves left)
  "attack-melee"       → { "targetKey": one of [${playerKeys}] }   (target must be on same cell)
  "attack-range"       → { "targetKey": one of [${playerKeys}] }   (max 10 cells, needs line of sight)
  "cast-spell"         → { "spellKey": "<spell key>", "targetKey": one of [${playerKeys}] }
  "next-turn"          → {}

### "spawn-player" — add a new character to the game
action = {
  "key": "<unique id>",       // e.g. "warrior1"
  "label": "<display name>",
  "weap1Key": "<weapon key or null>",
  "weap2Key": "<weapon key or null>",
  "armorKey": "<armor key or null>",
  "spellKeys": ["<spell key>", ...],
  "cell": [x, y]              // starting cell on 10x10 grid
}

### "remove-player" — remove a character from the game
action = { "playerKey": one of [${playerKeys}] }

### "register-weapon" — create a new weapon in the catalog
action = {
  "key": "<unique id>",
  "label": "<display name>",
  "mods": [ { "label": "<mod name>", "attributes": { "<attr>": <value_desc> } }, ... ],
  "gemSlots": ["BLUE"|"RED"|"YELLOW"|"PURPLE"|"GREEN", ...],
  "gemKeys": ["<gem key>", ...]
}

### "register-armor" — create a new armor in the catalog
action = {
  "key": "<unique id>",
  "label": "<display name>",
  "mods": [ { "label": "<mod name>", "attributes": { "<attr>": <value_desc> } }, ... ],
  "gemSlots": [...],
  "gemKeys": [...]
}

### "register-gem" — create a new gem in the catalog
action = {
  "key": "<unique id>",
  "label": "<display name>",
  "color": "BLUE"|"RED"|"YELLOW"|"PURPLE"|"GREEN",
  "mods": [ { "label": "<mod name>", "attributes": { "<attr>": <value_desc> } }, ... ]
}

### "register-spell" — create a new spell in the catalog
action = {
  "key": "<unique id>",
  "label": "<display name>",
  "mana": <integer cost>,
  "friendly": true|false,
  "damage": <value_desc or null>,
  "duration": <integer turns>,
  "mods": [ { "label": "<mod name>", "attributes": { "<attr>": <value_desc> } }, ... ]
}

---
## VALUE DESCRIPTORS (for attributes and damage)
{ "type": "fixed", "value": <number> }        → always returns that number
{ "type": "dice", "count": N, "faces": F }    → rolls N dice with F faces

## VALID ATTRIBUTE NAMES
hp, mana, maxMana, parry, dodge, meleeDamage, spellPower, rangeDamage, hit, actions, endTurnMana, speed

---
If the intent is unclear or impossible, respond:
{ "description": "I couldn't understand that. Please try again.", "actions": [{ "category": "unknown", "action": {} }] }
`.trim()
}

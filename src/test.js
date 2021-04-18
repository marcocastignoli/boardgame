import { dices, roll } from './classes/Dice.js'
import Mod from './classes/Mod.js'
import Gem, { GEM_TYPES } from './classes/Gem.js'
import { Weapon, Armor } from './classes/Items.js'
import Spell from './classes/Spell.js'
import Character from './classes/Character.js'
import Game from './classes/Game.js'

import modifiers from './var/modifiers.js'
import spellDamages from './var/damages.js'
import map from '../maps/test.js'

// gems
const t0_spell_power = new Gem(
    "t0_spell_power",
    "Gem of the mage",
    GEM_TYPES.BLUE,
    [modifiers.find(mod => mod.key === "_1d3_spellPower")]
)

const t0_cloth = new Armor({
    key: "t0_cloth",
    label: "Robe of the mage",
    mods: [modifiers.find(mod => mod.key === "_5_endTurnMana")],
    gemSlots: [GEM_TYPES.BLUE],
    gems: [t0_spell_power]
})

const t0_mage_sword = new Weapon({
    key: "t0_mage_sword",
    label: "Sword of the mage",
    mods: [modifiers.find(mod => mod.key === "_15_mana"), modifiers.find(mod => mod.key === "sword_mage_damage")],
    gemSlots: [GEM_TYPES.BLUE],
    gems: [t0_spell_power]
})

const t0_bow = new Weapon({
    key: "t0_bow",
    label: "Bow",
    mods: [modifiers.find(mod => mod.key === "bow_damage")],
    gemSlots: [],
    gems: []
})

const t0_fire_armor = new Spell(
    "t0_fire_armor",
    "Fire Armor",
    [modifiers.find(mod => mod.key === "_5_parry")],
    true,
    0,
    1,
    5
)

const t0_fireball = new Spell(
    "t0_fireball",
    "Fireball",
    [modifiers.find(mod => mod.key === "_minus_1_hit")],
    false,
    spellDamages.t0_fireball_damage,
    1,
    6
)

const Theon = new Character(
    "theon",
    "Theon",
    [modifiers.find(mod => mod.key === "baseMods")],
    t0_mage_sword,
    null,
    t0_cloth,
    [t0_fire_armor, t0_fireball],
    [3, 7]
)

const Rheon = new Character(
    "rheon",
    "Rheon",
    [modifiers.find(mod => mod.key === "baseMods")],
    t0_mage_sword,
    t0_bow,
    t0_cloth,
    [],
    [4, 8]
)

const game = new Game([
    Theon,
    Rheon
],0, 0, null, map)
game.setActivePlayer(Theon)
game.activePlayerCastSpell("t0_fire_armor", Theon)
game.activePlayerCastSpell("t0_fireball", Rheon)
game.setActivePlayer(Rheon)
game.activePlayerAttackMelee(Theon)
game.activePlayerMove([-1, 0])
game.activePlayerMove([0, -1])
game.activePlayerAttackMelee(Theon)
game.nextTurn()
game.setActivePlayer(Rheon)
game.activePlayerAttackMelee(Theon)
game.activePlayerAttackMelee(Theon)
game.activePlayerAttackMelee(Theon)
game.nextTurn()
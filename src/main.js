class Dice {
    constructor(faces) {
        this.faces = faces
    }
}

function dices(n, faces) {
    let dices = []
    for (let i = 0; i < n; i++) {
        dices.push(new Dice(faces))
    }
    return dices;
}


function roll(dices = []) {
    return dices.reduce((total, dice) => total + Math.floor(Math.random() * dice.faces) + 1, 0)
}

// esempio roll
// roll([...dices(1, 6), ...dices(2, 3)])

class Mod {
    constructor(mods = {}, turn = 0, label = "Undefined mod") {
        this.label = label

        this.expiresAt = Infinity
        this.startsAt = 0
        this.turn = turn

        this.hp = () => 0
        this.mana = () => 0
        this.parry = () => 0
        this.dodge = () => 0
        this.meleeDamage = () => 0
        this.spellPower = () => 0
        this.rangeDamage = () => 0
        this.hit = () => 0
        this.actions = () => 0
        this.endturnMana = () => 0
        this.speed = () => 0

        for (let mod in mods) {
            this[mod] = mods[mod]
        }
    }
}

const GEM_TYPES = {
    BLUE: "BLUE",
    YELLOW: "YELLOW",
    RED: "RED",
    PURPLE: "PURPLE",
    GREEN: "GREEN"
}

class Gem {
    constructor(key, label, color, mods) {
        this.key = key
        this.label = label
        this.color = color
        this.mods = mods
    }
}

class Item {
    constructor(key, label, mods, gemSlots, gems) {
        this.key = key
        this.label = label
        this.mods = mods
        this.gemSlots = gemSlots
        this.gems = gems
    }
    getAttr(attr, turn, silence) {
        let attribute = 0
        this.mods.forEach(mod => {
            if (mod[attr] && (turn < mod.expiresAt && turn >= mod.startsAt)) {
                const result = mod[attr]()
                if (result != 0) {
                    silence || console.log(`\t\t${mod.label}: ${result}\t${mod[attr].toString()}`)
                    attribute += result
                }
            }
        })
        this.gems.forEach(gem => {
            gem.mods.forEach(mod => {
                if (mod[attr] && (turn < mod.expiresAt && turn >= mod.startsAt)) {
                    const result = mod[attr]()
                    if (result != 0) {
                        silence || console.log(`\t\t${mod.label}: ${result}\t${mod[attr].toString()}`)
                        attribute += result
                    }
                }
            })
        })
        return attribute
    }
}

class Weapon extends Item {
    constructor({ key, label, mods, gemSlots, gems }) {
        super(key, label, mods, gemSlots, gems)
    }
}

class Armor extends Item {
    constructor({ key, label, mods, gemSlots, gems }) {
        super(key, label, mods, gemSlots, gems)
    }
}

class Spell {
    constructor(key, label, mods, friendly, damage, duration = null, mana) {
        this.key = key
        this.label = label
        this.mods = mods
        this.friendly = friendly
        this.damage = () => 0
        this.duration = duration
        this.mana = mana
    }
    getAttr(attr, turn) {
        let attribute = 0
        this.mods.forEach(mod => {
            if (mod[attr] && (turn < mod.expiresAt && turn >= mod.startsAt)) {
                attribute += mod[attr]()
            }
        })
        return attribute
    }
}

class Character {
    constructor(key, label, mods, weap1, weap2, armor, spells = [], cell = [0, 0]) {
        this.key = key
        this.label = label
        this.mods = mods
        this.weap1 = weap1
        this.weap2 = weap2
        this.armor = armor
        this.spells = spells
        this.cell = cell
    }
    getAttr(attr, turn, silence = false) {
        silence || console.log(`\tCalculation for ${this.label}'s ${attr}`)
        let attribute = 0
        this.mods.forEach(mod => {
            if (mod[attr] && (turn < mod.expiresAt && turn >= mod.startsAt)) {
                const result = mod[attr]()
                if (result != 0) {
                    silence || console.log(`\t\t${mod.label}: ${result}\t${mod[attr].toString()}`)
                    attribute += result
                }
            }
        })
        if (this.weap1) {
            attribute += this.weap1.getAttr(attr, turn, silence)
        }
        if (this.weap2) {
            attribute += this.weap2.getAttr(attr, turn, silence)
        }
        if (this.armor) {
            attribute += this.armor.getAttr(attr, turn, silence)
        }
        silence || console.log(`\t\tTotal: ${attribute}`)
        return attribute
    }
    damage(amount, turn) {
        const damage = new Mod({
            hp: () => -amount
        }, turn, `Damage at turn ${turn}`)
        this.mods.push(damage)
        return this.getAttr("hp", turn, true)
    }
    processSpell(mods, duration, damageAmount, turn) {
        const damage = new Mod({
            hp: () => -damageAmount
        }, turn, `Damage at turn ${turn}`)
        this.mods.push(damage)
        mods.forEach(mod => {
            mod.startsAt = turn
            mod.expiresAt = turn + duration
            const damage = new Mod(mod, turn, `Damage at turn ${turn}`)
            this.mods.push(damage)
        })
        return this.getAttr("hp", turn, true)
    }
    move(coords, turn) {
        const speed = this.getAttr("speed", turn, true)
        coords.forEach((c, i) => {
            if (Math.abs(c) <= speed) {
                this.cell[i] += c
            } else {
                throw "Cannot move faster then player's maximum speed"
            }
        })
        return true
    }
}

// mods
const _1d3_spellPower = new Mod()
_1d3_spellPower.spellPower = () => roll([...dices(1, 3)])
_1d3_spellPower.label = "Light enchantment of spell power"

const _2_mana = new Mod()
_2_mana.mana = () => 2

const _1d3_rangeDamage = new Mod()
_1d3_rangeDamage.rangeDamage = () => roll([...dices(1, 3)])

const _1_dodge = new Mod()
_1_dodge.dodge = () => 2

const _1d3_meleeDamage = new Mod()
_1d3_meleeDamage.meleeDamage = () => roll([...dices(1, 3)])

const _3_hit = new Mod()
_3_hit.hit = () => roll([...dices(1, 3)])

const _2_hp = new Mod()
_2_hp.hp = () => 2

const _2_parry = new Mod()
_2_parry.parry = () => 2

const _20_mana = new Mod()
_20_mana.mana = () => 20

const _15_mana = new Mod()
_15_mana.mana = () => 15

const _5_endturnMana = new Mod()
_5_endturnMana.endturnMana = () => 5
_5_endturnMana.label = "Recover mana"

// gems
const t0_spell_power = new Gem(
    "t0_spell_power",
    "Gem of the mage",
    GEM_TYPES.BLUE,
    [_1d3_spellPower]
)

const t0_cloth = new Armor({
    key: "t0_cloth",
    label: "Robe of the mage",
    mods: [_5_endturnMana],
    gemSlots: [GEM_TYPES.BLUE],
    gems: [t0_spell_power]
})

const sword_mage_damage = new Mod()
sword_mage_damage.meleeDamage = () => roll([...dices(3, 6)])
sword_mage_damage.label = "Sword strike"

const t0_mage_sword = new Weapon({
    key: "t0_mage_sword",
    label: "Sword of the mage",
    mods: [_15_mana, sword_mage_damage],
    gemSlots: [GEM_TYPES.BLUE],
    gems: [t0_spell_power]
})

const bow_damage = new Mod()
bow_damage.rangeDamage = () => roll([...dices(1, 6)])

const t0_bow = new Weapon({
    key: "t0_bow",
    label: "Bow",
    mods: [bow_damage],
    gemSlots: [],
    gems: []
})

const _5_parry = new Mod()
_5_parry.parry = () => 5
_5_parry.label = "Fire armor"


const t0_fire_armor = new Spell(
    "t0_fire_armor",
    "Fire Armor",
    [_5_parry],
    true,
    0,
    1,
    5
)

const _minus_1_hit = new Mod()
_minus_1_hit.hit = () => -1
_minus_1_hit.label = "Fireball's burns"

const t0_fireball = new Spell(
    "t0_fireball",
    "Fireball",
    [_minus_1_hit],
    false,
    () => roll([...dices(1, 6)]),
    1,
    5
)

const baseMods = new Mod()
baseMods.actions = () => 3
baseMods.hp = () => 10
baseMods.hit = () => roll([...dices(1, 6)])
baseMods.speed = () => roll([...dices(1, 6)])
baseMods.label = "Base stats"

const Rheon = new Character(
    "rheon",
    "Rheon",
    [baseMods],
    t0_mage_sword,
    t0_bow,
    t0_cloth,
    [],
    [0, 1]
)

const Theon = new Character(
    "theon",
    "Theon",
    [baseMods],
    t0_mage_sword,
    null,
    t0_cloth,
    [t0_fire_armor, t0_fireball],
    [0, 0]
)

const MAX_RANGED = 1

class Game {
    constructor(turn, actionsActivePlayer, activePlayer) {
        this.turn = turn
        this.actionsActivePlayer = actionsActivePlayer
        this.activePlayer = activePlayer
        console.log("Game starts")
    }
    nextTurn() {
        this.turn++
        this.actionsActivePlayer = 0
        this.activePlayer = null
        console.log("Next turn")
    }
    setActivePlayer(player) {
        console.log(`Active player is ${player.label}`)
        this.actionsActivePlayer = 0
        this.activePlayer = player
    }
    addActionsActivePlayer() {
        if (this.actionsActivePlayer < this.activePlayer.getAttr('actions', this.turn, true)) {
            this.actionsActivePlayer++
        } else {
            throw 'Change player'
        }
    }
    checkActivePlayerAlive() {
        if (this.activePlayer.getAttr("hp", this.turn, true) <= 0) {
            console.log(`${this.activePlayer.label} is dead`)
            return false
        }
        return true
    }
    checkTarget(defender) {
        if (!this.checkActivePlayerAlive()) {
            return false
        }
        if (defender.getAttr("hp", this.turn, true) <= 0) {
            console.log(`${this.activePlayer.label} cannot target ${defender.label} because ${defender.label} is dead`)
            return false
        }
        return true
    }
    checkDistance(defender) {
        let attackerCell = this.activePlayer.cell
        let sumDistance = defender.cell.reduce((tot, coordinate, i) => Math.pow(coordinate + attackerCell[i], 2))
        return Math.sqrt(sumDistance)
    }
    activePlayerAttackMelee(defender) {
        if (!this.checkTarget(defender)) {
            return false
        }
        if (this.checkDistance(defender) !== 0) {
            console.log(`${this.activePlayer.label} cannot attack because ${defender.label} is too far away`)
            return false
        }
        this.addActionsActivePlayer()
        console.log(`${this.activePlayer.label} tries to hit ${defender.label}.`)
        const attacker = this.activePlayer
        const hitAttacker = attacker.getAttr("hit", this.turn)
        const dodgeDefender = defender.getAttr("dodge", this.turn, true)
        const parryDefender = defender.getAttr("parry", this.turn, true)
        const defendAttr = dodgeDefender > parryDefender ? dodgeDefender : parryDefender
        if (hitAttacker <= defendAttr) {
            console.log(`${attacker.label} melee misses ${defender.label} rolling hit ${hitAttacker} against ${dodgeDefender > parryDefender ? 'dodge' : 'parry'} ${defendAttr}`)
            return false
        }
        console.log(`${attacker.label} melee hit ${defender.label} rolling hit ${hitAttacker} against ${dodgeDefender > parryDefender ? 'dodge' : 'parry'} ${defendAttr}`)
        const damageAmount = attacker.getAttr("meleeDamage", this.turn)
        console.log(`${attacker.label} does ${damageAmount} melee damage to ${defender.label}.`)
        const hpDefender = defender.damage(damageAmount, this.turn)
        if (hpDefender <= 0) {
            console.log(`${defender.label} is dead.`)
        } else {
            console.log(`${defender.label} has now ${hpDefender} hp.`)
        }
        return true
    }
    activePlayerAttackRange(defender) {
        if (!this.checkTarget(defender)) {
            return false
        }
        if (this.checkDistance(defender) > MAX_RANGED) {
            console.log(`${this.activePlayer.label} cannot attack because ${defender.label} is too far away`)
            return false
        }
        this.addActionsActivePlayer()
        console.log(`${this.activePlayer.label} tries to hit ${defender.label}.`)
        const attacker = this.activePlayer
        const hitAttacker = attacker.getAttr("hit", this.turn)
        const dodgeDefender = defender.getAttr("dodge", this.turn)
        const parryDefender = defender.getAttr("parry", this.turn)
        const defendAttr = dodgeDefender > parryDefender ? dodgeDefender : parryDefender
        if (hitAttacker <= defendAttr) {
            console.log(`${attacker.label} range misses ${defender.label} rolling hit ${hitAttacker} against ${dodgeDefender > parryDefender ? 'dodge' : 'parry'} ${defendAttr}`)
            return false
        }
        console.log(`${attacker.label} range hit ${defender.label} rolling hit ${hitAttacker} against ${dodgeDefender > parryDefender ? 'dodge' : 'parry'} ${defendAttr}`)
        const damageAmount = attacker.getAttr("rangeDamage", this.turn)
        console.log(`${attacker.label} does ${damageAmount} range damage to ${defender.label}.`)
        const hpDefender = defender.damage(damageAmount, this.turn)
        if (hpDefender <= 0) {
            console.log(`${defender.label} is dead.`)
        } else {
            console.log(`${defender.label} has now ${hpDefender} hp.`)
        }
        return true
    }
    activePlayerCastSpell(spellKey, target) {
        if (!this.checkTarget(target)) {
            return false
        }
        if (this.checkDistance(target) > MAX_RANGED) {
            console.log(`${this.activePlayer.label} cannot cast a spell to ${target.label} because is too far away.`)
            return false
        }
        const spell = this.activePlayer.spells.find(s => s.key === spellKey)
        if (spell === undefined) {
            console.log(`${this.activePlayer.label} cannot cast ${spellKey}.`)
            return false
        }
        this.addActionsActivePlayer()
        const caster = this.activePlayer

        if (!spell.friendly) {
            console.log(`${this.activePlayer.label} tries to hit ${target.label}.`)
            const hitAttacker = caster.getAttr("hit", this.turn)
            const dodgeDefender = target.getAttr("dodge", this.turn)
            const parryDefender = target.getAttr("parry", this.turn)
            const defendAttr = dodgeDefender > parryDefender ? dodgeDefender : parryDefender
            if (hitAttacker <= defendAttr) {
                console.log(`${caster.label} spell misses ${target.label} rolling hit ${hitAttacker} against ${dodgeDefender > parryDefender ? 'dodge' : 'parry'} ${defendAttr}`)
                return false
            }
            console.log(`${caster.label} spell hit ${target.label} rolling hit ${hitAttacker} against ${dodgeDefender > parryDefender ? 'dodge' : 'parry'} ${defendAttr}`)

            const damageAmount = spell.damage() + caster.getAttr("spellPower", this.turn)
            const hpDefender = target.processSpell(spell.mods, spell.duration, damageAmount, this.turn)
            console.log(`${caster.label} does ${damageAmount} spell damage to ${target.label}.`)
            if (hpDefender <= 0) {
                console.log(`${target.label} is dead.`)
            } else {
                console.log(`${target.label} has now ${hpDefender} hp.`)
            }
            return true
        } else {
            target.processSpell(spell.mods, spell.duration, spell.damage(), this.turn)
        }
    }
    activePlayerMove(coords) {
        if (!this.checkActivePlayerAlive()) {
            return false
        }
        this.addActionsActivePlayer()
        console.log(`${this.activePlayer.label} moves ${coords.join(", ")}`)
        this.activePlayer.move(coords, this.turn)
    }
}

const game = new Game(0, 0)
game.setActivePlayer(Theon)
game.activePlayerCastSpell("t0_fire_armor", Theon)
game.activePlayerCastSpell("t0_fireball", Rheon)
game.activePlayerCastSpell("t0_fireball", Rheon)
game.setActivePlayer(Rheon)
game.activePlayerAttackMelee(Theon)
game.activePlayerMove([0, -1])
game.activePlayerAttackMelee(Theon)
game.nextTurn()
game.setActivePlayer(Rheon)
game.activePlayerAttackMelee(Theon)
game.activePlayerAttackMelee(Theon)
game.activePlayerAttackMelee(Theon)
game.nextTurn()
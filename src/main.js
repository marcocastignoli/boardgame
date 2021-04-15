import { dices, roll } from './Dice.js'
import Mod from './Mod.js'
import Gem, { GEM_TYPES } from './Gem.js'
import { Weapon, Armor } from './Items.js'
import Spell from './Spell.js'
import Character from './Character.js'
import Game from './Game.js'

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
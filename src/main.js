import { dices, roll } from './Dice.js'
import Mod from './Mod.js'
import Gem, { GEM_TYPES } from './Gem.js'
import { Weapon, Armor } from './Items.js'
import Spell from './Spell.js'
import Character from './Character.js'
import Game from './Game.js'

import map from '../maps/test.js'
// mods
const _1d3_spellPower = new Mod()
_1d3_spellPower.spellPower = () => roll([...dices(1, 2)])
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
_15_mana.label = "Enchantment of mana"

const _5_endTurnMana = new Mod()
_5_endTurnMana.maxMana = () => 15
_5_endTurnMana.endTurnMana = () => 5
_5_endTurnMana.label = "Recover mana"

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
    mods: [_5_endTurnMana],
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
_5_parry.label = "+5 on parry for 1 turn"


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
_minus_1_hit.label = "-1 hit for one turn"

const t0_fireball = new Spell(
    "t0_fireball",
    "Fireball",
    [_minus_1_hit],
    false,
    () => roll([...dices(1, 3)]),
    1,
    6
)

const baseMods = new Mod()
baseMods.actions = () => 3
baseMods.hp = () => 10
baseMods.hit = () => roll([...dices(1, 6)])
baseMods.speed = () => 10
baseMods.label = "Base stats"

const Theon = new Character(
    "theon",
    "Theon",
    [baseMods],
    t0_mage_sword,
    null,
    t0_cloth,
    [t0_fire_armor, t0_fireball],
    [3, 7]
)

const Rheon = new Character(
    "rheon",
    "Rheon",
    [baseMods],
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
//game.activePlayerMove([1, 2])


//game.activePlayerCastSpell("t0_fireball", Rheon)



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
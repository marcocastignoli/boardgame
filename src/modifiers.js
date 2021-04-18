import Mod from './classes/Mod.js'
import { dices, roll } from './classes/Dice.js'

const _1d3_spellPower = new Mod()
_1d3_spellPower.spellPower = () => roll([...dices(1, 2)])
_1d3_spellPower.label = "Light enchantment of spell power"
_1d3_spellPower.key = "1d3_spellPower"

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

const _minus_1_hit = new Mod()
_minus_1_hit.hit = () => -1
_minus_1_hit.label = "-1 hit for one turn"

const baseMods = new Mod()
baseMods.actions = () => 3
baseMods.hp = () => 10
baseMods.hit = () => roll([...dices(1, 6)])
baseMods.speed = () => 10
baseMods.label = "Base stats"

const _5_parry = new Mod()
_5_parry.parry = () => 5
_5_parry.label = "+5 on parry for 1 turn"

const bow_damage = new Mod()
bow_damage.rangeDamage = () => roll([...dices(1, 6)])

const sword_mage_damage = new Mod()
sword_mage_damage.meleeDamage = () => roll([...dices(3, 6)])
sword_mage_damage.label = "Sword strike"

const modifiers = {
    _1d3_spellPower,
    _2_mana,
    _1d3_rangeDamage,
    _1_dodge,
    _1d3_meleeDamage,
    _3_hit,
    _2_hp,
    _2_parry,
    _20_mana,
    _15_mana,
    _5_endTurnMana,
    baseMods,
    _5_parry,
    bow_damage,
    sword_mage_damage,
}

export function getMods(mods) {
    let res = []
    mods.forEach(key => {
        res.push(modifiers[key])
    });
    return res
}

export default modifiers
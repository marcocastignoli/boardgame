import { dices, roll } from './classes/Dice.js'

const spellDamages = {
    t0_fireball_damage: () => roll([...dices(1, 3)])    
}

export function getSpellDamage(key) {
    return spellDamages[key]
}

export default spellDamages
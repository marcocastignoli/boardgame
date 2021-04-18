import { dices, roll } from '../classes/Dice.js'

const damages = [
    { key: "t0_fireball_damage", damage: () => roll([...dices(1, 3)]) }
]

export function getDamage(damage) {
    return damages.find(dmg => dmg.key === damage).damage
}

export default damages
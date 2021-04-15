import Mod from './Mod.js'

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

export default Character
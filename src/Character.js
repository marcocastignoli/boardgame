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
    checkEndTurnMods(turn) {
        const endTurnMana = this.getAttr("endTurnMana", turn, true)
        const mana = this.getAttr("mana", turn, true)
        const maxMana = this.getAttr("maxMana", turn, true)
        let manaIncrease = 0
        if (endTurnMana + mana > maxMana) {
            manaIncrease = maxMana - mana
        } else {
            manaIncrease = endTurnMana
        }
        console.log(`${this.label} recovered ${manaIncrease} mana.`)
        const endTurnManaMod = new Mod(manaIncrease, turn, `Recovered mana of turn ${turn}`)
        this.mods.push(endTurnManaMod)
    }
    useMana(amount, turn) {
        const damage = new Mod({
            mana: () => -amount
        }, turn, `Spell at turn ${turn}`)
        this.mods.push(damage)
        return this.getAttr("mana", turn, true)
    }
    damage(amount, turn) {
        const damage = new Mod({
            hp: () => -amount
        }, turn, `Damage at turn ${turn}`)
        this.mods.push(damage)
        return this.getAttr("hp", turn, true)
    }
    processSpell(spell, damageAmount, turn) {
        const mods = spell.mods
        const duration = spell.duration
        const label = spell.duration
        if (damageAmount > 0) {
            const damage = new Mod({
                hp: () => -damageAmount
            }, turn, `Damage at turn ${turn}`)
            this.mods.push(damage)
        }
        mods.forEach(mod => {
            console.log(`\t${mod.label}`)
            mod.startsAt = turn
            mod.expiresAt = turn + duration
            const modSpell = new Mod(mod, turn, `Spell at turn ${turn}`)
            this.mods.push(modSpell)
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
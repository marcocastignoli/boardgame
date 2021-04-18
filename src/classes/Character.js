import Mod from './Mod.js'

class Character {
    constructor(key, label, mods = [], weap1, weap2, armor, spells = [], cell = [0, 0]) {
        this.key = key
        this.label = label
        this.mods = mods
        this.weap1 = weap1
        this.weap2 = weap2
        this.armor = armor
        this.spells = spells
        this.cell = cell
    }
    dbTable() {
        return "characters"
    }
    toDb() {
        return {
            key: this.key,
            label: this.label,
            mods: this.mods.map(x => x.key),
            weap1: this.weap1 && this.weap1.key,
            weap2: this.weap2 && this.weap2.key,
            armor: this.armor && this.armor.key,
            spells: this.spells.map(x => x.key),
            cell: this.cell,
        }
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
        const endTurnManaMod = new Mod(manaIncrease, turn, `manaEndTurn_${this.key}_${turn}`, `Recovered mana of turn ${turn}`)
        this.mods.push(endTurnManaMod)
    }
    useMana(amount, turn) {
        const damage = new Mod({
            mana: () => -amount
        }, turn, `mana_${this.key}_${turn}`, `Mana at turn ${turn}`)
        this.mods.push(damage)
        return this.getAttr("mana", turn, true)
    }
    damage(amount, turn) {
        const damage = new Mod({
            hp: () => -amount
        }, turn, `damage_${this.key}_${turn}`, `Damage at turn ${turn}`)
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
            }, turn, `damage_${this.key}_${turn}`, `Damage at turn ${turn}`)
            this.mods.push(damage)
        }
        mods.forEach(mod => {
            console.log(`\t${mod.label}`)
            mod.startsAt = turn
            mod.expiresAt = turn + duration
            const modSpell = new Mod(mod, turn, `spell_${this.key}_${turn}`, `Spell at turn ${turn}`)
            this.mods.push(modSpell)
        })
        return this.getAttr("hp", turn, true)
    }
    move(coords, turn) {
        const speed = this.getAttr("speed", turn, true)
        let arrivingCell = this.cell.slice(0)
        coords.forEach((c, i) => {
            arrivingCell[i] += c
        })
        let sumDistance = this.cell.reduce((tot, coordinate, i) => Math.pow(coordinate - arrivingCell[i], 2))
        if (Math.floor(Math.sqrt(sumDistance)) <= speed) {
            this.cell = arrivingCell
            return true
        } else {
            throw "Cannot move faster then maximum speed"
        }
    }
}

export default Character
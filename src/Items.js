
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

export {
    Item, Weapon, Armor
}
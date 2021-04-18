class Spell {
    constructor(key, label, mods, friendly, damage, duration = null, mana) {
        this.key = key
        this.label = label
        this.mods = mods
        this.friendly = friendly
        this.damage = damage || (() => 0)
        this.duration = duration
        this.mana = mana
    }
    dbTable() {
        return "spells"
    }
    toDb() {
        return {
            key: this.key,
            label: this.label,
            mods: this.mods.map(x => x.key),
            friendly: this.friendly,
            damage: this.damage.map(x => x.key),
            duration: this.duration,
            mana: this.mana,
        }
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

export default Spell
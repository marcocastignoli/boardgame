class Spell {
    constructor(key, label, mods, friendly, damage, duration = null, mana) {
        this.key = key
        this.label = label
        this.mods = mods
        this.friendly = friendly
        this.damage = () => 0
        this.duration = duration
        this.mana = mana
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
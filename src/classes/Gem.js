const GEM_TYPES = {
    BLUE: "BLUE",
    YELLOW: "YELLOW",
    RED: "RED",
    PURPLE: "PURPLE",
    GREEN: "GREEN"
}

class Gem {
    constructor(key, label, color, mods) {
        this.key = key
        this.label = label
        this.color = color
        this.mods = mods
    }
    dbTable() {
        return "gems"
    }
    toDb() {
        return {
            key: this.key,
            label: this.label,
            color: this.color,
            mods: this.mods.map(x => x.key),
        }
    }
}

export default Gem
export {
    GEM_TYPES
}
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
}

export default Gem
export {
    GEM_TYPES
}
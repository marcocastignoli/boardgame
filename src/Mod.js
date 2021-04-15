class Mod {
    constructor(mods = {}, turn = 0, label = "Undefined mod") {
        this.label = label

        this.expiresAt = Infinity
        this.startsAt = 0
        this.turn = turn

        this.hp = () => 0
        this.mana = () => 0
        this.maxMana = () => 0
        this.parry = () => 0
        this.dodge = () => 0
        this.meleeDamage = () => 0
        this.spellPower = () => 0
        this.rangeDamage = () => 0
        this.hit = () => 0
        this.actions = () => 0
        this.endTurnMana = () => 0
        this.speed = () => 0

        for (let mod in mods) {
            this[mod] = mods[mod]
        }
    }
}

export default Mod
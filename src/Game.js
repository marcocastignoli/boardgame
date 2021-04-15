const MAX_RANGED = 1

class Game {
    constructor(turn, actionsActivePlayer, activePlayer) {
        this.turn = turn
        this.actionsActivePlayer = actionsActivePlayer
        this.activePlayer = activePlayer
        console.log("Game starts")
    }
    nextTurn() {
        this.turn++
        this.actionsActivePlayer = 0
        this.activePlayer = null
        console.log("Next turn")
    }
    setActivePlayer(player) {
        console.log(`Active player is ${player.label}`)
        this.actionsActivePlayer = 0
        this.activePlayer = player
    }
    addActionsActivePlayer() {
        if (this.actionsActivePlayer < this.activePlayer.getAttr('actions', this.turn, true)) {
            this.actionsActivePlayer++
        } else {
            throw 'Change player'
        }
    }
    checkActivePlayerAlive() {
        if (this.activePlayer.getAttr("hp", this.turn, true) <= 0) {
            console.log(`${this.activePlayer.label} is dead`)
            return false
        }
        return true
    }
    checkTarget(defender) {
        if (!this.checkActivePlayerAlive()) {
            return false
        }
        if (defender.getAttr("hp", this.turn, true) <= 0) {
            console.log(`${this.activePlayer.label} cannot target ${defender.label} because ${defender.label} is dead`)
            return false
        }
        return true
    }
    checkDistance(defender) {
        let attackerCell = this.activePlayer.cell
        let sumDistance = defender.cell.reduce((tot, coordinate, i) => Math.pow(coordinate + attackerCell[i], 2))
        return Math.sqrt(sumDistance)
    }
    activePlayerAttackMelee(defender) {
        if (!this.checkTarget(defender)) {
            return false
        }
        if (this.checkDistance(defender) !== 0) {
            console.log(`${this.activePlayer.label} cannot attack because ${defender.label} is too far away`)
            return false
        }
        this.addActionsActivePlayer()
        console.log(`${this.activePlayer.label} tries to hit ${defender.label}.`)
        const attacker = this.activePlayer
        const hitAttacker = attacker.getAttr("hit", this.turn)
        const dodgeDefender = defender.getAttr("dodge", this.turn, true)
        const parryDefender = defender.getAttr("parry", this.turn, true)
        const defendAttr = dodgeDefender > parryDefender ? dodgeDefender : parryDefender
        if (hitAttacker <= defendAttr) {
            console.log(`${attacker.label} melee misses ${defender.label} rolling hit ${hitAttacker} against ${dodgeDefender > parryDefender ? 'dodge' : 'parry'} ${defendAttr}`)
            return false
        }
        console.log(`${attacker.label} melee hit ${defender.label} rolling hit ${hitAttacker} against ${dodgeDefender > parryDefender ? 'dodge' : 'parry'} ${defendAttr}`)
        const damageAmount = attacker.getAttr("meleeDamage", this.turn)
        console.log(`${attacker.label} does ${damageAmount} melee damage to ${defender.label}.`)
        const hpDefender = defender.damage(damageAmount, this.turn)
        if (hpDefender <= 0) {
            console.log(`${defender.label} is dead.`)
        } else {
            console.log(`${defender.label} has now ${hpDefender} hp.`)
        }
        return true
    }
    activePlayerAttackRange(defender) {
        if (!this.checkTarget(defender)) {
            return false
        }
        if (this.checkDistance(defender) > MAX_RANGED) {
            console.log(`${this.activePlayer.label} cannot attack because ${defender.label} is too far away`)
            return false
        }
        this.addActionsActivePlayer()
        console.log(`${this.activePlayer.label} tries to hit ${defender.label}.`)
        const attacker = this.activePlayer
        const hitAttacker = attacker.getAttr("hit", this.turn)
        const dodgeDefender = defender.getAttr("dodge", this.turn)
        const parryDefender = defender.getAttr("parry", this.turn)
        const defendAttr = dodgeDefender > parryDefender ? dodgeDefender : parryDefender
        if (hitAttacker <= defendAttr) {
            console.log(`${attacker.label} range misses ${defender.label} rolling hit ${hitAttacker} against ${dodgeDefender > parryDefender ? 'dodge' : 'parry'} ${defendAttr}`)
            return false
        }
        console.log(`${attacker.label} range hit ${defender.label} rolling hit ${hitAttacker} against ${dodgeDefender > parryDefender ? 'dodge' : 'parry'} ${defendAttr}`)
        const damageAmount = attacker.getAttr("rangeDamage", this.turn)
        console.log(`${attacker.label} does ${damageAmount} range damage to ${defender.label}.`)
        const hpDefender = defender.damage(damageAmount, this.turn)
        if (hpDefender <= 0) {
            console.log(`${defender.label} is dead.`)
        } else {
            console.log(`${defender.label} has now ${hpDefender} hp.`)
        }
        return true
    }
    activePlayerCastSpell(spellKey, target) {
        if (!this.checkTarget(target)) {
            return false
        }
        if (this.checkDistance(target) > MAX_RANGED) {
            console.log(`${this.activePlayer.label} cannot cast a spell to ${target.label} because is too far away.`)
            return false
        }
        const spell = this.activePlayer.spells.find(s => s.key === spellKey)
        if (spell === undefined) {
            console.log(`${this.activePlayer.label} cannot cast ${spellKey}.`)
            return false
        }
        this.addActionsActivePlayer()
        const caster = this.activePlayer

        if (!spell.friendly) {
            console.log(`${this.activePlayer.label} tries to hit ${target.label}.`)
            const hitAttacker = caster.getAttr("hit", this.turn)
            const dodgeDefender = target.getAttr("dodge", this.turn)
            const parryDefender = target.getAttr("parry", this.turn)
            const defendAttr = dodgeDefender > parryDefender ? dodgeDefender : parryDefender
            if (hitAttacker <= defendAttr) {
                console.log(`${caster.label} spell misses ${target.label} rolling hit ${hitAttacker} against ${dodgeDefender > parryDefender ? 'dodge' : 'parry'} ${defendAttr}`)
                return false
            }
            console.log(`${caster.label} spell hit ${target.label} rolling hit ${hitAttacker} against ${dodgeDefender > parryDefender ? 'dodge' : 'parry'} ${defendAttr}`)

            const damageAmount = spell.damage() + caster.getAttr("spellPower", this.turn)
            const hpDefender = target.processSpell(spell.mods, spell.duration, damageAmount, this.turn)
            console.log(`${caster.label} does ${damageAmount} spell damage to ${target.label}.`)
            if (hpDefender <= 0) {
                console.log(`${target.label} is dead.`)
            } else {
                console.log(`${target.label} has now ${hpDefender} hp.`)
            }
            return true
        } else {
            target.processSpell(spell.mods, spell.duration, spell.damage(), this.turn)
        }
    }
    activePlayerMove(coords) {
        if (!this.checkActivePlayerAlive()) {
            return false
        }
        this.addActionsActivePlayer()
        console.log(`${this.activePlayer.label} moves ${coords.join(", ")}`)
        this.activePlayer.move(coords, this.turn)
    }
}

export default Game
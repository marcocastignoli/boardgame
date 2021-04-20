import Los from './Los.js'

const MAX_RANGED = 10

class Game {
    constructor(players, turn, actionsActivePlayer, activePlayer, map) {
        this.players = players
        this.turn = turn
        this.actionsActivePlayer = actionsActivePlayer
        this.activePlayer = activePlayer
        this.map = map
        console.log("Game starts")
    }
    nextTurn() {
        this.players.forEach(player => {
            player.checkEndTurnMods()
            player.turns++
        })
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
        if (this.actionsActivePlayer < this.activePlayer.getAttr('actions', true)) {
            this.actionsActivePlayer++
        } else {
            throw 'Change player'
        }
    }
    checkActivePlayerAlive() {
        if (this.activePlayer.getAttr("hp", true) <= 0) {
            console.log(`${this.activePlayer.label} is dead`)
            return false
        }
        return true
    }
    checkTarget(defender) {
        if (!this.checkActivePlayerAlive()) {
            return false
        }
        if (defender.getAttr("hp", true) <= 0) {
            console.log(`${this.activePlayer.label} cannot target ${defender.label} because ${defender.label} is dead`)
            return false
        }
        return true
    }
    checkWalls(defender) {
        const wall = this.map.layers.find(l => l.name === "wall")

        if(!Los(wall.data, wall.height, this.activePlayer.cell, defender.cell)) {
            return false
        }
        return true
    }
    checkDistance(defender) {
        
        let attackerCell = this.activePlayer.cell
        let sumDistance = defender.cell.reduce((tot, coordinate, i) => Math.pow(coordinate - attackerCell[i], 2))
        return Math.sqrt(sumDistance)
    }
    activePlayerAttackMelee(defender) {
        if (!this.checkTarget(defender)) {
            return false
        }
        if (!this.checkWalls(defender)) {
            console.log(`${this.activePlayer.label} cannot hit ${defender.label} throught walls.`)
            return false;
        }
        if (this.checkDistance(defender) !== 0) {
            console.log(`${this.activePlayer.label} cannot attack because ${defender.label} is too far away`)
            return false
        }
        this.addActionsActivePlayer()
        console.log(`${this.activePlayer.label} tries to hit ${defender.label}.`)
        const attacker = this.activePlayer
        const hitAttacker = attacker.getAttr("hit")
        const dodgeDefender = defender.getAttr("dodge")
        const parryDefender = defender.getAttr("parry")
        const defendAttr = dodgeDefender > parryDefender ? dodgeDefender : parryDefender
        if (hitAttacker <= defendAttr) {
            console.log(`${attacker.label} melee misses ${defender.label} rolling hit ${hitAttacker} against ${dodgeDefender > parryDefender ? 'dodge' : 'parry'} ${defendAttr}`)
            return false
        }
        console.log(`${attacker.label} melee hit ${defender.label} rolling hit ${hitAttacker} against ${dodgeDefender > parryDefender ? 'dodge' : 'parry'} ${defendAttr}`)
        const damageAmount = attacker.getAttr("meleeDamage")
        console.log(`${attacker.label} does ${damageAmount} melee damage to ${defender.label}.`)
        const hpDefender = defender.damage(damageAmount)
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
        if (!this.checkWalls(target)) {
            console.log(`${this.activePlayer.label} cannot hit ${target.label} throught walls.`)
            return false;
        }
        if (this.checkDistance(defender) > MAX_RANGED) {
            console.log(`${this.activePlayer.label} cannot attack because ${defender.label} is too far away`)
            return false
        }
        this.addActionsActivePlayer()
        console.log(`${this.activePlayer.label} tries to hit ${defender.label}.`)
        const attacker = this.activePlayer
        const hitAttacker = attacker.getAttr("hit")
        const dodgeDefender = defender.getAttr("dodge")
        const parryDefender = defender.getAttr("parry")
        const defendAttr = dodgeDefender > parryDefender ? dodgeDefender : parryDefender
        if (hitAttacker <= defendAttr) {
            console.log(`${attacker.label} range misses ${defender.label} rolling hit ${hitAttacker} against ${dodgeDefender > parryDefender ? 'dodge' : 'parry'} ${defendAttr}`)
            return false
        }
        console.log(`${attacker.label} range hit ${defender.label} rolling hit ${hitAttacker} against ${dodgeDefender > parryDefender ? 'dodge' : 'parry'} ${defendAttr}`)
        const damageAmount = attacker.getAttr("rangeDamage")
        console.log(`${attacker.label} does ${damageAmount} range damage to ${defender.label}.`)
        const hpDefender = defender.damage(damageAmount)
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
        if (!this.checkWalls(target)) {
            console.log(`${this.activePlayer.label} cannot hit ${target.label} throught walls.`)
            return false;
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
        const manaInitial = this.activePlayer.getAttr("mana", true)
        if (manaInitial < spell.mana) {
            console.log(`${this.activePlayer.label} cannot cast ${spell.label} because mana is not enought.`)
            return false
        }
        this.addActionsActivePlayer()
        const caster = this.activePlayer
        console.log(`${this.activePlayer.label} cast ${spell.label} on ${target.label} using ${spell.mana} mana.`)
        const manaLeft = caster.useMana(spell.mana)
        if (!spell.friendly) {
            const hitAttacker = caster.getAttr("hit")
            const dodgeDefender = target.getAttr("dodge")
            const parryDefender = target.getAttr("parry")
            const defendAttr = dodgeDefender > parryDefender ? dodgeDefender : parryDefender
            if (hitAttacker <= defendAttr) {
                console.log(`${caster.label} spell misses ${target.label} rolling hit ${hitAttacker} against ${dodgeDefender > parryDefender ? 'dodge' : 'parry'} ${defendAttr}`)
                return false
            }
            
            console.log(`${caster.label} spell hit ${target.label} rolling hit ${hitAttacker} against ${dodgeDefender > parryDefender ? 'dodge' : 'parry'} ${defendAttr}`)
            const spellDamage = spell.damage()
            console.log(`\tDamage from spell ${spell.label}: ${spellDamage}\t${spell.damage.toString()}`)
            const damageAmount = spellDamage + caster.getAttr("spellPower")
            console.log(`\tTotal: ${damageAmount}`)
            console.log(`The spell afflicts ${target.label} with: `)
            const hpDefender = target.processSpell(spell, damageAmount)
            console.log(`${caster.label} does ${damageAmount} spell damage to ${target.label}.`)
            if (hpDefender <= 0) {
                console.log(`${target.label} is dead.`)
            } else {
                console.log(`${target.label} has now ${hpDefender} hp.`)
            }
        } else {
            target.processSpell(spell, spell.damage())
        }

        console.log(`${this.activePlayer.label} now has ${manaLeft} mana left.`)
        return true
    }
    activePlayerMove(coords) {
        if (!this.checkActivePlayerAlive()) {
            return false
        }
        let arrivingCell = this.activePlayer.cell.slice(0)
        coords.forEach((c, i) => {
            arrivingCell[i] += c
        })
        const wall = this.map.layers.find(l => l.name === "wall")
        if(!Los(wall.data, wall.height, this.activePlayer.cell, arrivingCell)) {
            console.log("Player cannot move throught walls")
            return false;
        }
        this.addActionsActivePlayer()
        console.log(`${this.activePlayer.label} moves ${coords.join(", ")}`)
        this.activePlayer.move(coords)
        console.log(`${this.activePlayer.label} is now in ${this.activePlayer.cell.join(", ")}`)
    }
}

export default Game
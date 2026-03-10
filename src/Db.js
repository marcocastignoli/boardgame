import Nedb from '@seald-io/nedb'
import { join } from 'path'
import Character from './classes/Character.js'
import Gem from './classes/Gem.js'
import { Armor, Weapon } from './classes/Items.js'
import Spell from './classes/Spell.js'
import { getMods } from './var/modifiers.js'
import { getDamage } from './var/damages.js'

class DbCollection {
    constructor(filename) {
        this._db = new Nedb({ filename, autoload: true })
    }
    async findOne(query) { return this._db.findOneAsync(query) }
    async find(query) { return this._db.findAsync(query) }
    async insertOne(doc) { return this._db.insertAsync(doc) }
    async updateOne(query, update, options = {}) {
        return this._db.updateAsync(query, update, { upsert: options.upsert || false })
    }
}

class Db {
    async init(dataDir) {
        this._dataDir = dataDir
        this._cols = {}
        this.db = this  // backward compat: auth/character routes receive db.db
    }

    collection(name) {
        if (!this._cols[name]) {
            this._cols[name] = new DbCollection(join(this._dataDir, `${name}.db`))
        }
        return this._cols[name]
    }

    async gem(key) {
        if (!key) return null
        const result = await this.collection("gems").findOne({ key })
        return new Gem(result.key, result.label, result.color, getMods(result.mods))
    }
    async saveGem(gem) {
        return this.collection("gems").updateOne({ key: gem.key }, { $set: gem.toDb() }, { upsert: true })
    }
    async gems(gems) {
        const res = []
        for (const key of gems) res.push(await this.gem(key))
        return res
    }
    async weapon(key) {
        if (!key) return null
        const result = await this.collection("weapons").findOne({ key })
        return new Weapon({
            key: result.key, label: result.label,
            mods: getMods(result.mods), gemSlots: result.gemSlots,
            gems: await this.gems(result.gems)
        })
    }
    async armor(key) {
        if (!key) return null
        const result = await this.collection("armors").findOne({ key })
        return new Armor({
            key: result.key, label: result.label,
            mods: getMods(result.mods), gemSlots: result.gemSlots,
            gems: await this.gems(result.gems)
        })
    }
    async spell(key) {
        if (!key) return null
        const result = await this.collection("spells").findOne({ key })
        return new Spell(
            result.key, result.label, getMods(result.mods),
            result.friendly, getDamage(result.damage), result.duration, result.mana
        )
    }
    async spells(spells) {
        const res = []
        for (const key of spells) res.push(await this.spell(key))
        return res
    }
    async character(key) {
        const result = await this.collection("characters").findOne({ key })
        return new Character(
            result.key, result.label, getMods(result.mods),
            await this.weapon(result.weap1), await this.weapon(result.weap2),
            await this.armor(result.armor), await this.spells(result.spells),
            result.cell, result.turns
        )
    }
    async save(object) {
        return this.collection(object.dbTable()).updateOne(
            { key: object.key }, { $set: object.toDb() }, { upsert: true }
        )
    }
}

export default Db

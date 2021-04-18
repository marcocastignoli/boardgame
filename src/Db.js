import mongodb from 'mongodb'
import Character from './classes/Character.js'
const { MongoClient } = mongodb

import Gem, { GEM_TYPES } from './classes/Gem.js'
import { Armor, Weapon } from './classes/Items.js'
import Spell from './classes/Spell.js'
import { getMods } from './var/modifiers.js'
import { getDamage } from './var/damages.js'

class Db {
    async init(connection) {
        let client = await MongoClient.connect(connection, { useNewUrlParser: true, useUnifiedTopology: true })
        this.db = client.db('cop')
    }
    async gem(key) {
        if (!key) {
            return null
        }
        const result = await this.db.collection("gems").findOne({
            key
        })
        return new Gem(
            result.key,
            result.label,
            result.color,
            getMods(result.mods)
        )
    }
    async saveGem(gem) {
        const query = { key: gem.key };
        const update = { $set: gem.toDb() };
        const options = { upsert: true };
        return await this.db.collection("gems").updateOne(query, update, options);
    }
    async gems(gems) {
        let res = []
        for (const key of gems) {
            const gem = await this.gem(key)
            res.push(gem)
        }
        return res
    }
    async weapon(key) {
        if (!key) {
            return null
        }
        const result = await this.db.collection("weapons").findOne({
            key
        })
        return new Weapon({
            key: result.key,
            label: result.label,
            mods: getMods(result.mods),
            gemSlots: result.gemSlots,
            gems: await this.gems(result.gems)
        })
    }
    async armor(key) {
        if (!key) {
            return null
        }
        const result = await this.db.collection("armors").findOne({
            key
        })
        return new Armor({
            key: result.key,
            label: result.label,
            mods: getMods(result.mods),
            gemSlots: result.gemSlots,
            gems: await this.gems(result.gems)
        })
    }
    async spell(key) {
        if (!key) {
            return null
        }
        const result = await this.db.collection("spells").findOne({
            key
        })
        return new Spell(
            result.key,
            result.label,
            getMods(result.mods),
            result.friendly,
            getDamage(result.damage),
            result.duration, 
            result.mana
        )
    }
    async spells(spells) {
        let res = []
        for (const key of spells) {
            const spell = await this.spell(key)
            res.push(spell)
        }
        return res
    }
    async character(key) {
        const result = await this.db.collection("characters").findOne({
            key
        })
        return new Character(
            result.key,
            result.label,
            getMods(result.mods),
            await this.weapon(result.weap1),
            await this.weapon(result.weap2),
            await this.armor(result.armor),
            await this.spells(result.spells),
            result.cell
        )
    }
    async save(object) {
        const query = { key: object.key };
        const update = { $set: object.toDb() };
        const options = { upsert: true };
        return await this.db.collection(object.dbTable()).updateOne(query, update, options);
    }
}

export default Db
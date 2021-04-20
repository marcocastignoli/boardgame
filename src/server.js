import express from 'express'
import bodyParser from 'body-parser'
import cors from 'cors'

import config from './config.js'

import Db from './Db.js'
import modifiers from './var/modifiers.js'

import auth from './server/auth/routes.js'
import characters from './server/characters/routes.js'

    // let rheon = await db.character("rheon")
    // console.log(rheon)
    // rheon.mods.push(modifiers.find(mod => mod.key === "_2_mana"))
    // await db.save(rheon)





async function load() {
    const app = express()
    app.use(cors({
        origin: [
            'http://localhost:8080',
        ],
        credentials:  true
    }))
    app.use(bodyParser.json());

    const db = new Db()
    await db.init(`mongodb://${config.mongo.host}:${config.mongo.port}`)

    auth(app, db.db)
    characters(app, db.db)
    
    app.listen(config.port)
}

load()
import 'dotenv/config'
import express from 'express'
import bodyParser from 'body-parser'
import cors from 'cors'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

import config from './config.js'
import gameRoutes from './server/game/routes.js'
import { initDb } from './server/game/gameManager.js'

const __dirname = dirname(fileURLToPath(import.meta.url))

async function load() {
    const app = express()
    app.use(cors({ origin: true, credentials: true }))
    app.use(bodyParser.json())

    // Serve frontend
    app.use(express.static(join(__dirname, '../public')))

    // Init game DB (catalog + saved games)
    await initDb(join(__dirname, '..', config.dataDir))

    // Game API routes (no DB required)
    gameRoutes(app)

    // Auth & character routes (requires MongoDB - load optionally)
    try {
        const [Db, auth, characters] = await Promise.all([
            import('./Db.js'),
            import('./server/auth/routes.js'),
            import('./server/characters/routes.js')
        ])
        const db = new Db.default()
        await db.init(join(__dirname, '..', config.dataDir))
        auth.default(app, db.db)
        characters.default(app, db.db)
        console.log('NeDB initialized - auth and character routes enabled')
    } catch (e) {
        console.warn('DB init failed - auth/character routes disabled:', e.message)
    }

    app.listen(config.port, () => {
        console.log(`Server running at http://localhost:${config.port}`)
    })
}

load()

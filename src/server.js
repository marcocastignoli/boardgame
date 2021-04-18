import Db from './Db.js'
import modifiers from './var/modifiers.js'

async function asd() {
    const db = new Db()
    await db.init('mongodb://localhost:27017')
    let rheon = await db.character("rheon")
    console.log(rheon)
    rheon.mods.push(modifiers.find(mod => mod.key === "_2_mana"))
    await db.save(rheon)
}

asd()
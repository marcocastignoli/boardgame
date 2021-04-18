import Db from './Db.js'

async function asd() {
    const db = new Db()
    await db.init('mongodb://localhost:27017')
    const rheon = await db.character("rheon")
    console.log(rheon)
}

asd()
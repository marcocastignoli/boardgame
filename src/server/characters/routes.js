export default function(app, db) {

    app.get('/characters', async (req, res) => {

        const result = await db.collection("characters").findOne({
            user: req.user.username
        })

        return res.send(result)
    })
}
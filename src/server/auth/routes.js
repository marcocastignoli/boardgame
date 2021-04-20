import cookieParser from 'cookie-parser'
import jwt from 'jsonwebtoken'
import jwtCheck from 'express-jwt'
import bcrypt from 'bcrypt'
import randomize from 'randomatic'
import config from '../../config.js'
import utilities from '../../utilities.js'

export default function(app, db) {

    app.use(cookieParser())

    app.use(jwtCheck({ secret: config.privateKey, algorithms: ['HS256'], getToken: req => req.cookies.token }).unless({ path: [/^\/auth\/.*/, /^\/payment\/.*/] }) )

    app.use(function (err, req, res, next) {
        if (err.name === 'UnauthorizedError') {
            return res.status(401).send({
                msg: 'Token not valid'
            });
        } else {
            next(err);
        }
    });

    app.post('/auth/register', utilities.validate(['username', 'password', 'email' ]), async (req, res) => {
        const verificationCode = randomize('000000')
        const passwordHash = await bcrypt.hash( req.body.password, 10)

        await db.collection("users").insertOne({
            username: req.body.username,
            password: passwordHash,
            email: req.body.email,
            verificationCode: verificationCode,
        })

        return res.send({
            username: req.body.username
        })
    })
/* 
    app.post('/auth/activate', utilities.validate(['username', 'verificationCode']), async (req, res) => {
        let result
        try {
            result = await SQL`
                UPDATE users
                SET active = 1
                WHERE 1=1
                    AND username = ${req.body.username} 
                    AND verification_token = ${req.body.verificationCode}
            `
        } catch (err) {
            return handleSqlError(res, err)
        }
        if (result.affectedRows === 0) {
            res.status(404).send({
                msg: "Username or verification code not found"
            })
        } else {
            res.send({
                msg: "User activated"
            })
        }
    }) */

    app.post('/auth/login', utilities.validate(['username', 'password']), async (req, res) => {
        let result = await db.collection("users").findOne({
            username: req.body.username
        })

        if (!result) {
            return res.status(404).send({
                msg: "Username not found"
            })
        }

        let user = result
        if (user.active === 0) {
            return res.status(403).send({
                msg: "User not active",
                type: "NOT_ACTIVE"
            })
        }
        if( bcrypt.compareSync( req.body.password, user.password ) ) {
            const token = jwt.sign({ username: user.username, id: user.id }, config.privateKey, { expiresIn: 60 * 15 });
            delete user.password
            delete user.verification_token
            res.cookie('token', token, { httpOnly: true });
            return res.send({ user })
        } else {
            return res.status(401).send({
                msg: "Pasword sbagliata"
            })
        }
    })

    app.post('/auth/logout', async (req, res) => {
        res.cookie('token', null, { httpOnly: true });
        return res.send()
    })

    /* app.post('/auth/askReset', utilities.validate(['phone']), async (req, res) => {
        const verificationCode = randomize('000000')
        const sendSms = await sendToken(req.body.phone, verificationCode)
        if (sendSms.status !== 200) {
            return res.status(500).send('sms_failed')
        }
        let result
        try {
            result = await SQL`
                UPDATE users
                SET reset_code = ${verificationCode}
                WHERE 
                    phone = ${req.body.phone}
            `
        } catch (err) {
            return handleSqlError(res, err)
        }
        if (result.affectedRows === 0) {
            res.status(404).send({
                msg: "Phone not found"
            })
        } else {
            res.send({
                msg: "Reset code sent"
            })
        }
    })

    app.post('/auth/reset', utilities.validate(['phone', 'reset_code', 'password']), async (req, res) => {
        let result
        try {
            result = await SQL`
                UPDATE users
                SET 
                    reset_code = NULL,
                    password = ${await bcrypt.hash( req.body.password, 10)}
                WHERE 
                    phone = ${req.body.phone}
                    AND reset_code = ${req.body.reset_code}
            `
        } catch (err) {
            return handleSqlError(res, err)
        }
        if (result.affectedRows === 0) {
            res.status(404).send({
                msg: "Phone not found"
            })
        } else {
            res.send({
                msg: "Password reset succesfully"
            })
        }
    }) */
}
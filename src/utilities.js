export default {
    validate(properties) {
        return function(req, res, next) {
            let missing = []
            properties.forEach(prop => {
                if (!req.body.hasOwnProperty(prop) || req.body[prop] === '') {
                    missing.push(prop)
                }
            });
            if (missing.length > 0) {
                return res.status(400).send({msg: `Missing fields: ${missing.join(',')}`})
            }
            return next()
        }
    }
}
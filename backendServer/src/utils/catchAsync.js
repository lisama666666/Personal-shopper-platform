module.exports = fn => {
    return (req, res, next) => {
        fn(req, res, next).catch((e) => {
            console.log("===== e =======", e)
            next(e)
        })
    }
}
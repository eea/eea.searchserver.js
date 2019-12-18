var cache = require('../util/cache');

exports.setLandingValues = async(req, res) => {
    var keys = Object.keys(req.body);
    await cache.setLandingValues(req.body);
    res.send("ok");
}

exports.invalidateLandingValues = async(req, res) => {
    await cache.invalidateLandingValues()
    res.send("cache invalidated");
}

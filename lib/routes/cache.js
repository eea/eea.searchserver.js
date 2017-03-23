var cache = require('../util/cache');

exports.setLandingValues = function(req, res){
    var keys = Object.keys(req.body);
    cache.setLandingValues(req.body);
    res.send("ok");
}

exports.invalidateLandingValues = function(req, res){
    cache.invalidateLandingValues()
    res.send("cache invalidated");
}
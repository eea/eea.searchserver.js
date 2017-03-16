var cache = require('memory-cache');
var CACHE_NAME = 'landingcache';
var CACHE_TTL = 60*60*1000;

exports.setLandingValues = function(values){
    var keys = Object.keys(values);
    var mem_cache = cache.get(CACHE_NAME);
    if (!mem_cache){
        mem_cache = {};
    }
    for (var i = 0; i < keys.length; i++){
        var value = values[keys[i]];
        if (value !== undefined){
            mem_cache[keys[i]] = value;
        }
    }
    cache.put(CACHE_NAME, mem_cache, CACHE_TTL);
}

exports.getLandingValues = function() {
    return cache.get(CACHE_NAME);
}

exports.invalidateLandingValues = function(){
    var mem_cache = {}
    cache.put(CACHE_NAME, mem_cache);
}


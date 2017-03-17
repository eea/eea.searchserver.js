//var cache = require('memory-cache');
var Memcached = require('memcached');
var CACHE_NAME = 'landingcache';
//var CACHE_TTL = 60*60*1000;
var CACHE_TTL = 60*60;
var MEMCACHED_SERVER = 'memcached:11211';

exports.setLandingValues = function(values){
    var memcached = new Memcached(MEMCACHED_SERVER);

    var keys = Object.keys(values);
    memcached.get(CACHE_NAME, function(err, mem_cache){
console.log("SET-GET");
console.log(mem_cache);
        var is_new = true;
        if (mem_cache !== undefined){
            is_new = false;
        }
        if (!mem_cache){
            mem_cache = {};
        }
        for (var i = 0; i < keys.length; i++){
            var value = values[keys[i]];
            if (value !== undefined){
                mem_cache[keys[i]] = value;
            }
        }
console.log("SET");
console.log(mem_cache);
        if (is_new){
            memcached.set(CACHE_NAME, mem_cache, CACHE_TTL, function(err){});
        }
        else {
            memcached.replace(CACHE_NAME, mem_cache, CACHE_TTL, function(err){});
        }
    });
//    cache.put(CACHE_NAME, mem_cache, CACHE_TTL);
}

exports.getLandingValues = function(callback) {
    var memcached = new Memcached(MEMCACHED_SERVER);
    memcached.get(CACHE_NAME, function (err, mem_cache) {
        if (mem_cache === undefined){
            mem_cache = {}
        }
        callback(mem_cache);
    });
//    return cache.get(CACHE_NAME);
}

exports.invalidateLandingValues = function(){
console.log("INVALIDATE");
    var mem_cache = {}
    var memcached = new Memcached(MEMCACHED_SERVER);
    memcached.set(CACHE_NAME, mem_cache, CACHE_TTL, function(err){});
//    cache.put(CACHE_NAME, mem_cache);
}


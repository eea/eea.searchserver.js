var request = require('sync-request');

function getOptions() {
    var nconf = require('nconf')
    var elastic = nconf.get()['elastic'];
    return {
        'es_host': elastic.host + ':' + elastic.port + elastic.path
    };
}

var setCachedValues = function(name, ttl, values){
    var esAPI = require('eea-searchserver').esAPI;
    var esQuery = new esAPI(getOptions());
    var elastic = require('nconf').get()['elastic'];
    var valuesForCache = {};

    var keys = Object.keys(values);
    getCachedValues(name, ttl, function(err, stored_values){
        var is_new = true;
        if (stored_values !== undefined){
            is_new = false;
        }
        if (!stored_values){
            stored_values = {};
        }
        for (var i = 0; i < keys.length; i++){
            var value = values[keys[i]];
            if (value !== undefined){
                stored_values[keys[i]] = value;
            }
        }
        valuesForCache["value"] = JSON.stringify(stored_values);
        valuesForCache["stored_at"] = Date.now();
        esQuery.PUT(elastic.index + '/cache/' + name, valuesForCache, function(){})
            .execute();
    });
}


exports.setLandingValues = function(values){
    setCachedValues("landing", 60*60, values);
}

var getCachedValues = function(name, ttl, callback) {
    var request = require('sync-request');
    var nconf = require('nconf')
    var elastic = nconf.get()['elastic'];
    var indexed_url = 'http://' + elastic.host + ':' + elastic.port + elastic.path + elastic.index + '/cache/' + name;
    var res;
    var cached_value = {};
    try {
        res = request('GET', indexed_url);
        var res_json = JSON.parse(res.getBody('utf8'));
        cached_value = res_json._source["value"] || '{}';
        cached_value = JSON.parse(cached_value);
        var cache_stored_at = res_json._source["stored_at"];
        var delta = (Date.now() - cache_stored_at) / 1000;
        if ((ttl > 0) && (delta > ttl)) {
            cached_value = {};
        }
    } catch(e) {
        console.log(e);
    }
    callback(cached_value);
}

exports.getCachedValues = getCachedValues;
exports.setCachedValues = setCachedValues;

var getLandingValues = function(callback) {
    getCachedValues("landing", 60*60, callback);
}

exports.getLandingValues = getLandingValues;

exports.invalidateLandingValues = function(){
    var esAPI = require('eea-searchserver').esAPI;
    var esQuery = new esAPI(getOptions());
    var elastic = require('nconf').get()['elastic'];
    var valuesForCache = {};
    esQuery.PUT(elastic.index + '/cache/cache', valuesForCache, function(){})
            .execute();
}

var request = require('sync-request');

var CACHE_NAME = 'landingcache';
var CACHE_TTL = 60 * 60;
var MEMCACHED_SERVER = 'memcached:11211';

function getOptions() {
    var nconf = require('nconf')
    var elastic = nconf.get()['elastic'];
    return {
        'es_host': elastic.host + ':' + elastic.port + elastic.path
    };
}

exports.setLandingValues = function(values){
    var esAPI = require('eea-searchserver').esAPI;
    var esQuery = new esAPI(getOptions());
    var elastic = require('nconf').get()['elastic'];
    var valuesForCache = {};

    var keys = Object.keys(values);

    getLandingValues(function(err, stored_values){
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
        valuesForCache[CACHE_NAME] = JSON.stringify(values);
        valuesForCache[CACHE_NAME + '_stored_at'] = Date.now();
        esQuery.PUT(elastic.index + '/cache/cache', valuesForCache, function(){})
            .execute();

    });
}

var getLandingValues = function(callback) {
    var request = require('sync-request');
    var nconf = require('nconf')
    var elastic = nconf.get()['elastic'];
    var indexed_url = 'http://' + elastic.host + ':' + elastic.port + elastic.path + elastic.index + '/cache/cache';
    var res;
    var cached_value = {};
    try {
        res = request('GET', indexed_url);
        var res_json = JSON.parse(res.getBody('utf8'));
        cached_value = res_json._source[CACHE_NAME] || '{}';
        cached_value = JSON.parse(cached_value);
        var cache_stored_at = res_json._source[CACHE_NAME + "_stored_at"];
        var delta = (Date.now() - cache_stored_at) / 1000;
        if (delta > CACHE_TTL) {
            cached_value = {};
        }
    } catch(e) {
        console.log(e);
    }
    callback(cached_value);
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


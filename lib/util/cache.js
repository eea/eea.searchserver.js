
function getOptions() {
    var nconf = require('nconf')
    var elastic = nconf.get()['elastic'];
    return {
        'es_host': elastic.host + ':' + elastic.port + elastic.path,
        'auth': elastic.rwuser + ':' + elastic.rwpass,
        'index': 'cache_' + elastic.index + '_' + elastic.appalias
    };
}

const setCachedValues = async(name, ttl, values) => {
    return new Promise(async (resolve, reject) => {
        var esAPI = require('eea-searchserver').esAPI;
        const options = getOptions();
        var esQuery = new esAPI(options);
        var valuesForCache = {};

        var keys = Object.keys(values);
        stored_values = await getCachedValues(name, ttl)

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
        esQuery.PUT(options.index + '/cache/' + name, valuesForCache, function(e,s,h,b){
                resolve(true)
            })
            .execute();
    });
}

const setLandingValues = async(values) => {
    return new Promise(async (resolve, reject) => {
        await setCachedValues("landing", 60*60, values);
        resolve(true);
    });
}


const getCachedValues = async(name, ttl) => {
    return new Promise(async (resolve, reject) => {
        try {
            const esAPI = require('eea-searchserver').esAPI;
            const options = getOptions();
            const esQuery = new esAPI(options);

            const query = {
                    "query": {
                        "match": {
                            "_id": name
                        }
                    }
                }
            esQuery
                .POST(options.index + "/_search", query, function(err, s, h, b){
                    try{
                        const res_json = JSON.parse(b);
                        let cached_value = {};
                        if ((res_json.hits !== undefined) &&
                            (res_json.hits.hits !== undefined) &&
                            (res_json.hits.hits.length !== 0))
                            {
                            cached_value = res_json.hits.hits[0]._source.value || '{}';
                            cached_value = JSON.parse(cached_value);
                            const cache_stored_at = res_json.hits.hits[0]._source.stored_at;
                            const delta = (Date.now() - cache_stored_at) / 1000;
                            if ((ttl > 0) && (delta > ttl)) {
                                cached_value = {};
                            }
                        }
                        resolve(cached_value)
                    }
                    catch(e){
                        if (!e.message.includes('404')){
                            console.log(e.message);
                        }
                        resolve({})
                    }
                })
                .execute()
        }
        catch(e){
            if (!e.message.includes('404')){
                console.log(e.message);
            }
            resolve({})
        }
    });
}


const getLandingValues = async() => {
    const landing_values = await getCachedValues("landing", 60*60);
    return Promise.resolve(landing_values);
}


const invalidateLandingValues = async() => {
    var esAPI = require('eea-searchserver').esAPI;
    const options = getOptions();
    var esQuery = new esAPI(getOptions());
    esQuery.PUT(options.index + '/cache/landing', {}, function(){})
            .execute();
}


exports.getLandingValues = getLandingValues;
exports.getCachedValues = getCachedValues;
exports.setCachedValues = setCachedValues;
exports.setLandingValues = setLandingValues;
exports.invalidateLandingValues = invalidateLandingValues;

/* View that forwards a search request to the configured
 * Elastic endpoint index and type */
var nconf = require('nconf');
var http = require('http');

function findObjectByKey(obj, key){
    let found_obj;
    if (typeof(obj) === 'object'){
        Object.keys(obj).forEach(function(obj_key){
            let obj_val = obj[obj_key];
            if (obj_key === key){
                found_obj = obj_val;
            }
            if (found_obj === undefined){
                found_obj = findObjectByKey(obj_val, key);
            }
        });
    }
    return found_obj;
}

function lengthInBytes(str) {
  var specialCharacters = encodeURIComponent(str).match(/%[89ABab]/g);
  return str.length + (specialCharacters ? specialCharacters.length : 0);
}

module.exports = function(req, res) {
    var elasticConf = nconf.get()['elastic'];

    var searchData;
    if (req.method === 'GET') {
        searchData = req.query.source || '';
    }
    if (req.method === 'POST') {
        searchData = req.body;
        if (searchData.source !== undefined){
            searchData = searchData.source;
        }
    }

    let json_searchData = JSON.parse(searchData);
    let query_string = findObjectByKey(json_searchData, "query_string");
    if (query_string !== undefined){
      let query = findObjectByKey(query_string, "query");
      if (query !== undefined){
        if (!query_string.query.endsWith("*")){
          query_string.query = query_string.query + "*";
        }
      }
    }
    searchData = JSON.stringify(json_searchData);

/*    if (searchData !== ''){
        searchData = JSON.parse(searchData);
        delete(searchData.facets)
        searchData = JSON.stringify(searchData);
    }*/

    var user = elasticConf.rouser;
    var password = elasticConf.ropass
    var suffix = '/_search';
    var method = 'POST';
    if (req.query.source === 'mapping'){
        suffix = '/_mapping';
        method = 'GET';
        user = elasticConf.rwuser;
        password = elasticConf.rwpass
    }
    if (req.query.source === 'mapping'){
        suffix = '/_mapping';
        method = 'GET';
        user = elasticConf.rwuser;
        password = elasticConf.rwpass
    }

//    method = req.method;

    var appalias = elasticConf.appalias || elasticConf.default_appalias;

    var searchOptions = {
        host: elasticConf.host,
        port: elasticConf.port,
        path: elasticConf.index + "_" + appalias + '/' +
              elasticConf.type + suffix,
        method: method,
        auth: user + ":" + password,
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': lengthInBytes(searchData)
        }
    };

    var searchRequest = http.request(searchOptions, function(rsp) {
        res.status(rsp.statusCode);
        res.set(rsp.headers);

        rsp.on('data', function(chunk) {
            res.write(chunk);
        });
        rsp.on('end', function() {
            res.end();
        });
    });
    searchRequest.on('error', function (e) {
        console.log('Error when performing search query', e.message);
        res.status(500).send({'error': e.message});
    });
    searchRequest.write(searchData);
    searchRequest.end();
}

/* View that forwards a search request to the configured
 * Elastic endpoint index and type */
var nconf = require('nconf');
var http = require('http');


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
    }

    var suffix = '/_search';
    var method = 'POST';
    if (req.query.source === 'mapping'){
        suffix = '/_mapping';
        method = 'GET';
    }
    var searchOptions = {
        host: elasticConf.host,
        port: elasticConf.port,
        path: elasticConf.path + elasticConf.index + '/' + 
              elasticConf.type + suffix,
        method: method,
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
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

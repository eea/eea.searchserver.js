/* View that forwards a search request to the configured
 * Elastic endpoint index and type */
var nconf = require('nconf');
var http = require('http');

module.exports = function(req, res) {
    var elasticConf = nconf.get('elastic');

    var searchData;
    if (req.method === 'GET') {
        searchData = req.query.source || '';
    }
    if (req.method === 'POST') {
        searchData = req.body;
    }

    var searchOptions = {
        host: elasticConf.host,
        port: elasticConf.port,
        path: elasticConf.path + elasticConf.index + '/' + 
              elasticConf.type + '/_search',
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Content-Length': searchData.length
        }
    };

    var searchRequest = http.request(searchOptions, function(rsp) {
        res.status(rsp.statusCode);
        res.set(rsp.headers);

        rsp.on('data', function(chunk) {
            res.write(chunk);
        });
        res.on('end', function() {
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

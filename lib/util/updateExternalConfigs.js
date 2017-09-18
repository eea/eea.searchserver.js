var nconf = require('nconf');
var http = require('http');
var cache = require('./cache');

module.exports = function(callback) {

    function getExternalConfigs(options){
        var externalConfigRequest = http.request(options, function (res) {
            var data = '';
            res.on('data', function (chunk) {
                data += chunk;
            });
            res.on('end', function () {
                if (res.statusCode >= 200 && res.statusCode < 300 && data.length) {
                    data = JSON.parse(data);
                    cache.setCachedValues("externals", 0, data);
                }
                callback(null, "Success");
            });
        });
        externalConfigRequest.on('error', function (e) {
            callback(e);
        });
        externalConfigRequest.end();
    }

    var options = {
        host: nconf.get("external_configs:host"),
        path: nconf.get("external_configs:path"),
        port: nconf.get("external_configs:port")
    };

    getExternalConfigs(options);

};

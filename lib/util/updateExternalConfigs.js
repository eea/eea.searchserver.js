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
console.log(callback);
console.log("1")
//                    console.log(data);
                    data = JSON.parse(data);
                    cache.setCachedValues("externals", 0, data);
                }
console.log("2")

                callback(null, "Success");
            });
        });
console.log("3")
        externalConfigRequest.on('error', function (e) {
            callback(e);
        });
console.log("4")
        externalConfigRequest.end();
    }


    var options = {
        host: nconf.get("external_configs:host"),
        path: nconf.get("external_configs:path"),
        port: nconf.get("external_configs:port")
    };

    getExternalConfigs(options);

};

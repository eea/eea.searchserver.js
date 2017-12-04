var nconf = require('nconf');
var http = require('http');
var https = require('https');
var cache = require('./cache');

module.exports = function(callback) {

    function getExternalConfigs(options){
        var tool = http;

        var protocol = nconf.get("external_configs:protocol");

        if (protocol === "https"){
            tool = https;
        }
        console.log("External config options: ", options);
        var externalConfigRequest = tool.request(options, function (res) {
            var data = '';
            res.on('data', function (chunk) {
                data += chunk;
            });
            res.on('end', function () {
                if (res.statusCode >= 200 && res.statusCode < 300 && data.length) {
                    console.log("External config data: ", data);
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

    var date = new Date();
    var ts = date.getTime();

    var options = {
        host: nconf.get("external_configs:host"),
        path: nconf.get("external_configs:path") + "?ts=" + ts,
        port: nconf.get("external_configs:port")
    };

    getExternalConfigs(options);

};

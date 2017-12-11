var nconf = require('nconf');
var http = require('http');
var https = require('https');
var cache = require('./cache');

module.exports = function(callback) {

    function getExternalConfigs(){
        var date = new Date();
        var ts = date.getTime();

        var options = {
            host: nconf.get("external_configs:host"),
            path: nconf.get("external_configs:path") + "?ts=" + ts,
            port: nconf.get("external_configs:port")
        };

        var tool = http;

        var protocol = nconf.get("external_configs:protocol");

        if (protocol === "https"){
            tool = https;
        }
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
            });
            res.on('error', function() {
                console.log('error reading external configs');
            });
        });
        externalConfigRequest.end();
    }

    // Added a delay before reading the external configs.
    // This was required because in some cases the automatic update of the
    // external configs, which was triggered by the plone content rule,
    // occured before the json in plone was updated.
    setTimeout(getExternalConfigs, 10000);
    callback(null, "Success");

};

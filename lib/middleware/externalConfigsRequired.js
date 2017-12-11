var nconf = require('nconf');

module.exports = function(req, res, next) {
    var host = nconf.get("external_configs:host") || "";
    if (host.trim() === ""){
        req.app.set('externalConfigsValid', true);
    }
    if (!req.app.get('externalConfigsValid')) {
        var updateExternalConfigs = require('../util/updateExternalConfigs');
        updateExternalConfigs(function(err) {
            if (err) {
                console.log("Error while updating configs");
                console.log(err);
                next();
            } else {
                console.log("Configs updated!");
                req.app.set('externalConfigsValid', true);
                next();
            } 
        });
    } else {
        next();
    }
}



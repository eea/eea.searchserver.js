module.exports = function(req, res, next) {
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



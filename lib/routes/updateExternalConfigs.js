var updateExternalConfigs = require('../util/updateExternalConfigs');

module.exports = function(req, res) {
    updateExternalConfigs(function(err, result) {
        if (err) {
            console.log(err);
            res.status(500).send("Error while updateing external configuration!");
        } else {
            res.send("Done!");
        }
    });
}

var invalidateTemplates = require('../util/invalidateTemplates');

module.exports = function(req, res) {
    invalidateTemplates(function(err, result) {
        if (err) {
            console.log(e);
            res.status(500).send("Error while invalidanting templates!");
        } else {
            res.send("Done!");
        }
    });
}

var invalidateTemplates = require('../util/invalidateTemplates');

module.exports = function(req, res) {
    invalidateTemplates(function(err, result) {
        if (err) {
            console.log(err);
            res.status(500).send("Error while invalidating templates!");
        } else {
            res.send("Done!");
        }
    });
}

module.exports = function(req, res) {
    if (!req.app.get('templatesValid')) {
        console.log("No templates, set, invalidating!");
        var invalidateTemplates = require('../util/invalidateTemplates');
        invalidateTemplates(function(err) {
            if (err) {
                console.log("Error while invalidating templates");
                console.log(err);
                res.status(500).send("<h1>Error, Please try again later!<h1>");
                return false;
            } else {
                console.log("Invalidated Templates!");
                req.app.set('templatesValid', true);
                return true;
            } 
        });
    } else {
        return true;
    }
}



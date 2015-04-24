module.exports = function(req, res, next) {
    if (!req.app.get('templatesValid')) {
        console.log("No templates, set, invalidating!");
        var invalidateTemplates = require('../util/invalidateTemplates');
        invalidateTemplates(function(err) {
            if (err) {
                console.log("Error while invalidating templates");
                console.log(err);
                res.status(500).send("<h1>Error, Please try again later!<h1>");
            } else {
                console.log("Invalidated Templates!");
                req.app.set('templatesValid', true);
                next();
            } 
        });
    } else {
        next();
    }
}



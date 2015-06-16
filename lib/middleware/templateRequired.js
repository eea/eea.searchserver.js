module.exports = function(req, res, next) {
    if (!req.app.get('templatesValid')) {
        console.log("No templates, set, invalidating!");
        var invalidateTemplates = require('../util/invalidateTemplates');
        invalidateTemplates(function(err) {
            if (err) {
                console.log("Error while invalidating templates");
                console.log(err);
                res.status(500).send("<h1>Error, Please try again later!<h1>");
                if (next === undefined){
                    return false;
                }
            } else {
                console.log("Invalidated Templates!");
                req.app.set('templatesValid', true);
                if (next === undefined){
                    return true;
                }
                else{
                    next();
                }
            } 
        });
    } else {
        if (next === undefined){
            return true;
        }
        else{
            next();
        }
    }
}



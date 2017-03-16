/*
 * Template invalidation util function
 */

var nconf = require('nconf');
var request = require('request');

module.exports = function(callback) {
    var fs = require("fs");
    var path = require("path");
    var dir = nconf.get("external_templates:local_path");
    if (!path.isAbsolute(dir)) {
        throw new Error("external_templates:local_path must be absolute");
    }

    var dir = path.normalize(dir);
    var dirs = dir.split(path.sep);
    var lastPath = '/';
    for (var i = 0; i < dirs.length; i++) {
        if (!dirs[i]) continue;
        lastPath = path.join(lastPath, dirs[i]);
        if (!fs.existsSync(lastPath)) fs.mkdirSync(lastPath);
    }

    var footerFile = path.join(dir, "footer.html");
    var headerFile = path.join(dir, "header.html");
    var headFile = path.join(dir, "head.html");
    var count = 0;

    fs.writeFile(footerFile, "");
    fs.writeFile(headerFile, "");
    fs.writeFile(headFile, "");

    function getExternalTemplate(options, fileName){
        request(options.host+options.path, function (error, response, body) {

            if (error){
                callback(error);
            }

            if (response){
                if (response.statusCode >= 200 && response.statusCode < 300 && body.length){
                    fs.writeFile(fileName, body);
                }
                count += 1;
                if (count == 3) callback(null, "Success");
            }
        });
    }


    function downloadExternalTemplates(){
        var head_options = {
            host: nconf.get("external_templates:host"),
            path: nconf.get("external_templates:head_path"),
        };
        getExternalTemplate(head_options, headFile);

        var header_options = {
            host: nconf.get("external_templates:host"),
            path: nconf.get("external_templates:header_path")
        };
        getExternalTemplate(header_options, headerFile);

        var footer_options = {
            host: nconf.get("external_templates:host"),
            path: nconf.get("external_templates:footer_path")
        };
        getExternalTemplate(footer_options, footerFile);
    }

    downloadExternalTemplates();

    try {
        var child_process = require('child_process');
        child_process.exec('git describe --tags', {cwd: '/sources_from_git/'}, function (err, stdout, stderr) {
            if (err) {
                console.log(err);
                GLOBAL.gittagnumber = 'unknown';
            } else {
                stdout = stdout.trim();
                console.log('Git tag number: ' + stdout);
                GLOBAL.gittagnumber = stdout;
            }
        });
    }
    catch(err) {
        console.log(err);
        GLOBAL.gittagnumber = 'unknown';
    }
};

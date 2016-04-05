/*
 * Template invalidation util function
 */

var nconf = require('nconf');

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

    var http = require('http');
    var head_options = {
        host: nconf.get("external_templates:host"),
        path: nconf.get("external_templates:head_path")
    };
    var head_request = http.request(head_options, function (res) {
        var data = '';
        res.on('data', function (chunk) {
            data += chunk;
        });
        res.on('end', function () {
            fs.writeFile(headFile, data);
            count += 1;
            if (count == 3) callback(null, "Success");
        });
    });
    head_request.on('error', function (e) {
        callback(e);
    });
    head_request.end();

    var header_options = {
        host: nconf.get("external_templates:host"),
        path: nconf.get("external_templates:header_path")
    };
    var header_request = http.request(header_options, function (res) {
        var data = '';
        res.on('data', function (chunk) {
            data += chunk;
        });
        res.on('end', function () {
            fs.writeFile(headerFile, data);
            count += 1;
            if (count == 3) callback(null, "Success");
        });
    });
    header_request.on('error', function (e) {
        callback(e);
    });
    header_request.end();

    var footer_options = {
        host: nconf.get("external_templates:host"),
        path: nconf.get("external_templates:footer_path")
    };
    var footer_request = http.request(footer_options, function (res) {
        var data = '';
        res.on('data', function (chunk) {
            data += chunk;
        });
        res.on('end', function () {
            fs.writeFile(footerFile, data);
            count += 1;
            if (count == 3) callback(null, "Success");
        });
    });
    footer_request.on('error', function (e) {
        callback(e);
    });
    footer_request.end();

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

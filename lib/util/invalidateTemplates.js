/*
 * Template invalidation util function
 */

var nconf = require('nconf');
var http = require('http');
var https = require('https');

module.exports = function(callback) {
    var fs = require("fs");
    var path = require("path");

    var protocol = nconf.get("external_templates:protocol");
    var translation = nconf.get("translation");
    var languages = {}

    tool = http;
    if (protocol === "https"){
        tool = https;
    }

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

    var footerFile = {};
    var headerFile = {};
    var headFile = {};
    var count = 0;

    if (translation && translation.enabled) {
        languages = translation.languages ? translation.languages : {};
    }

    if (Object.keys(languages).length === 0) {
        languages['en'] = ''
    }

    for (var lang in languages) {
        footerFile[lang] = path.join(dir, `footer_${lang}.html`);
        headerFile[lang] = path.join(dir, `header_${lang}.html`);
        headFile[lang] = path.join(dir, `head_${lang}.html`);
        writeFiles([footerFile[lang], headerFile[lang], headFile[lang]])
    }

    function writeFiles(files) {
        files.forEach(function(f) {
            fs.writeFile(f, "", function(err) {
                if(err) {
                    return console.log(err);
                }
            });
        })
    }

    function getExternalTemplate(options, fileName) {
        var externalTemplateRequest = tool.request(options, function (res) {
            var data = '';
            res.on('data', function (chunk) {
                data += chunk;
            });
            res.on('end', function () {
                if (res.statusCode >= 200 && res.statusCode < 300 && data.length) {
                    fs.writeFile(fileName, data, function(err) {
                        if(err) {
                            return console.log(err);
                        }
                    });
                }
                count += 1;
                if (count == Object.keys(languages).length * 3) {
                    var msg = "Done!";
                    if ((options.headers !== undefined) && (options.headers.Upgrade !== undefined)){
                        msg = "Response header 'Upgraded' found";
                    }
                    callback(null, msg);
                }
            });
        });
        externalTemplateRequest.on('error', function (e) {
            callback(e);
        });
        externalTemplateRequest.on('upgrade', function (req, socket, upgradeHead) {
            if (options.headers === undefined){
                options.headers = {};
            }
            options.headers.Connection = 'Upgrade';
            options.headers.Upgrade = 'websocket';
            getExternalTemplate(options, fileName);
        });
        externalTemplateRequest.end();
    }

    function downloadExternalTemplates(lang, path){
        var port = nconf.get("external_templates:port") || (protocol==='https' ? 443 : 80);

        var head_options = {
            host: nconf.get("external_templates:host"),
            port: port,
            path: nconf.get("external_templates:head_path").replace("${lang}", path)
        };

        if (protocol === 'https'){
          head_options.rejectUnauthorized = false
          head_options.agent = new tool.Agent(head_options);
        }
        getExternalTemplate(head_options, headFile[lang]);

        var header_options = {
            host: nconf.get("external_templates:host"),
            port: port,
            path: nconf.get("external_templates:header_path").replace("${lang}", path)
        };

        if (protocol === 'https'){
          header_options.rejectUnauthorized = false
          header_options.agent = new tool.Agent(header_options);
        }
        getExternalTemplate(header_options, headerFile[lang]);

        var footer_options = {
            host: nconf.get("external_templates:host"),
            port: port,
            path: nconf.get("external_templates:footer_path").replace("${lang}", path)
        };

        if (protocol === 'https'){
          footer_options.rejectUnauthorized = false
          footer_options.agent = new tool.Agent(footer_options);
        }
        getExternalTemplate(footer_options, footerFile[lang]);
    }

    for (var lang in languages) {
        downloadExternalTemplates(lang, languages[lang]);
    }

    try {
        var child_process = require('child_process');
        child_process.exec('git describe --tags', {cwd: '/sources_from_git/'}, function (err, stdout, stderr) {
            if (err) {
                console.log(err);
                global.gittagnumber = 'unknown';
            } else {
                stdout = stdout.trim();
                console.log('Git tag number: ' + stdout);
                global.gittagnumber = stdout;
            }
        });
    }
    catch(err) {
        console.log(err);
        global.gittagnumber = 'unknown';
    }
};

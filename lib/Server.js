function getSettings(settingsFile, callback) {
    var nconf = require('nconf');
    nconf.env({separator: '_',
               whitelist: ['elastic_host',
                           'elastic_path',
                           'elastic_port',
                           'elastic_index',
                           'elastic_type']})
         .file(settingsFile)
         .defaults({'elastic:path': '/',
                    'elastic:port': 9200});
    var elasticConf = nconf.get('elastic');
    if (elasticConf.host === undefined) {
        callback(new Error("Please set the 'elastic_host' env var or" +
                           " elastic:host in " + settingsFile));
        return null;
    }
    if (elasticConf.index === undefined) {
        callback(new Error("Please set the 'elastic_index' env var or" +
                           " elastic:index in " + settingsFile));
        return null;
    }
    if (elasticConf.type === undefined) {
        callback(new Error("Please set the 'elastic_type' env var or" +
                           " elastic:type in " + settingsFile));
        return null;
    }
    callback(null, nconf);
    return nconf;
}

function Server(app, settingsFile, callback) {
    var _ = require('underscore');
    var DEFAULT_PORT = 3000;

    /* Get config and fail if error */
    var nconf = getSettings(settingsFile, function(err, res) {
        if (err) callback(err);
    });
    if (!nconf) {
        return null;
    }

    /* Get server entrypoint commands */
    function runServer() {
        var http = require('http');
        var server = app.listen(nconf.get('http:port') || DEFAULT_PORT);
    }

    var commands = {
        'runserver': runServer,
    }
    if (app.get('managementCommands')) {
        commands = _.extend(commands, app.get('managementCommands'));
    }
    if (commands.help === undefined) {
        commands.help = function() {
            console.log("List of available commands: " + _.keys(commands));
        }
    }

    function run(cmd, args, callback) {
        cmdFunc = commands[cmd];
        if (cmdFunc === undefined) {
            callback(new Error("Command '" + cmd + "' unrecognized."));
            return;
        }
        cmdFunc(args);
        callback(null, this);
    }

    var res = {
        run: run,
        nconf: nconf
    };

    callback(null, res);
    return res;
}

module.exports = Server


// $roots keeps previous parent properties as they will be added as a prefix for each prop.
// $sep is just a preference if you want to seperate nested paths other than dot.
const flatten = (obj, roots = [], sep = '_') => Object
  // find props of given object
  .keys(obj)
  // return an object by iterating props
  .reduce((memo, prop) => Object.assign(
    // create a new object
    {},
    // include previously returned object
    memo,
    Object.prototype.toString.call(obj[prop]) === '[object Object]'
      // keep working if value is an object
      ? flatten(obj[prop], roots.concat([prop]), sep)
      // include current prop and value and prefix prop with the roots
      : {[roots.concat([prop]).join(sep)]: obj[prop]}
  ), {})

function getSettings(settingsFile, callback) {
    var nconf = require('nconf');
    nconf.env({separator: '_',
               whitelist: ['elastic_host',
                           'elastic_path',
                           'elastic_port',
                           'elastic_index',
                           'elastic_rwuser',
                           'elastic_rwpass',
                           'elastic_rouser',
                           'elastic_ropass',
                           'elastic_type',
                           'elastic_riverindex',
                           'elastic_appalias',
                           'elastic_requests_per_second',
                           'external_templates_local_path',
                           'external_templates_protocol',
                           'external_templates_host',
                           'external_templates_head_path',
                           'external_templates_header_path',
                           'external_templates_footer_path',
                           'sourceconf_bulksize',
                           'sourceconf_url',
                           'sourceconf_counturl']})

         .file(settingsFile)
         .defaults({'elastic:path': '/',
                    'elastic:port': 9200});

    /* Overwrite external_templates properties form settings.json */
    if (nconf.get()['external'] != undefined) {
        let external_templates_conf = nconf.get()['external_templates'];
        let external_templates_props = flatten(nconf.get()['external']['templates']);

        for (const [key, value] of Object.entries(external_templates_props)) {
            if (key in external_templates_conf) {
                nconf.set('external_templates:' + key, value);
            }
        }
    }

    var elasticConf = nconf.get()['elastic'];
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

function Server(app, settings, callback) {
    var _ = require('underscore');
    var getenv = require('getenv');
    var DEFAULT_PORT = 3000;
    var AUTO_INDEXING = getenv.bool('AUTO_INDEXING', true);

    /* Get config and fail if error */
    var nconf = getSettings(settings.settingsFile, function(err, res) {
        if (err) callback(err);
    });

    if (!nconf) {
        return null;
    }
    var isConstruct = settings.isConstruct;

    function exists_index(elastic){
        var request = require('sync-request');
        var indexed_url = 'http://' + encodeURIComponent(elastic.rwuser) + ":" + encodeURIComponent(elastic.rwpass) + "@"+ elastic.host + ':' + elastic.port + elastic.path + elastic.index + '/_count';
        var count_current = 0;
        var res;
        try{
            res = request('GET', indexed_url)
            count_current = JSON.parse(res.getBody('utf8')).count;
            if (isNaN(count_current)){
                count_current = 0;
            }
        }catch(e){
            if(res.statusCode != 404){
                return exists_index(elastic);
            }else{
                return false
            }
        }
        return (count_current > 0);
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

    function run(cmd, app_dir, args, callback) {
        var cmdFunc = commands[cmd];
        if (cmdFunc === undefined) {
            callback(new Error("Command '" + cmd + "' unrecognized."));
            return;
        }
        cmdFunc(app_dir, args);
        callback(null, this);

        if (cmd == 'runserver' && AUTO_INDEXING === true){
            var waitForPort = require('wait-for-port');
            var elastic = nconf.get()['elastic'];
            if (!isConstruct){
              elastic.real_index = elastic.index + '_blue';
            }
            else {
              elastic.real_index = elastic.index;
            }
            waitForPort(elastic.host, elastic.port, { numRetries: 30 }, function(err) {
                if (err) throw new Error(err);
                var exists = exists_index(elastic);
                if (exists === false){
                    commands['create_index'](settings.indexing, args);
                }
            });
        }

    }

    var res = {
        run: run,
        nconf: nconf
    };

    callback(null, res);
    return res;
}

module.exports = Server


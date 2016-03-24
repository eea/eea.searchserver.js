var path = require('path');
fs = require("fs")

function extend(target) {
    var sources = [].slice.call(arguments, 1);
    sources.forEach(function (source) {
        for (var prop in source) {
            target[prop] = source[prop];
        }
    });
    return target;
}

function getIndexFiles(settings) {

  var analyzers = require(path.join(__dirname, 'builtinAnalyzers.json'));
  if ((settings.extraAnalyzers !== undefined) && (settings.extraAnalyzers !== '')){
    settingsAnalyzers = require(path.join(settings.app_dir,settings.extraAnalyzers));
    analyzers = extend(analyzers, settingsAnalyzers);
  }
  var datamappings = require(path.join(settings.app_dir,settings.dataMapping));
  var mappings = {
    'settings': {
        'analysis': {
            'analyzer': analyzers
        }
    },
    'mappings': {
        'resources': {
            'properties': datamappings
        }
    }
  };

  var filtersQuery = null;
  if (settings.indexingFilterQuery !== null){
    filtersQuery = fs.readFileSync(path.join(settings.app_dir, settings.indexingFilterQuery), 'utf8');
  }

  return {
    filtersQuery: filtersQuery,
    queryTemplate: fs.readFileSync(path.join(settings.app_dir,settings.indexingQuery), 'utf8'),
    analyzers: mappings,
    endpoint: settings.endpoint
  }
}

function getOptions() {
    var nconf = require('nconf')
    var elastic = nconf.get()['elastic'];
    return {
        'es_host': elastic.host + ':' + elastic.port + elastic.path
    };
}

var callback = function(text, showBody) {
    if (showBody === undefined){
        showBody = true;
    }
    return function(err, statusCode, header, body) {
        console.log(text);
        if (err) {
            console.log(err.message);
        } else {
            console.log('  Successfuly ran query');
            console.log('  ResponseCode: ' + statusCode);
            if (showBody === true){
                console.log('  ' + body);
            }
        }
    };
}

function removeData(settings) {
    var esAPI = require('eea-searchserver').esAPI;
    var elastic = require('nconf').get()['elastic'];
    new esAPI(getOptions())
        .DELETE(elastic.index, callback('Deleting index! (if it exists)'))
        .execute();
}

function createIndex(settings) {
    var esAPI = require('eea-searchserver').esAPI;
    var config = getIndexFiles(settings);
    var elastic = require('nconf').get()['elastic'];
    elastic.real_index = elastic.index + "_blue";
    new esAPI(getOptions())
            .indexFromQuery(config.endpoint, config.queryTemplate, config.filtersQuery, elastic, config.analyzers);
}

function syncIndex(settings) {
    var esAPI = require('eea-searchserver').esAPI;
    var config = getIndexFiles(settings);
    new esAPI(getOptions())
            .syncFromQuery(config.endpoint, config.queryTemplate, config.filtersQuery, config.analyzers);
}

function showHelp() {
    console.log('List of available commands:');
    console.log(' runserver: Run the app web server');
    console.log('');
    console.log(' create_index: Setup Elastic index and trigger indexing');
    console.log('');
    console.log(' sync_index: Sync Elastic index with zero downtime');
    console.log('');
    console.log(' remove_data: Remove the ES index of this application');
    console.log('');
    console.log(' help: Show this menu');
    console.log('');
}

module.exports = { 
    'remove_data': removeData,
    'create_index': createIndex,
    'sync_index': syncIndex,
    'help': showHelp
}

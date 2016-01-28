var elastic_settings = require('nconf').get('elastic');
var elastic_indexing = require('nconf').get('indexing');

var esAPI = require('eea-searchserver').esAPI;

var analyzers
// = require('./river_config/analyzers.js');
var config
// = require('./river_config/config.js');

var builtinAnalyzers = {
    "none" : {
      "type" : "keyword"
    },
    "coma" : {
      "type" : "pattern",
      "lowercase" : false,
      "pattern" : ", "
    },
    "semicolon" : {
      "type" : "pattern",
      "lowercase" : false,
      "pattern" : "; "
    }
}


function getOptions() {
    var nconf = require('nconf')
    var elastic = nconf.get()['elastic'];
    return {
        'es_host': elastic.host + ':' + elastic.port + elastic.path
    };
}

//var analyzers = analyzers.mappings;

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

function removeData() {
    var elastic = require('nconf').get('elastic');
    new esAPI(getOptions())
        .DELETE(elastic.index, callback('Deleting index! (if it exists)'))
        .execute();
}

function createIndex() {
    var elastic = require('nconf').get('elastic');
    new esAPI(getOptions())
            .indexFromQuery(config.endpoint, config.queryTemplate, config.filtersQuery, elastic, analyzers);
}

function syncIndex() {
    new esAPI(getOptions())
            .syncFromQuery(config.endpoint, config.queryTemplate, config.filtersQuery, analyzers);
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
    console.log(' help: Show this menux');
    console.log('');
}

module.exports = { 
    'remove_data': removeData,
    'create_index': createIndex,
    'sync_index': syncIndex,
    'help': showHelp
}

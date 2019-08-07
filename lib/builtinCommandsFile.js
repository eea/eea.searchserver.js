/* eslint-disable no-console */
var path = require('path');
var fs = require("fs");

function extend(target) {
    var sources = [].slice.call(arguments, 1);
    sources.forEach(function (source) {
        for (var prop in source) {
            target[prop] = source[prop];
        }
    });
    return target;
}

function polyfillMapping(mapping){ // make old mapping.jsons compatible with new elasticsearch
    delete (mapping['_id']);
    if (mapping['all_fields_for_freetext'] === undefined){
        mapping['all_fields_for_freetext'] = {"type": "text", "analyzer": "freetext"};
    }
    var fields = Object.keys(mapping);
    for (var i = 0; i < fields.length; i++){
        var field = mapping[fields[i]]
        if (field.type === 'string'){
            field.type = 'text';
        }
        if (field.type === 'text'){
            if (field.fielddata === undefined){
                field.fielddata = true;
            }
            if (field.copy_to === undefined){
                field.copy_to = [];
            }
            field.copy_to.push('all_fields_for_freetext');
        }
    }
    return mapping;
}

function getMapping(settings, mappingCallback) {
  var mapping = {};
  var mappingFile = path.resolve(settings.app_dir,settings.dataMapping);
  if (fs.existsSync(mappingFile) &&
      fs.readFileSync(mappingFile).length > 0 &&
      Object.keys(require(mappingFile)).length > 0
  ) {
      mapping = require(mappingFile);
      mapping = polyfillMapping(mapping);
      mappingCallback(mapping);
  }
}

function getIndexFiles(settings, indexCallback) {
  console.log('dirname now', __dirname);
  var analyzer = path.resolve(__dirname, 'builtinAnalyzers.json');
  console.log('analyzer path', analyzer);
  var analyzers = require(analyzer);
  if ((settings.extraAnalyzers !== undefined) && (settings.extraAnalyzers !== '')){
    var settingsAnalyzers = require(path.resolve(settings.app_dir,settings.extraAnalyzers));
    analyzers = extend(analyzers, settingsAnalyzers);
  }

  var filters = require(path.resolve(__dirname, 'builtinFilters.json'));
  if ((settings.filterAnalyzers !== undefined) && (settings.filterAnalyzers.length !== 0)){
    var settingsFilters = require(path.resolve(settings.app_dir,settings.filterAnalyzers));
    filters = extend(filters, settingsFilters);
  }

  settings.callback = indexCallback;
  getMapping(settings, function(mapping) {
      var elastic = require('nconf').get()['elastic'];
      var mappings = {
        'settings': {
            'mapping.ignore_malformed': true,
            'index':{'max_shingle_diff':12},
            'analysis': {
                'analyzer': analyzers,
                'filter': filters
            }
        }
        ,
        'mappings': {
        }
      };
      mappings.mappings[elastic.type] = {'properties': mapping};
//      var filtersQuery = null;
//      if (settings.indexingFilterQuery !== null){
//        filtersQuery = fs.readFileSync(path.resolve(settings.app_dir, settings.indexingFilterQuery), 'utf8');
//      }

      var config = {
//        filtersQuery: filtersQuery,
//        queryTemplate: fs.readFileSync(path.resolve(settings.app_dir,settings.indexingQuery), 'utf8'),
        analyzers: mappings,
        endpoint: settings.endpoint
      };
      indexCallback(config);
  });
}

function getOptions() {
    var nconf = require('nconf');
    var elastic = nconf.get()['elastic'];
    return {
        'es_host': elastic.host + ':' + elastic.port + elastic.path,
        'auth': elastic.rwuser + ':' + elastic.rwpass,
        'encoded_auth': encodeURIComponent(elastic.rwuser) + ':' + encodeURIComponent(elastic.rwpass)
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
};

function removeData(settings) {
    var esAPI = require('eea-searchserver').esAPI;
    var elastic = require('nconf').get()['elastic'];

    new esAPI(getOptions())
        .DELETE(elastic.index + "_blue", callback('Deleting index! (if it exists)'))
        .execute();

    new esAPI(getOptions())
        .DELETE(elastic.index + "_green", callback('Deleting index! (if it exists)'))
        .execute();
}

function createIndex(settings) {
    getIndexFiles(settings, function(config) {
      var esAPI = require('eea-searchserver').esAPI;
      var nconf = require('nconf');
      var elastic = nconf.get()['elastic'];
      elastic.real_index = elastic.index + "_blue";
      var indexFile = nconf.get()['indexFile'];
      indexFile.file = path.join(settings.config_dir, indexFile.file);
      new esAPI(getOptions())
            .testAnalyzers(config.analyzers, function(success){
                if (success){
                    new esAPI(getOptions())
                        .indexFromFile(indexFile, config.analyzers);
                }
      })
    });
}


function showHelp() {
    console.log('List of available commands:');
    console.log(' runserver: Run the app web server');
    console.log('');
    console.log(' create_index: Setup Elastic index and trigger indexing');
    console.log('');
    console.log(' remove_data: Remove the ES index of this application');
    console.log('');
    console.log(' help: Show this menu');
    console.log('');
}

module.exports = { 
    'remove_data': removeData,
    'create_index': createIndex,
    'help': showHelp
};

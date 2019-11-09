const index_helpers = require('eea-searchserver').indexHelpers;
const esAPI = require('eea-searchserver').esAPI;
const readerCSV = require('eea-searchserver').readerCSV;
const readerJSON = require('eea-searchserver').readerJSON;
const path = require('path');
const fs = require("fs");
const nconf = require('nconf');
const _ = require('underscore');

get_conf = function(){
    console.log(require('nconf').get());
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

const get_mapping = async(settings) => {
    var mapping = {};
    var mappingFile = path.resolve(settings.app_dir,settings.dataMapping);
    if (fs.existsSync(mappingFile) &&
        fs.readFileSync(mappingFile).length > 0 &&
        Object.keys(require(mappingFile)).length > 0
    ) {
        mapping = require(mappingFile);
        mapping = polyfillMapping(mapping);
        return Promise.resolve(mapping);
    }
}

const get_index_files = async(settings) => {
    console.log('dirname now', __dirname);
    var analyzer = path.resolve(__dirname, 'builtinAnalyzers.json');
    console.log('analyzer path', analyzer);
    var analyzers = require(analyzer);
    if ((settings.extraAnalyzers !== undefined) && (settings.extraAnalyzers !== '')){
        var settingsAnalyzers = require(path.resolve(settings.app_dir,settings.extraAnalyzers));
        analyzers = _.extend(analyzers, settingsAnalyzers);
    }

    var filters = require(path.resolve(__dirname, 'builtinFilters.json'));
    if ((settings.filterAnalyzers !== undefined) && (settings.filterAnalyzers.length !== 0)){
        var settingsFilters = require(path.resolve(settings.app_dir,settings.filterAnalyzers));
        filters = _.extend(filters, settingsFilters);
    }
    const mapping = await get_mapping(settings);
    var elastic = require('nconf').get()['elastic'];
    var mappings = {
        'settings': {
            'mapping.ignore_malformed': true,
            'index':{'max_shingle_diff':12},
            'analysis': {
                'analyzer': analyzers,
                'filter': filters
            }
        },
        'mappings': {
        }
    };
    mappings.mappings[elastic.type] = {'properties': mapping};

    var config = {
        analyzers: mappings,
        endpoint: settings.endpoint
    };
    return Promise.resolve(config);
}


remove_data = function(){

}

remove_river = function(){

}

const create_index = async(settings) => {
    const analyzers = await get_index_files(settings);
    const analyzer_status = await index_helpers.test_analyzers(analyzers.analyzers);
    if (analyzer_status){
        await index_helpers.create_empty_index(analyzers.analyzers);
        const data_source = nconf.get()['source'];
        let data_reader = undefined;
        if (data_source.type.toLowerCase() === 'file'){
            data_source.configuration.file = path.join(settings.config_dir, data_source.configuration.file);
            if (['csv', 'tsv'].indexOf(data_source.configuration.type.toLowerCase()) > -1){
                data_reader = new readerCSV(data_source.configuration);
            }
            if (data_source.configuration.type.toLowerCase() === 'json'){
                data_reader = new readerJSON(data_source.configuration);
            }
        }
        while(true){
            const data = await data_reader.read_bulk();
            await index_helpers.index_bulk(data.rows_str, data.counter - data.bulk_counter);
            if (data.bulk_counter < data_source.configuration.bulk_size){
                break;
            }
        }
        await index_helpers.remove_old_indices();

        console.log("done");

    }
}

sync_index = function(){

}

show_help = function(){
    console.log('List of available commands:');
    console.log(' runserver: Run the app web server');
    console.log('');
    common_commands.forEach(function(command){
        console.log(' ' + command.command + ': ' + command.text);
        console.log('');
    })
}

common_commands = [
    {
        command: 'create_index',
        text: 'Setup Elastic index and trigger indexing',
        fct: create_index
    },
    {
        command: 'remove_data',
        text: 'Remove the ES index of this application',
        fct: remove_data
    },
    {
        command: 'help',
        text: 'Show this menu',
        fct: show_help
    }
]


get_commands = function(){
    let commands = {}
    common_commands.forEach(function(command){
        commands[command.command] = command.fct
    })
    return commands;
}

module.exports = get_commands();
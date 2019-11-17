const path = require('path');
const fs = require("fs");
const nconf = require('nconf');
const _ = require('underscore');
const detectCharacterEncoding = require('detect-character-encoding');
const AutoDetectDecoderStream = require('autodetect-decoder-stream');

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

const api_healtchcheck = async(settings) => {
    const idx_helpers = require('eea-searchserver').indexHelpers;
    const status = await idx_helpers.test_elastic();
    status.app = 'ok';
    settings.API_callback(status)
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

const create_index = async(settings) => {
    const elastic = require('nconf').get()['elastic'];
    const index_helpers = require('eea-searchserver').indexHelpers;
    const streamConsumer = require('eea-searchserver').streamConsumer;
    const sparqlConsumer = require('eea-searchserver').sparqlConsumer;

    const analyzers = await get_index_files(settings);
    const analyzer_status = await index_helpers.test_analyzers(analyzers.analyzers);
    if (analyzer_status){
        const indexName = await index_helpers.create_empty_index(analyzers.analyzers);
        if (settings.API_callback !== undefined){
            settings.API_callback({'status': 'Indexing triggered', 'index':indexName})
        }
        console.log({'status': 'Indexing triggered', 'index':indexName});

        const data_source = nconf.get()['source'];
        let multiparts = [];
        let data_reader = undefined;

        let input_stream = undefined;

        if (data_source.configuration.type === undefined){
            data_source.configuration.type = data_source.type;
        }
        if (data_source.type.toLowerCase() === 'file'){

            let encoding = data_source.configuration.encoding;

            const source_file = path.join(settings.config_dir, data_source.configuration.file);


            if (encoding === undefined){
                const fileBuffer = fs.readFileSync(source_file);
                const charsetMatch = detectCharacterEncoding(fileBuffer);
                encoding = charsetMatch.encoding;
            }

            input_stream = fs.createReadStream(source_file, encoding)
        }

        if (data_source.type.toLowerCase() === 'url'){
            let encoding = data_source.configuration.encoding;

            const request = require('request');

            input_stream = request({
                    uri:data_source.configuration.url
                })
                .pipe(new AutoDetectDecoderStream({ defaultEncoding: encoding }));
        }


        if (['csv', 'tsv'].indexOf(data_source.configuration.type.toLowerCase()) > -1){
            const CsvReadableStream = require('csv-reader');

            data_source.configuration.decorator = function(dec_options){
                    if ((dec_options.counter === 0) && (!dec_options.processed_first_row)){
                        return {'should_index': false, 'fields': dec_options.row, 'processed_first_row': true};
                    }
                    return {'should_index': true};
                }

            data_source.configuration.stream = input_stream
                        .pipe(CsvReadableStream({ parseNumbers: true, parseBooleans: true, trim: true , delimiter: data_source.configuration.delimiter}));

        }
        if (data_source.configuration.type.toLowerCase() === 'json'){
            const JSONStream = require('JSONStream')

            data_source.configuration.decorator = function(dec_options){
                    let keys = Object.keys(dec_options.row);
                    for (let i = 0; i < keys.length; i++){
                        if (dec_options.normalized_keys[keys[i]] === undefined){
                            dec_options.normalized_keys[keys[i]] = keys[i].replace(/[\W_]+?/g,"_");
                        }
                        dec_options.toindex[dec_options.normalized_keys[keys[i]]] = dec_options.row[keys[i]];
                    }

                    return{'should_index': true, 'normalized_keys': dec_options.normalized_keys, 'toindex': dec_options.toindex}
                }
            data_source.configuration.stream = input_stream
                        .pipe(JSONStream.parse(data_source.configuration.data_path));

        }

        if (['file', 'url'].indexOf(data_source.type) > -1){
            data_reader = new streamConsumer(data_source.configuration);
        }

        if (data_source.type === 'sparql'){
            if (settings.indexingFilterQuery){
                const fs = require("fs");
                const path = require('path');
                const query = fs.readFileSync(path.resolve(settings.app_dir, settings.indexingFilterQuery), 'utf8');

                const filters_results = await sparqlConsumer.execute_query(data_source.configuration.endpoint, query)

                for (let i = 0; i < filters_results.results.bindings.length; i++){
                    let part = [];
                    for (let j = 0; j < filters_results.head.vars.length; j++){
                        part.push({
                            key: filters_results.head.vars[j],
                            value: filters_results.results.bindings[i][filters_results.head.vars[j]].value
                        })
                    }
                    multiparts.push(part);
                }

            }

            data_source.configuration.elastic = elastic;
            data_source.configuration.settings = settings;
            data_source.configuration.analyzers = analyzers;
        }

        let has_more_parts = true;
        let total_counter = 0;
        let multiparts_counter = 0;
        const multiparts_length = multiparts.length;
        while(true){
            if (multiparts.length > 0){
                console.log("Execute query " + multiparts_counter + " of " + multiparts_length);
                multiparts_counter++;
                data_source.configuration.part = multiparts.pop();
            }

            if (data_source.configuration.type.toLowerCase() === 'sparql'){
                data_reader = new sparqlConsumer.consumer(data_source.configuration);
            }

            while(true){
                const data = await data_reader.read_bulk();
                total_counter += data.bulk_counter;
                if (data.has_elements){
                    await index_helpers.index_bulk(data.rows_str, total_counter - data.bulk_counter, data.counter - data.bulk_counter, data.counter);
                }
                if (data.is_last_bulk){
                    break;
                }
            }
            console.log("TOTAL INDEXED: " + (total_counter));
            if (['file', 'url'].indexOf(data_source.type) > -1){
                has_more_parts = false;
            }
            if (multiparts.length === 0){
                has_more_parts = false;
            }
            if (!has_more_parts){
                break;
            }
        }
        await index_helpers.remove_old_indices();

        console.log("Indexing finished");

    }
}

const api_switch = async(settings) => {
    const index_helpers = require('eea-searchserver').indexHelpers;
    await index_helpers.switch_prod_alias(settings);
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

remove_data = function(){
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
    },
    {
        command: 'healthcheck',
        text: 'Check the healtch of the app',
        fct: api_healtchcheck
    },
    {
        command: 'api_switch',
        text: 'Move production alias to latest index',
        fct: api_switch
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
const path = require('path');
const fs = require("fs");
const nconf = require('nconf');
const _ = require('underscore');
const detectCharacterEncoding = require('detect-character-encoding');
const AutoDetectDecoderStream = require('autodetect-decoder-stream');
const sleep = require('sleep-promise');

function secondstohuman(sec_num){
    let hours  = Math.floor(sec_num / 3600);
    let minutes = Math.floor((sec_num - (hours * 3600)) / 60);
    let seconds = sec_num - (hours * 3600) - (minutes * 60);

    if (hours   < 10) {hours   = "0"+hours;}
    if (minutes < 10) {minutes = "0"+minutes;}
    if (seconds < 10) {seconds = "0"+seconds;}
    return hours+':'+minutes+':'+seconds;
}
function deltatohuman(from, to){
    const sec_num = parseInt((Math.abs(to - from)) / 1000, 10);
    return secondstohuman(sec_num);
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

const api_healthcheck = async(settings) => {
    const idx_helpers = require('eea-searchserver').indexHelpers;
    const status = await idx_helpers.test_elastic();
    status.app = 'ok';
    if (status.elastic !== 'ok'){
        status.rsp_code = 500;
    }
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
//debugger;
    let reindex_clusters = false;

    if (settings.clusters !== undefined){
        reindex_clusters = true;
        if (!Array.isArray(settings.clusters)){
            settings.clusters = [settings.clusters];
        }
    }

    const dateFormat = require('dateformat');

    const elastic = require('nconf').get()['elastic'];
    const index_helpers = require('eea-searchserver').indexHelpers;

    let tmp_data_source = nconf.get()['source'];

    if (tmp_data_source.type === 'rdfriver'){
        const already_indexing = await index_helpers.test_index_from_river_in_progress()
        if (already_indexing){
            if (settings.API_callback !== undefined){
                settings.API_callback({'status': 'Indexing already in progress'})
            }
            console.log({'status': 'Indexing already in progress'});
            return
        }
    }

    const streamConsumer = require('eea-searchserver').streamConsumer;
    const sparqlConsumer = require('eea-searchserver').sparqlConsumer;
    const sparqlHelpers = require('eea-searchserver').sparqlHelpers;
    const rdfriver = require('eea-searchserver').rdfriver;
    const analyzers = await get_index_files(settings);
    const analyzer_status = await index_helpers.test_analyzers(analyzers.analyzers);
    if (analyzer_status){
        let idx_create_options = {
            analyzers: analyzers.analyzers
        }
        if (tmp_data_source.type === 'rdfriver'){
            idx_create_options.rivers = true
        }
        const indexName = await index_helpers.create_empty_index(idx_create_options);

        if (settings.API_callback !== undefined){
            settings.API_callback({'status': 'Indexing triggered', 'index':indexName})
        }
        console.log({'status': 'Indexing triggered', 'index':indexName});

        await index_helpers.set_status({status:'indexing', indexing_started_at:new Date(), index_name: indexName})

        let data_source = _.extend({}, tmp_data_source);
        let data_sourceconf = nconf.get()['sourceconf'];
        if (data_sourceconf !== undefined){
            data_source.configuration = _.extend(data_source.configuration, data_sourceconf);
        }
        // sometimes attributes of data_source is restored to the values from settings.json, so we save the values in different attributes
        data_source.configuration._bulksize = data_source.configuration.bulksize;
        data_source.configuration._url = data_source.configuration.url;
        data_source.configuration._counturl = data_source.configuration.counturl;

        let multiparts = [];
        let data_reader = undefined;

        let input_stream = undefined;

        let req = undefined;

        if (data_source.configuration.type === undefined){
            data_source.configuration.type = data_source.type;
        }
        let force_update_from_url = false;
        if (data_source.type.toLowerCase() === 'file'){
            if (settings.update_from_url !== undefined){
                force_update_from_url = true;
            }
            else {
                let status = await index_helpers.get_status();
                status.source = {'file':data_source.configuration.file};
                await index_helpers.set_status(status);

                let encoding = data_source.configuration.encoding;

                const source_file = path.join(settings.config_dir, data_source.configuration.file);


                if (encoding === undefined){
                    const fileBuffer = fs.readFileSync(source_file);
                    const charsetMatch = detectCharacterEncoding(fileBuffer);
                    encoding = charsetMatch.encoding;
                }

                input_stream = fs.createReadStream(source_file, encoding)
                req = input_stream;
            }
        }

        if ((data_source.type.toLowerCase() === 'url') || (force_update_from_url)){
            let status = await index_helpers.get_status();

            let url_to_index = data_source.configuration._url;
            let count_url = data_source.configuration._counturl
            if (settings.update_from_url !== undefined){
                url_to_index = settings.update_from_url;
            }
            status.source = {'url':url_to_index};
            await index_helpers.set_status(status);
            let encoding = data_source.configuration.encoding;

            const request = require('request');

            url_to_index = decodeURIComponent(url_to_index);

            req = request({
                    uri:url_to_index
                })
            input_stream = req.pipe(new AutoDetectDecoderStream({ defaultEncoding: encoding }));

            if ((count_url !== undefined) && (settings.update_from_url === undefined)){
                let count_data = '';
                count_url = decodeURIComponent(count_url);
                const count_req = request({
                    uri:count_url
                })
                .on('data',function(chunk){
                    count_data += chunk
                })
                .on('end', async() => {
                    const data_to_read = JSON.parse(count_data).results[0].total
                    let status = await index_helpers.get_status();
                    status.nr_of_docs_to_index = data_to_read;
                    await index_helpers.set_status(status);
                })
            }
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
        let indexing_cancelled = true;
        if (data_source.type === 'rdfriver'){
            if (!data_source.configuration.fullreindex){
                await index_helpers.reindex()
            }
            //remove missing from elastic

            const rivers = require('eea-searchserver').rivers;
            const river_options = {
                clusters : settings.clusters,
                river_configs : data_source.configuration.river_configs,
                config_dir : settings.config_dir
            };
            let rivers_from_config = await rivers.get_rivers_from_files(river_options);

            const all_river_options = {
                river_configs : data_source.configuration.river_configs,
                config_dir : settings.config_dir
            };
            let all_rivers_from_config = await rivers.get_rivers_from_files(all_river_options);

            if (!data_source.configuration.fullreindex) {
                if (!reindex_clusters){
                    const docs_in_semantic = await sparqlHelpers.get_docs_from_semantic(data_source.configuration.endpoint, all_rivers_from_config);
                    console.log("Number of documents in semantic: " + docs_in_semantic.length);
                    await sleep(10000)
                    const docs_in_elastic = await index_helpers.get_docs_from_index();
                    console.log("Number of documents in elastic: " + docs_in_elastic.length);

                    console.log("Delete documents from elastic that were removed already from semantic")
                    for (let i = 0; i < docs_in_elastic.length; i++){
                        if (docs_in_semantic.indexOf(docs_in_elastic[i]) === -1){
                            await index_helpers.delete_doc(docs_in_elastic[i])
                        }
                    }
                }
            }
            let start_times = {};
            if (!reindex_clusters){
                start_times = await index_helpers.get_rivers_start_times();
            }
            else {
                console.log("Delete data from clusters: ", settings.clusters)
                await sleep(10000)
                await index_helpers.delete_clusters(settings.clusters);
            }
            for (let i = 0; i < rivers_from_config.length; i++){
                let river = rivers_from_config[i];
                let updated_at = start_times[river.cluster_id];
                if (updated_at !== undefined){
                    updated_at = dateFormat(updated_at * 1000, "yyyy-mm-dd'T'HH:MM:ss");
                }
                river.enable_values_counting = elastic.enableValuesCounting;
                const indexing_start_time = Math.floor(Date.now() / 1000)

                await rdfriver.index_river({endpoint:data_source.configuration.endpoint, river:river, start_time: updated_at}, 30)
                await index_helpers.set_river_start_time(river.cluster_id, indexing_start_time);
            }
            console.log("Finished all rivers")
        }
        else {
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
                        indexing_cancelled = await index_helpers.test_interrupt(indexName)
                        if (!indexing_cancelled){
                            if ((data.column_names !== undefined) && (data.column_names.length > 0)){
                                let tmp_stats = await index_helpers.get_status();
                                tmp_stats.columns = data.column_names;
                                await index_helpers.set_status(tmp_stats);
                            }
                            await index_helpers.index_bulk(data.rows_str, total_counter - data.bulk_counter, data.counter - data.bulk_counter, data.counter);
                        }
                        else {
                            break;
                        }

                    }
                    indexing_cancelled = await index_helpers.test_interrupt(indexName)
                    if (data.is_last_bulk){
                        break;
                    }
                    if (indexing_cancelled){
                        break;
                    }
                }
                if (indexing_cancelled){
                    break;
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
        }
        indexing_cancelled = await index_helpers.test_interrupt(indexName)

        if (data_source.type === 'rdfriver'){
//            await index_helpers.wait_until_finished();
//            await index_helpers.set_rivers_start_times(settings.clusters, indexing_start_time);
            console.log("INDEXING WITH RIVER FINISHED")
        }
        if (indexing_cancelled){
            if (req) {
                if (req.abort !== undefined){
                    req.abort()
                }
                else if (req.close !== undefined){
                    req.close()
                }
            }
            console.log("Indexing to index " + indexName + " interrupted");
        }
        else {
            await index_helpers.remove_old_indices();
            let status = await index_helpers.get_status();
            status.status = 'finished';
            status.indexing_finished_at = new Date();

            const start_timestamp = new Date(status.indexing_started_at);
            status.indexing_total_time = deltatohuman(start_timestamp, status.indexing_finished_at)

            status.indexing_total_time_in_seconds = parseInt(Math.abs(start_timestamp - status.indexing_finished_at)/1000)
            await index_helpers.set_status(status)
            console.log("Indexing finished");
            if (data_source.autoswitch){
                console.log("Automatically switching prod alias")
                delete(settings.API_callback);
                await index_helpers.switch_prod_alias(settings);
            }
        }
    }
    else {
        console.log("Problems while testing the analyzers")
        if (settings.API_callback){
            settings.API_callback("Problems while testing the analyzers");
        }
    }
}

const api_switch = async(settings) => {
    const index_helpers = require('eea-searchserver').indexHelpers;
    await index_helpers.switch_prod_alias(settings);
}


const api_status = async(settings) => {
    const index_helpers = require('eea-searchserver').indexHelpers;
    let status = {}
    status.latest_index_info = await index_helpers.get_status("latest");

    if ((status.latest_index_info === undefined) || (status.latest_index_info === false)){
        status = {error: "Can't find status index"}
    }
    else {
        const current_date = new Date();
        let elapsed_time_in_seconds = 0;

        if (status.latest_index_info.status === 'indexing'){
            const last_timestamp = new Date(status.latest_index_info.timestamp);
            status.latest_index_info.elapsed_time_since_last_status_change = deltatohuman(last_timestamp, current_date);
            const start_timestamp = new Date(status.latest_index_info.indexing_started_at);
            status.latest_index_info.elapsed_time_since_indexing_started = deltatohuman(start_timestamp, current_date);
            elapsed_time_in_seconds = parseInt((Math.abs(start_timestamp - current_date)) / 1000, 10);
        }

        const prod_stats = await index_helpers.get_status("prod");

        status.production_index_info = prod_stats;
        const index_stats = await index_helpers.get_index_stats();
        const latest_count = index_stats.body.indices[status.latest_index_info.index_name].primaries.docs.count;
        try{
            const prod_count = index_stats.body.indices[status.latest_index_info.index_name].primaries.docs.count;
            status.latest_index_info.docs = latest_count;
        }
        catch(err){
            status.latest_index_info.docs = "can't read nr. of documents";
        }
        try{
            const prod_count = index_stats.body.indices[status.production_index_info.index_name].primaries.docs.count;
            status.production_index_info.docs = prod_count;
        }
        catch(err){
            if (status.production_index_info !== undefined){
                status.production_index_info.docs = "can't read nr. of documents";
            }
        }

        if (status.latest_index_info.status === 'indexing'){
            status.latest_index_info['ETA(seconds)'] = null
            status.latest_index_info['ETA'] = null
            if (status.latest_index_info.docs !== 0){
                let total_count = 0;
                if (status.latest_index_info.nr_of_docs_to_index !== undefined){
                    total_count = status.latest_index_info.nr_of_docs_to_index;
                }
                else {
                    if (status.production_index_info !== undefined){
                        total_count = status.production_index_info.docs
                    }
                }
                if (total_count !== 0){
                    status.latest_index_info['ETA(seconds)'] = parseInt((total_count - status.latest_index_info.docs) / status.latest_index_info.docs * elapsed_time_in_seconds)
                    status.latest_index_info['ETA'] = secondstohuman(status.latest_index_info['ETA(seconds)'])
                }
            }
        }

        if ((status.production_index_info !== undefined) &&
            (status.production_index_info.columns !== undefined) &&
            (status.latest_index_info !== undefined) &&
            (status.latest_index_info.columns !== undefined)){
            let extra_columns = [];
            for (let i = 0; i < status.latest_index_info.columns.length; i++){
                if (status.production_index_info.columns.indexOf(status.latest_index_info.columns[i]) === -1){
                    extra_columns.push(status.latest_index_info.columns[i]);
                }
            }
            status.latest_index_info.extra_columns_compared_to_production = extra_columns.sort();
            let missing_columns = [];
            for (let i = 0; i < status.production_index_info.columns.length; i++){
                if (status.latest_index_info.columns.indexOf(status.production_index_info.columns[i]) === -1){
                    missing_columns.push(status.production_index_info.columns[i]);
                }
            }
            status.latest_index_info.missing_columns_compared_to_production = missing_columns.sort();
        }

//        status.index_stats = index_stats;
        let data_source = nconf.get()['source'];
        if (data_source.type === 'rdfriver'){
            const prod_clusters = await index_helpers.get_cluster_status("prod")
            const latest_clusters = await index_helpers.get_cluster_status("latest")
            const rivers_waiting = await index_helpers.get_rivers_waiting()
            let currently_indexing = ""
            let clean_rivers_waiting = [];
            rivers_waiting.forEach(function(river){
                if (latest_clusters[river] !== undefined){
                    currently_indexing = river;
                }
                else {
                    clean_rivers_waiting.push(river);
                }
            });

            if (status.production_index_info !== undefined){
                status.production_index_info.cluster_status = {}
                status.production_index_info.cluster_status.indexed = prod_clusters;
            }
            if (status.latest_index_info !== undefined){
                status.latest_index_info.cluster_status = {}
                status.latest_index_info.cluster_status.queue = clean_rivers_waiting;
                status.latest_index_info.cluster_status.in_progress = {}
                status.latest_index_info.cluster_status.in_progress[currently_indexing] = latest_clusters[currently_indexing];
                delete(latest_clusters[currently_indexing]);
                status.latest_index_info.cluster_status.indexed = latest_clusters;
            }
        }


    }
    if (settings.API_callback !== undefined){
        settings.API_callback(status);
    }
    else {
        console.log(status);
    }
}

const cancel_update = async(settings) => {
    const index_helpers = require('eea-searchserver').indexHelpers;
    let status = {};
    let message = '';
    status = await index_helpers.get_status("latest");
    if ((status !== undefined) && (status.status === 'indexing')){
        status.status = 'cancelled';
        await index_helpers.set_status(status);
        message = {'status': 'Indexing cancelled'};
    }
    else {
        message = {'status':'No indexing in progress'};
    }
    console.log(message);
    if (settings.API_callback !== undefined){
        settings.API_callback(message);
    }
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

remove_data = async() => {
    const index_helpers = require('eea-searchserver').indexHelpers;
    await index_helpers.remove_data();
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
        fct: api_healthcheck
    },
    {
        command: 'api_switch',
        text: 'Move production alias to latest index',
        fct: api_switch
    },
    {
        command: 'api_status',
        text: 'Get status of indices',
        fct: api_status
    },
    {
        command: 'api_update_from_url',
        text: 'Update data from a different url',
        fct: create_index
    },
    {
        command: 'cancel_update',
        text: 'Cancel the running update',
        fct: cancel_update
    },
    {
        command: 'reindex_cluster',
        text: 'Reindex only specified clusters',
        fct: create_index
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

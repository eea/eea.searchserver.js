var dateFormat = require('dateformat');
var path = require('path');
var cache = require('eea-searchserver').util.cache;
var util = require('util');
var _ = require('underscore');

var RIVER_INDEX = "eeariver";

function getOptions() {
    var nconf = require('nconf');
    var elastic = nconf.get()['elastic'];

    return {
        'es_host': elastic.host + ':' + elastic.port + elastic.path,
        'auth': elastic.rwuser + ':' + elastic.rwpass
    };
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

function getIndexFiles(settings, elastic, riverconfig, cluster_id, cluster_name) {
    var analyzer = path.resolve(__dirname, 'builtinAnalyzers.json');
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
    var datamappings = {};
    datamappings = require(path.join(settings.app_dir, settings.dataMapping));
    datamappings = polyfillMapping(JSON.parse(JSON.stringify(datamappings)));
    var mappings = {
        'settings': {
            'analysis': {
                'filter': filters,
                'analyzer': analyzers
            }
        },
        'mappings': {
            'resource': {
                'properties': datamappings
            }
        }
    };

    if ((cluster_id !== undefined) && (cluster_id !== "")) {
        riverconfig.proplist.push("cluster_id");
        riverconfig.normMissing["cluster_id"] = cluster_id;
    }
    if ((cluster_name !== undefined) && (cluster_name !== "")) {
        riverconfig.proplist.push("cluster_name");
        riverconfig.normMissing["cluster_name"] = cluster_name;
    }
    if (riverconfig.graphSyncConditions === undefined) {
        riverconfig.graphSyncConditions = [];
    }
    return {
        analyzers: mappings,
        syncReq: {
            'type': 'eeaRDF',
            'eeaRDF': {
                'endpoint': settings.endpoint,
                'indexType': 'sync',
                'syncConditions': riverconfig.syncConditions.join(''),
                'graphSyncConditions': riverconfig.graphSyncConditions.join(''),
                'syncTimeProp': riverconfig.syncTimeProp,
                'startTime': '',
                'queryType': riverconfig.queryType,
                'proplist': riverconfig.proplist,
                'listtype': riverconfig.listtype,
                'normProp': riverconfig.normProp,
                'normMissing': riverconfig.normMissing,
                'blackMap': riverconfig.blackMap,
                'whiteMap': riverconfig.whiteMap,
                'normObj': riverconfig.normObj,
                'syncOldData': true,
                'addCounting': elastic.enableValuesCounting
            },
            'index': {
                'index': elastic.index + "_blue",
                'type': elastic.type,
            }
        }
    }
}

var callback = function(text, cb) {
    return function(err, statusCode, header, body) {
        //console.log(text);
        if (err) {
            console.log(err.message);
            if(cb) cb(err, null);
        }
        else {
            if(statusCode === 400){
                //debugger;
            }

            console.log('  Successfuly ran query');
            console.log('  ResponseCode: ' + statusCode);
            console.log('  ' + body);
            if(cb) cb(null, body);
        }
    };
};

function removeRiver() {
    var esAPI = require('eea-searchserver').esAPI;
    var river_configs = require('nconf').get()['river_configs'];
    var esQuery = new esAPI(getOptions());
    for (var i = 0; i < river_configs.configs.length; i++) {
        var river_name = RIVER_INDEX + "/" + "river/" + river_configs.configs[i].id;
        esQuery
            .DELETE(river_name, callback('Deleting river! (if it exists): '  + river_name));
    }
    esQuery.execute();
}

function removeData(settings) {
    var esAPI = require('eea-searchserver').esAPI;
    var elastic = require('nconf').get()['elastic'];
    new esAPI(getOptions())
        .DELETE( elastic.index, callback('Deleting index! (if it exists)'))
        .DELETE( elastic.index + "_blue", callback(''))
        .DELETE( elastic.index + "_green", callback(''))
        .execute();

    new esAPI(getOptions())
        .DELETE( elastic.index + "_status", callback('Deleting status index! (if it exists)'))
        .DELETE( elastic.index + "_blue_status", callback(''))
        .DELETE( elastic.index + "_green_status", callback(''))
        .execute();

    new esAPI(getOptions())
        .DELETE( elastic.index + "_cache" , callback('Deleting cache index! (if it exists)'))
        .execute();
}

function getAuth(user){
    var nconf = require('nconf');
    var elastic = nconf.get()['elastic'];
    var esuser = 'rouser';
    var espass = 'ropass';
    if (user === 'rw'){
        esuser = 'rwuser';
        espass = 'rwpass';
    }
    if ((elastic[esuser] !== undefined) && (elastic[esuser] !== undefined) && (elastic[esuser] !== '')){
        return elastic[esuser] + ":" + elastic[espass] + "@";
    }
    return "";
}

function checkIfIndexing(settings, clusters) {
    var request = require('sync-request');
    var esAPI = require('eea-searchserver').esAPI;
    var elastic = require('nconf').get()['elastic'];

    var rivers = 'http://' + getAuth('rw') +  elastic.host + ':' + elastic.port + elastic.path + RIVER_INDEX + '/_search';

    var qs = {
        "query": {
            "bool": {
                "must": [{
                    "term": {
                        "index.index": elastic.index
                    }
                }]
            }
        }
    };
    var river_count = 0;

    try {
        var res = request('GET', rivers, {
            q: qs,
        });
        var res_json = JSON.parse(res.getBody('utf8'));
        river_count = res_json.hits.total;
    }
    catch (e) {
        console.log("Couldn't get the number of rivers");
    }
    if (river_count !== 0) {
        return true;
    }
    return false;
}

function getLastUpdateDate(elastic, cb){
    //TODO : update to using status index 
    var request = require('sync-request');
    var indexed_url = 'http://' + getAuth('rw') + elastic.host + ':' + elastic.port + elastic.path +  elastic.index + '_status/last_update/_search';
    var http = require('http');

    var es_options = getOptions();
    //TODO: move in a async request
    var options = {
        host: elastic.host,
        path: elastic.index + '_status/last_update/_search',
        method: "GET",
        auth: es_options.auth,
        port: elastic.port
    };

    var req = http.request(options, function(res) {
        res.setEncoding('utf8');
        var body = '';
        res.on('data', function (chunk) {
            body += chunk;
        });
        res.on('end', function() {
            var res_json = JSON.parse(body);

            if(res_json.hits !== undefined){
                    var r = res_json.hits.hits.reduce(function(acc, cur){
                        if(cur._source === undefined) {
                            return acc;
                        }
                        if(acc._source !== undefined){
                            return Math.min( acc._source.updated_at, cur._source.updated_at );
                        } else {
                            return Math.min( acc, cur._source.updated_at );
                        }
                    });
                    cb( r );
            } else {
                cb(-1);
            }
        });
    });

    req.on('error', function(e){
        cb( -1);
        console.log("problem with request: " + e.message);
    });

    req.setHeader("Content-Type", "application/json");

    req.write('{ "query" :  {"match_all" : {} } }');
    req.end();
}

function readRiverConfig(location, fileName){
    var deepExtend = require('deep-extend');
    var tmp_config = JSON.parse(JSON.stringify(require(path.join(location, fileName))));

    if (tmp_config['extend'] !== undefined){
        var parent_config = readRiverConfig(location, tmp_config['extend']);
        deepExtend(parent_config, tmp_config);
        tmp_config = parent_config;
    }

    Object.keys(tmp_config).forEach(function(key){
        if ((!key.endsWith("_add")) && (tmp_config[key + "_add"] !== undefined)){
            tmp_config[key] = tmp_config[key].concat(tmp_config[key + "_add"]);
        }
    });

    return tmp_config;
}


function testMapping(settings, elastic,use_default_startTime,default_startTime,startTimeJson,clusters){
    var esAPI = require('eea-searchserver').esAPI;
    var river_configs = require('nconf').get()['river_configs'];
    var cluster_id = river_configs.configs[0].id;
    var riverconfig = readRiverConfig(settings.config_dir, river_configs.configs[0].config_file);
    var config = getIndexFiles(settings, elastic, riverconfig, cluster_id, river_configs.configs[0].cluster_name);

    new esAPI(getOptions())
        .testAnalyzers(config.analyzers, function(success){
            if (success){
                startCreatingRiverClusters(settings, elastic,use_default_startTime,default_startTime,startTimeJson,clusters)
            }});
}

function startCreatingRiverClusters(settings, elastic,use_default_startTime,default_startTime,startTimeJson,clusters){
    var esAPI = require('eea-searchserver').esAPI;
    var river_configs = require('nconf').get()['river_configs'];
    var esQuery = new esAPI(getOptions());
    var river_creation_date = Math.round( Date.now() /1000);
    var river_last_update = {};

    // create eeariver index before adding them
    esQuery.PUT(RIVER_INDEX, {} , callback('Creating river index'));

    var firstConfig = null;

    for (var i = 0; i < river_configs.configs.length; i++) {
        var cluster_id = river_configs.configs[i].id;
        var riverconfig = readRiverConfig(settings.config_dir, river_configs.configs[i].config_file);

        var config = getIndexFiles(settings, elastic, riverconfig, cluster_id, river_configs.configs[i].cluster_name);
        config.syncReq.eeaRDF.startTime = default_startTime;

        var shouldAdd = false;
        if (clusters === null){
            shouldAdd = true;
        }
        if ( clusters != null && clusters.indexOf(cluster_id) >= 0) {
            shouldAdd = true;
            if (deleteClusterData(elastic,cluster_id) != 0 ) {
                //Exiting, error on deleting from index
                return;
            }
        } else {
            if (!use_default_startTime && startTimeJson[cluster_id]) {

                var updated_date = new Date(startTimeJson[cluster_id]);
                config.syncReq.eeaRDF.startTime = dateFormat(updated_date, "yyyy-mm-dd'T'HH:MM:ss");
            }
        }

        if (shouldAdd){
            console.log('***Setting startTime for cluster ' + cluster_id + " " + config.syncReq.eeaRDF.startTime);
            var river_name = RIVER_INDEX + "/" + cluster_id;
            var river_meta = river_name + "/_meta";

            river_last_update[cluster_id] = river_creation_date;
            debugger;
            config.syncReq.statusIndex = elastic.index + "_status";
            // TODO: detect real index
            var eeariver_config = {
                river_meta : river_meta,
                syncReq: config.syncReq
            };
            debugger;
            if(JSON.stringify(firstConfig) !==  JSON.stringify(config.analyzers) || firstConfig === null){
                var aC = {
                    "actions" : [
                        { "add" : { "index" : elastic.index + "_blue", "alias" : elastic.index } },
                       // { "add" : { "index" : elastic.index + "_green", "alias" : elastic.index } },
                    ]
                };

                esQuery.PUT(elastic.index + "_blue" , config.analyzers, callback('Setting up new index and analyzers'));
                esQuery.PUT(elastic.index + "_green" , config.analyzers, callback(''));

                esQuery.POST("_aliases", aC , callback('Setting up aliases'));
                firstConfig = JSON.parse(JSON.stringify(config.analyzers));
            }
            esQuery
                .DELETE( RIVER_INDEX + "/river/" + cluster_id, callback('Deleting river! (if it exists)'));

            esQuery
                .PUT( RIVER_INDEX + "/river/" + cluster_id, eeariver_config, callback('Adding river back'));
        }

    }

    esQuery.PUT(elastic.index + '_status', {
      "mappings": {
        "last_update": {
          "properties": {
            "river": {
              "type": "object",
              "properties": {
                "name": {
                  "type": "keyword"
                },
                "updated_at": {
                  "type": "long"
                }
              }
            }
          }
        }
      }
    }, callback('Created status index'));
    var qC = {
        "actions" : [
            { "add" : { "index" : elastic.index + "_blue_status", "alias" : elastic.index + "_status" } }
        ]
    };
    esQuery.POST("_aliases", qC , callback('Setting up aliases for status') );

    /*esQuery.PUT(elastic.index + '/status/last_update', {
         'updated_at': river_last_update,
    }, callback('Rivers updated'));*/

    Object.keys(river_last_update).forEach(function(rivK){
        var lastDate = river_last_update[rivK];
        if(use_default_startTime) lastDate = 0;

        esQuery.PUT( elastic.index + '_status/last_update/' + rivK , {
              "name": rivK,
              "updated_at": lastDate

        }, callback('River updated') );
    });
    
    esQuery.PUT(elastic.index + '_cache', {}, function() {});

    esQuery.execute();
}

function createIndex(settings, syncIndex) {
    if ( checkIfIndexing(settings) ) {
        console.log("Indexing already in progress, you have to wait until the indexing is done.");
        return;
    }
    var esAPI = require('eea-searchserver').esAPI;
    var elastic = require('nconf').get()['elastic'];
    var river_configs = require('nconf').get()['river_configs'];
    var default_startTime = "1970-01-01T00:00:00";
    var startTimeJson ;
    var use_default_startTime = true;
    var esQuery = new esAPI(getOptions());

    if (settings.remove_all) {
        for (var i = 0; i < river_configs.configs.length; i++) {
            var river_name = RIVER_INDEX + "/" + "river" + "/" + river_configs.configs[i].id;
            esQuery.DELETE( river_name, callback('Deleting river! (if it exists)')).execute();
        }
        esQuery.DELETE( elastic.index, callback('Deleting index! (if it exists)'))
            .execute();
        //TODO : delete status index

        getLastUpdateDate(elastic, function( rezult ){
            startTimeJson = rezult;
            if ( startTimeJson !== -1 ) {
                use_default_startTime = false;
                //Check for undeleted, duplicate data in elastic. Refs #86021
                compareElasticSemantic(settings, function (res) {
                    if (use_default_startTime) {
                        console.log('Index objects newer than:', default_startTime);
                    }
                    else {
                        console.log('Last updated date found, using start time per cluser:', JSON.stringify(startTimeJson));
                    }
                    testMapping(settings,elastic,use_default_startTime,default_startTime,startTimeJson,null);
                });
            } else {
                if (use_default_startTime) {
                    console.log('Index objects newer than:', default_startTime);
                }
                else {
                    console.log('Last updated date found, using start time per cluser:', JSON.stringify(startTimeJson));
                }
                testMapping(settings,elastic,use_default_startTime,default_startTime,startTimeJson,null);
            }
        });

    } else {
        getLastUpdateDate(elastic, function( rezult ){
            startTimeJson = rezult;

            if ( startTimeJson !== -1 ) {
                use_default_startTime = false;
                //Check for undeleted, duplicate data in elastic. Refs #86021
                compareElasticSemantic(settings,function(res){
                    if (use_default_startTime) {
                        console.log('Index objects newer than:', default_startTime);
                    }
                    else {
                        console.log('Last updated date found, using start time per cluser:', JSON.stringify(startTimeJson));
                    }
                    testMapping(settings,elastic,use_default_startTime,default_startTime,startTimeJson,null);
                });
            } else {
                if (use_default_startTime) {
                    console.log('Index objects newer than:', default_startTime);
                }
                else {
                    console.log('Last updated date found, using start time per cluser:', JSON.stringify(startTimeJson));
                }
                testMapping(settings,elastic,use_default_startTime,default_startTime,startTimeJson,null);
            }
        });
    }

}

function switchAlias(){

}

function getESCLient() {
    var elastic = require('nconf').get()['elastic'];
    var elasticsearch = require('elasticsearch');

    var ret = new elasticsearch.Client({
        host: 'http://' + getAuth('rw') + elastic.host + ':' + elastic.port  ,
        apiVersion :  '6.2',
        log: {
            type: 'stdio',
            levels: ['error'],
        }
        //sniffOnStart: true,
        //sniffInterval: 60000,
    });
    return ret;
}

function getRealIndex(){
    var elastic = require('nconf').get()['elastic'];
    var client = getESCLient();
    //elastic.real_index = elastic.index;

    return new Promise(function (resolve, reject) {
        client.cat.aliases({format: "json" , name: elastic.index })
            .then(function (body) {
                if(body.length === 1){
                    elastic.real_index = body[0].index;
                    resolve(elastic);
                }
            }).catch(function (err) {
                reject(err);
        });

    });
}

function createBlueGreen(settings, cb){
    var client = getESCLient();
    var elastic = require('nconf').get()['elastic'];

    function getIndexes(body){
        var real_index = Object.keys(body).length === 1 ? Object.keys(body)[0] : null;
        var other_index = null;

        if(real_index.indexOf("blue")){
            other_index = elastic.index + "_green";
        } else {
            other_index = elastic.index + "_blue";
        }
        return { real_index : real_index, other_index:other_index }
    }

    function reindexOther(indexes){
        var reindexBody = {
            "source": {
                "index": indexes.real_index,
                "size": 1000
            },
            "dest": {
                "index": indexes.other_index
            }
        };

        return client.reindex({
            requestsPerSecond: 150,
            scroll: '10m',
            waitForCompletion: false,
            body: reindexBody
        }).then(function (value) {
           return {
               indexes: indexes,
               task_id: value.task,
               cb: taskCb
           };
        });
    }

    function taskCb(tid){
        client.get({
            index: '.tasks',
            type: 'task',
            id: tid
        }).then(function (value) {
            var run = (parseInt(value._source.task.running_time_in_nanos) / 1000000000) / 60;
            console.log("TIME: " +  run + " minutes");
            //TODO: DELETE from .tasks index
            cb(true);
        }).catch(function (reason) {
            cb(false);
        });
        //console.log("running callback...");
    }

    function watchTask(res){
        var task_id = res.task_id;

        console.log('\x1Bc');

        console.log("Copying index...");

        client.tasks.get({
            taskId: task_id,
            requestTimeout: 500
        }).then(function (value) {
            var status = value.task.status;
            var up  = parseInt(status.updated) + parseInt(status.created);
            var prog = (up / parseInt(status.total)) * 100 ;
            console.log("Task id:" + task_id);
            console.log(status);
            console.log("Progress : " +  Math.floor(prog) + " %");
            /*if(Math.floor(prog) === "100"){
                console.log("'Finished backing up the index...");
            }*/
            if(value && !value.completed){
                // POLLING
                var time = 30000;

                if(status.throttled_until_millis > 0){
                    time = parseInt(status.throttled_until_millis) + 1;
                }
                setTimeout(watchTask, time , res );
            } else {
                console.log("Finished backing up the index...");
                if(res.cb !== null) res.cb(task_id);
            }
        });
    }

    client.indices.getMapping({ index : elastic.index })
        .then(getIndexes)
        .catch(function (reason) {
            console.error(reason);
        })
        .then(reindexOther)
        .then(watchTask);
}


function syncIndex(settings){
    debugger;
    if (checkIfIndexing(settings)) {
        console.log("Indexing already in progress, you have to wait until the indexing is done.");
        return;
    }

    createBlueGreen(settings, function(res){
        //console.log("after reindex...");
        if(res){
            createIndex(settings);
        }

    });

    //createIndex(settings);
}


function reCreateRivers(settings, clusters) {
    if (checkIfIndexing(settings, clusters)) {
        console.log("Indexing already in progress, you have to wait until the indexing is done.");
        return;
    }

    var elastic = require('nconf').get()['elastic'];
    var default_startTime = "1970-01-01T00:00:00";
    var use_default_startTime = true;

    getLastUpdateDate(elastic, function(rez){
        var startTimeJson = rez;
        if ( startTimeJson != -1 ) {
            use_default_startTime = false;
        }

        if (use_default_startTime) {
            console.log('Index objects newer than:', default_startTime);
        }
        else {
            console.log('Last updated date found, using start time per cluser:', JSON.stringify(startTimeJson));
        }
        testMapping(settings,elastic,use_default_startTime,default_startTime,startTimeJson,clusters);

    });

}

function deleteClusterData(elastic,cluster_id){
    //delete from index
    console.log("Starting deleting data from ElasticSearch, cluster ", cluster_id);
    var indexed_url = elastic.path + elastic.index + '/' + elastic.type + '/_delete_by_query';

    if(indexed_url.indexOf("/") === 0){
        indexed_url = indexed_url.substr(1);
    }

    var esAPI = require('eea-searchserver').esAPI;
    var esQuery = new esAPI(getOptions());
    var q = {
        "query": {
            "bool": {
                "filter": [
                    {
                        "match": {
                            "cluster_id": cluster_id
                        }
                    },
                    {
                        "match": {
                            "_type": "resource"
                        }
                    }
                ]
            }
        }
    };

    try {
        esQuery.DELETE( elastic.path.substr(1) + elastic.index + "_status" + "/" + "last_update" + "/" + cluster_id, callback("Deleted status for " + cluster_id) );
        esQuery.DELETE( elastic.path.substr(1) + elastic.index + "_cache" + "/" + "last_update" + "/" + cluster_id, callback("Deleted cache for " + cluster_id) );
        esQuery.POST(indexed_url, q, callback('Deleting data! (if it exists)') );

        esQuery.execute();
    } catch (e) {
        if (e.statusCode === 404){
            return 0;
        }
        console.log('Problems deleting ' + cluster_id + ' data from index ', e.message);
        return -1;
    }
    return 0;
}

function compareElasticSemantic(settings, cb) {
    var semanticData = getSemanticData(settings);

    getElasticData(function (err,elasticData) {
        if(semanticData && elasticData) {
            semanticData.sort();
            elasticData.sort();

            var fad = require("fast-array-diff");
            console.log("Comparing Elastic and Semantic data...");

            //console.time("difffad");
            var diff = fad.diff(elasticData, semanticData);
            //console.timeEnd("difffad");

            //console.log("Semantic data: " + semanticData.length);
            //console.log("Elastic data: " + elasticData.length);

            /*if(diff.added.length > 0) {
                console.log("missing from Elastic:");
                console.log(diff.added.length);
            }*/

            if(diff.removed.length > 0) {
                //console.log("added to Elastic:");
                //console.log(diff.removed.length);
                diff.removed.forEach(function (element) {
                    console.log("Deleting document from elastic: " + element);
                    deleteElasticDoc(element);
                });
            }

        } else {
            console.log("There was an error retrieving elastic or semantic data");
        }
        cb();
    });
}

function getSemanticData(settings) {
    var request = require('sync-request');
    var http = require('http');
    var semanticHost = "http://semantic.eea.europa.eu/sparql";
    var river_configs = require('nconf').get()['river_configs'];
    var syncConditionsList = [];
    var syncCondition = "";
    var river_config = {};
    var semanticList = [];

    // Build the sparql query with the syncConditions from rivers
    var sparql = " PREFIX xsd:<http://www.w3.org/2001/XMLSchema#> \
                    SELECT DISTINCT ?resource WHERE { \
                        GRAPH ?graph { ";

    for (var i = 0; i < river_configs.configs.length; i++) {
        river_config = readRiverConfig(settings.config_dir, river_configs.configs[i].config_file);
        for(var j = 0; j < river_config['syncConditions'].length; j++) {
            syncCondition = river_config['syncConditions'][j].match(/{(.*)}/i)[0];
            if(syncConditionsList.indexOf(syncCondition) < 0) {
                if(syncConditionsList.length != 0 ) {
                    sparql += " UNION ";
                }
                syncConditionsList.push(syncCondition);
                sparql += " " + syncCondition + " ";
            }
        }
    }

    sparql += "}";
/* Debugging example, how to test the deletion of a document from elastic
    sparql += "filter (?resource != <http://www.eea.europa.eu/data-and-maps/data/external/diva-gis-administrative-boundaries>) \
               filter (?resource != <http://www.eea.europa.eu/highlights/ireland2019s-laura-burke-takes-up>)" */
    sparql += "}";

    qs = {
        "query" : sparql
    };

    // Semantic sparql request
    try {
        res = request('GET', semanticHost, {
            "qs": qs,
            "headers": {
                'accept': 'application/sparql-results+json',
                'content-type': 'application/json'
            }
        });

        var res_json = JSON.parse(res.getBody('utf8'));
        // Return only list of ids
        for (var i = 0; i < res_json.results.bindings.length; i++) {
            semanticList.push(res_json.results.bindings[i].resource.value);
        }
        return semanticList;
    }
    catch (e) {
        console.log("Semantic request failed.");
        console.log(e.message);
        return false;
    }
}

function getElasticData(cb) {
    var request = require('sync-request');
    var elastic = require('nconf').get()['elastic'];
    var rdfSearch = 'http://' + getAuth('rw') + elastic.host + ':' + elastic.port + elastic.path + elastic.index + '/_search';
    var idList = [];
    var auth = getAuth('rw');

    var elasticsearch = require('elasticsearch');
    var esScrollToEnd = require('elasticsearch-scrolltoend');

    var client = new elasticsearch.Client({
        host: 'http://' + getAuth('rw') + elastic.host + ':' + elastic.port  ,
        apiVersion :  '6.2',
        log: {
            type: 'stdio',
            levels: ['error'],
            sniffOnStart: true,
            sniffInterval: 60000,
        },
        plugins: [ esScrollToEnd.plugin ]

    });

    var qs1 = {
        "query": {
            "bool": {
                "filter": {
                    "type": {
                      "value": elastic.type
                    }
                }
            }
        },
        "stored_fields": [ "_id" ]
    };

    // Query elasticsearch for data count
    var data_count = 0;
    try {
        var res = request('GET', rdfSearch, {
            "q": qs1,
        });
        var res_json = JSON.parse(res.getBody('utf8'));

        if(res_json.hits) data_count = res_json.hits.total;
    }
    catch (e) {
        console.log("Couldn't get the number of hits");
        cb(false, null);
        return false;
    }

    var qs2 = {
        "size": 10000,
        "query": {
            "bool": {
              "filter": {
                "type": {
                  "value": elastic.type
                }
              }
            }
        },
        "stored_fields": [ "_id" ]
    };

    var batchHandler = function(response) {
        if(response){
            Object.keys(response.hits.hits).map(function(k){
                var kid = response.hits.hits[k];
                idList.push(kid._id);
            });
        }
        if(response.hits.total === idList.length){
            //when finished adding
            cb(null, idList);
        }
        return Promise.resolve();
    };

    var scroll = '30s';
    var scrollToEnd = client.scrollToEnd(scroll, batchHandler);

    client.search({
        index: elastic.index,
        //search_type: 'query_then_fetch',
        scroll: '30s', // keep the search results "scrollable" for 30 seconds
        _source: ['_id'], // filter the source to only include the title field
        body: qs2
    }).then(scrollToEnd, function (err) {
        console.log("Elastic query failed.");
        cb(err, null);
    });
}

function deleteElasticDoc(id) {
    var request = require('sync-request');
    var elastic = require('nconf').get()['elastic'];
    var docPath = elastic.index + "/" + elastic.type + '/';
    var esAPI = require('eea-searchserver').esAPI;
    var esQuery = new esAPI(getOptions());

    try {
        esQuery.DELETE(docPath + encodeURIComponent(id), callback('Deleting data! (if it exists)'))
            .execute();
    } catch (e) {
        if (e.statusCode === 404){
            return 0;
        }
        console.log('Problems deleting ' + cluster_id + ' data from index ', e.message);
        return false;
    }
}

function reIndex(settings) {
    settings.remove_all = true;
    createIndex(settings);
}

function validateClusters(clusters){
    var river_configs = require('nconf').get()['river_configs'];

    for (var i = 0; i < clusters.length; i++) {
        var found = false;
        for (var j = 0; j < river_configs.configs.length; j++) {
            if (river_configs.configs[j].id == clusters[i]) {
                found = true;
            }
        }
        if (!found) {
            console.log("There is no cluster " + clusters[i] + "\nUsage: reindex_cluster <clusterid_1> <clusterid_2> <clusterid_3>");
            return -1;
        }
    }
    console.log("Cluster list validated: ", clusters);
    return 0;
}

function reIndexCluster(settings, clusters) {
    if (!clusters.length) {
        console.log("Usage: reindex_cluster <clusterid_1> <clusterid_2> <clusterid_3>");
        return -1;
    }
    //Validate clusters variable
    if (validateClusters(clusters) === 0){
        reCreateRivers(settings, clusters);
    }
}

function removeCluster(settings, clusters) {
    if (!clusters.length) {
        console.log("Usage: remove_cluster <clusterid_1> <clusterid_2> <clusterid_3>");
        return -1;
    }
    if (validateClusters(clusters) === 0){
        var elastic = require('nconf').get()['elastic'];
        for (var i = 0; i < clusters.length; i++){
            deleteClusterData(elastic,clusters[i]);
        }
    }
}

function compareClusters(settings, args){
    if(args.length < 2){
        console.log("Usage: compare_clusters <host> <port> [<user>,<pass>]");
    }
    var oldhost = args[0];
    var oldport = args[1] || 9200;
    var olduser = args[2] || null;
    var oldpass = args[3] || null;

    var esAPI = require('eea-searchserver').esAPI;
    var elastic = require('nconf').get()['elastic'];
    var request = require('sync-request');

    var esQuery = new esAPI(getOptions());

    var river_configs = require('nconf').get()['river_configs'];

    var aggsQ = {
        "query": {
            "bool": {
                "must": {
                    "exists": {
                        "field": "cluster_id"
                    }
                }
            }
        },
        "size": 0,
        "aggs": {
            "clusters": {
                "terms": {
                    "field": "cluster_id",
                    "size": river_configs.configs.length

                }
            }
        }
    };


    var ids = river_configs.configs.map(function (item) {
            return item.id;
        }
    );

    var res = {};

    var esOldQuery = new esAPI(getOptions());

    esOldQuery.options.es_host = oldhost + ":" + oldport + "/";

    //TODO: change for auth command params
    esOldQuery.options.auth = olduser ? {} : {};
    delete esOldQuery.options.auth;

    function getNewClusterTotal(cid, cb){
        var q = {
            "query": {
                "bool": {
                    "filter": [
                        {
                            "match": {
                                "cluster_id": cid
                            }
                        },
                        {
                            "match": {
                                "_type": "resource"
                            }
                        }
                    ]
                }
            }
        };

        esQuery.POST(elastic.index  + "/" +"_search", q, function (re, s,e,b) {
            if(e || s !== 200 ){
                cb(e, false);
            }
            var newIndexRes = JSON.parse(b);
            var newIndexTotal = newIndexRes.hits.total;

            cb(null, newIndexTotal);
        });
    }

    function getOldCluster( cid, cb) {
        var q = {
            "query": {
                "bool": {
                    "must": [
                        {
                            "match": {
                                "cluster_id": cid
                            }
                        },
                        {
                            "match": {
                                "_type": "resource"
                            }
                        }
                    ]
                }
            }
        };

        esOldQuery.POST(elastic.index  + "/" +"_search", q, function (re, s,e,b) {
            if(e || s !== 200){
                cb(e, false);
            }
            var oldIndexRes = JSON.parse(b);
            if(oldIndexRes.hits !== undefined ){
                var oldIndexTotal = oldIndexRes.hits.total;
                cb(null, oldIndexTotal);
            } else {
                var oldIndexTotal = oldIndexRes.hits.total;
                cb(null, oldIndexTotal);
            }

        });
    }
    
    function refreshRes(cl) {
        if(res[cl].ready === true) {
            if(res[cl].newCluster !== res[cl].oldCluster){
                console.log("Cluster is different: " + cl);
                console.log("Old cluster : " + res[cl].oldCluster );
                console.log("New cluster : " + res[cl].newCluster );
            } else {
                console.log( cl + ": OK");
            }
        }
    }

    var notClusters = {
        "query": {
            "bool": {
                "must_not": {
                    "exists": {
                        "field": "cluster_id"
                    }
                }
            }
        }
    };

    esQuery.POST(elastic.index  + "/" +"_search", notClusters,function (re, s,e,b) {
        if(e || s !== 200 ){
            console.log(e);
        }
        var noC = JSON.parse(b);

        if(noC.hits !== undefined && noC.hits.total !== 0){
            console.log("Data with no cluster_id:");
            noC.hits.forEach(function (hit) {
                console.log(hit._id);
            });
        } else {
            console.log("All data has clusters");
        }
    });

    //TODO: make only 2 requests with aggregations
    ids.forEach(function (cl) {
        getNewClusterTotal(cl, function (error, newCT) {
            if(error){
                console.log(error);
            }
            if(!res[cl]){
                res[cl] = {};
            }
            res[cl].newCluster = newCT;
            if(res[cl].oldCluster){
                res[cl].ready = true;
            }
            refreshRes(cl);
        });

        getOldCluster(cl, function (olderr, oldCT) {
            if(olderr){
                console.log(olderr);
            }
            if(!res[cl]){
                res[cl] = {};
            }
            res[cl].oldCluster = oldCT;
            if(res[cl].newCluster){
                res[cl].ready = true;
            }
            refreshRes(cl);
        });
    });

    esQuery.execute();
    esOldQuery.execute();

}



function showHelp() {
    console.log('List of available commands:');
    console.log(' runserver: Run the app web server');
    console.log('');
    console.log(' create_index: Setup river and index in elastic and triggers indexing. This is done the first time.');
    console.log('');
    console.log(' remove_river: Remove the running river indexer if any');
    console.log(' remove_data: Remove the ES index of this application');
    console.log('');
    console.log(' reindex: does remove_river, remove_data and create_index commands in one go. To be used with major config changes like adding fields or new mappings.');
    console.log('');
    console.log(' reindex_cluster <clusterid_1> <clusterid_2> <clusterid_3>: Reindex only specified clusters');
    console.log(' remove_cluster <clusterid_1> <clusterid_2> <clusterid_3>: Remove data for the specified clusters');
    console.log('');
    console.log(' sync_index: Fetches latest data from sparql endpoint since last indexed time. Useful when cron is disabled, for testing or manual syncing.');
    console.log('');
    console.log(' create_bluegreen: blue/green behavior with cloning (backing up) the existing index before doing the sync');
    console.log('');
    console.log(' help: Show this menu');
    console.log('');
    //console.log(' compare_clusters <host> <port> [<user>,<pass>] : compare cluster to other cluster from host.');
}

module.exports = {
    'sync_index': syncIndex,
    'remove_river': removeRiver, // working
    'remove_data': removeData, // working
    'create_index': createIndex, // working
    'create_bluegreen': createBlueGreen, // WIP

    //TODO: ! not sure it works
    'reindex': reIndex,

    'reindex_cluster': reIndexCluster, // working
    'remove_cluster': removeCluster, // working

    'compare_clusters' : compareClusters,
    'help': showHelp
};

var dateFormat = require('dateformat');
var path = require('path');
var cache = require('eea-searchserver').util.cache;
var _ = require('underscore');

function getOptions() {
    var nconf = require('nconf');
    var elastic = nconf.get()['elastic'];
    return {
        'es_host': elastic.host + ':' + elastic.port + elastic.path,
        'auth': elastic.rwuser + ':' + elastic.rwpass,
        'riverindex': elastic.riverindex || 'eeariver'
    };
}

function getElasticIndex() {

    var elastic = require('nconf').get()['elastic'];
    return {
        current : elastic.index + "_green",
        other : elastic.index + "_green",
        alias : elastic.index
    }
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
            'mapping.ignore_malformed': true,
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
                'index': getElasticIndex().current,
                'type': elastic.type,
            }
        }
    }
}

var callback = function(text) {
    return function(err, statusCode, header, body) {
        console.log(text);
        if (err) {
            console.log(err.message);
        }
        else {
            console.log('  Successfuly ran query');
            console.log('  ResponseCode: ' + statusCode);
            console.log('  ' + body);
        }
    };
};

function removeRiver() {
    var esAPI = require('eea-searchserver').esAPI;
    var river_configs = require('nconf').get()['river_configs'];
    var esQuery = new esAPI(getOptions());
    for (var i = 0; i < river_configs.configs.length; i++) {
        var river_name = getOptions().riverindex + "/" + "river/" + river_configs.configs[i].id;
        esQuery
            .DELETE(river_name, callback('Deleting river! (if it exists): '  + river_name));
    }
    esQuery.execute();
}

function removeData(settings) {
    var esAPI = require('eea-searchserver').esAPI;
    var elastic = require('nconf').get()['elastic'];
    new esAPI(getOptions())
        .DELETE(getElasticIndex().current, callback('Deleting index! (if it exists)'))
        .DELETE(getElasticIndex().current + "_status",  callback('Deleting status index! (if it exists)') )
        .DELETE(getElasticIndex().alias + "_cache" , callback('Deleting cache index! (if it exists)'))
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

function checkIfIndexing(settings) {
    var request = require('sync-request');
    var esAPI = require('eea-searchserver').esAPI;
    var elastic = require('nconf').get()['elastic'];

    var rivers = 'http://' + getAuth('rw') +  elastic.host + ':' + elastic.port + elastic.path + getOptions().riverindex + '/_search';


//TODO: check the query
    var qs = {
        "query": {
            "bool": {
                "must": [{
                    "term": {
                        "index.index": getElasticIndex().current
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

function getLastUpdateDate(elastic){
    var request = require('sync-request');

    var indexed_url = 'http://' + getAuth('rw') + elastic.host + ':' + elastic.port + elastic.path +  getElasticIndex().current + '_status/last_update/_search?size=100';
    try {
        res = request('GET', indexed_url);
        var res_json = JSON.parse(res.getBody('utf8'));

        if(res_json.hits === undefined){
            return -1;
        }

        var resSource = res_json.hits.hits.map(function(item){return item._source});

        var t = {};
        var r = resSource.map(function(item){
            t[item.name] = item.updated_at;
        });

        return t;

    }
    catch (e) {

        console.log('Index is missing', e.message);
    }
    return -1
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

function startCreatingRiverClusters(settings, elastic,use_default_startTime,default_startTime,startTimeJson,clusters){
    var esAPI = require('eea-searchserver').esAPI;
    var river_configs = require('nconf').get()['river_configs'];
    var esQuery = new esAPI(getOptions());
    var river_creation_date = Date.now();
    var river_last_update = {};

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
                return
            }
        }
        else {
            if (!use_default_startTime && startTimeJson[cluster_id]) {
                var updated_date = new Date(startTimeJson[cluster_id]);
                config.syncReq.eeaRDF.startTime = dateFormat(updated_date * 1000, "yyyy-mm-dd'T'HH:MM:ss");
            }
        }

        config.syncReq.index.statusIndex = getElasticIndex().current + "_status";
        config.syncReq.index.switchAlias = false;

        if (shouldAdd){
            console.log('***Setting startTime for cluster ' + cluster_id + " " + config.syncReq.eeaRDF.startTime);

            var river_name = getOptions().riverindex + "/" + cluster_id;
            var river_meta = river_name + "/_meta";

            var eeariver_config = {
                river_meta : river_meta,
                syncReq: config.syncReq
            };

/*        new esAPI(esoptions)
            .DELETE(elastic.real_index, default_callback('Deleting index (if it exists)'))
            .PUT(elastic.real_index, analyzers,
                function(){
                    fetchFile(indexFile, esoptions, analyzers);
                })
            .POST("_aliases", add_alias, default_callback(
                "SUCCESS SWITCH ALIAS: Alias is now on " + elastic.real_index))
            .execute();*/

            var add_alias = '{"actions":[{"add":{"alias":"'+getElasticIndex().alias+'","index":"'+getElasticIndex().current+'"}}]}';
            var remove_alias = '{"actions":[{"add":{"alias":"'+getElasticIndex().alias+'","index":"'+getElasticIndex().other+'"}}]}';
            esQuery
                .PUT(getElasticIndex().current, config.analyzers, callback('Setting up new index and analyzers'))
                .POST("_aliases", add_alias, callback(
                    "SUCCESS SWITCH ALIAS: Alias is now on " + getElasticIndex().current))
                .POST("_aliases", remove_alias, callback(
                    "REMOVE OLD ALIAS: " + getElasticIndex().other))
                .DELETE(river_name, callback('Deleting river! (if it exists)'))
                .PUT(getOptions().riverindex + "/river/" + cluster_id, eeariver_config, callback('Adding river back'))
                .execute()
        }

    }
/*    esQuery.PUT(elastic.index + '/status/last_update', {
        'updated_at': river_last_update
    }, callback('Rivers updated'));
    esQuery.PUT(elastic.index + '/cache/cache', {}, function() {})
        .execute();*/
}


function createIndex(settings) {
    if (checkIfIndexing(settings)) {
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
            var river_name = getOptions().riverindex + "/" + "river" + "/" + river_configs.configs[i].id;
            esQuery.DELETE(river_name, callback('Deleting river! (if it exists)'));
        }
        esQuery.DELETE(getElasticIndex().current, callback('Deleting index! (if it exists)'))
            .execute();
    }
    else {
        startTimeJson = getLastUpdateDate(elastic);
        if ( startTimeJson != -1 ) {
            use_default_startTime = false
        }
    }

//    Check for undeleted, duplicate data in elastic. Refs #86021
    compareElasticSemantic(settings, function(){
        if (use_default_startTime) {
            console.log('Index objects newer than:', default_startTime);
        }
        else {
            console.log('Last updated date found, using start time per cluser:', JSON.stringify(startTimeJson));
        }

        startCreatingRiverClusters(settings,elastic,use_default_startTime,default_startTime,startTimeJson,null)
    });
}


function reCreateRivers(settings, clusters) {
    if (checkIfIndexing(settings)) {
        console.log("Indexing already in progress, you have to wait until the indexing is done.");
        return;
    }

    var elastic = require('nconf').get()['elastic'];
    var default_startTime = "1970-01-01T00:00:00";
    var use_default_startTime = true;
    var startTimeJson = getLastUpdateDate(elastic);

    if ( startTimeJson != -1 ) {
        use_default_startTime = false;
    }

    if (use_default_startTime) {
        console.log('Index objects newer than:', default_startTime);
    }
    else {
        console.log('Last updated date found, using start time per cluser:', JSON.stringify(startTimeJson));
    }

    startCreatingRiverClusters(settings,elastic,use_default_startTime,default_startTime,startTimeJson,clusters)
}

function deleteClusterData(elastic,cluster_id){
    //delete from index
    console.log("Starting deleting data from ElasticSearch, cluster ", cluster_id);
    var indexed_url = elastic.path + getElasticIndex.current() + '/' + elastic.type + '/_delete_by_query';

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
        esQuery.DELETE( elastic.path.substr(1) + getElasticIndex().current + "_status" + "/" + "last_update" + "/" + cluster_id, callback("Deleted status for " + cluster_id) );
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
    getElasticData(function(elasticData){
    // Delete documents that are not found in semantic data list
    if(semanticData && elasticData) {
        for (var i = 0; i < elasticData.length; i++) {
            if(semanticData.indexOf(elasticData[i]) < 0) {
                console.log("Delete document from elastic: " + elasticData[i]);
                deleteElasticDoc(elasticData[i]);
            }
        }
    } else {
        console.log("There was and error retrieving elastic or semantic data");
    }
    cb();
    });
}

function getSemanticData(settings) {
    var request = require('sync-request');
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
/* Debugging examples, how to test the deletion of a document from elastic
    sparql += "filter (?resource != <http://www.eea.europa.eu/data-and-maps/data/external/diva-gis-administrative-boundaries>) \
               filter (?resource != <http://www.eea.europa.eu/highlights/ireland2019s-laura-burke-takes-up>)" */
//    sparql += "FILTER (str(?resource) != 'http://www.eea.europa.eu/about-us/governance/scientific-committee/call-for-expressions-of-interest')"

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
        return false;
    }
}

function getElasticData(cb) {
    var elastic = require('nconf').get()['elastic'];
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

    var batch_size = 10000;
    var scroll = '30s';
    var idList = [];

    var qs2 = {
        "size": batch_size,
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
            cb(idList);
        } else {
        }
        return Promise.resolve();
    };

    var scrollToEnd = client.scrollToEnd(scroll, batchHandler);

    client.search({
        index: getElasticIndex().current,
        //search_type: 'query_then_fetch',
        scroll: scroll, // keep the search results "scrollable" for 30 seconds
        _source: ['_id'], // filter the source to only include the title field
        body: qs2
    }).then(scrollToEnd, function (err) {
        //console.log("Elastic query failed.");
        //console.log(err);
        cb();
    });



}

function deleteElasticDoc(id) {
    var request = require('sync-request');
    var elastic = require('nconf').get()['elastic'];
    var docPath = getElasticIndex().current + "/" + elastic.type + '/';
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
}

module.exports = {
    'sync_index': createIndex,
    'remove_river': removeRiver,
    'remove_data': removeData,
    'create_index': createIndex,
    'reindex': reIndex,
    'reindex_cluster': reIndexCluster,
    'remove_cluster': removeCluster,
    'help': showHelp
};

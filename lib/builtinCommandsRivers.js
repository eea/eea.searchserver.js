var dateFormat = require('dateformat')
var path = require('path');
var cache = require('eea-searchserver').util.cache;

function getOptions() {
    var nconf = require('nconf')
    var elastic = nconf.get()['elastic'];
    return {
        'es_host': elastic.host + ':' + elastic.port + elastic.path
    };
}

function getIndexFiles(settings, elastic, riverconfig, cluster_id, cluster_name) {
    var analyzers = require(path.join(settings.app_dir, settings.extraAnalyzers));
    var filters = require(path.join(settings.app_dir, settings.filterAnalyzers));
    var datamappings = require(path.join(settings.app_dir, settings.dataMapping));

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
                'index': elastic.index,
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
}

function removeRiver() {
    var esAPI = require('eea-searchserver').esAPI;
    var river_configs = require('nconf').get()['river_configs'];
    var esQuery = new esAPI(getOptions());
    for (var i = 0; i < river_configs.configs.length; i++) {
        var river_name = "_river/" + river_configs.configs[i].id;
        esQuery
            .DELETE(river_name, callback('Deleting river! (if it exists)'));
        }
    esQuery.execute();
}

function removeData(settings) {
    var esAPI = require('eea-searchserver').esAPI;
    var elastic = require('nconf').get()['elastic'];
    new esAPI(getOptions())
        .DELETE(elastic.index, callback('Deleting index! (if it exists)'))
        .execute();
}

function checkIfIndexing(settings) {
    var request = require('sync-request');
    var esAPI = require('eea-searchserver').esAPI;
    var elastic = require('nconf').get()['elastic'];
    var rivers = 'http://' + elastic.host + ':' + elastic.port + elastic.path + '/_river/_search'
    qs = {
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
        res = request('GET', rivers, {
                q: qs
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

    var indexed_url = 'http://' + elastic.host + ':' + elastic.port + elastic.path + elastic.index + '/status/last_update';
    try {
        res = request('GET', indexed_url);
        var res_json = JSON.parse(res.getBody('utf8'));
        return res_json._source.updated_at;

    }
    catch (e) {
        console.log('Index is missing', e.message);
    }
    return -1
}

function startCreatingRiverClusters(settings, elastic,use_default_startTime,default_startTime,startTimeJson,clusters){
    var esAPI = require('eea-searchserver').esAPI;
    var river_configs = require('nconf').get()['river_configs'];
    var esQuery = new esAPI(getOptions());
    var river_creation_date = Date.now()
    var river_last_update = {}

    for (var i = 0; i < river_configs.configs.length; i++) {
        var cluster_id = river_configs.configs[i].id
        var riverconfig = require(path.join(settings.config_dir, river_configs.configs[i].config_file));
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
                config.syncReq.eeaRDF.startTime = dateFormat(updated_date, "yyyy-mm-dd'T'HH:MM:ss");
            }
        }
        if (shouldAdd){
            console.log('***Setting startTime for cluster ' + cluster_id + " " + config.syncReq.eeaRDF.startTime);
            var river_name = "_river/" + cluster_id;
            var river_meta = river_name + "/_meta";
            river_last_update[cluster_id] = river_creation_date
            esQuery
                .PUT(elastic.index, config.analyzers, callback('Setting up new index and analyzers'))
                .DELETE(river_name, callback('Deleting river! (if it exists)'))
                .PUT(river_meta, config.syncReq, callback('Adding river back'))
        }

    }
    esQuery.PUT(elastic.index + '/status/last_update', {
        'updated_at': river_last_update
    }, callback('Rivers updated'));
    esQuery.PUT(elastic.index + '/cache/cache', {}, function() {})
        .execute();
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
            var river_name = "_river/" + river_configs.configs[i].id;
            esQuery.DELETE(river_name, callback('Deleting river! (if it exists)'));
        }
        esQuery.DELETE(elastic.index, callback('Deleting index! (if it exists)'))
            .execute();
    }
    else {
        startTimeJson = getLastUpdateDate(elastic)
        if ( startTimeJson != -1 ) {
            use_default_startTime = false
        }
    }

//    Check for undeleted, duplicate data in elastic. Refs #86021
    compareElasticSemantic(settings)

    if (use_default_startTime) {
        console.log('Index objects newer than:', default_startTime);
    }
    else {
        console.log('Last updated date found, using start time per cluser:', JSON.stringify(startTimeJson));
    }

    startCreatingRiverClusters(settings,elastic,use_default_startTime,default_startTime,startTimeJson,null)
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
    console.log("Starting deleting data from ElasticSearch, cluster ", cluster_id)
    var indexed_url = elastic.path + elastic.index + '/' + elastic.type + '/_query?q=cluster_id:' + cluster_id;

    var esAPI = require('eea-searchserver').esAPI;
    var esQuery = new esAPI(getOptions());
    try {
        esQuery.DELETE(indexed_url, callback('Deleting data! (if it exists)'))
            .execute();
    } catch (e) {
        if (e.statusCode === 404){
            return 0;
        }
        console.log('Problems deleting ' + cluster_id + ' data from index ', e.message);
        return -1;
    }
    return 0;
}

function compareElasticSemantic(settings) {
    var semanticData = getSemanticData(settings);
    var elasticData = getElasticData();

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
        river_config = require(path.join(settings.config_dir, river_configs.configs[i].config_file));
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

    sparql += "}"
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
        return false;
    }
}

function getElasticData() {
    var request = require('sync-request');
    var elastic = require('nconf').get()['elastic'];
    var rdfSearch = 'http://' + elastic.host + ':' + elastic.port + elastic.path + '/' + elastic.index + '/_search';
    var idList = [];

    qs1 = {
        "query": {
            "filtered": {
                "filter": {
                    "type": {
                        "value": elastic.type
                    }
                }
            }
        },
        "fields": ["_id"]
    };
    // Query elasticsearch for data count
    var data_count = 0;
    try {
        res = request('POST', rdfSearch, {
                "json": qs1
            });
        var res_json = JSON.parse(res.getBody('utf8'));
        data_count = res_json.hits.total;
    }
    catch (e) {
        console.log("Couldn't get the number of hits");
        return false;
    }

    var qs2 = {
        "query": {
            "filtered": {
                "filter": {
                    "type": {
                        "value": elastic.type
                    }
                }
            }
        },
        "fields": ["_id"],
        "size": data_count,
    };

    // Query only for resource _type
    try {
        res2 = request('POST', rdfSearch, {
                "json": qs2
        });
        var res_json2 = JSON.parse(res2.getBody('utf8'));

        // Return only ids list
        for (var i = 0; i < data_count; i++) {
            idList.push(res_json2.hits.hits[i]._id);
        }

        return idList;
    }
    catch (e) {
        console.log("Elastic query failed.");
        return false;
    }

}

function deleteElasticDoc(id) {
    var request = require('sync-request');
    var elastic = require('nconf').get()['elastic'];
    var docPath ='/' + elastic.index + '/' + elastic.type + '/';
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
    console.log(' sync_index: Get changes from the semantic DB into the ES index');
    console.log(' create_index: Setup Elastic index and trigger indexing');
    console.log('');
    console.log(' remove_data: Remove the ES index of this application');
    console.log(' remove_river: Remove the running river indexer if any');
    console.log('');
    console.log(' reindex: Remove river and data, recrate the index on the elastic_host and start harvesting');
    console.log('');
    console.log(' reindex_cluster <clusterid_1> <clusterid_2> <clusterid_3>: Reindex only specified clusters');
    console.log(' remove_cluster <clusterid_1> <clusterid_2> <clusterid_3>: Remove data for the specified clusters');
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
}

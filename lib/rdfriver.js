const execute_query = async(endpoint, query) => {
    return new Promise(async (resolve, reject) => {
        const request = require('request');
        let sparql_result = ''
        const req = request({
                url:endpoint,
                method: 'POST',
                form: {query:query},
                headers: {
                    'accept': 'application/sparql-results+json',
                    'content-type': 'application/json'
                }
            })
            .on('data',function(chunk){
                sparql_result += chunk
            })
            .on('end', async() => {
                resolve (JSON.parse(sparql_result))
            })

    })
}

const execute_construct = async(endpoint, query) => {
    return new Promise(async (resolve, reject) => {
        const request = require('request');
        let sparql_result = ''
        const req = request({
                url:endpoint,
                method:'POST',
                form: {query:query},
                headers: {
                    'accept': 'application/xhtml+xml',
                    'content-type': 'application/rdf+xml'
                }
            })
            .on('error', function(error){
                reject(error);
                return;
            })
            .on('data',function(chunk){
                sparql_result += chunk;
            })
            .on('end', async() => {
                try{
                    var $rdf = require('rdflib');
                    var store = $rdf.graph();

                    $rdf.parse(sparql_result, store, 'http://rdf_to_index', "application/rdf+xml")

                    let results = [];
                    for (let i = 0; i < store.statements.length; i++){
                        let result = {};
                        result.S = store.statements[i].subject.value;
                        result.P = store.statements[i].predicate.value;
                        result.O = store.statements[i].object;
                        results.push(result)
                    }

                    resolve (results)
                }
                catch(err){
                    console.log(sparql_result);
                    reject("Error when trying to parse response from endpoint:", sparql_result);
                    return;
                }
            })

    })
}

function normalize_documents(river_config, data) {
    let normalized_data = {};

    const proplist = river_config.river.conf.proplist;
    const whiteMap = river_config.river.conf.whiteMap;
    const blackMap = river_config.river.conf.blackMap;
    const normProp = river_config.river.conf.normProp;
    const normObj = river_config.river.conf.normObj;
    const normMissing = river_config.river.conf.normMissing;
}

function create_documents(data){
    let json = {};
    for (let i = 0; i < data.length; i++){
        const S = data.S;
        const P = data.P;
        const O = data.O;
        if (json[S] === undefined){
            json[S] = {};
        }
        if (json[S][P] === undefined){
            json[S][P] = O;
        }
        else {
            if (!Array.isArray(json[S][P])){
                const tmp_O = json[S][P];
                json[S][P] = [];
                json[S][P].push(tmp_O);
            }
            json[S][P].push(O);
        }
    }

    return json;
}

const get_rdfs_from_endpoint = async(river_config) => {
    return new Promise(async (resolve, reject) => {
        const start_time = river_config.start_time || "1970-01-01T00:00:00";

        const query_template =
            "PREFIX xsd:<http://www.w3.org/2001/XMLSchema#> "
                + "SELECT DISTINCT ?resource WHERE { "
                + " GRAPH ?graph { <sync_conditions> }"
                + " ?graph <<sync_time_prop>> ?time .  <graph_sync_conditions> "
                + " FILTER (?time > xsd:dateTime('<start_time>')) }";

        const query = query_template
                        .replace('<sync_conditions>', river_config.river.conf.syncConditions)
                        .replace('<sync_time_prop>', river_config.river.conf.syncTimeProp)
                        .replace('<graph_sync_conditions>', river_config.river.conf.graphSyncConditions)
                        .replace('<start_time>', start_time);

        console.log("Cluster:", river_config.river.cluster_id, "Execute query:", query);

        const results = await execute_query(river_config.endpoint, query);

        console.log("Cluster:", river_config.river.cluster_id, "Retrieved", results.results.bindings.length, "documents");

        resolve(results.results.bindings);
    });
}

const _get_bulk_from_endpoint = async(river_config, bulk) => {
    return new Promise(async (resolve, reject) => {

        const query_template =
            "CONSTRUCT { ?s ?p ?o }"
                + "WHERE {"
                + "{?s ?p ?o . "
                + "FILTER (?s in "
                + "("
                + "<URIS>"
                + ")"
                + ") . "
                + "OPTIONAL { ?o <http://www.w3.org/2000/01/rdf-schema#label> ?o1 }  . "
                + "FILTER(!BOUND(?o1)) . "
                + "OPTIONAL { ?o <http://purl.org/dc/terms/title> ?o2 }  . "
                + "FILTER(!BOUND(?o2))} "
                + "UNION { "
                + "<http://www.w3.org/2000/01/rdf-schema#Class> a <http://www.w3.org/2000/01/rdf-schema#Class> . "
                + "{ SELECT ?s ?p (str(?label) as ?o) "
                + "{    ?s ?p ?res   . "
                + "FILTER (?s in "
                + "("
                + "<URIS>"
                + ")"
                + ")   ."
                + "?res <http://www.w3.org/2000/01/rdf-schema#label> ?label }}}"
                + "UNION {"
                + "<http://www.w3.org/2000/01/rdf-schema#Class> a <http://www.w3.org/2000/01/rdf-schema#Class> ."
                + "{ SELECT ?s ?p (str(?label) as ?o)"
                + "{    ?s ?p ?res   ."
                + "FILTER (?s in"
                + "("
                + "<URIS>"
                + ")"
                + ")."
                + "?res <http://purl.org/dc/terms/title> ?label }}}}"

        let uri_list = [];
        for (let i = 0; i < bulk.length; i++){
            uri_list.push('<' + bulk[i].resource.value + '>')
        }
        const uri_list_str = uri_list.join(',')
        const query = query_template.split('<URIS>').join(uri_list_str);
        console.log(query)

//        const data = await sparqlHelpers.execute_query(river_config.endpoint, query);
        let data;
        try{
            data = await execute_construct(river_config.endpoint, query);
        }
        catch(error){
            reject(error);
            return;
        }
//        debugger;
//console.log(data);
//        console.log(data.length)
        resolve(data);
    })
}

const get_bulk_from_endpoint = async(river_config, bulk) => {
    return new Promise(async (resolve, reject) => {
        let data = []
        try{
            data = await _get_bulk_from_endpoint(river_config, bulk);
        }
        catch(error){
            console.log("Error when trying to fetch details for bulk");
            console.log("Try each document separately");
            console.log(error)
//            debugger;
            for (let i = 0; i < bulk.length; i++){
                const tmp_bulk = [bulk[i]];
                let tmp_data = [];
                try{
                    tmp_data = await _get_bulk_from_endpoint(river_config, tmp_bulk)
                }
                catch(err){
                    debugger;
                    // mark failed in status
                }
                for (let j = 0; j < tmp_data.length; j++){
                    data.push(tmp_data[j]);
                }
            }
        }
        resolve(data);
    })
}

const index_bulk_from_endpoint = async(river_config, bulk) => {
    return new Promise(async (resolve, reject) => {
        const idx_helpers = require('eea-searchserver').indexHelpers;
        let data = await get_bulk_from_endpoint(river_config, bulk);
        debugger;
    })
}
const index_river = async(river_config, bulk_size) => {
    return new Promise(async (resolve, reject) => {
        const rdfs_list = await get_rdfs_from_endpoint(river_config);
        let tmp_bulk = [];
        for (let i = 0; i < rdfs_list.length; i++){
            if (((i % bulk_size) === 0) && (i > 0)){
                await index_bulk_from_endpoint(river_config, tmp_bulk);
                tmp_bulk = [];
            }
            tmp_bulk.push(rdfs_list[i])
        }
        if (tmp_bulk.length !== 0){
            await index_bulk_from_endpoint(river_config, tmp_bulk);
            tmp_bulk = [];
        }
    })
}

module.exports = {
    index_river : index_river
}
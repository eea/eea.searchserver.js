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
                try{
                    resolve (JSON.parse(sparql_result))
                }
                catch(err){
                    reject({query:query, msg:sparql_result});
                }
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
                console.log('sparql_results.length:', sparql_result.length)
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
        const S = data[i].S.trim();
        const P = data[i].P.trim();
        let O = data[i].O;
        let lang = undefined;

        lang = O.lang

        if (O.termType === 'Literal'){
            O = O.value.trim();

        }
        if (O.termType === 'NamedNode'){
            O = O.value.trim();
        }
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
        if ((lang !== undefined) && (lang.length > 0)){
            if (json[S]['language'] === undefined){
                json[S]['language'] = lang
            }
            else {
                let should_add_language = false;
                if (!Array.isArray(json[S]['language'])){
                    if (json[S]['language'] !== lang){
                        const tmp_O = json[S]['language'];
                        json[S]['language'] = [];
                        json[S]['language'].push(tmp_O);
                        should_add_language = true;
                    }
                }
                else {
                    if (json[S]['language'].indexOf(lang) === -1){
                        should_add_language = true;
                    }
                }
                if (should_add_language){
                    json[S]['language'].push(O);
                }
            }
        }

    }

    return json;
}

function remove_empty(data){
    let clear_data = {};
    for (let i = 0; i < Object.keys(data).length; i++){
        const id = Object.keys(data)[i];
        clear_data[id] = {};
        let row = data[id];
        for (let j = 0; j < Object.keys(row).length; j++){
            const attr = Object.keys(row)[j];
            let ignore_attr = false;
            if ((Array.isArray(row[attr])) && (row[attr].length === 0)){
                ignore_attr = true;
            }
            else {
                if ((row[attr] === null) || row[attr].length === 0){
                    ignore_attr = true;
                }
            }
            if (!ignore_attr){
                clear_data[id][attr] = row[attr];
            }
        }
    }
    return clear_data;
}

function apply_black_map(river_config, data){
    const black_map = river_config.river.conf.blackMap;
    if (black_map === undefined){
        return data;
    }
    let clear_data = {};
    for (let i = 0; i < Object.keys(data).length; i++){
        const id = Object.keys(data)[i];
        clear_data[id] = {};
        let row = data[id];
        for (let j = 0; j < Object.keys(row).length; j++){
            const attr = Object.keys(row)[j];
            let value = row[attr];
            if (black_map[attr] !== undefined){
                if (Array.isArray(value)){
                    let tmp_value = [];
                    for (let k = 0; k < value.length; k++){
                        if (black_map[attr].indexOf(value[k]) === -1){
                            tmp_value.push(value[k]);
                        }
                    }
                    value = tmp_value;
                }
                else {
                    if (black_map[attr].indexOf(value) !== -1){
                        value = '';
                    }
                }
            }
            clear_data[id][attr] = value;
        }
    }
    return clear_data;
}

function apply_white_map(river_config, data){
    const white_map = river_config.river.conf.whiteMap;
    if (white_map === undefined){
        return data;
    }
    let clear_data = {};
    for (let i = 0; i < Object.keys(data).length; i++){
        const id = Object.keys(data)[i];
        clear_data[id] = {};
        let row = data[id];
        for (let j = 0; j < Object.keys(row).length; j++){
            const attr = Object.keys(row)[j];
            let value = row[attr];
            if (white_map[attr] !== undefined){
                if (Array.isArray(value)){
                    let tmp_value = [];
                    for (let k = 0; k < value.length; k++){
                        if (white_map[attr].indexOf(value[k]) !== -1){
                            tmp_value.push(value[k]);
                        }
                    }
                    value = tmp_value;
                }
                else {
                    if (white_map[attr].indexOf(value) === -1){
                        value = '';
                    }
                }
            }
            clear_data[id][attr] = value;
        }
    }
    return clear_data;
}

function apply_norm_obj(river_config, data){
    const norm_obj = river_config.river.conf.normObj;
    let clear_data = {};
    for (let i = 0; i < Object.keys(data).length; i++){
        const id = Object.keys(data)[i];
        clear_data[id] = {};
        let row = data[id];
        for (let j = 0; j < Object.keys(row).length; j++){
            const attr = Object.keys(row)[j];
            let value = row[attr];
            if (Array.isArray(value)){
                for (let k = 0; k < value.length; k++){
                    if (norm_obj[value[k]] !== undefined){
                        value[k] = norm_obj[value[k]];
                    }
                }
            }
            else {
                if (norm_obj[value] !== undefined){
                    value = norm_obj[value];
                }
            }
            clear_data[id][attr] = value;
        }
    }
    return clear_data;
}

function remove_duplicates(data){
  let clear_data = {};
  for (let i = 0; i < Object.keys(data).length; i++){
    const id = Object.keys(data)[i];
    clear_data[id] = {};
    let row = data[id];
    for (let j = 0; j < Object.keys(row).length; j++){
      const attr = Object.keys(row)[j];
      let value = row[attr];
      if (Array.isArray(value)){
          value = [... new Set(value)]
      }
      clear_data[id][attr] = value;
    }
  }
  return clear_data;
}
function apply_norm_prop(river_config, data){
    const norm_prop = river_config.river.conf.normProp;
    let clear_data = {};
    for (let i = 0; i < Object.keys(data).length; i++){
        const id = Object.keys(data)[i];
        clear_data[id] = {};
        let row = data[id];
        for (let j = 0; j < Object.keys(row).length; j++){
            const attr = Object.keys(row)[j];
            let value = row[attr];
            if (norm_prop[attr] === undefined){
                clear_data[id][attr] = value;
            }
            else {
                if (!Array.isArray(norm_prop[attr])){
                    norm_prop[attr] = [norm_prop[attr]];
                }
                for (let k = 0; k < norm_prop[attr].length; k++){
                    clear_data[id][norm_prop[attr][k]] = value;
                }
            }
        }
    }
    return clear_data;
}

function apply_norm_missing(river_config, data){
    const norm_missing = river_config.river.conf.normMissing;
    let clear_data = {};
    for (let i = 0; i < Object.keys(data).length; i++){
        const id = Object.keys(data)[i];
        clear_data[id] = {};
        let row = data[id];
        for (let j = 0; j < Object.keys(norm_missing).length; j++){
            const attr = Object.keys(norm_missing)[j];
            if (row[attr] === undefined){
                row[attr] = norm_missing[attr];
            }
        }
        clear_data[id] = row;
    }
    return clear_data;
}

function get_attrs_to_delete(river_config, data){
    const proplist = river_config.river.conf.proplist;
    let attrs = [];
    for (let i = 0; i < Object.keys(data).length; i++){
        const id = Object.keys(data)[i];
        let row = data[id];
        for (let j = 0; j < Object.keys(row).length; j++){
            const attr = Object.keys(row)[j];
            if (proplist.indexOf(attr) === -1){
                attrs.push(attr);
            }
        }
    }
    return attrs;
}

function delete_attrs(attrs, data){
    let clear_data = {};
    for (let i = 0; i < Object.keys(data).length; i++){
        const id = Object.keys(data)[i];
        clear_data[id] = {};
        let row = data[id];
        for (let j = 0; j < Object.keys(row).length; j++){
            const attr = Object.keys(row)[j];
            if (attrs.indexOf(attr) === -1){
                clear_data[id][attr] = row[attr];
            }
        }
    }
    return clear_data;
}

function count_values(data){
    for (let i = 0; i < Object.keys(data).length; i++){
        const id = Object.keys(data)[i];
        let row = data[id];
        const attrs = Object.keys(row)
        for (let j = 0; j < attrs.length; j++){
            const value = row[attrs[j]];
            if (Array.isArray(value)){
                data[id]['items_count_' + attrs[j]] = value.length;
            }
            else {
                if (value === undefined){
                    data[id]['items_count_' + attrs[j]] = 0;
                }
                else {
                    data[id]['items_count_' + attrs[j]] = 1;
                }
            }
        }
    }
    return data;
}

function add_cluster_info(river_config, data){
    for (let i = 0; i < Object.keys(data).length; i++){
        const id = Object.keys(data)[i];
        data[id]['cluster_id'] = river_config.river.cluster_id;
        data[id]['cluster_name'] = river_config.river.cluster_name;
    }
    return data;
}

function add_lastRefreshed_info(data, bulk){
  let lr_info = {}

  bulk.map(res => lr_info[res.resource.value] = res.time.value)

  for (let i = 0; i < Object.keys(data).length; i++){
        const id = Object.keys(data)[i];
        data[id]['rdf_lastRefreshed'] = lr_info[id];
    }
  return data;
}

function add_language(data){
    for (let i = 0; i < Object.keys(data).length; i++){
        const id = Object.keys(data)[i];
        let row = data[id];
        if (row['language'] === undefined){
            data[id]['language'] = 'en'
        }
    }
    return data;
}

function resolve_duplicates(results){
  let clean_results = {results:{bindings:[]}}
  results.results.bindings.sort((a,b)=>(a.time.value > b.time.value) ? 1 : -1)
  for (let i = 0; i < results.results.bindings.length; i++){
    let found_clean = -1
    for (let j = 0; j < clean_results.results.bindings.length; j++){
      if (results.results.bindings[i].resource.value === clean_results.results.bindings[j].resource.value){
        found_clean = j
      }
    }
    if (found_clean === -1){
      clean_results.results.bindings.push(results.results.bindings[i])
    }
    else {
      clean_results.results.bindings[found_clean].time.value += ", " + results.results.bindings[i].time.value
    }
  }
  return clean_results;
}

const get_rdfs_from_endpoint = async(options) => {
    return new Promise(async (resolve, reject) => {
        try{
            const river_config = options.river_config;
            const start_time = river_config.start_time || "1970-01-01T00:00:00";

            const query_template =
                "PREFIX xsd:<http://www.w3.org/2001/XMLSchema#> \n"
                    + "SELECT DISTINCT ?resource ?time WHERE { \n"
                    + " GRAPH ?graph { <sync_conditions> }\n"
                    + " ?graph <<sync_time_prop>> ?time .  <graph_sync_conditions> \n"
                    + " FILTER (?time > xsd:dateTime('<start_time>')) }\n";

            const query = query_template
                            .replace('<sync_conditions>', river_config.river.conf.syncConditions.join(' '))
                            .replace('<sync_time_prop>', river_config.river.conf.syncTimeProp)
                            .replace('<graph_sync_conditions>', river_config.river.conf.graphSyncConditions.join(' . '))
                            .replace('<start_time>', start_time);

            console.log("Cluster:", river_config.river.cluster_id, "Execute query:", query);

            let results = await execute_query(river_config.endpoint, query);
            results = resolve_duplicates(results)
            console.log("Cluster:", river_config.river.cluster_id, "Retrieved", results.results.bindings.length, "documents");

            resolve(results.results.bindings);
        }
        catch(err){
            const sleep = require('sleep-promise');
            await sleep(5000);
            reject(err);
        }
    });
}
const _get_bulk_from_endpoint = async(river_config, bulk) => {
    return new Promise(async (resolve, reject) => {
        const query_template =
            "\n"
            +"construct {?s ?p ?o}\n"
            +"WHERE {\n"
            +" {\n"
            +"  ?s ?p ?o .\n"
            +"  FILTER NOT EXISTS { ?o <http://www.w3.org/2000/01/rdf-schema#label> ?o1 } .\n"
            +"  FILTER NOT EXISTS { ?o <http://purl.org/dc/terms/title> ?o2 } .\n"
            +" } \n"
            +" UNION \n"
            +" {\n"
            +"  SELECT DISTINCT ?s ?p (str(?label) as ?o) \n"
            +"  { \n"
            +"   ?s ?p ?res .\n"
            +"   {\n"
            +"    ?res <http://www.w3.org/2000/01/rdf-schema#label> ?label .\n"
            +"   } UNION {\n"
            +"     ?res <http://purl.org/dc/terms/title> ?label .\n"
            +"   }\n"
            +"  }\n"
            +" }\n"
            +" FILTER (?s in \n"
            +"  (<URIS>)\n"
            +" ) \n"
            +"}\n"
        let uri_list = [];
        for (let i = 0; i < bulk.length; i++){
            uri_list.push('<' + bulk[i].resource.value + '>')
        }
        const uri_list_str = uri_list.join(',')
        const query = query_template.split('<URIS>').join(uri_list_str).split('<SYNCTIMEPROP>').join(river_config.river.conf.syncTimeProp);
        console.log("Cluster:", river_config.river.cluster_id, "QUERY:", query)

        let data;
        try{
            data = await execute_construct(river_config.endpoint, query);
        }
        catch(error){
            const tmp_error = {error:error, rdfs:bulk, query: query}
            reject(tmp_error);
            return;
        }
        resolve(data);
    })
}

const write_error_in_stats = async(cluster_id, type, resource, msg) => {
    return new Promise(async (resolve, reject) => {
        const idx_helpers = require('eea-searchserver').indexHelpers;
        tmp_stats = await idx_helpers.get_status();
        if (tmp_stats.clusters === undefined){
            tmp_stats.clusters = {};
        }
        if (tmp_stats.clusters.errors === undefined){
            tmp_stats.clusters.errors = {};
        }
        if (tmp_stats.clusters.errors[cluster_id] === undefined){
            tmp_stats.clusters.errors[cluster_id] = {};
        }
        if (tmp_stats.clusters.errors[cluster_id][type] === undefined){
            tmp_stats.clusters.errors[cluster_id][type] = [];
        }
        tmp_stats.clusters.errors[cluster_id][type].push({resource:resource, msg:msg});
        await idx_helpers.set_status(tmp_stats);
        resolve(true);
    });
}

const get_bulk_from_endpoint = async(river_config, bulk) => {
    return new Promise(async (resolve, reject) => {
        const sleep = require('sleep-promise');

        let data = []
        try{
            data = await _get_bulk_from_endpoint(river_config, bulk);
        }
        catch(error){
            console.log("Cluster:", river_config.river.cluster_id, "Error when trying to fetch details for bulk");
            console.log("Cluster:", river_config.river.cluster_id, "Try each document separately");
            console.log("Cluster:", river_config.river.cluster_id, "Error: ", error)
            for (let i = 0; i < bulk.length; i++){
                const tmp_bulk = [bulk[i]];
                let tmp_data = [];
                let has_errors = false;
                try{
                    tmp_data = await _get_bulk_from_endpoint(river_config, tmp_bulk)
                }
                catch(err){
                    console.log("Cluster:", river_config.river.cluster_id, "Error when trying to fetch details for", bulk[i].resource.value);
                    console.log("Cluster:", river_config.river.cluster_id, "Error: ", err)

                    const idx_helpers = require('eea-searchserver').indexHelpers;

                    idx_helpers.imalive();
                    await write_error_in_stats(river_config.river.cluster_id, 'sparql', err.rdfs[0].resource.value, {error:err.error, query:err.query});
                    idx_helpers.imalive();

                    await sleep(10000);
                }
                if (!has_errors){
                    for (let j = 0; j < tmp_data.length; j++){
                        data.push(tmp_data[j]);
                    }
                }
            }
        }
        resolve(data);
    })
}

function nicedate(){
    let date_ob = new Date();

    let date = ("0" + date_ob.getDate()).slice(-2);

    let month = ("0" + (date_ob.getMonth() + 1)).slice(-2);

    let year = date_ob.getFullYear();

    let hours = ("0" + date_ob.getHours()).slice(-2);

    let minutes = ("0" + date_ob.getMinutes()).slice(-2);

    let seconds = ("0" + date_ob.getSeconds()).slice(-2);

    return (year + "-" + month + "-" + date + "_" + hours + ":" + minutes + ":" + seconds);
}

function create_bulk(data){
    let bulk_str = ''
    for (let i = 0; i < Object.keys(data).length; i++){
        const id = Object.keys(data)[i];
        bulk_str += '{"index":{"_id":"' + id + '"}}\n'
        row = data[id]
        row['about'] = id;
        bulk_str += JSON.stringify(row) + "\n";
    }
    return bulk_str;
}

const index_bulk_from_endpoint = async(options) => {
    return new Promise(async (resolve, reject) => {
        const river_config = options.river_config;
        const bulk = options.bulk;

        const idx_helpers = require('eea-searchserver').indexHelpers;
        idx_helpers.imalive();
        console.log("Cluster:", river_config.river.cluster_id, "Start read from sparql:", nicedate());
        let data = await get_bulk_from_endpoint(river_config, bulk);
        idx_helpers.imalive();
        console.log("Cluster:", river_config.river.cluster_id, "End read from sparql:", nicedate());
        console.log("Cluster:", river_config.river.cluster_id, "Start prepare data:", nicedate());
        let json_data = create_documents(data);
        let attrs_to_delete = get_attrs_to_delete(river_config, json_data);
        json_data = apply_black_map(river_config, json_data);
        json_data = apply_white_map(river_config, json_data);
        json_data = remove_empty(json_data);
        json_data = apply_norm_obj(river_config, json_data);
        json_data = apply_norm_prop(river_config, json_data);
        json_data = apply_norm_missing(river_config, json_data);
        json_data = delete_attrs(attrs_to_delete, json_data);
        json_data = add_language(json_data);
        json_data = add_cluster_info(river_config, json_data);
        json_data = add_lastRefreshed_info(json_data, bulk);
        json_data = remove_duplicates(json_data);
        if (river_config.river.enable_values_counting){
            json_data = count_values(json_data);
        }
        console.log("Cluster:", river_config.river.cluster_id, "End prepare data:", nicedate());
        idx_helpers.imalive();
        try{
            const bulk_str = create_bulk(json_data);
            await idx_helpers.index_rdf_bulk(bulk_str);
            resolve(Object.keys(json_data).length);
        }
        catch(err){
            let indexed = 0
            for (let i = 0; i < Object.keys(json_data).length; i++){
                const resource = Object.keys(json_data)[i];
                let tmp_json_data = {}
                tmp_json_data[resource] = json_data[resource];
                try{
                    const bulk_str = create_bulk(tmp_json_data);
                    await idx_helpers.index_rdf_bulk(bulk_str);
                    indexed++;
                }
                catch(e){
                    await write_error_in_stats(river_config.river.cluster_id, 'elastic', resource, e);
                }
            }
            resolve(indexed);
        }
    })
}

const get_modified_docs = async(options) => {
    return new Promise(async (resolve, reject) => {
        try{
            const river_config = options.river_config;
            const deepExtend = require('deep-extend');
            const idx_helpers = require('eea-searchserver').indexHelpers;

            let tmp_river_config = {};

            deepExtend(tmp_river_config, river_config);
            delete(tmp_river_config.start_time);

            idx_helpers.imalive();
            let docs_in_semantic = await get_rdfs_from_endpoint({river_config:tmp_river_config});
            idx_helpers.imalive();

            const docs_in_elastic = await idx_helpers.get_docs_from_index_with_lastRefreshed(tmp_river_config.river.cluster_id);
            idx_helpers.imalive();

            let modified_docs = [];
            for (let i = 0; i < docs_in_semantic.length; i++){
                if (docs_in_elastic[docs_in_semantic[i].resource.value] === undefined){
                    modified_docs.push(docs_in_semantic[i]);
                    console.log("Missing")
                    console.log(docs_in_semantic[i].resource.value)
                }
                else {
                  if (docs_in_elastic[docs_in_semantic[i].resource.value] !== docs_in_semantic[i].time.value){
                    modified_docs.push(docs_in_semantic[i]);
                    console.log("Different")
                    console.log(docs_in_semantic[i].resource.value)
                    console.log("es:      ",docs_in_elastic[docs_in_semantic[i].resource.value])
                    console.log("semantic:",docs_in_semantic[i].time.value)
                  }
                }
            }
            if (modified_docs.length === 0){
              console.log("No changes");
            }

            resolve(modified_docs);
        }
        catch(err){
            resolve(err);
        }
    });
}

const test_and_execute = async(indexName, execute, params) => {
    return new Promise(async (resolve, reject) => {
        try{
            const idx_helpers = require('eea-searchserver').indexHelpers;
            let indexing_cancelled = await idx_helpers.test_interrupt(indexName)
            if (!indexing_cancelled){
                const resp = await execute(params);
                resolve(resp)
            }
            else {
                reject({code:1, msg:"cancelled"})
            }
        }
        catch(e){
            reject(e)
        }
    })
}

const index_river = async(river_config, bulk_size) => {
    return new Promise(async (resolve, reject) => {
        try{
            let total_indexed = 0;
            let indexed = 0;
            const rdfs_list = await test_and_execute(river_config.index, get_modified_docs, {river_config: river_config});

            console.log("Update documents in cluster",river_config.river.cluster_id)

            let tmp_bulk = [];
            for (let i = 0; i < rdfs_list.length; i++){
                if (((i % bulk_size) === 0) && (i > 0)){
                    indexed = await test_and_execute(river_config.index, index_bulk_from_endpoint, {river_config:river_config, bulk:tmp_bulk});
                    total_indexed += indexed;
                    tmp_bulk = [];
                }
                tmp_bulk.push(rdfs_list[i])
            }
            if (tmp_bulk.length !== 0){
                indexed = await test_and_execute(river_config.index, index_bulk_from_endpoint, {river_config:river_config, bulk:tmp_bulk});
                total_indexed += indexed;
                tmp_bulk = [];
            }
            console.log("Cluster:", river_config.river.cluster_id, "Finished indexing");
            resolve(total_indexed);
        }
        catch(e){
            const idx_helpers = require('eea-searchserver').indexHelpers;

            idx_helpers.imalive();
            tmp_stats = await idx_helpers.get_status();
            tmp_stats.status = "failed";
            await write_error_in_stats(river_config.river.cluster_id, 'others', "", e);
            reject({msg:e, code:1});
        }
    })
}

module.exports = {
    index_river : index_river
}
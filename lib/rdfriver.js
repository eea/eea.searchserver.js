const get_rdfs_from_endpoint = async(river_config) => {
    return new Promise(async (resolve, reject) => {
console.log(river_config)
        const start_time = river_config.start_time || "1970-01-01T00:00:00";

        const sparqlHelpers = require('eea-searchserver').sparqlHelpers;

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

        const results = await sparqlHelpers.execute_query(river_config.endpoint, query);

        console.log("Cluster:", river_config.river.cluster_id, "Retrieved", results.results.bindings.length, "documents");

        resolve(results.results.bindings);
    });
}

const get_bulk_from_endpoint = async(river_config, bulk) => {
    return new Promise(async (resolve, reject) => {
        resolve(true);
    })
}

const index_river = async(river_config, bulk_size) => {
    return new Promise(async (resolve, reject) => {
        const rdfs_list = await get_rdfs_from_endpoint(river_config);
        let tmp_bulk = [];
        for (let i = 0; i < rdfs_list.length; i++){
            if (((i % bulk_size) === 0) && (i > 0)){
                await get_bulk_from_endpoint(river_config, tmp_bulk);
                tmp_bulk = [];
            }
            tmp_bulk.push(rdfs_list[i])
        }
        if (tmp_bulk.length !== 0){
            await get_bulk_from_endpoint(river_config, tmp_bulk);
            tmp_bulk = [];
        }
    })
}

module.exports = {
    index_river : index_river
}
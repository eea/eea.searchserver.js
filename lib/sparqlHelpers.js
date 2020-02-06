const execute_query = async(endpoint, query) => {
    return new Promise(async (resolve, reject) => {
        const request = require('request');
        let sparql_result = ''
        const count_req = request({
                url:endpoint,
                method:'POST',
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

const get_docs_from_semantic = async(endpoint, river_configs) => {
    return new Promise(async (resolve, reject) => {
        try{
            let syncConditionsList = [];
            let syncCondition = "";

            let sparql = "PREFIX xsd:<http://www.w3.org/2001/XMLSchema#> \
                            SELECT DISTINCT ?resource WHERE { \
                            GRAPH ?graph { ";

            for (var i = 0; i < river_configs.length; i++) {
                for(var j = 0; j < river_configs[i].conf['syncConditions'].length; j++) {
                    const syncCondition = river_configs[i].conf['syncConditions'][j].match(/{(.*)}/i)[0];
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
            const results = await execute_query(endpoint, sparql)
            const docs = results.results.bindings.map(result => result.resource.value)
            resolve(docs)
        }
        catch(err){
            reject(err);
        }
    });
}

module.exports = {
    execute_query:execute_query,
    get_docs_from_semantic : get_docs_from_semantic
}

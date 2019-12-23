var parse = require('csv-parse/lib/sync');

const execute_query = async function(endpoint, query){
    return new Promise(async (resolve, reject) => {
        try {
            const SparqlClient = require('sparql-client');

            const client = new SparqlClient(endpoint);
            client.query(query).execute(function(error, results){
                if (error){
                    reject(error);
                }
                else{
                    resolve(results);
                }
            })
        }
        catch (err){
            reject(err);
        }
    })
}

var sparqlConsumer = function(options){
    this.options = options;
    this.results = undefined;
    this.counter = 0;
}

sparqlConsumer.prototype = {
    read_data: async function() {
        return new Promise(async (resolve, reject) => {
            try {
                const fs = require("fs");
                const path = require('path');
                let query = fs.readFileSync(path.resolve(this.options.settings.app_dir,this.options.settings.indexingQuery), 'utf8');

                if (this.options.part !== undefined){
                    console.log("Using filter:");
                    for (let i = 0; i < this.options.part.length; i++){
                        console.log(' ' + this.options.part[i].key + ' : ' + this.options.part[i].value)
                        query = query.split("<" + this.options.part[i].key + ">").join(this.options.part[i].value);
                    }
                }

                this.results = await execute_query(this.options.endpoint, query);
                console.log("Received " + this.results.results.bindings.length + " documents");
                resolve(true);
            }
            catch (err){
                reject(err);
            }
        })
    },
    read_bulk: async function() {
        return new Promise(async (resolve, reject) => {
            try {
                if (this.results === undefined){
                    await this.read_data();
                }
                const properties = this.options.analyzers.analyzers.mappings[this.options.elastic.type].properties;
                const analyzers = this.options.analyzers.analyzers.settings.analysis.analyzer;
                let bulk_counter = 0;
                let rows_str = '';
                let head = this.results.head.vars;
                let batch_head = '{"index":{}}';
                let row = undefined;
                while(true){
                    if (this.counter >= this.results.results.bindings.length){
                        break;
                    }

                    has_elements = true;
                    row = this.results.results.bindings[this.counter];
                    this.counter++;
                    bulk_counter++;

                    var toindex = {};
                    for (let i = 0; i < head.length; i++){
                        if (row[head[i]] !== undefined){

                            if (head[i] === "_id"){
                                toindex["es_doc_id"] = row[head[i]].value;
                            }
                            else{
                                toindex[head[i]] = row[head[i]].value;
                            }

                            if (this.options.enableValuesCounting){
                                let items_count = 1;
                                const field_name = head[i];
                                if ((properties[field_name] !== undefined) &&
                                    (properties[field_name].analyzer !== undefined) &&
                                    (analyzers[properties[field_name].analyzer].type === 'pattern')){
                                    const pattern = analyzers[properties[field_name].analyzer].pattern;
                                    const values = parse(row[field_name].value, pattern.trim());
                                    if (values[0]){
                                        items_count = values[0].length;
                                    }
                                }
                                toindex["items_count_" + head[i]] = items_count;
                            }

                            rows_str += batch_head.split("{}").join('{"_id":"' + row["_id"].value + '"}');
                            rows_str += "\n";
                            rows_str += JSON.stringify(toindex);
                            rows_str += "\n";
                        }
                    }
                    if (this.counter % this.options.bulk_size === 0){
                        break;
                    }
                    if (this.counter === this.results.results.bindings.length){
                        break;
                    }
                }
                if (bulk_counter > 0){
                    console.log("Created bulk: " + (this.counter - bulk_counter) + " - " + (this.counter - 1));
                }
                else {
                    console.log("No bulk created");
                }

                const resp = {
                    has_elements : bulk_counter > 0,
                    is_last_bulk : bulk_counter < this.options.bulk_size,
                    rows_str : rows_str,
                    counter : this.counter,
                    bulk_counter : bulk_counter
                }

                resolve(resp);
            }
            catch (err){
                reject(err);
            }
        })
    }
}

module.exports = {
    consumer : sparqlConsumer,
    execute_query : execute_query
}

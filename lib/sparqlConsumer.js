var sparqlConsumer = function(options){
    this.options = options;
    this.results = undefined;
    this.counter = 0;
}

sparqlConsumer.prototype = {
    execute_query: async function(endpoint, query){
        return new Promise(async (resolve, reject) => {
            try {
                const SparqlClient = require('sparql-client');

                const client = new SparqlClient(endpoint);

                client.query(query).execute(function(error, results){
                    resolve(results);
                })

            }
            catch (err){
                reject(err);
            }
        })
    },
    read_data: async function() {
        return new Promise(async (resolve, reject) => {
            try {
                const fs = require("fs");
                const path = require('path');
                const query = fs.readFileSync(path.resolve(this.options.settings.app_dir,this.options.settings.indexingQuery), 'utf8');

                this.results = await this.execute_query(this.options.endpoint, query);
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
                let bulk_counter = 0;
                let rows_str = '';
                let head = this.results.head.vars;
                let batch_head = '{"index":{}}';
                let row = undefined;
                while(true){
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

                            rows_str += batch_head.split("{}").join('{"_id":"' + row["_id"].value + '"}');
                            rows_str += "\n";
                            rows_str += JSON.stringify(toindex);
                            rows_str += "\n";
                        }
                    }

/*                        if (results.head.vars[j] !== "_id"){
                            toindex[results.head.vars[j]] = results.results.bindings[i][results.head.vars[j]].value;
                            if (elastic.enableValuesCounting){
                                var items_count = 1;
                                var field_name = results.head.vars[j];
                                if ((properties[field_name] !== undefined) &&
                                    (properties[field_name].analyzer !== undefined) &&
                                    (analyzers[properties[field_name].analyzer].type === 'pattern')){
                                    var pattern = analyzers[properties[field_name].analyzer].pattern;
                                    var values = parse(results.results.bindings[i][field_name].value, pattern.trim());
                                    if (values[0]){
                                        items_count = values[0].length;
                                    }
                                }
                                toindex["items_count_" + results.head.vars[j]] = items_count;
                            }
                        }
                    }
                }
*/
                    if (this.counter % this.options.bulk_size === 0){
                        break;
                    }
                    if (this.counter === this.results.results.bindings.length){
                        break;
                    }
                }

                console.log("Created bulk: " + (this.counter - bulk_counter) + " - " + (this.counter - 1));

                const resp = {
                    rows_str : rows_str,
                    counter: this.counter,
                    bulk_counter: bulk_counter
                }
                resolve(resp);
            }
            catch (err){
                reject(err);
            }
        })
    }
}

module.exports = sparqlConsumer;
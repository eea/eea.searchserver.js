var streamConsumer = function(options){
    this.options = options;
    counter = 0;
}

streamConsumer.prototype = {
    read_bulk: async function() {
        return new Promise(async (resolve, reject) => {
            try {
                if (this.stream === undefined){
                    this.stream = this.options.stream;
                    var stream = this.stream;
                    var decorator = this.options.decorator;
                    var rows_str = '';
                    var bulk_counter = 0;
                    var counter = 0;
                    var fields = [];
                    var options = this.options;
                    var batch_head = '{"index":{}}';
                    var normalized_keys = {};
                    var processed_first_row = false;
                    var column_names = [];
                    // stream.on('error', function(e){
                    //     debugger;
                    // });
                    stream.on('data', function (row) {
                        let toindex = {};
                        let decorator_values = decorator({'counter':counter, 'row':row, 'normalized_keys': normalized_keys, 'toindex': toindex, 'processed_first_row': processed_first_row});

                        if (decorator_values.processed_first_row !== undefined){
                            processed_first_row = decorator_values.processed_first_row;
                        }
                        if (decorator_values.should_index !== undefined){
                            should_index = decorator_values.should_index;
                        }
                        if (decorator_values.fields !== undefined){
                            fields = decorator_values.fields;
                            column_names = fields;
                        }
                        if (decorator_values.normalized_keys !== undefined){
                            normalized_keys = decorator_values.normalized_keys;
                            column_names = Object.keys(normalized_keys);
                        }
                        if (decorator_values.toindex !== undefined){
                            toindex = decorator_values.toindex;
                        }
                        if (should_index) {
                            bulk_counter++;
                            counter++;
                            if (Array.isArray(row)) {
                                for (let i = 0; i < row.length; i++){
                                    if (row[i] !== 'NULL'){
                                        toindex[fields[i]] = row[i];
                                    }
                                }
                            }
                            let tmp_id = counter;
                            if (options.id_type === 'field'){
                                tmp_id = toindex[options.id_field];
                            }
                            rows_str += batch_head.split("{}").join('{"_id":"' + tmp_id + '"}');
                            rows_str += "\n";

                            const nconf = require('nconf');
                            const path = require('path');
                            var fs = require('fs-extra');
                            if (nconf.get()["source"].configuration.data_modifier !== undefined){
                                try{
                                    const modifier = require(path.join(API_settings.config_dir, nconf.get()["source"].configuration.data_modifier));
                                    toindex = modifier(toindex);
                                }
                                catch(err){
                                    console.log(err);
                                    return;
                                }
                            }

                            rows_str += JSON.stringify(toindex);
                            rows_str += "\n";
                            if ((counter > 0) && (counter % options._bulksize === 0)){
                                console.log("Received: " + (counter - options._bulksize) + " - " + (counter - 1));
                                stream.pause()
                                const resp = {
                                    has_elements : bulk_counter > 0,
                                    is_last_bulk : bulk_counter < options._bulksize,
                                    rows_str : rows_str,
                                    counter : counter,
                                    bulk_counter : bulk_counter,
                                    column_names : column_names
                                }
                                if (stream.callback){
                                    stream.callback(resp);
                                }
                                else{
                                    resolve(resp);
                                }
                                rows_str = ''
                                bulk_counter = 0;
                            }
                        }
                    }).on('end', function (data) {
                        if (rows_str.length !== 0){
                            stream.pause();
                            if (bulk_counter > 0){
                                console.log("Received: " + (counter - bulk_counter) + " - " + (counter - 1));
                            }
                            console.log("Created bulk: " + (counter - bulk_counter) + " - " + (counter - 1));
                            const resp = {
                                has_elements : bulk_counter > 0,
                                is_last_bulk : bulk_counter < options._bulksize,
                                rows_str : rows_str,
                                counter : counter,
                                bulk_counter : bulk_counter,
                                column_names : column_names
                            }
                            if (stream.callback){
                                stream.callback(resp);
                            }
                            else{
                                console.log('No more rows!');
                                resolve(resp);
                            }
                            rows_str = "";
                        }
                        else {
                            const resp = {
                                has_elements : false,
                                is_last_bulk : true
                            }
                            if (stream.callback){
                                stream.callback(resp);
                            }
                            else{
                                console.log('No more rows!');
                                resolve(resp);
                            }

                        }
                    });
                }
                else {
                    this.stream.callback = function(data){
                        resolve(data)
                    }
                    this.stream.resume()
                }
            }
            catch (err){
                reject(err);
            }
        })
    }
}

module.exports = streamConsumer;


function getOptions() {
    var nconf = require('nconf');
    var elastic = nconf.get()['elastic'];
    return {
        'es_host': elastic.host + ':' + elastic.port + elastic.path,
        'auth': elastic.rwuser + ':' + elastic.rwpass,
        'encoded_auth': encodeURIComponent(elastic.rwuser) + ':' + encodeURIComponent(elastic.rwpass),
        'elastic': elastic
    };
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
        return encodeURIComponent(elastic[esuser]) + ":" + encodeURIComponent(elastic[espass]) + "@";
    }
    return "";
}


function nicedate(){
    const nconf = require('nconf');
    const elastic = nconf.get()['elastic'];
    let es_version = 'es6';
    if (elastic['version'] === '7'){
      es_version = 'es7';
    }

    let date_ob = new Date();

    let date = ("0" + date_ob.getDate()).slice(-2);

    let month = ("0" + (date_ob.getMonth() + 1)).slice(-2);

    let year = date_ob.getFullYear();

    let hours = ("0" + date_ob.getHours()).slice(-2);

    let minutes = ("0" + date_ob.getMinutes()).slice(-2);

    let seconds = ("0" + date_ob.getSeconds()).slice(-2);

    let nd = (year + "-" + month + "-" + date + "_" + hours + ":" + minutes + ":" + seconds);
    if (es_version === 'es7'){
        nd = (year + "-" + month + "-" + date + "_" + hours + "_" + minutes + "_" + seconds);
    }
    return nd;
}

var default_callback = function(text, showBody) {
    if (showBody === undefined){
        showBody = true;
    }
    return function(err, statusCode, header, body) {
        console.log(text);
        if (err) {
            console.log(err.message);
        } else {
            console.log('  Successfuly ran query');
            console.log('  ResponseCode: ' + statusCode);
            if (showBody === true){
                console.log('  ' + body);
            }
        }
    };
};

const create_empty_index = async(settings) => {
    return new Promise(async (resolve, reject) => {
        const options = getOptions();
        const esAPI = require('eea-searchserver').esAPI;

        const timestamp = nicedate();
        const index_base_name = options.elastic.index;
        const index_name = index_base_name + '_' + timestamp;

        let helpers = [];
        const status_index = {"name": "STATUS INDEX",
                            "prefix": "status_",
                            "options": {"settings":{"index":{"number_of_shards":1}}}};
        helpers.push(status_index);


        const cache_index = {"name": "CACHE INDEX",
                            "prefix": "cache_",
                            "options": {"settings":{"index":{"number_of_shards":1}}}};
        helpers.push(cache_index);

        if (settings.rivers){
            const river_status_index = {"name": "RIVER STATUS INDEX",
                                "prefix": "river_status_",
                                "options": {"settings":{"index":{"number_of_shards":1}}}};
            helpers.push(river_status_index);
        }

        const actual_index = {"name": "INDEX",
                            "prefix": '',
                            "options": settings.analyzers,
                            "callback": function(){
                                            console.log("ALIAS " + index_base_name + '_latest points to ' + index_name)
                                            resolve(index_name)
                                        }
                            }
        helpers.push(actual_index);

        let esa = new esAPI(getOptions())
        helpers.forEach(function(helper){
            const h_index_name = helper.prefix + index_name;
            esa.PUT(h_index_name, helper.options, default_callback("CREATED " + helper.name + " " + h_index_name));

            const remove_cmd = '{"actions":[{"remove":{"alias":"' + helper.prefix + index_base_name + '_latest' + '","index":"*"}}]}';
            esa.POST("_aliases", remove_cmd, default_callback("REMOVED " + helper.name + " LATEST ALIAS"));

            const add_generic_alias_cmd = '{"actions":[{"add":{"alias":"' + helper.prefix + index_base_name + '","index":"'+helper.prefix + index_name+'"}}]}';
            esa.POST("_aliases", add_generic_alias_cmd, default_callback("ADDED " + helper.prefix + index_base_name + " ALIAS"));

            const add_latest_alias_cmd = '{"actions":[{"add":{"alias":"' + helper.prefix + index_base_name+'_latest' + '","index":"'+helper.prefix + index_name + '"}}]}';
            if (helper.callback === undefined){
                esa.POST("_aliases", add_latest_alias_cmd, default_callback("ALIAS " + helper.prefix + index_base_name + "_latest points to " + helper.prefix + index_name));
            }
            else {
                esa.POST("_aliases", add_latest_alias_cmd, helper.callback);
            }
        })
        esa.execute()
    });
}

const test_analyzers = async(analyzers) => {
    return new Promise(async (resolve, reject) => {
        const esAPI = require('eea-searchserver').esAPI;

        const options = getOptions();
        const index_base_name = options.elastic.index;

        const test_index_name = index_base_name + "_test_analyzers";
        const esa = new esAPI(options);
        esa.DELETE(test_index_name, function(err, s, h, b){
            if (err !== null){
                resolve(false)
            }
        });
        esa.PUT(test_index_name, analyzers,
            function(err, s, h, b){
                if (s !== undefined && s.toString() !== '200'){
                    console.log(b);
                    esa.DELETE(test_index_name, function(text, showbody){
                        resolve(false);
                    });
                    esa.execute();

                } else {
                    esa.DELETE(test_index_name, function(err, s, h, b){
                        resolve(true);
                    });
                    esa.execute();
                }
            });

        esa.DELETE(test_index_name, function(text, showbody){});
        esa.execute();
    });
}

const index_bulk = async(bulk, docs_nr, parts_nr, count) => {
    return new Promise(async (resolve, reject) => {
        console.log("Indexing bulk: " + parts_nr + " - " + (count - 1));
        const esAPI = require('eea-searchserver').esAPI;
        const request = require('request');

        const options = getOptions();
        const index_base_name = options.elastic.index;
        const latest_alias = index_base_name + "_latest";

        const status_url = 'http://' + getAuth('rw') + options.es_host +
                           latest_alias+'/_stats';
        const sleep = require('sleep-promise');

        // while (true) {
        //     let status = -1;
        //     const status_resp = await request_promise(status_url)
        //     if (status_resp.error !== null){
        //         debugger;
        //     }
        //     else {
        //         const body = JSON.parse(status_resp.body);
        //         try{
        //             const idx_name = Object.keys(body.indices)[0];
        //             status = body.indices[idx_name].primaries.translog.uncommitted_operations;
        //             let docs_count = body.indices[idx_name].primaries.docs.count;
        //             if (docs_count === docs_nr){
        //                 status = 0;
        //             }
        //             if (isNaN(status)){
        //                 status = -1;
        //             }
        //         }catch(e){
        //             console.log("\n\n ERROR: " + e + "\n\n" );
        //             status = -1;
        //         }
        //         if (status > 0){
        //             await sleep(1000)
        //             console.log("There are transactions in ES");
        //         }
        //         if (status === 0){
        //             console.log("There are no more transactions in ES");
        //             console.log("Index bulk in ES");
        //             new esAPI(options)
        //                 .POST(latest_alias+"/"+options.elastic.type+"/_bulk", bulk,
        //                     function(){
        //                         resolve(true)
        //                     }
        //                 )
        //                 .execute();
        //         }
        //     }
        // }

        function indexWhenNoMoreOperations(){
            let status = -1;
            request({url: status_url, json:true}, function (error, response, body) {
                try{
                    const idx_name = Object.keys(body.indices)[0];
                    status = body.indices[idx_name].primaries.translog.uncommitted_operations;
                    let docs_count = body.indices[idx_name].primaries.docs.count;
                    if (docs_count === docs_nr){
                        status = 0;
                    }
                    if (isNaN(status)){
                        status = -1;
                    }
                }catch(e){
                    console.log("\n\n ERROR: " + e + "\n\n" );
                    status = -1;
                }
                if (status > 0){
                    console.log("There are transactions in ES");
                    sleep(1000).then(function() {
                        indexWhenNoMoreOperations();
                    });
                }
                if (status === 0){
                    console.log("There are no more transactions in ES");
                    console.log("Index bulk in ES");
                    const nconf = require('nconf');
                    const elastic = nconf.get()['elastic'];
                    let es_version = 'es6';
                    if (elastic['version'] === '7'){
                        es_version = 'es7';
                    }
                    let bulk_post = latest_alias+"/"+options.elastic.type+"/_bulk";
                    if (es_version === 'es7'){
                        bulk_post = latest_alias+"/_bulk"
                    }
                    let retry = false;

                    const sleep = require('sleep-promise');

                    function index_bulk_when_possible(blk_api, blk_opts, blk_post, blk, blk_alias){
                      new blk_api(blk_opts)
                          .POST(blk_post, blk,
                              function(err, statusCode, header, body){
                                console.log(err, statusCode, header);
                                if ((err) || (statusCode.toString() !== '200')){
                                  console.log("Error on bulk")
                                  console.log(err, statusCode, header, body);
                                  if (statusCode.toString() === '429'){
                                    console.log("RETRY BULK")
                                    sleep(1000).then(function() {
                                      index_bulk_when_possible(blk_api, blk_opts, blk_post, blk, blk_alias)
                                    });
                                  }
                                  else{
                                    reject(false)
                                  }
                                }
                                else{
                                  resolve(true)
                                }
                              }
                          )
                          .GET(blk_alias+"/_flush",null,function(err, statusCode, header, body){
                                console.log("flush");
                                console.log(err, statusCode, header, body);
                              }
                          )
                          .execute();
                    }
                    index_bulk_when_possible(esAPI, options, bulk_post, bulk, latest_alias)
                }
            });
        }

        indexWhenNoMoreOperations();

    });
}

const wait_for_transactions = async() => {
    return new Promise(async (resolve, reject) => {
        const esAPI = require('eea-searchserver').esAPI;
        const request = require('request');

        const options = getOptions();
        const index_base_name = options.elastic.index;
        const latest_alias = index_base_name + "_latest";

        console.log("waiting to finish transactions on:", latest_alias);

        const status_url = 'http://' + getAuth('rw') + options.es_host +
                           latest_alias+'/_stats';
        const sleep = require('sleep-promise');

        function testOperations(){
            let status = -1;
            request({url: status_url, json:true}, function (error, response, body) {
                try{
                    const idx_name = Object.keys(body.indices)[0];
                    status = body.indices[idx_name].primaries.translog.uncommitted_operations;
                    let docs_count = body.indices[idx_name].primaries.docs.count;
                    if (isNaN(status)){
                        status = -1;
                    }
                }catch(e){
                    console.log("\n\n ERROR: " + e + "\n\n" );
                    status = -1;
                }
                if (status > 0){
                    console.log("There are transactions in ES");
                    sleep(1000).then(function() {
                        testOperations();
                    });
                }
                if (status === 0){
                    console.log("There are no more transactions in ES");
                    resolve(true);
                }
            });
        }

        testOperations();

    });

}

const remove_old_indices = async(opt_threshold) => {
    return new Promise(async (resolve, reject) => {
        const esAPI = require('eea-searchserver').esAPI;

        const options = getOptions();
        const index_base_name = options.elastic.index;
        const latest_alias = index_base_name + "_latest";
        const prod_alias = index_base_name + "_prod";
        new esAPI(options)
            .GET(index_base_name + '*','',function(stats_err, stats_statusCode, stats_header, stats_body){
                var stats = JSON.parse(stats_body);
                var indexes = Object.keys(stats);
                var idx_list = [];
                if (indexes.length === 0){
                    resolve(true);
                    return;
                }
                for (var i = 0; i < indexes.length; i++){
                    if ((stats[indexes[i]].aliases[index_base_name] !== undefined) &&
                        (stats[indexes[i]].aliases[latest_alias] === undefined) &&
                        (stats[indexes[i]].aliases[prod_alias] === undefined)) {
                            idx_list.push ({name:indexes[i], creation_date:stats[indexes[i]].settings.index.creation_date});
                        }
                }
                let threshold = options.elastic.increment_threshold || 3;
                if (opt_threshold !== undefined) {threshold = 0}
                if (idx_list.length - threshold < 1){
                    resolve(true);
                    return;
                }
                idx_list.sort((a, b) => (a.creation_date < b.creation_date) ? 1 : -1)
                if (idx_list.length > threshold){
                    var idx_to_delete = [];
                    for (var i = threshold; i < idx_list.length; i++){
                        idx_to_delete.push(idx_list[i].name);
                    }
                    let es = new esAPI(options);
                    for (let i = 0; i < idx_to_delete.length; i++){
                        es.DELETE("cache_" + idx_to_delete[i], default_callback("REMOVE OLD CACHE INDEX: cache_" + idx_to_delete[i]))
                        es.DELETE("river_status_" + idx_to_delete[i], default_callback("REMOVE OLD RIVER STATUS INDEX: river_status_" + idx_to_delete[i]))
                        es.DELETE("status_" + idx_to_delete[i], default_callback("REMOVE OLD STATUS INDEX: status_" + idx_to_delete[i]))
                        if (i < idx_to_delete.length - 1){
                            es.DELETE(idx_to_delete[i], default_callback("REMOVE OLD INDEX: " + idx_to_delete[i]))
                        }
                        else {
                            es.DELETE(idx_to_delete[i],
                                function(){
                                    console.log("REMOVED OLD INDEXES: " + idx_to_delete[i])
                                    resolve(true)
                                }
                            )
                        }
                    }
                    es.execute();
                }
            })
            .execute();
    });
}

const request_promise = async(url) => {
    const request = require("request")
    return new Promise(async  (resolve, reject) => {
        request(url, function(error, response, body){
            resolve ({error: error, response: response, body: body});
        });
    });
}

const test_elastic = async() => {
    return new Promise(async (resolve, reject) => {
        const options = getOptions();
        const index_base_name = options.elastic.index;
        const latest_alias = index_base_name + "_prod";
        const status_url = 'http://' + getAuth('rw') + options.es_host +
                           latest_alias+'/_stats';

        const status = await request_promise(status_url)
        if (status.error !== null){
            resolve({elastic:status.error.code});
        }
        else {
            let resp = {elastic:'ok',index:'ok'};
            const body = JSON.parse(status.body);
            if (body.error !== undefined){
                resp.index = body.error.root_cause[0].type;
            }
            resolve(resp);
        }
    });
}

const switch_prod_alias = async(settings) => {
    return new Promise(async (resolve, reject) => {
        await switch_alias(settings, '_latest', '_prod');
        resolve(true);
    });
}

const switch_latest_alias = async(settings) => {
    return new Promise(async (resolve, reject) => {
        await switch_alias(settings, '_prod', '_latest');
        resolve(true);
    });
}

const switch_alias = async(settings, source, target) => {
    return new Promise(async (resolve, reject) => {
        var nconf = require('nconf');
        const esAPI = require('eea-searchserver').esAPI;

        var elastic = nconf.get()['elastic'];

        const sourcealias = elastic.index + source;
        const targetalias = elastic.index + target;

        new esAPI(getOptions())
            .GET('_alias/' +  sourcealias, '',
                function(rsp, rsp_code, rsp_header, rsp_data){
                    var data = JSON.parse(rsp_data);
                    var indexes = Object.keys(data);
                    var found_indexes = [];
                    for (var i = 0; i < indexes.length; i++){
                        var index = indexes[i];
                        var aliases = data[index].aliases;
                        if (aliases !== undefined){
                            var alias_names = Object.keys(aliases)
                            for (var j = 0; j < alias_names.length; j++){
                                if (alias_names[j] === sourcealias){
                                    found_indexes.push(index)
                                }
                            }
                        }
                    }
                    if (found_indexes.length === 0){
                        if (settings.API_callback !== undefined){
                            settings.API_callback({'error':'no alias found'});
                        }
                        else {
                            console.log({'error':'no alias found'});
                        }
                    }
                    if (found_indexes.length > 1){
                        if (settings.API_callback !== undefined){
                            settings.API_callback({'error':'more indexes with the alias found'});
                        }
                        else{
                            console.log({'error':'more indexes with the alias found'});
                        }
                    }
                    if (found_indexes.length === 1){
                        const remove_alias = '{"actions":[{"remove":{"alias":"' + targetalias + '","index":"*"}}]}';
                        const add_alias = '{"actions":[{"add":{"alias":"' + targetalias + '","index":"' + found_indexes[0] + '"}}]}';
                        const remove_stats_alias = '{"actions":[{"remove":{"alias":"status_' + targetalias + '","index":"*"}}]}';
                        const add_stats_alias = '{"actions":[{"add":{"alias":"status_' + targetalias + '","index":"status_' + found_indexes[0] + '"}}]}';
                        const remove_river_alias = '{"actions":[{"remove":{"alias":"river_status_' + targetalias + '","index":"*"}}]}';
                        const add_river_alias = '{"actions":[{"add":{"alias":"river_status_' + targetalias + '","index":"river_status_' + found_indexes[0] + '"}}]}';
                        const remove_cache_alias = '{"actions":[{"remove":{"alias":"cache_' + targetalias + '","index":"*"}}]}';
                        const add_cache_alias = '{"actions":[{"add":{"alias":"cache_' + targetalias + '","index":"cache_' + found_indexes[0] + '"}}]}';
                        new esAPI(getOptions())
                            .POST("_aliases", remove_alias, default_callback(
                                "REMOVED OLD ALIAS"))
                            .POST("_aliases", remove_stats_alias, default_callback(
                                "REMOVED OLD ALIAS"))
                            .POST("_aliases", add_stats_alias, default_callback(
                                "Alias status_" + targetalias + " points to status_" + found_indexes[0]))

                            .POST("_aliases", remove_river_alias, default_callback(
                                "REMOVED OLD ALIAS"))
                            .POST("_aliases", add_river_alias, default_callback(
                                "Alias river_status_" + targetalias + " points to river_status_" + found_indexes[0]))

                            .POST("_aliases", remove_cache_alias, default_callback(
                                "REMOVED OLD ALIAS"))
                            .POST("_aliases", add_cache_alias, default_callback(
                                "Alias cache_" + targetalias + " points to status_" + found_indexes[0]))
                            .POST("_aliases", add_alias, function(err, statusCode, header, body){
                                    if (settings.API_callback !== undefined){
                                        settings.API_callback({"prod":found_indexes[0]})
                                    }
                                    default_callback("Alias " + targetalias + " points to " + found_indexes[0])(err, statusCode, header, body);
                                    resolve(true);
                                })
                            .execute();
                    }
                })
            .execute();

    });
}

const set_status = async(settings) => {
    return new Promise(async (resolve, reject) => {
        settings.timestamp = new Date()
        var nconf = require('nconf');
        const esAPI = require('eea-searchserver').esAPI;

        var elastic = nconf.get()['elastic'];

        const statusalias = "status_" + elastic.index + '_latest';

        new esAPI(getOptions())
            .PUT(statusalias + "/status/status",settings,function(){
                resolve(true);
            })
            .execute()
    });
}

const get_status = async(alias) => {
    if (alias === undefined){
        alias = 'latest'
    }
    return new Promise(async (resolve, reject) => {
        var nconf = require('nconf');
        const esAPI = require('eea-searchserver').esAPI;

        var elastic = nconf.get()['elastic'];

        const statusalias = "status_" + elastic.index + "_" + alias;
        new esAPI(getOptions())
            .GET(statusalias + "/status/status",{},function(stats_err, stats_statusCode, stats_header, stats_body){
                if (stats_err !== null){
                    resolve(false)
                }
                else {
                    if (stats_body !== null){
                        const body = JSON.parse(stats_body)
                        resolve(body._source);
                    }
                    else {
                        resolve(false)
                    }
                }
            })
            .execute()
    });
}

const imalive = async(alias) => {
    return new Promise(async (resolve, reject) => {
        const status = await get_status();
        await set_status(status);
        resolve(true);
    });
}

const get_mapping = async(alias) => {
    if (alias === undefined){
        alias = 'latest'
    }
    return new Promise(async (resolve, reject) => {
        var nconf = require('nconf');
        const esAPI = require('eea-searchserver').esAPI;

        var elastic = nconf.get()['elastic'];

        const index_alias = elastic.index + "_" + alias;
        new esAPI(getOptions())
            .GET(index_alias + "/_mapping",{},function(stats_err, stats_statusCode, stats_header, stats_body){
                if (stats_err !== null){
                    resolve(false)
                }
                else {
                    if (stats_body !== null){
                        const body = JSON.parse(stats_body)
                        resolve(body);
                    }
                    else {
                        resolve(false)
                    }
                }
            })
            .execute()
    });
}

const get_index_by_alias = async(alias) => {
    if (alias === undefined){
        alias = 'latest'
    }
    return new Promise(async (resolve, reject) => {
        var nconf = require('nconf');
        const esAPI = require('eea-searchserver').esAPI;

        var elastic = nconf.get()['elastic'];

        const index_alias = elastic.index + '_' + alias;

        new esAPI(getOptions())
            .GET('_alias/' + index_alias,{},function(stats_err, stats_statusCode, stats_header, stats_body){
                if (stats_body !== null){
                    stats_body = JSON.parse(stats_body);
                }
                const resp = {err:stats_err, body:stats_body}
                resolve(resp);
            })
            .execute();
    });
}

const get_index_stats = async() => {
    return new Promise(async (resolve, reject) => {
        var nconf = require('nconf');
        const esAPI = require('eea-searchserver').esAPI;

        var elastic = nconf.get()['elastic'];

        const index_alias = elastic.index;

        new esAPI(getOptions())
            .GET(index_alias + '/_stats',{},function(stats_err, stats_statusCode, stats_header, stats_body){
                if ((stats_body !== null) && (stats_body !== undefined)){
                    stats_body = JSON.parse(stats_body);
                }
                const resp = {err:stats_err, body:stats_body}
                resolve(resp);
            })
            .execute();
    });
}

const test_interrupt = async(index_name) => {
    return new Promise(async (resolve, reject) => {
        var nconf = require('nconf');
        const esAPI = require('eea-searchserver').esAPI;

        var elastic = nconf.get()['elastic'];

        const demoalias = elastic.index + '_latest';

        const status = await get_status('latest')
        if ((status.status === 'cancelled') || (status.status === 'failed')){
            resolve(true);
            return;
        }

        new esAPI(getOptions())
            .GET(demoalias,'',function(stats_err, stats_statusCode, stats_header, stats_body){
                if (stats_err !== null){
                    resolve(true);
                }
                else {
                    if (JSON.parse(stats_body)[index_name] === undefined){
                        resolve(true)
                    }
                    else {
                        if (JSON.parse(stats_body)[index_name].aliases[demoalias] === undefined){
                            resolve(true);
                        }
                        else {
                            resolve(false);
                        }
                    }
                }
            })
            .execute()
    });
}

const remove_data = async() => {
    return new Promise(async (resolve, reject) => {
        const esAPI = require('eea-searchserver').esAPI;

        const options = getOptions();
        const index_base_name = options.elastic.index;

        new esAPI(options)
            .GET(index_base_name + '*','',function(stats_err, stats_statusCode, stats_header, stats_body){
                var stats = JSON.parse(stats_body);
                var idx_to_delete = Object.keys(stats);

                if (idx_to_delete.length > 0){
                    let es = new esAPI(options);
                    for (let i = 0; i < idx_to_delete.length; i++){
                        es.DELETE("cache_" + idx_to_delete[i],
                            function(){
                                console.log("REMOVE CACHE INDEX: cache_" + idx_to_delete[i])
                            }
                        )
                        es.DELETE("river_status_" + idx_to_delete[i],
                            function(){
                                console.log("REMOVE RIVER STATUS INDEX: river_status_" + idx_to_delete[i])
                            }
                        )
                        es.DELETE("status_" + idx_to_delete[i],
                            function(){
                                console.log("REMOVE STATUS INDEX: status_" + idx_to_delete[i])
                            }
                        )
                        if (i < idx_to_delete.length - 1){
                            es.DELETE(idx_to_delete[i],
                                function(){
                                    console.log("REMOVE INDEX: " + idx_to_delete[i])
                                }
                            )
                        }
                        else {
                            es.DELETE(idx_to_delete[i],
                                function(){
                                    console.log("REMOVE INDEX: " + idx_to_delete[i])
                                    resolve(true)
                                }
                            )
                        }
                    }
                    es.execute();
                }
                else {
                    console.log("NO INDEX TO REMOVE");
                    resolve(true);
                }
            })
            .execute();
    });
}

const reindex_index = async(index_name) => {
    return new Promise(async (resolve, reject) => {
        var getenv = require('getenv');

        const env_rsp = getenv.string('elastic_requests_per_second', '')

        const esAPI = require('eea-searchserver').esAPI;

        const options = getOptions();

        const qs = {
            "source": {
                "index": index_name + "_prod"
            },
            "dest": {
                "index": index_name + "_latest"
            }
        }
        const rps = env_rsp || options.elastic.requests_per_second || 200;
        console.log("Starting reindex from " + index_name + "_prod to " + index_name + "_latest");
        console.log("Requests per second:", rps);
        new esAPI(options)
            .POST('_reindex?requests_per_second=' + rps, qs, function(err, statusCode, header, body){
                if (err === null){
                    if (JSON.parse(body).error !== undefined){
                        console.log("Error: Reindex from " + index_name + "_prod to " + index_name + "_latest failed");
                        console.log(JSON.parse(body).error.reason)
                        resolve(false)
                    }
                    else if (JSON.parse(body).total === JSON.parse(body).created){
                        console.log("Reindex from " + index_name + "_prod to " + index_name + "_latest was successful");
                        resolve(true);
                    }
                    else {
                        console.log("Error: Reindex from " + index_name + "_prod to " + index_name + "_latest failed");
                        console.log("Not all documents were reindexed")
                        resolve(false)
                    }
                }
                else {
                    console.log("Error: Reindex from " + index_name + "_prod to " + index_name + "_latest failed");
                    console.log(err)
                    resolve(false)
                }
            })
            .GET(index_name + '_latest' + "/_flush",null,function(err, statusCode, header, body){
                  console.log("flush");
                  console.log(err, statusCode, header, body);
                }
            )
            .execute();
    });
}


const reindex = async() => {
    return new Promise(async (resolve, reject) => {
        const options = getOptions();
        let success = false;
        let count = 0;
        while(true){
            count++
            success = await reindex_index(options.elastic.index);
            if (success){
                break
            }
            else {
                if (count < 3){
                    console.log("Try again")
                }
                else {
                    break;
                }
            }
        }
        if (success){
            await reindex_index("river_status_" + options.elastic.index);
            await reindex_index("cache_" + options.elastic.index);
            resolve(true);
        }
        else {
            reject(false);
        }
    });
}

const create_river = async(settings) => {
    return new Promise(async (resolve, reject) => {
        const nconf = require('nconf');
        const esAPI = require('eea-searchserver').esAPI;

        const elastic = nconf.get()['elastic'];

        const start_time = settings.start_time || "1970-01-01T00:00:00";

        console.log('***Setting startTime for cluster ' + settings.river.cluster_id + " " + start_time);

        if (settings.river.conf.graphSyncConditions === undefined){
            settings.river.conf.graphSyncConditions = [];
        }
        settings.river.conf.proplist.push('cluster_id');
        settings.river.conf.normMissing['cluster_id'] = settings.river.cluster_id;
        settings.river.conf.proplist.push('cluster_name');
        settings.river.conf.normMissing['cluster_name'] = settings.river.cluster_name;

        let river_config = {
            river_meta : elastic.riverindex + '/' + settings.river.cluster_id + '/_meta',
            syncReq : {
                type : 'eeaRDF',
                eeaRDF : {
                    'endpoint': settings.endpoint,
                    'indexType': 'sync',
                    'syncConditions': settings.river.conf.syncConditions.join(''),
                    'graphSyncConditions': settings.river.conf.graphSyncConditions.join(''),
                    'syncTimeProp': settings.river.conf.syncTimeProp,
                    'startTime': start_time,
                    'queryType': settings.river.conf.queryType,
                    'proplist': settings.river.conf.proplist,
                    'listtype': settings.river.conf.listtype,
                    'normProp': settings.river.conf.normProp,
                    'normMissing': settings.river.conf.normMissing,
                    'blackMap': settings.river.conf.blackMap,
                    'whiteMap': settings.river.conf.whiteMap,
                    'normObj': settings.river.conf.normObj,
                    'syncOldData': true,
                    'addCounting': elastic.enableValuesCounting
                },
                'index': {
                    'index': elastic.index + '_latest',
                    'type': elastic.type,
                    'switchAlias': false,
                    'statusIndex': 'river_status_' + elastic.index + '_latest'
                }
            }
        }

        new esAPI(getOptions())
            .PUT(elastic.riverindex + '/river/' + settings.river.cluster_id,river_config,function(err, statusCode, header, body){
                console.log("Added river for", settings.river.cluster_id);
                resolve(true);
            })
            .execute();
    });
}

const test_index_from_river_in_progress = async() => {
    return new Promise(async (resolve, reject) => {
        const nconf = require('nconf');
        const esAPI = require('eea-searchserver').esAPI;

        const elastic = nconf.get()['elastic'];

        const qs = {
            "query": {
                "bool": {
                    "must": [{
                        "term": {
                            "index.index": elastic.index + '_latest'
                        }
                    }]
                }
            }
        };

        new esAPI(getOptions())
            .GET(elastic.riverindex + '/_search', qs, function(err, statusCode, header, body){
                if (!err){
                    let river_count = 0;
                    try {
                        river_count = parseInt(JSON.parse(body).hits.total);
                    }
                    catch(e){
                        river_count = 0;
                    }
                    if (river_count === 0){
                        console.log("No indexing in progress");
                        resolve(false);
                    }
                    else {
                        console.log("Number of rivers in the river index:", river_count);
                        resolve(true);
                    }
                }
                else {
                    console.log("Error while testing rivers");
                    resolve(true);
                }
            })
            .execute();
    })
}

const get_docs_from_index = async(cluster_id) => {
    return new Promise(async (resolve, reject) => {

        const elasticsearch = require('elasticsearch');
        const options = getOptions();

        const client = new elasticsearch.Client({
            host: 'http://' + options.auth + "@" + options.elastic.host + ':' + options.elastic.port,
            type: 'stdio',
            levels: ['error']
        });

        const ElasticsearchScrollStream = require('elasticsearch-scroll-stream')

        const nconf = require('nconf');
        const elastic = nconf.get()['elastic'];
        let es_version = 'es6';
        if (elastic['version'] === '7'){
          es_version = 'es7';
        }
        let query = {}
        if (es_version === 'es6'){
          query = {
            "query": {
              "bool": {
                "filter": {
                  "type": {
                    "value": options.elastic.type
                  }
                }
              }
            }
          }
        }
        if (es_version === 'es7'){
          query = {
            "query": {
              "bool": {
                "must": [
                  {
                    "match_all": {}
                  }
                ]
              }
            }
          }
        }
        if (cluster_id !== undefined){
          if (es_version === 'es6'){
            query = {
                "query": {
                    "bool": {
                        "filter": [
                            {
                                "type": {
                                    "value": options.elastic.type
                                }
                            },
                            {
                                "term": {
                                    "cluster_id": cluster_id
                                }
                            }
                        ]
                    }
                }
            }
          }
          if (es_version === 'es7'){
            query = {
                "query": {
                    "bool": {
                        "filter": [
                            {
                                "term": {
                                    "cluster_id": cluster_id
                                }
                            }
                        ]
                    }
                }
            }
          }
        }
        let es_stream_options = {
            index: options.elastic.index + "_latest",
            scroll: '10s',
            size: 50,
            _source: ["about"],
            body: query
        }

        if (es_version === 'es6'){
          es_stream_options['type'] = options.elastic.type
        }
        const es_stream = new ElasticsearchScrollStream(client, es_stream_options)
        let elastic_result = [];
        es_stream.on('data', function(data) {
            elastic_result.push(JSON.parse(data.toString()).about)
        });

        es_stream.on('end', function() {
            resolve(elastic_result);
        });

        es_stream.on('error', function(err) {
            console.log(err)
        });
    });
}

const get_docs_from_index_with_lastRefreshed = async(cluster_id) => {
    return new Promise(async (resolve, reject) => {

        const elasticsearch = require('elasticsearch');
        const options = getOptions();

        const client = new elasticsearch.Client({
            host: 'http://' + options.auth + "@" + options.elastic.host + ':' + options.elastic.port,
            type: 'stdio',
            levels: ['error']
        });

        const ElasticsearchScrollStream = require('elasticsearch-scroll-stream')
        const nconf = require('nconf');
        const elastic = nconf.get()['elastic'];
        let es_version = 'es6';
        if (elastic['version'] === '7'){
          es_version = 'es7';
        }

        let query = {}
        if (es_version === 'es6'){
            query = {
                "query": {
                    "bool": {
                        "filter": {
                            "type": {
                                "value": options.elastic.type
                            }
                        }
                    }
                }
            }
        }
        if (es_version === 'es7'){
          query = {
            "query": {
              "bool": {
                "must": [
                  {
                    "match_all": {}
                  }
                ]
              }
            }
          }
        }
        if (cluster_id !== undefined){
          if (es_version === 'es6'){
            query = {
                "query": {
                    "bool": {
                        "filter": [
                            {
                                "type": {
                                    "value": options.elastic.type
                                }
                            },
                            {
                                "term": {
                                    "cluster_id": cluster_id
                                }
                            }
                        ]
                    }
                }
            }
          }
          if (es_version === 'es7'){
            query = {
                "query": {
                    "bool": {
                        "filter": [
                            {
                                "term": {
                                    "cluster_id": cluster_id
                                }
                            }
                        ]
                    }
                }
            }
          }
        }
        let es_stream_options = {
            index: options.elastic.index + "_latest",
            scroll: '10s',
            size: 50,
            _source: ["about", "rdf_lastRefreshed"],
            body: query
        }
        if (es_version === 'es6'){
          es_stream_options['type'] = options.elastic.type
        }
        const es_stream = new ElasticsearchScrollStream(client, es_stream_options);
        let elastic_result = {};
        es_stream.on('data', function(data) {
              elastic_result[JSON.parse(data.toString()).about] = JSON.parse(data.toString()).rdf_lastRefreshed;
        });

        es_stream.on('end', function() {
            resolve(elastic_result);
        });

        es_stream.on('error', function(err) {
            console.log(err)
        });
    });
}



const wait_until_finished = async() => {
    return new Promise(async (resolve, reject) => {

        test_progress = async() => {
            const running = await test_index_from_river_in_progress()

            if (running){
                setTimeout(test_progress, 5000);
            }
            else {
                resolve(true);
            }
        }
        setTimeout(test_progress, 5000);

    });
}

const get_cluster_status = async(alias) => {
    return new Promise(async (resolve, reject) => {
        alias = alias || 'latest';
        const nconf = require('nconf');
        const esAPI = require('eea-searchserver').esAPI;

        const elastic = nconf.get()['elastic'];

        const qs = {
            "query": {
                "bool": {}
            },
            "sort": [],
            "aggs": {
                "cluster_id": {
                    "terms": {
                        "field": "cluster_id",
                        "size": 100,
                        "order": {
                            "_key": "asc"
                        }
                    }
                }
            },
            "size": 0
        };

        new esAPI(getOptions())
            .POST(elastic.index + "_" + alias + '/_search', qs, function(err, statusCode, header, body){
                try {
                    const buckets = JSON.parse(body).aggregations.cluster_id.buckets;
                    let results = {};
                    buckets.map(bucket => results[bucket.key] = bucket.doc_count);
                    resolve(results);
                }
                catch(error) {
                    resolve({});
                }
            })
            .execute();
    })
}

const get_rivers_waiting = async() => {
    return new Promise(async (resolve, reject) => {
        try{
            const nconf = require('nconf');
            const esAPI = require('eea-searchserver').esAPI;

            const elastic = nconf.get()['elastic'];

            const qs = {
                "query": {
                    "bool": {}
                },
                "_source":[""],
                "size":1000
            };

            new esAPI(getOptions())
                .POST(elastic.riverindex + '/_search', qs, function(err, statusCode, header, body){
                    if (statusCode === 404){
                        resolve([]);
                    }
                    else{
                        const results = JSON.parse(body).hits.hits.map(river => river._id)
                        resolve (results.sort());
                    }
                })
                .execute();
        }
        catch(err){
            resolve([])
        }
    })
}

const delete_doc = async(id) => {
    return new Promise(async (resolve, reject) => {
        const nconf = require('nconf');
        const esAPI = require('eea-searchserver').esAPI;
        const elastic = nconf.get()['elastic'];

        let es_version = 'es6';
        if (elastic['version'] === '7'){
          es_version = 'es7';
        }
        let docPath = ''
        if (es_version === 'es6'){
          docPath = elastic.index + "_latest/" + elastic.type + '/';
        }
        if (es_version === 'es7'){
          docPath = elastic.index + "_latest/_doc/";
        }

        console.log("Try to delete from elastic: " + id);
        new esAPI(getOptions())
            .DELETE(docPath + encodeURIComponent(id), function(err, s, h, b){
                if (err !== null){
                    console.log("Error deleting from elasticsearch:", id);
                    resolve(false);
                }
                else {
                    console.log("Deleting from elasticsearch:", id);
                    resolve(true);
                }
            })
            .execute();
    })
}

const delete_cluster = async(cluster) => {
    return new Promise(async (resolve, reject) => {
        const nconf = require('nconf');
        console.log("Starting deleting data from ElasticSearch, cluster ", cluster);
        const esAPI = require('eea-searchserver').esAPI;

        const options = getOptions();
        const delete_path = options.elastic.index + '_latest/' +  options.elastic.type + '/_delete_by_query';

        const delete_query = {
            "query": {
                "bool": {
                    "filter": [
                        {
                            "match": {
                                "cluster_id": cluster
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
            new esAPI(options)
                .DELETE("river_status_" + options.elastic.index + "_latest/last_update" + "/" + cluster, default_callback("Deleted status for " + cluster))
                .POST(delete_path, delete_query, function(err,s,h,b){
                    console.log('Deleting data! (if it exists)');
                    resolve(1)
                })
                .execute();
        } catch (e) {
            if (e.statusCode === 404){
                console.log("Cluster not found");
                resolve(0);
            }
            else {
                console.log('Problems deleting ' + cluster + ' data from index ', e.message);
                reject(-1);
            }
        }
    })
}

const delete_clusters = async(clusters) => {
    return new Promise(async (resolve, reject) => {
        for (let i = 0; i < clusters.length; i++){
            await delete_cluster(clusters[i])
        }
        resolve(true);
    })
}

const get_rivers_start_times = async(alias) => {
    return new Promise(async (resolve, reject) => {
        try{
            if (alias === undefined){
                alias = 'latest'
            }
            const esAPI = require('eea-searchserver').esAPI;

            const options = getOptions();

            const query = {
                    "query": {
                        "bool": {}
                    },
                    "size": 1000
                };

            new esAPI(options)
                .POST("river_status_" + options.elastic.index + "_" + alias + "/_search", query, function(err, s, h, b){
                    if (err){
                        resolve({});
                    }
                    else{
                        let results = {};
                        try{
                            JSON.parse(b).hits.hits.forEach(function(river){
                                results[river._id] = river._source.updated_at;
                            });
                            resolve(results);
                        }
                        catch(e){
                            resolve({});
                        }
                    }
                })
                .execute();
        }
        catch(err){
            reject({});
        }
    })
}

const set_river_start_time = async(cluster, start_time) => {
    return new Promise(async (resolve, reject) => {
        try{
            const esAPI = require('eea-searchserver').esAPI;

            const options = getOptions();

            const value = {
                    name: cluster,
                    updated_at: start_time
            };

            try{
                new esAPI(options)
                    .PUT("river_status_" + options.elastic.index + "_latest/last_update/" + cluster, value, function(err,s,h,b){})
                    .POST("river_status_" + options.elastic.index + "_latest/_search", {}, function(err,s,h,b){
                        resolve(true);
                    })
                    .execute()
            }
            catch(e){
                console.log(e);
                resolve(false);
            }
        }
        catch(err){
            reject(false);
        }
    })
}

const get_index_creation_date = async() => {
    return new Promise(async (resolve, reject) => {
        const sleep = require('sleep-promise');
        try{
            const dateFormat = require('dateformat');
            const options = getOptions();

            const start_times = await get_rivers_start_times(options.elastic.appalias);
            if (Object.values(start_times).length > 0) {
                const min_update = Math.min.apply(Math, Object.values(start_times));
                resolve(dateFormat(min_update * 1000, 'dd mmmm yyyy HH:MM TT'));
            }
            else {
                const esAPI = require('eea-searchserver').esAPI;
                new esAPI(options)
                    .GET(options.elastic.index + "_" + options.elastic.appalias+ "/_settings", {}, function(err, s, h, b){
                        if (!err){
                            try{
                                const res_json = JSON.parse(b);

                                const index_real_name = Object.keys(res_json)[0];
                                const creation_date_str = res_json[index_real_name].settings.index.creation_date;

                                let creation_date = new Date(0);
                                creation_date.setUTCSeconds(creation_date_str.substring(0, creation_date_str.length - 3));
                                creation_date = dateFormat(creation_date, 'dd mmmm yyyy HH:MM TT');
                                resolve(creation_date);
                            }
                            catch(err) {
                                resolve("Couldn't get info");
                            }
                        }
                        else {
                            resolve("Couldn't get info");
                        }
                    })
                    .execute()
            }

        }
        catch(err){
            resolve("Couldn't get info");
        }
    })
}

const index_rdf_bulk = async(bulk) => {
    return new Promise(async (resolve, reject) => {
        const esAPI = require('eea-searchserver').esAPI;

        const options = getOptions();

        const index_base_name = options.elastic.index;
        const latest_alias = index_base_name + "_latest";

        let es_version = 'es6';
        if (options.elastic['version'] === '7'){
          es_version = 'es7';
        }
        let bulk_post = latest_alias+"/"+options.elastic.type+"/_bulk";
        if (es_version === 'es7'){
            bulk_post = latest_alias+"/_bulk"
        }

        new esAPI(options)
            .POST(bulk_post, bulk,
                function(){
                    resolve(true)
                }
            )
            .GET(latest_alias+"/_flush",null,function(err, statusCode, header, body){
                  console.log("flush");
                  console.log(err, statusCode, header, body);
                }
            )
            .execute();
    });
}

module.exports = {
    "wait_for_transactions" : wait_for_transactions,
    "create_empty_index" : create_empty_index,
    "test_analyzers": test_analyzers,
    "index_bulk": index_bulk,
    "remove_data": remove_data,
    "remove_old_indices": remove_old_indices,
    "test_elastic": test_elastic,
    "switch_prod_alias": switch_prod_alias,
    "switch_latest_alias": switch_latest_alias,
    "test_interrupt": test_interrupt,
    "set_status": set_status,
    "get_status": get_status,
    "get_mapping": get_mapping,
    "get_index_stats": get_index_stats,
    "get_rivers_start_times": get_rivers_start_times,
    "set_river_start_time": set_river_start_time,
    "create_river": create_river,
    "test_index_from_river_in_progress": test_index_from_river_in_progress,
    "get_docs_from_index": get_docs_from_index,
    "get_docs_from_index_with_lastRefreshed": get_docs_from_index_with_lastRefreshed,
    "reindex": reindex,
    "wait_until_finished": wait_until_finished,
    "get_cluster_status": get_cluster_status,
    "get_rivers_waiting": get_rivers_waiting,
    "delete_doc": delete_doc,
    "delete_clusters": delete_clusters,
    "get_index_creation_date": get_index_creation_date,
    "index_rdf_bulk" :index_rdf_bulk,
    "imalive": imalive
};

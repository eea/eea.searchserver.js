
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
    let date_ob = new Date();

    let date = ("0" + date_ob.getDate()).slice(-2);

    let month = ("0" + (date_ob.getMonth() + 1)).slice(-2);

    let year = date_ob.getFullYear();

    let hours = ("0" + date_ob.getHours()).slice(-2);

    let minutes = ("0" + date_ob.getMinutes()).slice(-2);

    let seconds = ("0" + date_ob.getSeconds()).slice(-2);

    return (year + "-" + month + "-" + date + "_" + hours + ":" + minutes + ":" + seconds);
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

const create_empty_index = async(analyzers) => {
    return new Promise(async (resolve, reject) => {
        const options = getOptions();
        const esAPI = require('eea-searchserver').esAPI;

        const timestamp = nicedate();
        const index_base_name = options.elastic.index;
        const index_name = index_base_name + '_' + timestamp;
        const remove_alias = '{"actions":[{"remove":{"alias":"' + index_base_name+'_latest' + '","index":"*"}}]}';
        const add_latest_alias = '{"actions":[{"add":{"alias":"' + index_base_name+'_latest' + '","index":"'+index_name+'"}}]}';
        const add_generic_alias = '{"actions":[{"add":{"alias":"' + index_base_name + '","index":"'+index_name+'"}}]}';

        const status_name = "status_" + index_name;
        const remove_status_alias = '{"actions":[{"remove":{"alias":"status_' + index_base_name+'_latest' + '","index":"*"}}]}';
        const add_status_latest_alias = '{"actions":[{"add":{"alias":"status_' + index_base_name+'_latest' + '","index":"'+status_name+'"}}]}';
        const add_status_generic_alias = '{"actions":[{"add":{"alias":"status_' + index_base_name + '","index":"'+status_name+'"}}]}';

        new esAPI(getOptions())
            .PUT(status_name,{},default_callback(
                    "CREATED STATUS INDEX" + status_name))
            .PUT(index_name,analyzers,default_callback(
                    "CREATED INDEX" + index_name))
            .POST("_aliases", remove_status_alias, default_callback(
                    "REMOVED STATUS LATEST ALIAS"))
            .POST('_aliases', add_status_generic_alias, default_callback(
                    "ADDED status_" + index_base_name + " ALIAS"))
            .POST('_aliases', add_status_latest_alias, default_callback(
                    "ALIAS status_" + index_base_name + '_latest points to ' + status_name))
            .POST("_aliases", remove_alias, default_callback(
                    "REMOVED LATEST ALIAS"))
            .POST('_aliases', add_generic_alias, default_callback(
                    "ADDED " + index_base_name + " ALIAS"))
            .POST('_aliases', add_latest_alias, function(){
                    console.log("ALIAS " + index_base_name + '_latest points to ' + index_name)
                    resolve(index_name)
                })
            .execute()
    });
}

const test_analyzers = async(analyzers) => {
    return new Promise(async (resolve, reject) => {
        const esAPI = require('eea-searchserver').esAPI;

        var esa = new esAPI(getOptions());

        esa.DELETE("test_analyzers", function(text, showbody){});

        esa.PUT("test_analyzers", analyzers,
            function(err, s, h, b){
                if (s !== undefined && s.toString() !== '200'){
                    console.log(b);
                    esa.DELETE("test_analyzers", function(text, showbody){
                        resolve(false);
                    });
                    esa.execute();

                } else {
                    esa.DELETE("test_analyzers", function(text, showbody){
                        resolve(true);
                    });
                    esa.execute();
                }
            });

        esa.DELETE("test_analyzers", function(text, showbody){});
        esa.execute();
    });
}

const index_bulk = async(bulk, docs_nr, parts_nr, count) => {
    return new Promise(async (resolve, reject) => {
        console.log("Indexing bulk: " + parts_nr + " - " + (count - 1));
        const esAPI = require('eea-searchserver').esAPI;
        const request = require('sync-request');

        const options = getOptions();
        const index_base_name = options.elastic.index;
        const latest_alias = index_base_name + "_latest";

        const status_url = 'http://' + getAuth('rw') + options.es_host +
                           latest_alias+'/_stats';

        function indexWhenNoMoreOperations(){
            let status = -1;
            try{
                let res = request('GET', status_url);
                const idx_name = Object.keys(JSON.parse(res.getBody('utf8')).indices)[0];
                status = JSON.parse(res.getBody('utf8')).indices[idx_name].primaries.translog.uncommitted_operations;
                let docs_count = JSON.parse(res.getBody('utf8')).indices[idx_name].primaries.docs.count;
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
                setTimeout(indexWhenNoMoreOperations, 1000);
            }
            if (status === 0){
                console.log("There are no more transactions in ES");
                console.log("Index bulk in ES");
                new esAPI(options)
                    .POST(latest_alias+"/"+options.elastic.type+"/_bulk", bulk,
                        function(){
                            resolve(true)
                        }
                    )
                    .execute();
            }
        }

        indexWhenNoMoreOperations();

    });
}

const remove_old_indices = async() => {
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
                for (var i = 0; i < indexes.length; i++){
                    if ((stats[indexes[i]].aliases[index_base_name] !== undefined) &&
                        (stats[indexes[i]].aliases[latest_alias] === undefined) &&
                        (stats[indexes[i]].aliases[prod_alias] === undefined)) {
                            idx_list.push ({name:indexes[i], creation_date:stats[indexes[i]].settings.index.creation_date});
                        }
                }
                idx_list.sort((a, b) => (a.creation_date < b.creation_date) ? 1 : -1)
                var threshold = options.elastic.increment_threshold || 3;
                    if (idx_list.length > threshold){
                        var idx_to_delete = [];
                        for (var i = threshold; i < idx_list.length; i++){
                            idx_to_delete.push(idx_list[i].name);
                        }
                        let es = new esAPI(options);
                        for (let i = 0; i < idx_to_delete.length; i++){
                            if (i < idx_to_delete.length - 1){
                                es.DELETE("status_" + idx_to_delete[i], default_callback("REMOVE OLD STATUS INDEX: status_" + idx_to_delete[i]))
                                es.DELETE(idx_to_delete[i], default_callback("REMOVE OLD INDEX: " + idx_to_delete[i]))
                            }
                            else {
                                es.DELETE("status_" + idx_to_delete[i], default_callback("REMOVE OLD STATUS INDEX: status_" + idx_to_delete[i]))
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
        var nconf = require('nconf');
        const esAPI = require('eea-searchserver').esAPI;

        var elastic = nconf.get()['elastic'];

        const demoalias = elastic.index + '_latest';
        const prodalias = elastic.index + '_prod';
        new esAPI(getOptions())
            .GET('_alias/' +  demoalias, '',
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
                                if (alias_names[j] === demoalias){
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
                        var remove_alias = '{"actions":[{"remove":{"alias":"' + prodalias + '","index":"*"}}]}';
                        var add_alias = '{"actions":[{"add":{"alias":"' + prodalias + '","index":"' + found_indexes[0] + '"}}]}';
                        new esAPI(getOptions())
                            .POST("_aliases", remove_alias, default_callback(
                                "REMOVED OLD ALIAS"))
                            .POST("_aliases", add_alias, function(err, statusCode, header, body){
                                    if (settings.API_callback !== undefined){
                                        settings.API_callback({"prod":found_indexes[0]})
                                    }
                                    default_callback("Alias " + prodalias + " points to " + found_indexes[0])(err, statusCode, header, body)
                                })
                            .execute();
                    }
                })
            .execute();

    });
}

const status = async(settings) => {
    return new Promise(async (resolve, reject) => {
        resolve("xxx");
    });
}

const test_alias = async(index_name) => {
    return new Promise(async (resolve, reject) => {
        var nconf = require('nconf');
        const esAPI = require('eea-searchserver').esAPI;

        var elastic = nconf.get()['elastic'];

        const demoalias = elastic.index + '_latest';

        new esAPI(getOptions())
            .GET(demoalias,'',function(stats_err, stats_statusCode, stats_header, stats_body){
                if (stats_err !== null){
                    resolve(false);
                }
                else {
                    if (JSON.parse(stats_body)[index_name] === undefined){
                        resolve(false)
                    }
                    else {
                        if (JSON.parse(stats_body)[index_name].aliases[demoalias] === undefined){
                            resolve(false);
                        }
                        else {
                            resolve(true);
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
                        if (i < idx_to_delete.length - 1){
                            es.DELETE("status_" + idx_to_delete[i],
                                function(){
                                    console.log("REMOVE STATUS INDEX: status_" + idx_to_delete[i])
                                }
                            )
                            es.DELETE(idx_to_delete[i],
                                function(){
                                    console.log("REMOVE INDEX: " + idx_to_delete[i])
                                }
                            )
                        }
                        else {
                            es.DELETE("status_" + idx_to_delete[i],
                                function(){
                                    console.log("REMOVE STATUS INDEX: status_" + idx_to_delete[i])
                                }
                            )
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

module.exports = {
    "create_empty_index" : create_empty_index,
    "test_analyzers": test_analyzers,
    "index_bulk": index_bulk,
    "remove_data": remove_data,
    "remove_old_indices": remove_old_indices,
    "test_elastic": test_elastic,
    "switch_prod_alias": switch_prod_alias,
    "status": status,
    "test_alias": test_alias
};
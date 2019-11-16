
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

        new esAPI(getOptions())
            .PUT(index_name,analyzers,default_callback)
            .POST("_aliases", remove_alias, default_callback(
                    "REMOVED LATEST ALIAS"))
            .POST('_aliases', add_generic_alias, default_callback(
                    "ADDED " + index_base_name + " ALIAS"))
            .POST('_aliases', add_latest_alias, function(){
                    console.log("ALIAS " + index_base_name + '_latest points to ' + index_name)
                    resolve(true)
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
        const fs = require("fs");

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

module.exports = {
    "create_empty_index" : create_empty_index,
    "test_analyzers": test_analyzers,
    "index_bulk": index_bulk,
    "remove_old_indices": remove_old_indices,
    "test_elastic": test_elastic
};

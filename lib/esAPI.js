#!/usr/bin/nodejs
/* eslint-disable no-console */

var http = require('http');
var parse = require('csv-parse/lib/sync');
var nconf = require('nconf');

var sendRequest = function(method, url, auth, body, callback) {
    if (!url.indexOf('http://') == 0)
        url = 'http://' + url;

    var urlparse = require('url');
    var parsedUrl = urlparse.parse(url);

    var options = {
        host: parsedUrl.hostname,
        path: parsedUrl.path,
        method: method,
        auth: auth,
        port: parsedUrl.port ? parsedUrl.port : 80
    };

    //TODO : Requests to existing endpoints with incorrect HTTP verb now return 405 responses 
    //https://www.elastic.co/guide/en/elasticsearch/reference/current/breaking_60_rest_changes.html#_requests_to_existing_endpoints_with_incorrect_http_verb_now_return_405_responses    
    if(method === "DELETE"){
        body = "{}";
        //options.path = "/" + options.path;
    }

    var req = http.request(options, function(res) {
        res.setEncoding('utf8');
        var body = '';
        res.on('data', function (chunk) {
            body += chunk;
        });
        res.on('end', function() {
            if (callback !== null){
                callback(null, res.statusCode, res.header, body);
            }
        });
    });
    req.setHeader('Content-Type', 'application/json');
    req.on('error', function(err) {
        if (callback !== null){
            callback(err);
        }
        else {
            console.log(err);
        }
    });
    req.write(body);
    req.end();
};

var total_queries = 0;
var success_calls = 0;
if (nconf.get().hasOwnProperty('switch_condition_value_percent')) {
    var SWITCH_CONDITION_VALUE_PERCENT = nconf.get()['switch_condition_value_percent'];
} else {
    var SWITCH_CONDITION_VALUE_PERCENT = -5;
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

var switch_alias_callback = function(text, elastic, esoptions, showBody) {
    if (showBody === undefined){
        showBody = true;
    }
    return function(err, statusCode, header, body) {
        try{
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
            success_calls = success_calls + 1;
        }
        catch(e){
            console.log("\n\n ERROR: " + e + "\n\n" );
        }
        finally{
            if (success_calls >= total_queries){
                waitForESOperations({"elastic": elastic, "esoptions": esoptions, "callback": applyAlias});
            }
        }
    };
};

function fetchQuery(query, endpoint, elastic, esoptions, analyzers, fetchcallback) {
    var properties = analyzers.mappings[elastic.type].properties;
    var analyzers = analyzers.settings.analysis.analyzer;
    var batch_head = '{"index":{}}';

    var bulk_size = 1000;

    var SparqlClient = require('sparql-client');
    var client = new SparqlClient(endpoint);
    client.query(query).execute(function(error, results){
        var results_length = results.results.bindings.length;
        var last_bulk_size = results_length % bulk_size;
        var bulks_nr = Math.floor(results_length / bulk_size);
        if (last_bulk_size !== 0){
            bulks_nr++;
        }
        if (bulks_nr === 0) {
            success_calls = success_calls + 1;
            switch_alias_callback("indexed " + 0 + " rows", elastic, esoptions, false);
        }
        for (var bulk_count = 0; bulk_count < bulks_nr; bulk_count++){
            var this_bulk_size = bulk_size;
            if (bulk_count === bulks_nr - 1){
                this_bulk_size = last_bulk_size;
            }
            var rows_str = "";
            for (var i = bulk_count * bulk_size; i < bulk_count * bulk_size + this_bulk_size; i++){
                var toindex = {};
                for (var j = 0; j < results.head.vars.length; j++){
                    if (results.results.bindings[i][results.head.vars[j]] !== undefined){
                        if (results.head.vars[j] === "_id"){
                            toindex["es_doc_id"] = results.results.bindings[i][results.head.vars[j]].value;
                        }
                        if (results.head.vars[j] !== "_id"){
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
                rows_str += batch_head.split("{}").join('{"_id":"' + results.results.bindings[i]["_id"].value + '"}');
                rows_str += "\n";
                rows_str += JSON.stringify(toindex);
                rows_str += "\n";
            }
            var es_callback = null;
            if (bulk_count === bulks_nr - 1){
                new esAPI(esoptions)
                    .POST(elastic.real_index+"/"+elastic.type+"/_bulk", rows_str, 
                        switch_alias_callback("indexed " + results.results.bindings.length + " rows", elastic, esoptions, false))
                    .execute();
            }
            else {
                new esAPI(esoptions)
                    .POST(elastic.real_index+"/"+elastic.type+"/_bulk", rows_str, null)
                    .execute();
            }
        }
        fetchcallback(results.results.bindings.length);
    });
}

var bigTotal = 0;
function fetchQueries(queries, endpoint, elastic, esoptions, analyzers, idx){
    if (idx === undefined){
        idx = 0;
    }

    if (idx === queries.length){
        return;
    }
    console.log("Fetching query #", idx + 1, " of ", queries.length);
    if (queries[idx].filters){
        console.log("Filters:");
        console.log(queries[idx].filters);
    }
    fetchQuery(queries[idx].query, endpoint, elastic, esoptions, analyzers, function(indexed){
        bigTotal += indexed;
        console.log("Total indexed:", bigTotal);
        fetchQueries(queries, endpoint, elastic, esoptions, analyzers, idx + 1);
    });
}

function indexWhenNoMoreOperations(opts){
//console.log(opts.esoptions);
//console.log(opts.index)
//console.log(opts.es_type)
    var request = require('sync-request');

    console.log("Waition for transactions in ES to finish");

    var index_status = 'http://' + getAuth('rw') + opts.esoptions.es_host +
                           opts.index+'/_stats';

//console.log(index_status)
    var status = -1;
    try{
        var res = request('GET', index_status);
        status = JSON.parse(res.getBody('utf8')).indices[opts.index].primaries.translog.uncommitted_operations;
        console.log("uncommitted operations: " + status);
        if (isNaN(status)){
            status = -1;
        }
    }catch(e){
        console.log("\n\n ERROR: " + e + "\n\n" );
        status = -1;
    }
    if (status > 0){
        console.log("There are transactions in ES");
        setTimeout(indexWhenNoMoreOperations, 1000, opts);
    }
    if (status === 0){
        console.log("There are no more transactions in ES");
        console.log("Index next bulk");
        new esAPI(opts.esoptions)
            .POST(opts.index+"/"+opts.es_type+"/_bulk", opts.bulk, null)
            .execute();

    }
}

function fetchFile(indexFile, esoptions, analyzers){
    var fs = require('fs');
    var CsvReadableStream = require('csv-reader');
    var elastic = nconf.get()['elastic'];
    elastic.real_index = elastic.index + "_blue";
    var detectCharacterEncoding = require('detect-character-encoding');
    var fileBuffer = fs.readFileSync(indexFile.file);
    var charsetMatch = detectCharacterEncoding(fileBuffer);
    console.log(charsetMatch);
    var inputStream = fs.createReadStream(indexFile.file, charsetMatch.encoding)

    var counter = 0;
    var bulk_size = 100000;
    var fields = [];
    var rows_str = '';
    var batch_head = '{"index":{}}';

    inputStream
        .pipe(CsvReadableStream({ parseNumbers: true, parseBooleans: true, trim: true , delimiter: indexFile.delimiter}))
        .on('data', function (row) {
            var toindex = {};
            if (counter === 0){
                fields = row;
            }
            else {
                for (var i = 0; i < row.length; i++){
                    if (row[i] !== 'NULL'){
                        toindex[fields[i]] = row[i];
                    }
                }
                var tmp_id = counter;
                if (indexFile.id_type === 'field'){
                    tmp_id = toindex[indexFile.id_field];
                }
                rows_str += batch_head.split("{}").join('{"_id":"' + tmp_id + '"}');
                rows_str += "\n";
                rows_str += JSON.stringify(toindex);
                rows_str += "\n";

                if (counter % bulk_size === 0){
                    console.log("Indexing: " + (counter - bulk_size) + " - " +counter);
                    console.log(esoptions)
//esoptions, index, es_type, bulk){
                    indexWhenNoMoreOperations({esoptions:esoptions, index:elastic.real_index, es_type:elastic.type, bulk:rows_str});
//                    new esAPI(esoptions)

//                        .POST(elastic.real_index+"/"+elastic.type+"/_bulk", rows_str, default_callback("BULK INDEXING"))
//                        .POST(elastic.real_index+"/"+elastic.type+"/_bulk", rows_str, null)
//                        .execute();
                    rows_str = "";
                }
            }

            counter ++;
        }).on('end', function (data) {
            if (rows_str.length !== 0){
                indexWhenNoMoreOperations({esoptions:esoptions, index:elastic.real_index, es_type:elastic.type, bulk:rows_str});
//                indexWhenNoMoreOperations(esoptions, elastic.real_index, elastic.type, rows_str);
//                new esAPI(esoptions)
//                    .POST(elastic.real_index+"/"+elastic.type+"/_bulk", rows_str, default_callback("BULK INDEXING"))
//                    .POST(elastic.real_index+"/"+elastic.type+"/_bulk", rows_str, null)
//                    .execute();
                rows_str = "";
            }
            console.log('No more rows!');
        });

}

function getBlueIndex(){
    var elastic = nconf.get()['elastic'];
    elastic.real_index = elastic.index + "_blue";
    return elastic;
}
function getGreenIndex(){
    var elastic = nconf.get()['elastic'];
    elastic.real_index = elastic.index + "_green";
    return elastic;
}

function getAuth(user){
    var elastic = nconf.get()['elastic'];
    var esuser = 'rouser';
    var espass = 'ropass';
    if (user === 'rw'){
        esuser = 'rwuser';
        espass = 'rwpass';
    }
    if ((elastic[esuser] !== undefined) && (elastic[esuser] !== undefined) && (elastic[esuser] !== '')){
        return elastic[esuser] + ":" + elastic[espass] + "@";
    }
    return "";
}


function waitForESOperations(opts){
    var request = require('sync-request');

    console.log("Waition for transactions in ES to finish");
    var elastic_blue = getBlueIndex();
    var elastic_green = getGreenIndex();

    if(elastic_blue.real_index == opts.elastic.real_index){
        next_elastic = elastic_blue;
    } else {
        next_elastic = elastic_green;
    }

    var indexed_next_url_status = 'http://' + getAuth('rw') + opts.esoptions.es_host +
                           next_elastic.real_index+'/_stats';


    var status = -1;
    try{
        var res = request('GET', indexed_next_url_status);
        status = JSON.parse(res.getBody('utf8')).indices[next_elastic.real_index].primaries.translog.uncommitted_operations;
        if (isNaN(status)){
            status = -1;
        }
    }catch(e){
        console.log("\n\n ERROR: " + e + "\n\n" );
        console.log("ABORT SWITCHING ALIAS");
        status = -1;
    }
    if (status > 0){
        console.log("There are transactions in ES");
        setTimeout(waitForESOperations, 1000, opts);
    }
    if (status === 0){
        console.log("There are no more transactions in ES");
        opts.callback(opts.elastic, opts.esoptions);
    }
}

function applyAlias(elastic, esoptions){
    var request = require('sync-request');
    var elastic_blue = getBlueIndex();
    var elastic_green = getGreenIndex();
    var current_elastic;
    var next_elastic;

    if (elastic_green === undefined){
        console.log("SKIP ALIAS, the second index is not present!");
        return;
    }

    if(elastic_blue.real_index == elastic.real_index){
        /* current index is green */
        current_elastic = elastic_green;
        next_elastic = elastic_blue;
    } else {
        /* current index is blue */
        current_elastic = elastic_blue;
        next_elastic = elastic_green;
    }
    console.log('\nATTEMPT OF SWITCHING ALIAS');
    console.log('Current alias is on ' + current_elastic.real_index);

    var indexed_current_url = 'http://' + getAuth('rw') + esoptions.es_host+
                              current_elastic.real_index+'/_count';
    var indexed_next_url = 'http://' + getAuth('rw') + esoptions.es_host+
                           next_elastic.real_index+'/_count';

    var count_current = 0;
    try{
        var res = request('GET', indexed_current_url);
        var count_current = JSON.parse(res.getBody('utf8')).count;
        if (isNaN(count_current)){
            count_current = 1;
        }
    }catch(e){
        count_current = 1;
    }
    var count_next = 0;
    try{
        var res = request('GET', indexed_next_url);
        count_next = JSON.parse(res.getBody('utf8')).count;
        if (isNaN(count_next)){
            count_next = 0;
        }
    }catch(e){
        count_next = 0;
    }
    var increment_percent = ((count_next-count_current)/count_current)*100;
    // if new index size is > then old index size of the SWITCH_CONDITION_VALUE_PERCENT
    // switch alias, none otherwise
    if (increment_percent > SWITCH_CONDITION_VALUE_PERCENT){
        var remove_alias = '{"actions":[{"remove":{"alias":"'+current_elastic.index+'","index":"'+current_elastic.real_index+'"}}]}';
        var add_alias = '{"actions":[{"add":{"alias":"'+next_elastic.index+'","index":"'+next_elastic.real_index+'"}}]}';
        new esAPI(esoptions)
            .POST("_aliases", remove_alias, default_callback(
                "REMOVE OLD ALIAS: " + current_elastic.real_index))
            .POST("_aliases", add_alias, default_callback(
                "SUCCESS SWITCH ALIAS: Alias is now on " + next_elastic.real_index))
            .execute();
    } else {
        console.log('ABORT SWITCH ALIAS: The new index size is lower then old');
    }
}

var esAPI = function(options) {
    this.callbacks = [];
    this.operations = [];
    this.options = options;
};

esAPI.prototype = {
    PUT: function(endpoint, body, callback) {
        var idx = this.callbacks.length;
        var callbacks = this.callbacks;
        var options = this.options;

        var putImpl = function() {
            sendRequest('PUT',
                options.es_host + endpoint,
                options.auth,
                JSON.stringify(body),
                callbacks[idx]);
        };

        this.callbacks.push(callback);
        this.operations.push(putImpl);
        return this;
    },

    POST: function(endpoint, body, callback) {
        var idx = this.callbacks.length;
        var callbacks = this.callbacks;
        var options = this.options;
        if (typeof(body) === 'object'){
            body = JSON.stringify(body);
        }

        var putImpl = function() {
            sendRequest('POST',
                options.es_host + endpoint,
                options.auth,
                body,
                callbacks[idx]);
        };

        this.callbacks.push(callback);
        this.operations.push(putImpl);
        return this;
    },

    DELETE: function(endpoint, callback) {
        var idx = this.callbacks.length;
        var callbacks = this.callbacks;
        var options = this.options;

        var delImpl = function() {
            sendRequest('DELETE',
            options.es_host + endpoint,
            options.auth, '',
            callbacks[idx]);
        };

        this.callbacks.push(callback);
        this.operations.push(delImpl);
        return this;
    },

    execute: function() {
        var callbacks = this.callbacks;
        var operations = this.operations;

        for (var i = this.operations.length - 2; i >= 0; i--) {
            // forcing block-level scoping
            var f = function(idx) {
                var oldCb = callbacks[idx];
                var next = operations[idx + 1];
                callbacks[i] = function(err, s, e, b) {
                    if (err) {
                        oldCb(err);
                    } else {
                        oldCb(null, s, e, b);
                        next();
                    }
                };
            };
            f(i);
        }
        this.operations[0]();
    },

    createQueries: function(endpoint, base_query, filters_query, esoptions, callback){
        var queries = [];
        if (!filters_query){
            queries.push({query:base_query, filters:[]});
            callback(queries,esoptions);
            return;
        }
        var SparqlClient = require('sparql-client');
        var client = new SparqlClient(endpoint);
        client.query(filters_query).execute(function(error, results){
            for (var i = 0; i < results.results.bindings.length; i++){
                var tmp_query = {query:base_query, filters:{}};
                for (var j = 0; j < results.head.vars.length; j++){
                    var attr = results.head.vars[j];
                    var value = results.results.bindings[i][results.head.vars[j]].value;
                    tmp_query.query = tmp_query.query.split("<" + attr + ">").join(value);
                    tmp_query.filters[attr] = value;
                }
                queries.push(tmp_query);
                total_queries = queries.length;
            }
            callback(queries, esoptions);
        });
    },

    indexFromQuery: function(endpoint, queryTemplate, filtersQuery, elastic, analyzers) {
        if (elastic.real_index === undefined){
            elastic.real_index = elastic.index;
        }
        this.createQueries(endpoint, queryTemplate, filtersQuery, this.options, function(queries, esoptions){
            new esAPI(esoptions)
                .DELETE(elastic.real_index, default_callback('Deleting index (if it exists)'))
                .PUT(elastic.real_index, analyzers,
                    function(){
                        fetchQueries(queries, endpoint, elastic, esoptions, analyzers);
                    })
                .execute();
        });
    },

    syncFromQuery: function(endpoint, queryTemplate, filtersQuery, analyzers) {
        var request = require('request');
        var elastic_blue = getBlueIndex();
        var elastic_green = getGreenIndex();
        var next_elastic = elastic_blue;
        var parent = this;
        /* get current index by alias */

        var req_url = 'http://' + parent.options.es_host + '_aliases';
        if ((parent.options.auth !== undefined) && (parent.options.auth !== null) && (parent.options.auth.length > 0)){
            req_url = 'http://' + parent.options.auth + "@" + parent.options.es_host + '_aliases';
        }
        request(
            req_url,
            function (error, response, body) {
                if (!error && response.statusCode == 200) {
                    var data = JSON.parse(body);

                    if(data.hasOwnProperty(elastic_blue.real_index) && data[elastic_blue.real_index]['aliases'].hasOwnProperty(elastic_blue.index)){
                        /* current index is blue */
                        next_elastic = elastic_green;
                    }
                    else if(data.hasOwnProperty(elastic_green.real_index) && data[elastic_green.real_index]['aliases'].hasOwnProperty(elastic_green.index)){
                        /* current index is green */
                        next_elastic = elastic_blue;
                    }
                    /* create the new index */
                    parent.indexFromQuery(endpoint, queryTemplate, filtersQuery, next_elastic, analyzers);
                } else {
                    console.log(error);
                }
            }
        )
    },

    indexFromFile: function(indexFile, analyzers){
        var elastic = nconf.get()['elastic'];
        var esoptions = this.options;
        elastic.real_index = elastic.index + "_blue";
        var add_alias = '{"actions":[{"add":{"alias":"'+elastic.index+'","index":"'+elastic.real_index+'"}}]}';
        new esAPI(esoptions)
            .DELETE(elastic.real_index, default_callback('Deleting index (if it exists)'))
            .PUT(elastic.real_index, analyzers,
                function(){
                    fetchFile(indexFile, esoptions, analyzers);
                })
            .POST("_aliases", add_alias, default_callback(
                "SUCCESS SWITCH ALIAS: Alias is now on " + elastic.real_index))
            .execute();
    },

    testAnalyzers: function(analyzers, callback) {
        new esAPI(this.options)
            .DELETE("test_analyzers", function(text, showbody){})
            .PUT("test_analyzers", analyzers,
                function(err, s, h, b){
                    if (s.toString() !== '200'){
                        console.log(b);
                        callback(false);
                    }
                    else {
                        callback(true);
                    }
                })
            .DELETE("test_analyzers", function(text, showbody){})
            .execute();
    }
};

module.exports = esAPI;

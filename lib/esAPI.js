#!/usr/bin/nodejs

var http = require('http');

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
    }

    var req = http.request(options, function(res) {
        res.setEncoding('utf8');
        var body = '';
        res.on('data', function (chunk) {
            body += chunk
        });
        res.on('end', function() {
            callback(null, res.statusCode, res.header, body);
        });
    });

    req.on('error', function(err) { callback(err); });
    req.write(body);
    req.end();
}

var total_queries = 0;
var success_calls = 0;
var SWITCH_CONDITION_VALUE_PERCENT = -5;

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
}

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
            console.log("\n\n ERROR: " + e + "\n\n" )
        }
        finally{
            if (success_calls >= total_queries){
                applyAlias(elastic, esoptions);
            }
        }
    };
}

function fetchQuery(query, endpoint, elastic, esoptions, fetchcallback) {
    var batch_head = '{"index":{}}'

    var SparqlClient = require('sparql-client');
    var client = new SparqlClient(endpoint);
    client.query(query).execute(function(error, results){
        var rows_str = "";
        for (var i = 0; i < results.results.bindings.length; i++){
            var toindex = {};
            for (var j = 0; j < results.head.vars.length; j++){
                if (results.results.bindings[i][results.head.vars[j]] !== undefined){
                    toindex[results.head.vars[j]] = results.results.bindings[i][results.head.vars[j]].value;
                }
            }
            rows_str += batch_head.split("{}").join('{"_id":"' + results.results.bindings[i]["_id"].value + '"}');
            rows_str += "\n";
            rows_str += JSON.stringify(toindex);
            rows_str += "\n";
        }
        new esAPI(esoptions)
            .POST(elastic.real_index+"/"+elastic.type+"/_bulk", rows_str, 
                  switch_alias_callback("indexed " + results.results.bindings.length + " rows", elastic, esoptions, false))
            .execute();
        fetchcallback(results.results.bindings.length);
    });
}

var bigTotal = 0;
function fetchQueries(queries, endpoint, elastic, esoptions, idx){
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
    fetchQuery(queries[idx].query, endpoint, elastic, esoptions, function(indexed){
        bigTotal += indexed;
        console.log("Total indexed:", bigTotal);
        fetchQueries(queries, endpoint, elastic, esoptions, idx + 1)
    });
}

function getBlueIndex(){
    var nconf = require('nconf');
    var elastic = nconf.get()['elastic'];
    elastic.real_index = elastic.index + "_blue";
    return elastic;
}
function getGreenIndex(){
    var nconf = require('nconf');
    var elastic = nconf.get()['elastic'];
    elastic.real_index = elastic.index + "_green";
    return elastic;
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

    var indexed_current_url = 'http://'+esoptions.es_host+'/'+
                              current_elastic.real_index+'/_count';
    var indexed_next_url = 'http://'+esoptions.es_host+'/'+
                           next_elastic.real_index+'/_count';
    var count_current = 0;
    try{
        var res = request('GET', indexed_current_url)
        var count_current = JSON.parse(res.getBody('utf8')).count;
        if (isNaN(count_current)){
            count_current = 1;
        }
    }catch(e){
        count_current = 1;
    }
    var count_next = 0;
    try{
        var res = request('GET', indexed_next_url)
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
            .POST("/_aliases", remove_alias, default_callback(
                "REMOVE OLD ALIAS: " + current_elastic.real_index))
            .POST("/_aliases", add_alias, default_callback(
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
}

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
        }

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
        }

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
        }

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
                }
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
                        fetchQueries(queries, endpoint, elastic, esoptions);
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
        request(
            'http://' + parent.options.es_host + '_aliases',
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
        );
    }
};

module.exports = esAPI;

#!/usr/bin/nodejs

var http = require('http');

var sendRequest = function(method, url, auth, body, callback) {
    if (!url.indexOf('http://') == 0)
        url = 'http://' + url;

    var urlparse = require('url');
    parsedUrl = urlparse.parse(url);

    options = {
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
            .POST(elastic.index+"/"+elastic.type+"/_bulk", rows_str, default_callback("indexed " + results.results.bindings.length + " rows", false))
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
            }
            callback(queries, esoptions);
        });
    },

    indexFromQuery: function(endpoint, queryTemplate, filtersQuery, elastic, analyzers) {
console.log("1");
console.log(this.options);
        this.createQueries(endpoint, queryTemplate, filtersQuery, this.options, function(queries, esoptions){
console.log("2");
console.log(esoptions);
            new esAPI(esoptions)
                .DELETE(elastic.index, default_callback('Deleting index (if it exists)'))
                .PUT(elastic.index, analyzers,
                    function(){
                        fetchQueries(queries, endpoint, elastic, esoptions);
                    })
                .execute();
        })
    }
};

module.exports = esAPI;

#!/usr/bin/nodejs
/* eslint-disable no-console */

var http = require('http');

var sendRequest = function(method, url, auth, body, callback) {
    if (!(url.indexOf('http://') == 0 ) )
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

var esAPI = function(options) {
    this.callbacks = [];
    this.operations = [];
    this.options = options;
};

esAPI.prototype = {
    GET: function (endpoint, body, callback) {
        var idx = this.callbacks.length;
        var callbacks = this.callbacks;
        var options = this.options;

        if (typeof(body) === 'object'){
            body = JSON.stringify(body);
        }

        var putImpl = function() {
            sendRequest('GET',
                options.es_host + endpoint,
                options.auth,
                body,
                callbacks[idx]);
        };

        this.callbacks.push(callback);
        this.operations.push(putImpl);
        return this;
    },
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
        this.operations = [];
    }

}


}

module.exports = esAPI;

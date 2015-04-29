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
    }
};

module.exports = esAPI;

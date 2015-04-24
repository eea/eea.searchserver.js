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
    var callbacks = arguments[1] || [];
    var operations = arguments[2] || [];
    return {
        PUT: function(endpoint, body, callback) {
            var idx = callbacks.length

            var putImpl = function() {
                sendRequest('PUT',
                    options.es_host + endpoint,
                    options.auth,
                    JSON.stringify(body),
                    callbacks[idx]);
            }

            callbacks.push(callback);
            operations.push(putImpl);
            return esAPI(options, callbacks, operations);
        },

        DELETE: function(endpoint, callback) {
            var idx = callbacks.length

            var delImpl = function() {
                sendRequest('DELETE',
                    options.es_host + endpoint,
                    options.auth, '',
                    callbacks[idx]);
            }

            callbacks.push(callback);
            operations.push(delImpl);
            return esAPI(options, callbacks, operations);
        },

        execute: function() {
            for (var i = operations.length - 2; i >=0; i--) {
                var oldCb = callbacks[i];
                var idx = i;
                callbacks[i] = function(err, s, e, b) {
                    if (err) {
                        oldCb(err);
                    } else {
                        oldCb(null, s, e, b);
                        operations[idx + 1]();
                    }
                };
            }
            operations[0]();
        }
    };
};

module.exports = esAPI;

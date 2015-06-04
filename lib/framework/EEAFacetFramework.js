var express = require('express');
var path = require('path');

function EEAFacetFramework() {
    var app = express();

    app.use(express.static(path.join(__dirname, 'public')));
    console.log(path.join(__dirname, 'views'));

    return app;
}

module.exports = EEAFacetFramework

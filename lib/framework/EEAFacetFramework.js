var express = require('express');
var path = require('path');
var jade = require('jade');
var fs = require('fs');

function EEAFacetFramework() {
    var app = express();

    app.use(express.static(path.join(__dirname, 'public')));

    return app;
}

function render(res, template, options) {

  var templatestr = fs.readFileSync(template, 'utf8');

  templatestr = "extends " +path.join(__dirname, 'views', 'layout') + "\n" + templatestr;

  options.basedir = '/';
  var page = jade.render(templatestr, options);

  res.send(page);

}

module.exports = {
    framework: EEAFacetFramework,
    render: render}

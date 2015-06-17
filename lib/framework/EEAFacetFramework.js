var express = require('express');
var path = require('path');
var jade = require('jade');
var fs = require('fs');
var routes = require('../routes');
var middleware = require('../middleware');

var nconf = require('nconf');

nconf.file({file:'/code/settings.json'});

var templatePath = nconf.get('external_templates:local_path');

function EEAFacetFramework(app_home) {
    GLOBAL.eea_app_home = app_home;

    var app = express();

    app.get('/invalidate_templates', routes.invalidateTemplates);
    app.get('/api', routes.elasticProxy);
    app.get('/download', routes.download);
    app.use(express.static(path.join(__dirname, 'public')));

    return app;
}

function render(req, res, template, options) {

  template = path.join(GLOBAL.eea_app_home, "views", template + ".jade");

  if (middleware.templateRequired(req, res)){
    var templatestr = fs.readFileSync(template, 'utf8');
    templatestr = "extends " +path.join(__dirname, 'views', 'layout') + "\n" + templatestr;

    options.basedir = '/';
    options.headFile = path.join(templatePath, 'head.html');
    headerFile = path.join(templatePath, 'header.html');
    options.footerFile = path.join(templatePath, 'footer.html');
    options.templateRender = fs.readFileSync;

    var page = jade.render(templatestr, options);

    res.send(page);
  }

}

module.exports = {
    framework: EEAFacetFramework,
    render: render}

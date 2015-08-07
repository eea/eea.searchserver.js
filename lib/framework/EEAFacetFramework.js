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
  //var app = require(path.join(GLOBAL.eea_app_home,"app.js"));
  getSortedFields("facet", function(facets){
    getSortedFields("listing", function(listing){
      getSortedFields("details", function(details){
        middleware.templateRequired(req, res, function(){
            var templatestr = fs.readFileSync(template, 'utf8');
            templatestr = "extends " +path.join(__dirname, 'views', 'layout') + "\n" + templatestr;

            options.basedir = '/';
            options.headFile = path.join(templatePath, 'head.html');
            headerFile = path.join(templatePath, 'header.html');
            options.footerFile = path.join(templatePath, 'footer.html');
            options.templateRender = fs.readFileSync;
            var mapping = {facets: facets, listing:listing, details:details};
            options.mapping = "var eea_mapping = " + JSON.stringify(mapping);
            var page = jade.render(templatestr, options);

            res.send(page);
        });
      });
    });
  });
}

function sort_elements(a, b) {
    return a.pos - b.pos
}

function getSortedFields(attr, next) {
    var app = require(path.join(GLOBAL.eea_app_home,"app.js"));
    app.fieldsMapping(function(mapping){
        var fields = [];
        for (var idx = 0; idx < mapping.fields_mapping.length; idx++){

            parent = mapping.fields_mapping[idx];
            field = parent[attr];
            if ((field !== undefined) && (field.visible)){
                field.name = parent.name;
                if (field.pos === undefined){
                    field.pos = 999;
                }
                if (field.title === undefined){
                    field.title = field.name;
                }
                fields.push(field);
            }
        }
        next(fields.sort(sort_elements));
    });
}

function getSections(next) {
    getSortedFields("details", function(fields){
        var app = require(path.join(GLOBAL.eea_app_home,"app.js"));
        app.fieldsMapping(function(mapping){
            var sections = mapping.details_settings.sections;
            var details_fields = []
            for (var idx = 0; idx < fields.length; idx++) {
                if (details_fields[fields[idx].section] === undefined){
                    details_fields[fields[idx].section] = []
                }
                details_fields[fields[idx].section].push(fields[idx])
            }
            for (var idx = 0; idx < sections.length; idx++){
                sections[idx].fields = details_fields[sections[idx].name];
            }
            next(sections.sort(sort_elements));
        });
    });
}

function getLinks(next) {
    var app = require(path.join(GLOBAL.eea_app_home,"app.js"));
    app.fieldsMapping(function(mapping){
        links = [];
        for (var idx = 0; idx < mapping.fields_mapping.length; idx++){
            if (mapping.fields_mapping[idx].is_link){
                links.push(mapping.fields_mapping[idx]);
            }
        }
        next(links);
    });
}

module.exports = {
    framework: EEAFacetFramework,
    render: render,
    getSortedFields: getSortedFields,
    getSections: getSections,
    getLinks: getLinks
}

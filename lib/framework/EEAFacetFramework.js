var express = require('express');
var path = require('path');
var jade = require('jade');
var fs = require('fs');
var _ = require('underscore');
var routes = require('../routes');
var middleware = require('../middleware');

var nconf = require('nconf');

nconf.file({file:'/code/config/settings.json'});

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

function render(req, res, template, options, isDetail) {
  template = path.join(GLOBAL.eea_app_home, "views", template + ".jade");
  getSortedFields("facet", function(facets){
    getSortedFields("listing", function(listing){
      getSortedFields("details", function(details){
        middleware.templateRequired(req, res, function(){
            var templatestr = fs.readFileSync(template, 'utf8');
            templatestr = "extends " +path.join(__dirname, 'views', 'layout') + "\n" + templatestr;
            if (isDetail){
                templatestr = "include " +path.join(__dirname, 'views', 'details.jade') + "\n" + templatestr;
            }
            options.basedir = '/';
            options.headFile = path.join(templatePath, 'head.html');
            headerFile = path.join(templatePath, 'header.html');
            options.footerFile = path.join(templatePath, 'footer.html');
            options.templateRender = fs.readFileSync;
            var mapping = {facets: facets, listing:listing, details:details};
            options.mapping = "var eea_mapping = " + JSON.stringify(mapping);
            options.getIndexCreationDate = getIndexCreationDate;
            options.getContainerInfo = getContainerInfo;
            var page = jade.render(templatestr, options);

            res.send(page);
        });
      });
    });
  });
}

function renderDetails(options){
  var request = require('request');

  getSections(function(sections){
    var fieldsMapping = [];
    for (var sections_idx = 0; sections_idx < sections.length; sections_idx++){
        if (sections[sections_idx].fields === undefined){
            sections[sections_idx].fields = [];
        }
        for (var fields_idx = 0; fields_idx < sections[sections_idx].fields.length; fields_idx++){
            fieldsMapping.push(sections[sections_idx].fields[fields_idx]);
        }
    }
    getLinks(function(links){
        request(options.options.host + options.options.path, function (error, response, body) {
            if (!error && response.statusCode == 200) {
                try{
                    var data = JSON.parse(body);
                    tmp_resultobj = {};
                    tmp_resultobj["records"] = [];
                    for ( var item = 0; item < data.hits.hits.length; item++ ) {
                        tmp_resultobj["records"].push(data.hits.hits[item]._source);
                        tmp_resultobj["records"][tmp_resultobj["records"].length - 1]._id = data.hits.hits[item]._id;
                    }
                    resultobj = {};
                    var value;
                    for (var idx = 0; idx < fieldsMapping.length; idx++) {
                        value = tmp_resultobj["records"][0][options.field_base + fieldsMapping[idx]['name']];
                        label = fieldsMapping[idx]['title'];

                        if (label.substr(label.length - 5,5) === "_link"){
                            value = encodeURIComponent(value);
                        }

                        resultobj[fieldsMapping[idx]['name']] = {'label':label, 'value':value};
                    }
                    for (var idx = 0; idx < links.length; idx++) {
                        value = tmp_resultobj["records"][0][options.field_base + links[idx]['name']];
                        if (value !== undefined){
                            value = encodeURIComponent(value);
                            if (resultobj[links[idx].link_for] !== undefined) {
                                resultobj[links[idx].link_for].link = value;
                            }
                        }
                    }
                    var detail_options = {data: resultobj,
                                field_base: options.field_base,
                                sections: sections,
                                raw_data:data};
                    if (options.prerender){
                        detail_options = options.prerender(detail_options);
                    }

                    detail_options = _.extend(detail_options, options.options.layout_vars);

                    render(options.req, options.res, 'details', detail_options, true);
                }
                catch(err){
                    var detail_options = {data: "",
                            field_base: options.field_base};
                    if (options.error_fallback){
                        detail_options = options.error_fallback(detail_options);
                    }
                    render(options.req, options.res, 'details', detail_options, true);
                }

            }
            else {
                if (!error && response.statusCode !== 200){
                    console.log(response.statusCode);
                }
                else {
                    console.log(error);
                }
            }
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

function getIndexCreationDate() {
    var elastic = nconf.get()['elastic'];
    var request = require('sync-request');
    var dateFormat = require('dateformat');

    var indexed_url = 'http://' + elastic.host + ':' + elastic.port + elastic.path + elastic.index + '/_settings';
    console.log(indexed_url);
    var creation_date = 'unknown';
    var res;
    try {
        res = request('GET', indexed_url);
        var res_json = JSON.parse(res.getBody('utf8'));
        var index_real_name = Object.keys(res_json)[0];
        var creation_date_str = res_json[index_real_name].settings.index.creation_date;
        var creation_date = new Date(0);
        creation_date.setUTCSeconds(creation_date_str.substring(0, creation_date_str.length - 3));
        creation_date = dateFormat(creation_date, 'dd mmmm yyyy HH:MM TT');
        console.log('getIndexCreationDate for', index_real_name, '-', creation_date);
    } catch(e) {
        console.log(e);
    }
    return creation_date;
}

function getContainerInfo() {
    var child_process = require('child_process');
    var info = {
        'hostname': process.env.HOSTNAME || 'unknown',
        'version_info': process.env.VERSION_INFO || 'unknown',
        'tag_info': GLOBAL.gittagnumber || 'unknown'
    };
    console.log('Container info: ' + JSON.stringify(info));
    return info;
}

module.exports = {
    framework: EEAFacetFramework,
    render: render,
    renderDetails: renderDetails,
    getSortedFields: getSortedFields,
    getSections: getSections,
    getLinks: getLinks,
    getIndexCreationDate: getIndexCreationDate,
    getContainerInfo: getContainerInfo
}

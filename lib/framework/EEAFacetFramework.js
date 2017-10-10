/* global require, GLOBAL, __dirname, console, process, module */
var body = require('body-parser');
var cache = require('../util/cache');
var express = require('express');
var path = require('path');
var jade = require('jade');
var fs = require('fs');
var _ = require('underscore');
var routes = require('../routes');
var middleware = require('../middleware');
var compression = require('compression');

var bundleup;
try {
    bundleup = require('bundle-up3');
}
catch (e) {
    if (e.code !== 'MODULE_NOT_FOUND') {
        throw(e);
    }
   console.log('bundle-up3 module not found');
}
var assets;
if (bundleup) {
    try {
        assets = require('./assets');
    }
    catch (e) {
        if (e.code !== 'MODULE_NOT_FOUND') {
            throw(e);
        }
        console.log('assets module not found');
    }
}

var nconf = require('nconf');
var getenv = require('getenv');
var APP_CONFIG_DIRNAME = getenv.string('APP_CONFIG_DIRNAME', '');
var APP_CONFIG_DIR = (APP_CONFIG_DIRNAME) ? APP_CONFIG_DIRNAME + '/' : '';
var GOOGLE_MAP_KEY = getenv.string('GOOGLE_MAP_KEY', false);

nconf.file({file:'/code/config/' + APP_CONFIG_DIR + 'settings.json'});

var templatePath = nconf.get('external_templates:local_path');

function EEAFacetFramework(app_home) {
    GLOBAL.eea_app_home = app_home;

    var app = express();
    app.use(body.json());

    app.use(compression());

    if (bundleup) {
        bundleup(app, assets, {
            staticRoot: __dirname + '/public',
            staticUrlRoot:'esbootstrap_resources/',
            bundle:true,
            minifyJs: false,
            minifyCss: false,
            complete: console.log.bind(console, "Bundle-up: static files are minified/ready")
        });
    }

/*    app.get('/invalidate_templates', routes.invalidateTemplates);
    app.get('/update_external_configs', routes.updateExternalConfigs);
    app.get('/api', routes.elasticProxy);
    app.get('/download', routes.download);
    app.put('/setlandingvalues', function(req, res) {routes.cache.setLandingValues(req, res)});
    app.get('/invalidate_landingvalues', routes.cache.invalidateLandingValues);*/


    // for backward compatibility
    app.get('/invalidate_templates', routes.invalidateTemplates);
    app.get('/refreshtemplate', routes.invalidateTemplates);
    app.get('/invalidate_landingvalues', routes.cache.invalidateLandingValues);

    app.get('/tools/invalidate_templates', routes.invalidateTemplates);
    app.get('/tools/refreshtemplate', routes.invalidateTemplates);
    app.get('/tools/update_external_configs', routes.updateExternalConfigs);
    app.get('/tools/api', routes.elasticProxy);
    app.get('/tools/download', routes.download);
    app.put('/tools/setlandingvalues', function(req, res) {routes.cache.setLandingValues(req, res);});
    app.get('/tools/invalidate_landingvalues', routes.cache.invalidateLandingValues);
    app.use(express.static(path.join(__dirname, 'public')));
    app.use("/esbootstrap_resources", express.static(path.join(__dirname, 'public')));
    return app;
}

function render(req, res, template, options, isDetail) {
  var landingpage_enabled = nconf.get()["landingpage_enabled"] || false;
  var suggestions_enabled = nconf.get()["suggestions_enabled"] || false;
  var es_debug_enabled = nconf.get()["es_debug_enabled"] || false;
  var selected_navigation_tab = nconf.get()["selected_navigation_tab"] || false;
  var relevance_enabled = nconf.get()["relevance_enabled"] || false;
  template = path.join(GLOBAL.eea_app_home, "views", template + ".jade");
  if (!template.endsWith("details.jade")){
      var customTemplate = path.join('/code/config/', APP_CONFIG_DIR,  "/views/index.jade");
      if (fs.existsSync(customTemplate)){
        template = customTemplate;
      }
  }
  else {
      var customTemplate = path.join('/code/config/', APP_CONFIG_DIR,  "/views/details.jade");
      if (fs.existsSync(customTemplate)){
        template = customTemplate;
      }
  }
  var landingtemplate = path.join('/code/config/', APP_CONFIG_DIR,  "/views/landing.jade");

  var cardViewTemplate = path.join(__dirname, 'views', 'cardview.jade');
  var listViewTemplate = path.join(__dirname, 'views', 'listview.jade');

  var layoutTemplate =  path.join(__dirname, 'views', 'layout.jade');

  var customCardViewTemplate = path.join('/code/config/', APP_CONFIG_DIR,  "/views/cardview.jade");
  if (fs.existsSync(customCardViewTemplate)){
    cardViewTemplate = customCardViewTemplate;
  }

  var customListViewTemplate = path.join('/code/config/', APP_CONFIG_DIR,  "/views/listview.jade");
  if (fs.existsSync(customListViewTemplate)){
    listViewTemplate = customListViewTemplate;
  }

  var customLayoutTemplate = path.join('/code/config/', APP_CONFIG_DIR,  "/views/layout.jade");
  if (fs.existsSync(customLayoutTemplate)){
    layoutTemplate = customLayoutTemplate;
  }

  cache.getCachedValues("externals", 0, function(external_configs){
  cache.getLandingValues(function(landingCache){
  getRelevanceSettings(function(relevanceSettings){
  getTypes(function(types){
  getHighlights(function(highlights){
  getSortedFields("facet", function(facets){
    getSortedFields("listing", function(listing){
      getSortedFields("details", function(details){
        getSortedFields("card", function(card){
            getSortedFields("list", function(list){
                getSearch_SortByFromSettings(function(settings_search_sortby){
                    getSortFromSettings(function(settings_sort){
                        getDisplayOptionsFromSettings(function(settings_display_options){
                        getDisplayImagesFromSettings(function(settings_display_images){
                            getDefaultDisplayFromSettings(function(settings_default_display){
                                middleware.templateRequired(req, res, function(){
                                middleware.externalConfigsRequired(req, res, function(){
                                    var count_facets = [];
                                    for (var i = 0; i < facets.length; i++){
                                        if (facets[i].order === 'rterm'){
                                            facets[i].order = 'reverse_term';
                                        }
                                        if (facets[i].order === 'rcount'){
                                            facets[i].order = 'reverse_count';
                                        }
                                        if (facets[i].allow_exact){
                                            count_facets.push(JSON.parse(JSON.stringify(facets[i])));
                                            count_facets[count_facets.length - 1].title = "#Count " + count_facets[count_facets.length - 1].title;
                                            count_facets[count_facets.length - 1].name = "items_count_" + count_facets[count_facets.length - 1].name;
                                            count_facets[count_facets.length - 1].order = 'term';
                                            count_facets[count_facets.length - 1].type = 'range';
                                            count_facets[count_facets.length - 1].allow_exact = false;
                                            count_facets[count_facets.length - 1].autocomplete = false;

                                        }
                                    }
                                    for (var i = 0; i < count_facets.length; i++){
                                        facets.push(count_facets[i]);
                                    }
                                    var templatestr = fs.readFileSync(template, 'utf8');
                                    if (landingpage_enabled){
                                        var landingstr = fs.readFileSync(landingtemplate, 'utf8');
                                        templatestr = templatestr + landingstr;
                                    }

                                    var cardTemplateStr = fs.readFileSync(cardViewTemplate);
                                    var renderedCardTemplate = jade.render(cardTemplateStr);
                                    options.cardViewTemplate = renderedCardTemplate;

                                    var listTemplateStr = fs.readFileSync(listViewTemplate);
                                    var renderedListTemplate = jade.render(listTemplateStr);
                                    options.listViewTemplate = renderedListTemplate;

                                    templatestr = "extends " +layoutTemplate + "\n" + templatestr;
                                    if (isDetail){
                                        templatestr = "include " +path.join(__dirname, 'views', 'details.jade') + "\n" + templatestr;
                                    }
                                    options.basedir = '/';
                                    options.headFile = path.join(templatePath, 'head.html');
                                    options.headerFile = path.join(templatePath, 'header.html');
                                    options.footerFile = path.join(templatePath, 'footer.html');
                                    options.templateRender = fs.readFileSync;
                                    var mapping = {facets: facets, listing: listing, details: details, card: card, list: list, highlights: highlights, types: types};
                                    options.mapping = "var eea_mapping = " + JSON.stringify(mapping);
                                    if (typeof options.getIndexCreationDate === 'undefined') {
                                        options.getIndexCreationDate = getIndexCreationDate;
                                    }
                                    if (typeof options.getContainerInfo === 'undefined') {
                                        options.getContainerInfo = getContainerInfo;
                                    }

                                    options.settings_search_sortby = "var settings_search_sortby = " + JSON.stringify(settings_search_sortby) + ";";
                                    options.settings_sort = "var settings_sort = " + JSON.stringify(settings_sort) + ";";
                                    options.settings_display_options = "var settings_display_options = " + JSON.stringify(settings_display_options) + ";";
                                    options.settings_display_images = "var settings_display_images = " + JSON.stringify(settings_display_images) + ";";
                                    options.settings_default_display = "var settings_default_display = " + JSON.stringify(settings_default_display) + ";";
                                    options.settings_landingpage_enabled = "var settings_landingpage_enabled = " + landingpage_enabled + ";";
                                    options.settings_suggestions_enabled = "var settings_suggestions_enabled = " + suggestions_enabled + ";";
                                    options.settings_selected_navigation_tab = "var settings_selected_navigation_tab = '" + selected_navigation_tab + "';";
                                    options.settings_es_debug_enabled = "var settings_es_debug_enabled = " + es_debug_enabled + ";";
                                    options.settings_relevance_enabled = "var settings_relevance_enabled = " + relevance_enabled + ";";
                                    options.settings_relevance = "var settings_relevance = " + JSON.stringify(relevanceSettings) + ";";

                                    var default_external_configs = "{}";
                                    if (nconf.get("external_configs:defaults") !== undefined) {
                                        var default_external_configs_file = path.join('/code/config/', APP_CONFIG_DIR, nconf.get("external_configs:defaults"));
                                        if (fs.existsSync(default_external_configs_file)){
                                            default_external_configs = fs.readFileSync(default_external_configs_file, 'utf8');
                                        }
                                    }
                                    options.settings_default_external_configs = "var settings_default_external_configs = " + default_external_configs + ";";
                                    options.settings_external_configs = "var settings_external_configs = " + JSON.stringify(external_configs) + ";";
                                    options.google_map_key = GOOGLE_MAP_KEY;

                                    default_external_configs = JSON.parse(default_external_configs);
                                    if (!_.isEmpty(default_external_configs)){
                                        var req_path = req.url.split("?")[0];
                                        var req_path_parts = req_path.split("/");
                                        var req_location = req_path_parts[req_path_parts.length - 1];
                                        var merged_external_config_for_country = _.extend(default_external_configs[req_location], external_configs[req_location]);
                                        if (default_external_configs["fallback"] !== undefined){
                                            var fallback_keys = _.keys(default_external_configs["fallback"]);
                                            if (merged_external_config_for_country === undefined){
                                                merged_external_config_for_country = {};
                                            }
                                            for (var i = 0; i < fallback_keys.length; i++){
                                                if ((merged_external_config_for_country[fallback_keys[i]] === "") || (merged_external_config_for_country[fallback_keys[i]] === undefined)){
                                                    merged_external_config_for_country[fallback_keys[i]] = default_external_configs["fallback"][fallback_keys[i]];
                                                }
                                            }
                                        }
                                        options.external_config = merged_external_config_for_country;
                                    }
                                    if (!landingCache){
                                        landingCache = {};
                                    }
                                    options.landingCache = landingCache;
                                    if (bundleup) {
                                        options.renderJs = req.app.locals.renderJs;
                                        options.renderStyles = req.app.locals.renderStyles;
                                    }
                                    var page = jade.render(templatestr, options);
                                    res.send(page);
                                });
                                });

                            });
                        });
                        });
                    });
                });
            });
        });
      });
    });
  });
  });
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
                    var tmp_resultobj = {};
                    tmp_resultobj["records"] = [];
                    for ( var item = 0; item < data.hits.hits.length; item++ ) {
                        tmp_resultobj["records"].push(data.hits.hits[item]._source);
                        tmp_resultobj["records"][tmp_resultobj["records"].length - 1]._id = data.hits.hits[item]._id;
                    }
                    var resultobj = {};
                    var value, label;
                    for (var idx = 0; idx < fieldsMapping.length; idx++) {
                        value = tmp_resultobj["records"][0][options.field_base + fieldsMapping[idx]['name']];
                        label = fieldsMapping[idx]['title'];
                        type = fieldsMapping[idx]['type'];
                        if (type === undefined){
                            type = 'simple';
                        }

                        if (label.substr(label.length - 5,5) === "_link"){
                            value = encodeURIComponent(value);
                        }

                        resultobj[fieldsMapping[idx]['name']] = {'label':label, 'value':value, 'type':type};
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
                    render(options.req, options.res, "details", detail_options, true);
                }
                catch(err){
                    var detail_options = {data: "",
                            field_base: options.field_base};
                    if (options.error_fallback){
                        detail_options = options.error_fallback(detail_options);
                    }
                    detail_options = _.extend(detail_options, options.options.layout_vars);
                    render(options.req, options.res, "details", detail_options, true);
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
    return a.pos - b.pos;
}

function getSortedFields(attr, next) {
    var app = require(path.join(GLOBAL.eea_app_home,"app.js"));
    app.fieldsMapping(function(mapping){
        var fields = [];
        for (var idx = 0; idx < mapping.fields_mapping.length; idx++){

            var parent = mapping.fields_mapping[idx];
            var field = parent[attr];
            if ((field !== undefined) && (field.visible)){
                field.name = parent.name;
                if (field.pos === undefined){
                    field.pos = 999;
                }
                if (field.title === undefined){
                    field.title = field.name;
                }
                if (field.values_whitelist === undefined){
                    field.values_whitelist = parent.values_whitelist;
                }
                if (field.values_blacklist === undefined){
                    field.values_blacklist = parent.values_blacklist;
                }
                fields.push(field);
            }
        }
        next(fields.sort(sort_elements));
    });
}

function getHighlights(next) {
    var app = require(path.join(GLOBAL.eea_app_home,"app.js"));
    app.fieldsMapping(function(mapping){
        var highlights = mapping.highlights;
        if (highlights === undefined){
            highlights = {};
        }
        if (highlights.enabled === undefined){
            highlights.enabled = false;
        }
        if (highlights.whitelist === undefined){
            highlights.whitelist = [];
        }
        if (highlights.blacklist === undefined){
            highlights.blacklist = [];
        }
        next(highlights);
    });
}

function getTypes(next) {
    var app = require(path.join(GLOBAL.eea_app_home,"app.js"));
    app.fieldsMapping(function(mapping){
        var types = mapping.types;
        next(types);
    });

}

function getSections(next) {
    getSortedFields("details", function(fields){
        var app = require(path.join(GLOBAL.eea_app_home,"app.js"));
        app.fieldsMapping(function(mapping){
            var sections = mapping.details_settings.sections;
            var details_fields = [];
            for (var idx = 0; idx < fields.length; idx++) {
                if (details_fields[fields[idx].section] === undefined){
                    details_fields[fields[idx].section] = [];
                }
                details_fields[fields[idx].section].push(fields[idx]);
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
        var links = [];
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
        res = request('GET', 'http://' + elastic.host + ':' + elastic.port + elastic.path + elastic.index + '/status/last_update');
        var res_json = JSON.parse(res.getBody('utf8'));
        var updated_at = res_json._source.updated_at;
        var min_update = _.min(_.values(updated_at));
        creation_date = dateFormat(min_update, 'dd mmmm yyyy HH:MM TT');
    } catch(e) {
        console.log("couldn't get last_udpate from status, fallback to index creation_date");
        try {
            res = request('GET', indexed_url);
            var res_json = JSON.parse(res.getBody('utf8'));
            var index_real_name = Object.keys(res_json)[0];
            var creation_date_str = res_json[index_real_name].settings.index.creation_date;
            creation_date = new Date(0);
            creation_date.setUTCSeconds(creation_date_str.substring(0, creation_date_str.length - 3));
            creation_date = dateFormat(creation_date, 'dd mmmm yyyy HH:MM TT');
            console.log('getIndexCreationDate for', index_real_name, '-', creation_date);
        } catch(e) {
            console.log(e);
        }
    }
    return creation_date;
}

function getContainerInfo() {
    var info = {
        'hostname': process.env.HOSTNAME || 'unknown',
        'version_info': process.env.VERSION_INFO || 'unknown',
        'tag_info': GLOBAL.gittagnumber || 'unknown'
    };
    console.log('Container info: ' + JSON.stringify(info));
    return info;
}

function getSearch_SortByFromSettings(next) {
    var app = require(path.join(GLOBAL.eea_app_home,"app.js"));
    app.fieldsMapping(function(mapping){
        if (mapping.search_sortby === undefined){
            mapping.search_sortby = [];
        }
        next(mapping.search_sortby);
    });

}

function getSortFromSettings(next) {
    var app = require(path.join(GLOBAL.eea_app_home,"app.js"));
    app.fieldsMapping(function(mapping){
        if (mapping.sort === undefined){
            mapping.sort = [];
        }
        next(mapping.sort);
    });
}

function getDisplayOptionsFromSettings(next) {
    var app = require(path.join(GLOBAL.eea_app_home,"app.js"));
    app.fieldsMapping(function(mapping){
        if (mapping.display_options === undefined){
            mapping.display_options = ['tabular'];
        }
        next(mapping.display_options);
    });
}

function getDisplayImagesFromSettings(next) {
    var app = require(path.join(GLOBAL.eea_app_home,"app.js"));
    app.fieldsMapping(function(mapping){
        if (mapping.display_images === undefined){
            mapping.display_images = true;
        }
        next(mapping.display_images);
    });
}

function getDefaultDisplayFromSettings(next) {
    var app = require(path.join(GLOBAL.eea_app_home,"app.js"));
    app.fieldsMapping(function(mapping){
        if (mapping.default_display === undefined){
            mapping.default_display = 'tabular';
        }
        next(mapping.default_display);
    });
}

function getRelevanceSettings(next) {
    var app = require(path.join(GLOBAL.eea_app_home,"app.js"));
    if (app.relevanceSettings) {
        app.relevanceSettings(function(relevanceSettings){
            next(relevanceSettings);
        });
    }
    else {
        next();
    }
}

module.exports = {
    framework: EEAFacetFramework,
    render: render,
    renderDetails: renderDetails,
    getSortedFields: getSortedFields,
    getSections: getSections,
    getLinks: getLinks,
    getIndexCreationDate: getIndexCreationDate,
    getContainerInfo: getContainerInfo,
    getSearch_SortByFromSettings: getSearch_SortByFromSettings,
    getSortFromSettings: getSortFromSettings
};

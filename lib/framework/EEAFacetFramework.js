/* eslint-disable no-console */
/* global require, GLOBAL, __dirname, console, process, module */
var body = require('body-parser');
var cache = require('../util/cache');
var express = require('express');
var path = require('path');
var pug = require('pug');
var fs = require('fs');
var _ = require('underscore');
var routes = require('../routes');
var middleware = require('../middleware');
var run_server_command = (process && process.argv[2] === "runserver") || false;

var compression;

try {
   compression = require('compression');
}
catch (e) {
    if (e.code !== 'MODULE_NOT_FOUND') {
        throw(e);
    }
   console.log('compression module not found');
}

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
if (bundleup && run_server_command) {
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
var SENTRY_DSN = getenv.string('SENTRY_DSN', false);
var SENTRY_VER = getenv.string('VERSION_INFO', false);

var DASHBOARD_SRC = getenv.string('DASHBOARD_SRC', '');


var draft_env_str = getenv.string('DRAFT', null);
var draft_cfg = nconf.get('DRAFT', false);
var draft_env;

if (draft_env_str === 'true'){
    draft_env = true
}
if (draft_env_str === 'false'){
    draft_env = false;
}

var draft = draft_cfg;
if (draft_env !== undefined){
    draft = draft || draft_env;
}

nconf.file({file:'/code/config/' + APP_CONFIG_DIR + 'settings.json'});

var templatePath = nconf.get('external_templates:local_path');

function EEAFacetFramework(app_home) {
    global.eea_app_home = app_home;

    var app = express();
    app.use(body.json());

    if (compression) {
        app.use(compression());
    }

    var skip_bundling = nconf.get("layout_vars")["skip_resources_bundling"] || false;

    if (bundleup && run_server_command && !skip_bundling) {
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



    app.get('/API/v1/update', routes.API.update);
    app.get('/API/v1/cancel_update', routes.API.cancel_update);
    app.get('/API/v1/switch', routes.API.switch);
    app.get('/API/v1/status', routes.API.status);
    app.get('/API/v1/healthcheck', routes.API.healthcheck);

    if ((nconf.get()["source"]["type"] === "url") || (nconf.get()["source"]["type"] === "file")){
        app.get('/API/v1/update_from_url', routes.API.update_from_url);
    }
    if (nconf.get()["source"]["type"] === "rdfriver") {
        app.get('/API/v1/reindex_cluster', routes.API.reindex_cluster);
    }

    // for backward compatibility
    app.get('/invalidate_templates', routes.invalidateTemplates);
    app.get('/refreshtemplate', routes.invalidateTemplates);
    app.get('/invalidate_landingvalues', routes.cache.invalidateLandingValues);

    app.get('/tools/invalidate_templates', routes.invalidateTemplates);
    app.get('/tools/refreshtemplate', routes.invalidateTemplates);
    app.get('/tools/update_external_configs', routes.updateExternalConfigs);
    app.get('/tools/api', routes.elasticProxy);
    app.post('/tools/api', routes.elasticProxy);
    app.get('/tools/download', routes.download);
    app.put('/tools/setlandingvalues', function(req, res) {routes.cache.setLandingValues(req, res);});
    app.get('/tools/invalidate_landingvalues', routes.cache.invalidateLandingValues);
    app.use(express.static(path.join(__dirname, 'public')));
    app.use("/esbootstrap_resources", express.static(path.join(__dirname, 'public')));
    return app;
}

const render = async(req, res, template, options, isDetail) => {

  const index_in_progress = await test_index_in_progress();
  const diffs_in_indices = await test_diffs_in_indices();

  var landingpage_enabled = nconf.get()["landingpage_enabled"] || false;
  var suggestions_enabled = nconf.get()["suggestions_enabled"] || false;
  var es_debug_enabled = nconf.get()["es_debug_enabled"] || false;
  var selected_navigation_tab = nconf.get()["selected_navigation_tab"] || false;
  var relevance_enabled = nconf.get()["relevance_enabled"] || false;
  template = path.join(global.eea_app_home, "views", template + ".pug");
  var customTemplate;
  if (!template.endsWith("details.pug")){
      customTemplate = path.join('/code/config/', APP_CONFIG_DIR,  "/views/index.pug");
      if (fs.existsSync(customTemplate)){
        template = customTemplate;
      }
  }
  else {
      customTemplate = path.join('/code/config/', APP_CONFIG_DIR,  "/views/details.pug");
      if (fs.existsSync(customTemplate)){
        template = customTemplate;
      }
  }
  var landingtemplate = path.join('/code/config/', APP_CONFIG_DIR,  "/views/landing.pug");

  var cardViewTemplate = path.join(__dirname, 'views', 'cardview.pug');
  var listViewTemplate = path.join(__dirname, 'views', 'listview.pug');

  var layoutTemplate =  path.join(__dirname, 'views', 'layout.pug');

  var customCardViewTemplate = path.join('/code/config/', APP_CONFIG_DIR,  "/views/cardview.pug");
  if (fs.existsSync(customCardViewTemplate)){
    cardViewTemplate = customCardViewTemplate;
  }

  var customListViewTemplate = path.join('/code/config/', APP_CONFIG_DIR,  "/views/listview.pug");
  if (fs.existsSync(customListViewTemplate)){
    listViewTemplate = customListViewTemplate;
  }

  var customLayoutTemplate = path.join('/code/config/', APP_CONFIG_DIR,  "/views/layout.pug");
  if (fs.existsSync(customLayoutTemplate)){
    layoutTemplate = customLayoutTemplate;
  }

  //  Get query language
  var default_language, languages;
  var translation = nconf.get('translation');
  var queryString = req.url.split('/?')[1];
  var query = {};
  var lang = 'en';

  if (queryString) {
    queryString.split('&').forEach(function(param) {
      if (param.includes('=')) {
        query[param.split('=')[0]] = param.split('=')[1];
      }
    })
  }

  if (translation && translation.enabled) {
    languages = translation.languages ? translation.languages : { en: '' };
    default_language = translation.default_language ? translation.default_language : 'en';
    lang = query.lang && languages[query.lang] ? query.lang : default_language;
  }

  const external_configs = await cache.getCachedValues("externals", 0);
  const creation_date = await getIndexCreationDate();
  let landingCache = await cache.getLandingValues();
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
                                            count_facets[count_facets.length - 1].default_values = undefined;

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
                                    var renderedCardTemplate = pug.render(cardTemplateStr);
                                    options.cardViewTemplate = renderedCardTemplate;

                                    var listTemplateStr = fs.readFileSync(listViewTemplate);
                                    var renderedListTemplate = pug.render(listTemplateStr);
                                    options.listViewTemplate = renderedListTemplate;

                                    if (isDetail){
                                        templatestr = "include " +path.join(__dirname, 'views', 'details.pug') + "\n" + templatestr;
                                    }
                                    templatestr = "extends " +layoutTemplate + "\n" + templatestr;
                                    options.basedir = '/';
                                    options.headFile = path.join(templatePath, `head_${lang}.html`);
                                    options.headerFile = path.join(templatePath, `header_${lang}.html`);
                                    options.footerFile = path.join(templatePath, `footer_${lang}.html`);
                                    options.templateRender = fs.readFileSync;

                                    // #105453 introduce external_templates_url with eea fallback
                                    var external_options = nconf.get('external_templates');
                                    var protocol, host;
                                    protocol = external_options['protocol'] || 'https';
                                    host = external_options['host'] || 'www.eea.europa.eu';
                                    options.external_templates_url = protocol + '://' + host;

                                    var mapping = {facets: facets, listing: listing, details: details, card: card, list: list, highlights: highlights, types: types};
                                    options.mapping = "var eea_mapping = " + JSON.stringify(mapping);
                                    options.creation_date = creation_date;
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

                                    options.settings_draft = "var settings_draft = " + draft + ";";

                                    options.settings_translation = "var settings_translation = " + JSON.stringify(translation) + ";";

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
                                    options.sentry_dsn = SENTRY_DSN;
                                    options.sentry_ver = SENTRY_VER;
                                    options.dashboard_src = DASHBOARD_SRC;
                                    options.sentry_instance = global.sentry_hostname;
                                    options.sentry_app_name = global.sentry_app_name;
                                    options.sentry_rancher_env = global.sentry_rancher_env;
                                    default_external_configs = JSON.parse(default_external_configs);
                                    if (!_.isEmpty(default_external_configs)){
                                        var req_path = req.url.split("?")[0];
                                        var req_path_parts = req_path.split("/");
                                        var req_filter = req_path_parts[req_path_parts.length - 1];
                                        var merged_external_config_for_filter = _.extend(default_external_configs[req_filter], external_configs[req_filter]);
                                        if (default_external_configs["fallback"] !== undefined){
                                            var fallback_keys = _.keys(default_external_configs["fallback"]);
                                            if (merged_external_config_for_filter === undefined){
                                                merged_external_config_for_filter = {};
                                            }
                                            for (var i = 0; i < fallback_keys.length; i++){
                                                if ((merged_external_config_for_filter[fallback_keys[i]] === "") || (merged_external_config_for_filter[fallback_keys[i]] === undefined)){
                                                    merged_external_config_for_filter[fallback_keys[i]] = default_external_configs["fallback"][fallback_keys[i]];
                                                }
                                            }
                                        }
                                        options.external_config = merged_external_config_for_filter;
                                    }
                                    if (!landingCache){
                                        landingCache = {};
                                    }
                                    options.landingCache = landingCache;
                                    if (bundleup) {
                                        options.renderJs = req.app.locals.renderJs;
                                        options.renderStyles = req.app.locals.renderStyles;
                                    }
                                    if (typeof options.breadcrumbs === 'string') {
                                        var breadcrumbs = {};
                                        breadcrumbs[options.breadcrumbs] = "";
                                        options.breadcrumbs = [{"Home":"http://www.eea.europa.eu"}, breadcrumbs];
                                    }
                                    if (options.external_config){
                                        var variables = {};
                                        for (i = 0; i < Object.keys(options.external_config).length; i++){
                                            var ec_key = Object.keys(options.external_config)[i];
                                            var ec_val = options.external_config[ec_key];
                                            variables["${external_config." + ec_key + "}"] = ec_val;
                                        }
                                        var new_breadcrumbs = [];
                                        for (var i = 0; i < options.breadcrumbs.length; i++){
                                            var new_breadcrumb = {};
                                            for (j = 0; j < Object.keys(options.breadcrumbs[i]).length; j++){
                                                var bc_key = Object.keys(options.breadcrumbs[i])[j];
                                                var bc_val = options.breadcrumbs[i][bc_key];
                                                var new_key = replace_variables_in_text(bc_key, variables);
                                                new_breadcrumb[new_key] = bc_val;
                                            }
                                            new_breadcrumbs.push(new_breadcrumb);
                                        }
                                        options.breadcrumbs = new_breadcrumbs;
                                    }
                                    options.index_in_progress = index_in_progress;
                                    options.diffs_in_indices = diffs_in_indices;
                                    var page = pug.render(templatestr, options);
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
}

const test_diffs_in_indices = async() => {
    return new Promise(async (resolve, reject) => {
        var elastic = nconf.get()['elastic'];
        var appalias = elastic.appalias || elastic.default_appalias;
        if (appalias === 'prod'){
            resolve(false);
        }
        else {
            const index_helpers = require('eea-searchserver').indexHelpers;
            const latest_index_info = await index_helpers.get_status('latest');
            const production_index_info = await index_helpers.get_status('prod');

            let extra_columns = [];
            let missing_columns = [];

            if ((production_index_info !== undefined) &&
                (production_index_info.columns !== undefined) &&
                (latest_index_info !== undefined) &&
                (latest_index_info.columns !== undefined)){
                for (let i = 0; i < latest_index_info.columns.length; i++){
                    if (production_index_info.columns.indexOf(latest_index_info.columns[i]) === -1){
                        extra_columns.push(latest_index_info.columns[i]);
                    }
                }
                for (let i = 0; i < production_index_info.columns.length; i++){
                    if (latest_index_info.columns.indexOf(production_index_info.columns[i]) === -1){
                        missing_columns.push(production_index_info.columns[i]);
                    }
                }
            }

            if ((extra_columns.length !==0) || (missing_columns.length !== 0)){
                resolve(true);
            }
            else {
                resolve(false);
            }
        }
    });
}

const test_index_in_progress = async() => {
    return new Promise(async (resolve, reject) => {
        var elastic = nconf.get()['elastic'];
        var appalias = elastic.appalias || elastic.default_appalias;
        if (appalias === 'prod'){
            resolve(false);
        }
        else {
            const index_helpers = require('eea-searchserver').indexHelpers;
            const status = await index_helpers.get_status();
            if ((status.status !== undefined) && (status.status === 'finished')){
                resolve(false);
            }
            else {
                resolve(true);
            }
        }
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
                    var value, label, type, split, link_title, link_label, link_split;
                    for (var idx = 0; idx < fieldsMapping.length; idx++) {
                        value = tmp_resultobj["records"][0][options.field_base + fieldsMapping[idx]['name']];
                        label = fieldsMapping[idx]['title'];
                        type = fieldsMapping[idx]['type'];
                        split = fieldsMapping[idx]['split'] || '';
                        link_title = fieldsMapping[idx]["link_title"] || label;
                        link_label = fieldsMapping[idx]["link_label"] || value;
                        if (type === undefined){
                            type = 'simple';
                        }

                        if (label.substr(label.length - 5,5) === "_link"){
                            value = encodeURIComponent(value);
                        }

                        resultobj[fieldsMapping[idx]['name']] = {'label':label, 'value':value, 'type':type, "link_title": link_title, "link_label": link_label, "split": split};
                    }
                    for (var idx = 0; idx < links.length; idx++) {
                        value = tmp_resultobj["records"][0][options.field_base + links[idx]['name']];
                        link_split = links[idx].link_split || '';
                        if (value !== undefined){
                            if (resultobj[links[idx].link_for] !== undefined) {
                                resultobj[links[idx].link_for].link = value;
                                resultobj[links[idx].link_for].link_split = link_split;
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

                    if (typeof detail_options.breadcrumbs === 'string') {
                        var breadcrumbs = {};
                        breadcrumbs[detail_options.breadcrumbs] = "";
                        detail_options.breadcrumbs = [{"Home":"http://www.eea.europa.eu"}, breadcrumbs];
                    }
                    var breadcrumbs_last_part = detail_options.breadcrumbs[detail_options.breadcrumbs.length - 1];
                    for (var key in breadcrumbs_last_part){
                        detail_options.breadcrumbs[detail_options.breadcrumbs.length - 1][key] = options.req.originalUrl.split("details")[0];
                    }
                    var current_breadcrumb_field = sections[0].fields[0].name;
                    for (var i = 0; i < sections.length; i++){
                        for (var j = 0; j < sections[i].fields.length; j++){
                            if (sections[i].fields[j].use_in_breadcrumb){
                                current_breadcrumb_field = sections[i].fields[j].name;
                            }
                        }
                    }
                    var details_breadcrumb = {};
                    details_breadcrumb[detail_options.data[current_breadcrumb_field].value] = "";
                    detail_options.breadcrumbs.push(details_breadcrumb);
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
    var app = require(path.join(global.eea_app_home,"app.js"));
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
    var app = require(path.join(global.eea_app_home,"app.js"));
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
    var app = require(path.join(global.eea_app_home,"app.js"));
    app.fieldsMapping(function(mapping){
        var types = mapping.types;
        next(types);
    });

}

function getSections(next) {
    getSortedFields("details", function(fields){
        var app = require(path.join(global.eea_app_home,"app.js"));
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
    var app = require(path.join(global.eea_app_home,"app.js"));
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

function getAuth(user){
    var elastic = nconf.get()['elastic'];
    var esuser = 'rouser';
    var espass = 'ropass';
    if (user === 'rw'){
        esuser = 'rwuser';
        espass = 'rwpass';
    }
    if ((elastic[esuser] !== undefined) && (elastic[esuser] !== undefined) && (elastic[esuser] !== '')){
        return encodeURIComponent(elastic[esuser]) + ":" + encodeURIComponent(elastic[espass]) + "@";
    }
    return "";
}


const getIndexCreationDate = async() => {
    const index_helpers = require('eea-searchserver').indexHelpers;

    const creation_date = await index_helpers.get_index_creation_date();

    return creation_date;
}

function getContainerInfo() {
    var info = {
        'hostname': process.env.HOSTNAME || 'unknown',
        'version_info': process.env.VERSION_INFO || 'unknown',
        'tag_info': global.gittagnumber || 'unknown'
    };
//    console.log('Container info: ' + JSON.stringify(info));
    return info;
}

function getSearch_SortByFromSettings(next) {
    var app = require(path.join(global.eea_app_home,"app.js"));
    app.fieldsMapping(function(mapping){
        if (mapping.search_sortby === undefined){
            mapping.search_sortby = [];
        }
        next(mapping.search_sortby);
    });

}

function getSortFromSettings(next) {
    var app = require(path.join(global.eea_app_home,"app.js"));
    app.fieldsMapping(function(mapping){
        if (mapping.sort === undefined){
            mapping.sort = [];
        }
        next(mapping.sort);
    });
}

function getDisplayOptionsFromSettings(next) {
    var app = require(path.join(global.eea_app_home,"app.js"));
    app.fieldsMapping(function(mapping){
        if (mapping.display_options === undefined){
            mapping.display_options = ['tabular'];
        }
        next(mapping.display_options);
    });
}

function getDisplayImagesFromSettings(next) {
    var app = require(path.join(global.eea_app_home,"app.js"));
    app.fieldsMapping(function(mapping){
        if (mapping.display_images === undefined){
            mapping.display_images = true;
        }
        next(mapping.display_images);
    });
}

function getDefaultDisplayFromSettings(next) {
    var app = require(path.join(global.eea_app_home,"app.js"));
    app.fieldsMapping(function(mapping){
        if (mapping.default_display === undefined){
            mapping.default_display = 'tabular';
        }
        next(mapping.default_display);
    });
}

function getRelevanceSettings(next) {
    var app = require(path.join(global.eea_app_home,"app.js"));
    if (app.relevanceSettings) {
        app.relevanceSettings(function(relevanceSettings){
            next(relevanceSettings);
        });
    }
    else {
        next();
    }
}

function replace_variables_in_text(text, variables){
    return text.replace(/\$\{(.*?)\}/gi, function(matched) {
        return variables[matched];
    });
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

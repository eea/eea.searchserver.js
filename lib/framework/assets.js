// assets.js
var nconf = require('nconf');
var getenv = require('getenv');
var path = require('path');
var fs = require("fs");
var APP_CONFIG_DIRNAME = getenv.string('APP_CONFIG_DIRNAME', 'default');
var APP_CONFIG_DIR = '/code/config/'+ APP_CONFIG_DIRNAME;
var bjson = path.resolve(__dirname + '/../builtinBundles.json');
var global = nconf.file('global', bjson);
var global_layout = global['stores']['global']['store']['layout_vars'];
var layout, custom_layout;
var _ = require('underscore');

var custom_app;
if (APP_CONFIG_DIRNAME !== 'default') {
    nconf.file('custom', APP_CONFIG_DIR + '/settings.json');
    custom_app = true;
}
layout = global_layout;
custom_layout = custom_app && global['stores']['custom']['store']['layout_vars'] || false;
var override = custom_layout && custom_layout['override_searchserver_resources'];
if (override) {
    layout = custom_layout;
}


module.exports = function(assets) {
    var url;
    assets.root = __dirname;
    var custom_app_public_url = APP_CONFIG_DIR + '/public/';
    var custom_esb_public_url = path.join(__dirname + '/public/');
    var custom_dsb_public_url = '/sources_from_git/app/public/';
    var jsres = layout['js_resources'];
    var cssres = layout['css_resources'];
    var custom_jsres, custom_cssres;
    var jsres_pages = Object.keys(jsres);
    var cssres_pages = Object.keys(cssres);
    var js_resources, css_resources, jsres_page, cssres_page;
    var custom_jsres_page, custom_cssres_page, custom_jsres_pages, custom_cssres_pages, custom_js_resources, custom_css_resources;
    if (custom_app && !override) {
        custom_jsres = custom_layout['js_resources'];
        custom_cssres = custom_layout['css_resources'];
        if (custom_jsres) {
            custom_jsres_pages = Object.keys(custom_jsres);
            for (var i = 0, jlength = custom_jsres_pages.length; i <= jlength; i++) {
                custom_jsres_page = custom_jsres_pages[i];
                jsres_page = _.pick(jsres, custom_jsres_page)[custom_jsres_page];
                if (jsres_page) {
                    custom_js_resources = custom_jsres[custom_jsres_page];
                    jsres_page = jsres_page.concat(custom_js_resources);
                    jsres[custom_jsres_page] = jsres_page;
                }
            }
        }
        if (custom_cssres) {
            custom_cssres_pages = Object.keys(custom_cssres);
            for (var k = 0, clength = custom_cssres_pages.length; k <= clength; k++) {
                custom_cssres_page = custom_cssres_pages[k];
                cssres_page = _.pick(cssres, custom_cssres_page)[custom_cssres_page];
                if (cssres_page) {
                    custom_css_resources = custom_cssres[custom_cssres_page];
                    cssres_page = cssres_page.concat(custom_css_resources);
                    cssres[custom_cssres_page] = cssres_page;
                }
            }
        }
    }
    for (var i = 0, jlength = jsres_pages.length; i <= jlength; i++) {
        jsres_page = jsres_pages[i];
        js_resources = jsres[jsres_page];
        for (var j in js_resources) {
            url = js_resources[j];
            if (custom_app && url.indexOf('app_resources') !== -1) {
                assets.js.addFile(custom_app_public_url + url.substr(13, url.length - 1), jsres_page);
            } else if (custom_app && url.indexOf('esbootstrap_resources') !== -1) {
                assets.js.addFile(custom_esb_public_url + url.substr(21, url.length - 1), jsres_page);
            } else if(fs.existsSync(custom_app_public_url + url)) {
                assets.js.addFile(custom_app_public_url + url, jsres_page);
            } else if(fs.existsSync(custom_dsb_public_url + url)) {
                assets.js.addFile(custom_dsb_public_url + url, jsres_page);
            } else if(url.indexOf('http') !== -1) {
                assets.js.addUrl(url, jsres_page);
            }
            else {
                assets.addJs('/public/' + url, jsres_page);
            }
        }
    }

    console.log('js.files has', assets.js.files);
    for (var k = 0, clength = cssres_pages.length; k <= clength; k++) {
        cssres_page = cssres_pages[k];
        css_resources = cssres[cssres_page];
        for (var c in css_resources) {
            url = css_resources[c];
            if (custom_app && url.indexOf('app_resources') !== -1) {
                assets.css.addFile(custom_app_public_url + url.substr(13, url.length -1), cssres_page);
            } else if (custom_app && url.indexOf('esbootstrap_resources') !== -1) {
                assets.css.addFile(custom_esb_public_url + url.substr(21, url.length -1), cssres_page);
            } else if(fs.existsSync(custom_app_public_url + url)) {
                assets.css.addFile(custom_app_public_url + url, cssres_page);
            } else if(fs.existsSync(custom_dsb_public_url + url)) {
                assets.css.addFile(custom_dsb_public_url + url, cssres_page);
            } else if(url.indexOf('http') !== -1) {
                assets.css.addUrl(url, cssres_page);
            }
            else {
                assets.addCss('/public/' + url, cssres_page);
            }
        }
    }
    console.log('css.files has', assets.css.files);

};


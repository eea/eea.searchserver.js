/*
 * GET home page.
 */


var nconf = require('nconf');
var path = require('path');
var _ = require('underscore');

var field_base = nconf.get("elastic:field_base");
var layout_vars = nconf.get("layout_vars");
var bjson = path.resolve(__dirname + '/builtinBundles.json');
if (typeof layout_vars === 'undefined') {
    nconf.file(bjson);
    layout_vars = nconf.get('layout_vars');
}
else {
    if (!layout_vars['override_searchserver_resources']) {
        var global = nconf.file('global', bjson);
        var global_layout = global['stores']['global']['store']['layout_vars'];
        layout_vars = nconf['stores']['custom']['store']['layout_vars'];
        var js_res = layout_vars['js_resources'];
        var global_js_res = global_layout['js_resources'];
        var global_js_res_keys = _.keys(global_js_res);
        var global_js_res_key;
        for (var i = 0, jlength = global_js_res_keys.length; i <= jlength; i++) {
            global_js_res_key = global_js_res_keys[i];
            if (js_res && !js_res[global_js_res_key]) {
                js_res[global_js_res_key] = global_js_res[global_js_res_key];
            }
        }
        var css_res = layout_vars['css_resources'];
        var global_css_res = global_layout['css_resources'];
        var global_css_res_keys = _.keys(global_css_res);
        var global_css_res_key;
        for (var j = 0, ilength = global_css_res_keys.length; j <= ilength; j++) {
            global_css_res_key = global_css_res_keys[j];
            if (css_res && !css_res[global_css_res_key]) {
                css_res[global_css_res_key] = global_css_res[global_css_res_key];
            }
        }
    }
    else {
        layout_vars = nconf['stores']['custom']['store']['layout_vars'];
    }
}


var searchServer = require('eea-searchserver');

exports.index = function(req, res){
  var options = {title: 'index'};

  options = _.extend(options, layout_vars);

  searchServer.EEAFacetFramework.render(req, res, 'index', options);
};


exports.details = function(req, res, id_name){
  if (req.query[id_name] === undefined){
      res.send(id_name + ' is missing');
      return;
  }
  var host = "http://localhost:" + nconf.get('http:port');

  var query = '{"query":{"ids":{"values":["' + encodeURIComponent(req.query[id_name]) + '"]}}}';
  query = encodeURIComponent(query);
  var options = {
    host: host + "/tools/api",
    path: "?source="+ query,
    layout_vars: layout_vars
  };

  searchServer.EEAFacetFramework.renderDetails({
    req:req,
    res:res,
    field_base:field_base,
    options:options,
    error_fallback:function(tmp_options){
        tmp_options[id_name] = req.query[id_name];
        return(tmp_options);
    }
  });
};


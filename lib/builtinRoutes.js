/*
 * GET home page.
 */


var nconf = require('nconf');
var path = require('path');
var _ = require('underscore');

var field_base = nconf.get("elastic:field_base");
var layout_vars = nconf.get("layout_vars");

if (typeof layout_vars === 'undefined') {
    var bjson = path.resolve(__dirname + '/builtinBundles.json');
    nconf.file(bjson);
    layout_vars = nconf.get('layout_vars');
}


var searchServer = require('eea-searchserver')

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


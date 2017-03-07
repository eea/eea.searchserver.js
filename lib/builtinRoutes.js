/*
 * GET home page.
 */


var cache = require('memory-cache');
var nconf = require('nconf');
var _ = require('underscore');

var field_base = nconf.get("elastic:field_base");
var layout_vars = nconf.get("layout_vars");

if (typeof layout_vars === 'undefined') {
  layout_vars = {}
}

var path = require('path');

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

  var query = '{"query":{"ids":{"values":["' + req.query[id_name] + '"]}}}';
  query = encodeURIComponent(query);
  var options = {
    host: host + "/api",
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

exports.setlandingvalue = function(req, res) {
    var keys = Object.keys(req.body);
    var mem_cache = cache.get("landingcache");
    if (!mem_cache){
        mem_cache = {};
    }
    for (var i = 0; i < keys.length; i++){
        var value = req.body[keys[i]];
        if (((!isNaN(value)) && value !== 0) || (isNaN(value))){
            if (!isNaN(value)){
                if (mem_cache[keys[i]] === undefined){
                    mem_cache[keys[i]] = 0;
                }

                if (mem_cache[keys[i]] < value){
                    mem_cache[keys[i]] = value;
                }
            }
            else {
                mem_cache[keys[i]] = value;
            }
        }
    }
    cache.put('landingcache', mem_cache);
    res.send("ok");
};

exports.invalidatelandingvalues = function(req, res) {
    var mem_cache = {}
    cache.put('landingcache', mem_cache);
    res.send("ok");
};

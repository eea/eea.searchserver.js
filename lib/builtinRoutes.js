/*
 * GET home page.
 */


var nconf = require('nconf');

var field_base = nconf.get("elastic:field_base");
var path = require('path');

var searchServer = require('eea-searchserver')

exports.index = function(req, res){
  var options = {title: 'index'};

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
    path: "?source="+ query
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

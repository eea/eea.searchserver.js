// assets.js

var nconf = require('nconf');
var getenv = require('getenv');
// var APP_CONFIG_DIRNAME = getenv.string('APP_CONFIG_DIRNAME', 'default');
// var APP_CONFIG_DIR = 'config/'+ APP_CONFIG_DIRNAME;
// nconf.file({file:'/code/' + APP_CONFIG_DIR + '/settings.json'});
nconf.file({file: '../builtinBundlers.json'});
var layout = nconf.get("layout_vars");
var jsres = layout['js_resources'];
var jsres_keys = Object.keys(jsres);
module.exports = function(assets) {
    var url;
    var url_list;
    for (var i in jsres_keys) {
         url_list = jsres[i];
         for (var j in url_list) {
             url = url_list[j];
             assets.js.addFile(__dirname + '/' + url, 'esbootstrap');
         }
     }
};

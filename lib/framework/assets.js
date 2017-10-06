// assets.js

var nconf = require('nconf');
var getenv = require('getenv');
var path = require('path');
var APP_CONFIG_DIRNAME = getenv.string('APP_CONFIG_DIRNAME', 'CaR');
var APP_CONFIG_DIR = 'config/'+ APP_CONFIG_DIRNAME;
var bjson = path.resolve(__dirname + '/../builtinBundles.json');
nconf.file(bjson);
//nconf.load();
var layout = nconf.get("layout_vars");
console.log(layout);
var jsres = layout['js_resources']['layout_page'];
var cssres = layout['css_resources']['layout_page'];
module.exports = function(assets) {
    var url;
    var url_list;
    assets.root = __dirname;
    for (var i in jsres) {
         url = jsres[i];
        assets.addJs('/public/' + url);
    }

    console.log('js.files has', assets.js.files);
    for (var i in cssres) {
         url = cssres[i];
         assets.addCss('/public/' + url);
    }
    
    console.log('css.files has', assets.css.files);

};

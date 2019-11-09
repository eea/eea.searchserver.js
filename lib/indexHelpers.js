
function getOptions() {
    var nconf = require('nconf');
    var elastic = nconf.get()['elastic'];
    return {
        'es_host': elastic.host + ':' + elastic.port + elastic.path,
        'auth': elastic.rwuser + ':' + elastic.rwpass,
        'encoded_auth': encodeURIComponent(elastic.rwuser) + ':' + encodeURIComponent(elastic.rwpass),
        'elastic': elastic
    };
}


function nicedate(){
    let date_ob = new Date();

    let date = ("0" + date_ob.getDate()).slice(-2);

    let month = ("0" + (date_ob.getMonth() + 1)).slice(-2);

    let year = date_ob.getFullYear();

    let hours = ("0" + date_ob.getHours()).slice(-2);

    let minutes = ("0" + date_ob.getMinutes()).slice(-2);

    let seconds = ("0" + date_ob.getSeconds()).slice(-2);

    return (year + "-" + month + "-" + date + "_" + hours + ":" + minutes + ":" + seconds);
}

var default_callback = function(text, showBody) {
    if (showBody === undefined){
        showBody = true;
    }
    return function(err, statusCode, header, body) {
        console.log(text);
        if (err) {
            console.log(err.message);
        } else {
            console.log('  Successfuly ran query');
            console.log('  ResponseCode: ' + statusCode);
            if (showBody === true){
                console.log('  ' + body);
            }
        }
    };
};

const create_empty_index = async(analyzers) => {
    return new Promise(async (resolve, reject) => {
        const options = getOptions();
        const esAPI = require('eea-searchserver').esAPI;

        const timestamp = nicedate();
        const index_base_name = options.elastic.index;
        const index_name = index_base_name + '_' + timestamp;
        const remove_alias = '{"actions":[{"remove":{"alias":"' + index_base_name+'_latest' + '","index":"*"}}]}';
        const add_latest_alias = '{"actions":[{"add":{"alias":"' + index_base_name+'_latest' + '","index":"'+index_name+'"}}]}';
        const add_generic_alias = '{"actions":[{"add":{"alias":"' + index_base_name + '","index":"'+index_name+'"}}]}';

        new esAPI(getOptions())
            .PUT(index_name,analyzers,default_callback)
            .POST("_aliases", remove_alias, default_callback(
                    "REMOVED LATEST ALIAS"))
            .POST('_aliases', add_generic_alias, default_callback(
                    "ADDED " + index_base_name + " ALIAS"))
            .POST('_aliases', add_latest_alias, function(){
                    console.log("ALIAS " + index_base_name + '_latest points to ' + index_name)
                    resolve(true)
                })
            .execute()
    });
}

const test_analyzers = async(analyzers) => {
    return new Promise(async (resolve, reject) => {
        const esAPI = require('eea-searchserver').esAPI;

        var esa = new esAPI(getOptions());

        esa.DELETE("test_analyzers", function(text, showbody){});

        esa.PUT("test_analyzers", analyzers,
            function(err, s, h, b){
                if (s !== undefined && s.toString() !== '200'){
                    console.log(b);
                    esa.DELETE("test_analyzers", function(text, showbody){
                        resolve(false);
                    });
                    esa.execute();

                } else {
                    esa.DELETE("test_analyzers", function(text, showbody){
                        resolve(true);
                    });
                    esa.execute();
                }
            });

        esa.DELETE("test_analyzers", function(text, showbody){});
        esa.execute();
    });
}
module.exports = {
    "create_empty_index" : create_empty_index,
    "test_analyzers": test_analyzers
};
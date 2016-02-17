var nconf = require('nconf');
var stringify = require('csv-stringify');
var path = require('path');
var EEAFacetFramework = require('../framework/EEAFacetFramework');

module.exports = function(req, res) {
    var app = require(path.join(GLOBAL.eea_app_home,"app.js"));

    function download(mapping_export){
        var field_base = nconf.get("elastic:field_base");
        if (field_base === undefined){
            field_base = "";
        }
        var download_mapping = [];
        for (var  i = 0; i < mapping_export.length; i++){
            var map = {field:mapping_export[i].name,
                        name:mapping_export[i].title};
            download_mapping.push(map);
        }
        for (var i = 0; i < download_mapping.length; i++){
            download_mapping[i].field = field_base + download_mapping[i].field;
        }
        var dataQueryStr = req.query.download_query.split("?source=")[1];
        var dataQuery = JSON.parse(dataQueryStr)

        var linebreak = '\n';
        var delimiter = ',';
        if (req.query.download_format === 'tsv'){
            delimiter = '\t';
        }
        var stringifier = stringify({delimiter: delimiter})

        res.setHeader('Content-Encoding', 'UTF-8');
        res.setHeader('Content-Type', 'text/csv;charset=UTF-8');
        res.setHeader('Content-disposition', 'attachment; filename=data.' + req.query.download_format);
        res.write('\uFEFF');
        var host = "http://localhost:" + nconf.get('http:port');
        var es_index = nconf.get("elastic:index");
        var es_type = nconf.get("elastic:type");

        var query = "mapping";
        query = encodeURIComponent(query);

        var options = {
            host: host + "/api",
            path: "?source="+ query
        };
    
        var request = require('request');
        request(options.host + options.path, function (error, response, body) {
            if (!error && response.statusCode == 200) {
                try{
                    var data = JSON.parse(body);
                    
                    // who is the current real index? blue or green
                    if (!(es_index in data)){
                        /* get current index by alias */
                        var elastic_blue = nconf.get()['elastic'];
                        var elastic_green = nconf.get()['elastic_green'];
                        var sync_request = require('sync-request');
                        var es_alias_url = 'http://' + elastic_blue.host + ':' + elastic_blue.port + elastic_blue.path + '_aliases'
                        var aliases = JSON.parse(sync_request('GET', es_alias_url ).getBody('utf8'));
                        
                        if(aliases.hasOwnProperty(elastic_blue.real_index) && aliases[elastic_blue.real_index]['aliases'].hasOwnProperty(elastic_blue.index)){
                            /* current index is blue */
                            es_index = elastic_blue.real_index
                        }
                        else if(aliases.hasOwnProperty(elastic_green.real_index) && aliases[elastic_green.real_index]['aliases'].hasOwnProperty(elastic_green.index)){
                            /* current index is green */
                            es_index = elastic_green.real_index
                        }
                    }
                    
                    var properties = Object.keys(data[es_index]['mappings'][es_type]['properties']);
                    var csv_header = [];
                    for (var i = 0; i < download_mapping.length; i++){
                        csv_header.push(download_mapping[i].name);
                    }

                    res.write(stringifier.stringify(csv_header));
                    res.write(linebreak);
                    var offset = 0;
                    var length = 1000;

                    var fetchFromElastic = function fetchElastic(){
                        dataQuery.from = offset;
                        dataQuery.size = length;
                        var fetchQuery = JSON.stringify(dataQuery);
                        fetchQuery = encodeURIComponent(fetchQuery);

                        var fetchOptions = {
                            host: host + "/api",
                            path: "?source="+ fetchQuery
                        };
                        request(fetchOptions.host + fetchOptions.path, function(fetchError, fetchResponse, fetchBody) {
                            if (!fetchError && fetchResponse.statusCode == 200) {
                                try{
                                    var data = JSON.parse(fetchBody);
                                    var chunk = ""
                                    for (var i = 0; i < data.hits.hits.length; i++){
                                        var rowstr = ""
                                        var row = data.hits.hits[i];
                                        var csv_row = [];
                                        for (var j = 0; j < download_mapping.length; j++){
                                            var value = row['_source'][download_mapping[j].field]
                                            if (value === undefined){
                                                value = '';
                                            }
                                            csv_row.push(value.toString());
                                        }
                                        chunk += stringifier.stringify(csv_row);
                                        chunk += linebreak;
                                    }
                                    res.write(chunk);
                                    if (data.hits.total < offset){
                                        res.end();
                                    }
                                    else{
                                        offset += length;
                                        setTimeout(fetchElastic, 0);
                                    }
                                }
                                catch(err){
                                    console.log("error");
                                    console.log(err);
                                }
                            }
                        });
                    }();
                }
                catch(err){
                    console.log("error");
                    console.log(err);
                }
            }
        });
    }
    try{
        EEAFacetFramework.getSortedFields("csv_tsv",function(mapping){
            download(mapping);
        });
    }
    catch(err){
        console.log("error in mapping");
    }
}

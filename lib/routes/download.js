var nconf = require('nconf');
var stringify = require('csv-stringify');
var path = require('path');
var EEAFacetFramework = require('../framework/EEAFacetFramework');


module.exports = function(req, res) {
    var app = require(path.join(GLOBAL.eea_app_home,"app.js"));
    function getBlueIndex(){
        var elastic = nconf.get()['elastic'];
        elastic.real_index = elastic.index + "_blue";
        return elastic;
    }
    function getGreenIndex(){
        var elastic = nconf.get()['elastic'];
        elastic.real_index = elastic.index + "_green";
        return elastic;
    }
    function getAuth(){
        var elastic = nconf.get()['elastic'];
        if ((elastic.rouser !== undefined) && (elastic.rouser !== undefined) && (elastic.rouser !== '')){
            return elastic.rouser + ":" + elastic.ropass + "@";
        }
        return "";
    }

    function download(mapping_export){
        var field_base = nconf.get("elastic:field_base");
        if (field_base === undefined){
            field_base = "";
        }
        var download_mapping = [];
        for (var  i = 0; i < mapping_export.length; i++){
            var map = {field:mapping_export[i].name,
                        name:mapping_export[i].title,
                        values_whitelist:mapping_export[i].values_whitelist,
                        values_blacklist:mapping_export[i].values_blacklist};
            download_mapping.push(map);
        }
        for (var i = 0; i < download_mapping.length; i++){
            download_mapping[i].field = field_base + download_mapping[i].field;
        }
        var dataQueryStr = req.query.download_query.split("?source=")[1];
        var dataQuery = JSON.parse(dataQueryStr);
        delete (dataQuery.display_type);
        delete (dataQuery.ignore_landing);
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
            host: host + "/tools/api",
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
                        var elastic_blue = getBlueIndex();
                        var elastic_green = getGreenIndex();
                        var sync_request = require('sync-request');

                        var es_alias_url = 'http://' + getAuth() + elastic_blue.host + ':' + elastic_blue.port + elastic_blue.path + '_aliases'
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

                    var elasticsearch = require('elasticsearch');
                    var elastic = nconf.get()['elastic'];


                    var client = new elasticsearch.Client({
                        host: 'http://' + getAuth('rw') + elastic.host + ':' + elastic.port,
                        type: 'stdio',
                        levels: ['error']
                    });

                    var length = 2000;
                    var offset = 0;
                    dataQuery.size = length;
                    delete (dataQuery.from);

                    client.search({
                        index: elastic.index,
                        scroll: '30s', // keep the search results "scrollable" for 30 seconds
                        body: dataQuery
                    }, function getMoreUntilDone(error, data) {
                        if (data.hits.total > offset) {
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
                                    if (!Array.isArray(value)){
                                        value = [value];
                                    }
                                    var field_whitelist = download_mapping[j].values_whitelist;
                                    var field_name = download_mapping[j].field;
                                    if (field_whitelist !== undefined){
                                        var new_value = [];
                                        for (var value_count = 0; value_count < value.length; value_count++){
                                            if (field_whitelist.indexOf(value[value_count]) !== -1){
                                                new_value.push(value[value_count]);
                                            }
                                        }
                                        value = new_value;
                                    }

                                    var field_blacklist = download_mapping[j].values_blacklist;
                                    if (field_blacklist !== undefined){
                                        var new_value = [];
                                        for (var value_count = 0; value_count < value.length; value_count++){
                                            if (field_blacklist.indexOf(value[value_count]) === -1){
                                                new_value.push(value[value_count]);
                                            }
                                        }
                                        value = new_value;
                                    }

                                    csv_row.push(value.toString());
                                }
                                chunk += stringifier.stringify(csv_row);
                                chunk += linebreak;
                            }
                            res.write(chunk);

                            // ask elasticsearch for the next set of hits from this search
                            offset += length;
                            setTimeout(function(){
                                    client.scroll({
                                        scroll: "30s",
                                        scrollId: data._scroll_id
                                    }, getMoreUntilDone);
                                }, 0);
                        }
                        else {
                                res.end();
                        }
                    });
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

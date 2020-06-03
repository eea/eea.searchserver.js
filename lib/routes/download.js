var nconf = require('nconf');
var stringify = require('csv-stringify');
var path = require('path');
var EEAFacetFramework = require('../framework/EEAFacetFramework');

const SCROLL_TIME = '5m';

module.exports = function(req, res) {
    var app = require(path.join(global.eea_app_home,"app.js"));
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
            return encodeURIComponent(elastic.rouser) + ":" + encodeURIComponent(elastic.ropass) + "@";
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
        res.once('close', function(){
            res.end();
        });
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
        request(options.host + options.path, async function (error, response, body) {
            if (!error && response.statusCode == 200) {
                try{
                    var data = JSON.parse(body);
                    // who is the current real index? blue or green
                    if (!(es_index in data)){
                        var elasticConf = nconf.get()['elastic'];
                        function getAlias(url) {
                            return new Promise((resolve, reject) => {
                                request(url, (error, response, body) => {
                                    if (error) reject(error);
                                    if (response.statusCode != 200) {
                                        reject('Invalid status code <' + response.statusCode + '>');
                                    }
                                    resolve(body);
                                });
                            });
                        }

                        var appalias = elasticConf.appalias || elasticConf.default_appalias;
                        var es_incr_alias_url = 'http://' + getAuth() + elasticConf.host + ':' + elasticConf.port + elasticConf.path + elasticConf.index + "_" + appalias+'/_alias'

                        var incr_aliases = await getAlias(es_incr_alias_url);
                        incr_aliases = JSON.parse(incr_aliases);
                        if (incr_aliases['error'] === undefined){
                            es_index = Object.keys(incr_aliases)[0];
                        }
                        else {
                            console.log('error');
                            console.log(incr_aliases['error'])
                            return;
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
                        index: es_index,
                        scroll: SCROLL_TIME, // keep the search results "scrollable" for the time specified in SCROLL_TIME constant
                        body: dataQuery
                    }, function getMoreUntilDone(error, data) {
                        if (error || (data === undefined) || (data.hits === undefined)){
                            if (error){
                                console.log("Error while downloading:", error);
                            }
                            else {
                                console.log("Error in data while downloading:", data);
                            }
                            res.destroy()
                            return;
                        }
                        if (res.finished){
                            return;
                        }
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
                            let write_res = res.write(chunk);

                            // ask elasticsearch for the next set of hits from this search
                            offset += length;
                            if (!write_res){
                                res.once('drain', function(){
                                    client.scroll({
                                        scroll: SCROLL_TIME,
                                        scrollId: data._scroll_id
                                    }, getMoreUntilDone);
                                });
                            }
                            else {
                                client.scroll({
                                    scroll: SCROLL_TIME,
                                    scrollId: data._scroll_id
                                }, getMoreUntilDone);
                            }
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

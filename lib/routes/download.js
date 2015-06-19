var nconf = require('nconf');
var stringify = require('csv-stringify');
var path = require('path');

module.exports = function(req, res) {
    var app = require(path.join(GLOBAL.eea_app_home,"app.js"));
    function download(mapping){
        try{
            var field_base = nconf.get("elastic:field_base");
            var download_mapping = [];
            var use_mapping = true;
            var use_all_fields = false;
            var has_order = false;

            if (mapping.download_mapping === undefined){
                use_mapping = false;
                use_all_fields = true;
            }
            else {
                if ((mapping.download_mapping.order !== undefined) && (mapping.download_mapping.order.length > 0)){
                    has_order = true;
                    for (var i = 0; i < mapping.download_mapping.order.length; i++){
                        var map = {field:mapping.download_mapping.order[i],
                                    name:mapping.download_mapping.order[i]};
                        download_mapping.push(map);
                    }
                }
                else{
                    if (mapping.download_mapping.use_all_fields === true){
                        use_all_fields = true;
                    }
                }
                if (mapping.download_mapping.use_mapping_from_details_mapping === true){
                    for (var i = 0; i < mapping.details_mapping.length; i++){
                        if (has_order){
                            for (var j = 0; j < download_mapping.length; j++){
                                if (download_mapping[j].field === mapping.details_mapping[i].field){
                                    download_mapping[j].name = mapping.details_mapping[i].title !== "" ? mapping.details_mapping[i].title : mapping.details_mapping[i].name;
                                }
                            }
                        }
                        else {
                            var map = {field:mapping.details_mapping[i].field,
                                        name:mapping.details_mapping[i].title !== "" ? mapping.details_mapping[i].title : mapping.details_mapping[i].name};
                            download_mapping.push(map);
                        }
                    }
                }
                if (mapping.download_mapping.mapping !== undefined){
                    for (var i = 0; i < mapping.download_mapping.mapping.length; i++){
                        if (has_order){
                            for (var j = 0; j < download_mapping.length; j++){
                                if (download_mapping[j].field === mapping.download_mapping.mapping[i].field){
                                    download_mapping[j].name = mapping.download_mapping.mapping[i].title;
                                }
                            }
                        }
                        else {
                            var map = {field:mapping.download_mapping.mapping[i].field,
                                        name:mapping.download_mapping.mapping[i].title};
                            download_mapping.push(map);
                        }
                    }
                }
            }
        }
        catch(err){
            console.log("mapping is missing or is not a valid json, using properties from es");
            use_mapping = false;
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

        res.setHeader('Content-disposition', 'attachment; filename=data.' + req.query.download_format);
        res.setHeader('Content-Type', 'text/csv');

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
                    var properties = Object.keys(data[es_index]['mappings'][es_type]['properties']);
                    if (!use_all_fields){
                        var tmp_properties = [];
                        for (var i = 0; i < properties.length; i++){
                            var should_add = false;
                            for (var j = 0; j < download_mapping.length; j++){
                                if (properties[i] === download_mapping[j].field){
                                    should_add = true;
                                }
                            }
                            if (should_add){
                                tmp_properties.push(properties[i])
                            }
                        }
                        properties = tmp_properties;
                    }
                    var properties_mapping = [];
                    for (var i = 0; i < properties.length; i++){
                        properties_mapping.push({field: properties[i], name: properties[i]});
                    }

                    if (has_order){
                        properties_mapping = download_mapping;
                    }
                    else {
                        if (use_mapping) {
                            for (var i = 0; i < properties_mapping.length; i++){
                                for (var j = 0; j < download_mapping.length; j++){
                                    if (properties_mapping[i].field === download_mapping[j].field){
                                        properties_mapping[i].name = download_mapping[j].name;
                                    }
                                }
                            }
                        }
                    }
                    var csv_header = [];
                    for (var i = 0; i < properties_mapping.length; i++){
                        csv_header.push(properties_mapping[i].name);
                    }

                    res.write(stringifier.stringify(csv_header));
                    res.write(linebreak);
                    var offset = 0;
                    var length = 1000;

                    function fetchFromElastic(){
                        dataQuery.from = offset;
                        dataQuery.size = length;
                        var fetchQuery = JSON.stringify(dataQuery);
                        fetchQuery = encodeURIComponent(fetchQuery);
                        var fetchRequest = require('request');

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
                                        for (var j = 0; j < properties_mapping.length; j++){
                                            var value = row['_source'][properties_mapping[j].field]
                                            if (value === undefined){
                                                value = '';
                                            }
                                            csv_row.push(value.toString());
                                        }
                                        chunk += stringifier.stringify(csv_row);
                                        chunk += linebreak;
                                    }
                                    res.write(chunk);
                                    if (data.hits.hits.length < length){
                                        res.end();
                                    }
                                    else{
                                        offset += length;
                                        setTimeout(fetchFromElastic, 0);
                                    }
                                }
                                catch(err){
                                    console.log("error");
                                    console.log(err);
                                }
                            }
                        });
                    };
                    fetchFromElastic();
                }
                catch(err){
                    console.log("error");
                    console.log(err);
                }
            }
        });
    }
    try{
        app.fieldsMapping(function(mapping){
            download(mapping);
        });
    }
    catch(err){
        console.log("mapping is missing or is not a valid json, using properties from es");
        download({});
    }
}

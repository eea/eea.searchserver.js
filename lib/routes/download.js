var nconf = require('nconf');
var stringify = require('csv-stringify');

module.exports = function(req, res) {

  var dataQueryStr = req.query.download_query.split("?source=")[1];
  var dataQuery = JSON.parse(dataQueryStr)

  var linebreak = '\n';
  var separator = ',';
  if (req.query.download_format === 'tsv'){
    separator = '\t';
  }
  var stringifier = stringify({delimiter: separator})

  res.setHeader('Content-disposition', 'attachment; filename=data.' + req.query.download_format);
  res.setHeader('Content-Type', 'text/csv');

  var host = "http://localhost:" + nconf.get('http:port');


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
            var properties = Object.keys(data['aqstatsdata']['mappings']['resources']['properties']);

            var csv_header = [];
            for (var i = 0; i < properties.length; i++){
                csv_header.push(properties[i]);
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
                                for (var j = 0; j < properties.length; j++){
                                    var value = row['_source'][properties[j]]
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
                        }
                    }
                });
            };

            fetchFromElastic();

        }
        catch(err){
            console.log("error");
        }
    }
  });
}

var nconf = require('nconf');

module.exports = function(req, res) {
  res.setHeader('Content-disposition', 'attachment; filename=aide.csv');
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

            var lineBreak = '\n';
            var separator = ', ';
            for (var i = 0; i < properties.length; i++){
                res.write(properties[i]);
                if (i < properties.length - 1){
                    res.write(separator);
                }
            }
            res.write(lineBreak);
            var offset = 0;
            var length = 1000;
            function fetchFromElastic(){
                var fetchQuery = '{"query":{"match_all":{}},"from":'+offset+',"size":'+length+'}';
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
                                for (var j = 0; j < properties.length; j++){
                                    var value = row['_source'][properties[j]]
                                    if (value === undefined){
                                        value = '';
                                    }
                                    rowstr += value.toString();
                                    if (j < properties.length - 1){
                                        rowstr += separator;
                                    }
                                }
                                chunk += rowstr;
                                chunk += lineBreak;
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

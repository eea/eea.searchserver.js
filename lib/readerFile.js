const fs = require('fs');
const CsvReadableStream = require('csv-reader');
const detectCharacterEncoding = require('detect-character-encoding');

var readerFile = function(options){
    this.options = options;
    counter = 0;
}

readerFile.prototype = {
    read_bulk: async function() {
        return new Promise(async (resolve, reject) => {
            try {
                if (this.stream === undefined){
                    let encoding = this.options.encoding;
                    if (encoding === undefined){
                        const fileBuffer = fs.readFileSync(this.options.file);
                        const charsetMatch = detectCharacterEncoding(fileBuffer);
                        encoding = charsetMatch.encoding;
                    }
                    let inputStream = fs.createReadStream(this.options.file, encoding)

                    this.stream = inputStream
                        .pipe(CsvReadableStream({ parseNumbers: true, parseBooleans: true, trim: true , delimiter: this.options.delimiter}));

                    var stream = this.stream;
                    var rows_str = '';
                    var bulk_counter = 0;
                    var counter = 0;
                    var fields = [];
                    var options = this.options;
                    var batch_head = '{"index":{}}';
                    stream.on('data', function (row) {
                        let toindex = {};
                        if (counter === 0){
                            fields = row;
                        }
                        else {
                            for (let i = 0; i < row.length; i++){
                                if (row[i] !== 'NULL'){
                                    toindex[fields[i]] = row[i];
                                }
                            }
                            let tmp_id = counter;
                            if (options.id_type === 'field'){
                                tmp_id = toindex[options.id_field];
                            }
                            rows_str += batch_head.split("{}").join('{"_id":"' + tmp_id + '"}');
                            rows_str += "\n";
                            rows_str += JSON.stringify(toindex);
                            rows_str += "\n";
                            if (counter % options.bulk_size === 0){
                                console.log("Received: " + (counter - options.bulk_size) + " - " +counter);
                                stream.pause()
                                const resp = {
                                    rows_str : rows_str,
                                    counter: counter,
                                    bulk_counter: bulk_counter
                                }
                                if (stream.callback){
                                    stream.callback(resp);
                                }
                                else{
                                    resolve(resp);
                                }
                                rows_stre = ''
                                bulk_counter = 0;
                            }
                        }
                        bulk_counter++;
                        counter++;
                    }).on('end', function (data) {
                        if (rows_str.length !== 0){
                            stream.pause();
                            console.log("Received: " + (counter - options.bulk_size) + " - " +counter);

                            const resp = {
                                rows_str : rows_str,
                                counter: counter,
                                bulk_counter: bulk_counter
                            }
                            if (stream.callback){
                                stream.callback(resp);
                            }
                            else{
                                resolve(resp);
                            }
                            rows_str = "";
                        }
                        console.log('No more rows!');
                    });
                }
                else {
                    this.stream.callback = function(data){resolve(data)}
                    this.stream.resume()
                }
            }
            catch (err){
                reject(err);
            }
        })
    }
}

module.exports = readerFile;
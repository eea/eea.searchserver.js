#!/usr/bin/env node
'use strict';
const chalk       = require('chalk');
const clear       = require('clear');
const figlet      = require('figlet');
const fs = require('fs');
const path = require('path');
const inquirer   = require('inquirer');
const program = require('commander');

//path.basename(path.dirname(fs.realpathSync(__filename)));
clear();

program
    .version('0.1.0')
    .option('-n, --new [fname]', 'new es document [fname]', 'new')
    .option('-o, --old [fname] ', 'old es document [fname]', 'old')
    .option('-c, --conf [fname] ', 'config file', 'conf')
    .parse(process.argv);

console.log(
    chalk.yellow(
        figlet.textSync('ESCompare', { horizontalLayout: 'full' })
    )
);

if(!program.old || !program.new ){
    console.log(
        chalk.red("Please input filenames" )
    );
    process.exit(0);
}

console.log(
    chalk.blue("Old es file:" + program.old)
);

console.log(
    chalk.green("New es file: " + program.blue)
);

//debugger;
//console.log(program.old);
var oldJ = require( path.resolve(__dirname) + "/" + program.old );

var newJ = require( path.resolve(__dirname) + "/" + program.new );

// Will test own properties only
function deepEqualWithDiff(a, e, names){
    var dif = {};
    var aKeys = Object.keys(a);
    var eKeys = Object.keys(e);

    var cKeys = aKeys;
    var dKeys = eKeys;
    var c = a;
    var d = e;
    var names = {
        c: names ? names['a'] : 'Actual',
        d: names ? names['e'] : 'Expected'
    }

    if(eKeys.length > aKeys.length){
        cKeys = eKeys;
        dKeys = aKeys;
        c = e;
        d = a;
        names = {
            d: names ? names['a'] : 'Actual',
            c: names ? names['e'] : 'Expected'
        }
    }


    for(var i = 0, co = cKeys.length; i < co; i++){
        var key = cKeys[i];
        if(typeof c[key] !== typeof d[key]){
            dif[key] = 'Type mismatch ' + names['c'] + ':' + typeof c[key] + '!==' + names['d'] + typeof d[key];
            continue;
        }
        if(typeof c[key] === 'function'){
            if(c[key].toString() !== d[key].toString()){
                dif[key] = 'Differing functions';
            }
            continue;
        }
        if(typeof c[key] === 'object'){
            if(c[key].length !== undefined){ // array
                var temp = c[key].slice(0);
                temp = temp.filter(function(el){
                    return (d[key].indexOf(el) === -1);
                });
                var message = '';
                if(temp.length > 0){
                    message += names['c'] + ' excess ' + JSON.stringify(temp);
                }

                temp = d[key].slice(0);
                temp = temp.filter(function(el){
                    return (c[key].indexOf(el) === -1);
                });
                if(temp.length > 0){
                    message += ' and ' + names['d'] + ' excess ' + JSON.stringify(temp);
                }
                if(message !== ''){
                    dif[key] = message;
                }
                continue;
            }
            var diff = deepEqualWithDiff(c[key], d[key], {a:names['c'],e:names['d']});
            if(diff !== true && Object.keys(diff).length > 0){
                dif[key] = diff;
            }
            continue;
        }
        // Simple types left so
        if(c[key] !== d[key]){
            dif[key] = names['c'] + ':' + c[key] + ' !== ' + names['d'] + ':' + d[key];
        }
    }
    return Object.keys(dif).length > 0 ? dif : true;
}


var res = deepEqualWithDiff(newJ, oldJ);
console.log(res);

function readRiverConfig(location, fileName) {
    var deepExtend = require('deep-extend');
    var tmp_config = JSON.parse(JSON.stringify(require(path.join(location, fileName))));

    if (tmp_config['extend'] !== undefined) {
        var parent_config = readRiverConfig(location, tmp_config['extend']);
        deepExtend(parent_config, tmp_config);
        tmp_config = parent_config;
    }

    Object.keys(tmp_config).forEach(function (key) {
        if ((!key.endsWith("_add")) && (tmp_config[key + "_add"] !== undefined)) {
            tmp_config[key] = tmp_config[key].concat(tmp_config[key + "_add"]);
        }
    });
}





/*console.log('you ordered a pizza with:');
if (program.peppers) console.log('  - peppers');
if (program.pineapple) console.log('  - pineapple');
if (program.bbqSauce) console.log('  - bbq');
console.log('  - %s cheese', program.cheese);*/




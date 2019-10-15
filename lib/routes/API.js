var commands = require('../builtinCommandsFile');
var _ = require('underscore');
var getenv = require('getenv');
var nconf = require('nconf')

function validateToken(req, res, next){
    const env_token = getenv.string('API_token', '')
    const settings_token = nconf.get('API:token')
    const stored_token = env_token || settings_token || false
    if (!stored_token){
        next(req, res);
        return;
    }
    let token = req.headers['x-access-token'] || req.headers['authorization']; // Express headers are auto converted to lowercase
    var validToken = false;
    if ((token !== undefined) && (token.startsWith('Bearer '))) {
        token = token.slice(7, token.length);
        if (token === stored_token){
            validToken = true;
        }
    }
    if (validToken){
        next(req, res);
    }
    else{
        res.send(400, 'Bad request\n');
    }
    return
}

exports.update = function(req, res){
    validateToken(req, res, function(request, response){
        var options = {}
        options = _.extend(options, global.API_settings.indexing);
        options.API_callback = function(rsp){
            res.send(rsp);
        }
        commands.api_update(options)
    });
}

exports.switch = function(req, res){
    validateToken(req, res, function(request, response){
        var options = {}
        options.API_callback = function(rsp){
            response.send(rsp);
        }
        commands.api_switch(options)
    });
}

exports.status = function(req, res){
    validateToken(req, res, function(request, response){
        var options = {}
        options.API_callback = function(rsp){
            response.send(rsp);
        }
        commands.api_status(options)
    });
}
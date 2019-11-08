const index_helpers = require('eea-searchserver').indexHelpers

get_conf = function(){
    console.log(require('nconf').get());
}

remove_data = function(){

}

remove_river = function(){

}

create_index = function(){
    index_helpers.create_empty_index({})
}

sync_index = function(){

}

show_help = function(){
    console.log('List of available commands:');
    console.log(' runserver: Run the app web server');
    console.log('');
    common_commands.forEach(function(command){
        console.log(' ' + command.command + ': ' + command.text);
        console.log('');
    })
}

common_commands = [
        {
            command: 'create_index',
            text: 'Setup Elastic index and trigger indexing',
            fct: create_index
        },
        {
            command: 'remove_data',
            text: 'Remove the ES index of this application',
            fct: remove_data
        },
        {
            command: 'help',
            text: 'Show this menu',
            fct: show_help
        }
    ]


get_commands = function(){
    let commands = {}
    common_commands.forEach(function(command){
        commands[command.command] = command.fct
    })
    return commands;
}

module.exports = get_commands();
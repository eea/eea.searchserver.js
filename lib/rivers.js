const path = require('path');

function readRiverConfig(location, fileName){
    var deepExtend = require('deep-extend');
    var tmp_config = JSON.parse(JSON.stringify(require(path.join(location, fileName))));

    if (tmp_config['extend'] !== undefined){
        var parent_config = readRiverConfig(location, tmp_config['extend']);
        deepExtend(parent_config, tmp_config);
        tmp_config = parent_config;
    }

    Object.keys(tmp_config).forEach(function(key){
        if ((!key.endsWith("_add")) && (tmp_config[key + "_add"] !== undefined)){
            tmp_config[key] = tmp_config[key].concat(tmp_config[key + "_add"]);
        }
    });

    return tmp_config;
}

const get_rivers_from_files = async(settings) => {
    return new Promise(async (resolve, reject) => {
        let rivers = [];
        settings.river_configs.forEach(function(river_conf){
            let should_add = false;
            if (settings.clusters === undefined){
                should_add = true;
            }
            else {
                if (settings.clusters.indexOf(river_conf.id) !== -1){
                    should_add = true;
                }
            }
            if (should_add){
                rivers.push({
                    cluster_id : river_conf.id,
                    cluster_name : river_conf.cluster_name,
                    conf : readRiverConfig(settings.config_dir, river_conf.config_file)
                });
            }
        })
        resolve(rivers);
    });
}

module.exports = {
    get_rivers_from_files : get_rivers_from_files
}
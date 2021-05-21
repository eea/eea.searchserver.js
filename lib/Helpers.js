function SimpleStart(settings){
  var searchServer = require('eea-searchserver');
  var express = require('express');
  var morgan = require('morgan');
  var path = require('path');
  var nconf = require('nconf');
  var crontab = require('node-crontab');

  var app = searchServer.EEAFacetFramework.framework(app_home = settings.app_dir);

  var env = process.env.NODE_ENV || 'dev';

  app.set('nconf', nconf);
  settings.indexing.app_dir = settings.app_dir;
  settings.indexing.config_dir = settings.config_dir;
  app.set('managementCommands', settings.indexing.managementCommands);
  app.set('views', settings.views);
  app.set('view engine', 'pug');

  // Skip non-error codes in production
  var prodLogOpt = {'skip': function(req, res) { return res.statusCode < 400; }};
  var loggerFormat = env === 'dev' ? 'dev' : 'combined';
  var loggerOpt =    env === 'dev' ? {} : prodLogOpt;
  var logger = morgan(loggerFormat, loggerOpt);
  app.use(logger);

  // 88482 server also the resources from eea.docker.esbootstrap public folder
  let lv_url_folder = nconf.get("layout_vars").url_folder
  app.use(express.static(path.join(settings.app_dir, 'public')));
  if (lv_url_folder){
    app.use(lv_url_folder, express.static(path.join(settings.app_dir, 'public')));
  }

  // Get custom resources
  if (settings.customResourcesPath !== undefined ) {
      settings.customResourcesPath.forEach(function(dirpath) {
          app.use("/app_resources", express.static(dirpath));
          app.use(express.static(dirpath));
          if (lv_url_folder){
            app.use(path.join(lv_url_folder, "/app_resources"), express.static(dirpath));
            app.use(lv_url_folder, express.static(dirpath));
          }
          console.log("Use custom resource '" + dirpath + "'");
      });
  }
  if (!lv_url_folder){
    app.get('/', settings.routes.routes.index);
    app.get('/index', settings.routes.routes.index);
  }
  else {
    app.get('/', function(req, res, next) {
      res.redirect(path.join(lv_url_folder,'index'));
    });
    app.get(lv_url_folder, function(req, res, next) {
      res.redirect(path.join(lv_url_folder,'index'));
    });
    app.get(path.join(lv_url_folder,'index'), settings.routes.routes.index);

  }
  if (settings.routes.detailsIdName === undefined){
    settings.routes.detailsIdName = 'id';
  }
  app.get('/details', function(req, res) {settings.routes.routes.details(req, res, settings.routes.detailsIdName);});

  function checkError(err) {
    if (err) {
        process.stderr.write(err.message + '\n\n');
        process.exit(2);
    }
  }

  // Schedule sync as expressed in env variables
  // only if running the server
  var syncCrontab = process.env.SYNC_CRONTAB;
  if (syncCrontab && process.argv[2] == 'runserver') {
    crontab.scheduleJob(syncCrontab, function(){settings.indexing.managementCommands.create_index(settings.indexing);});
    console.log("Enabled sync crontab job: " + syncCrontab);
  }

  // Schedule reindex as expressed in env variables
  // only if running the server
  var reindexCrontab = process.env.FULLREINDEX_CRONTAB;
  if (reindexCrontab && process.argv[2] == 'runserver') {
    crontab.scheduleJob(reindexCrontab, function(){settings.indexing.managementCommands.full_reindex(settings.indexing);});
    console.log("Enabled reindex crontab job: " + reindexCrontab);
  }

  global.API_settings = settings;

  searchServer.Server(app, settings, function(err, srv) {
    checkError(err);
    var elastic = srv.nconf.get()['elastic'];
    console.log("Running with Elastic Backend URL: http://" +
                elastic.host + ":" + elastic.port + elastic.path +
                elastic.index + "/" + elastic.type);
    console.log("");
    srv.run(process.argv[2], settings.indexing, process.argv.slice(3), function(err, srv) {
        checkError(err);
        console.log("Ran command: " + process.argv[2]);
    });
  });

}

module.exports = {
  "SimpleStart" : SimpleStart
};

# eea.searchserver.js
Node.js search server library for EEA search apps

To be used with an express Node.js application

### Features
* Proxy for any Elastic backend (so Elastic doesn't have to be exposed
  publicly)
* EEA Template Invalidation Routines
  * Automatic template loading if templates do not exist locally
  * On demand template loading via routes or util function
* API for Elastic management commands
* Framework for easily adding index management commands
* Entrypoint for any of EEA's Elastic Search Docker applications

### Install

```bash
npm install git://github.com/eea/eea.searchserver.js
```

## Contents

### Server
#### Initial setup
Start by writing the base configurtion file:

```js
{
  "http": {
    "port": 8080         // Port on which the app will listen, default(3000)
  },
  "elastic": {           // Remote Elastic Endpoint configuration
    "host":
      "my-elastic-host", // Host running an Elastic Server (required)
    "path":
      "/elastic/",       // Path on host to the Elastic Server (default /)
    "port": 80,          // Port on which Elastic listens (default 9200)
    "index":
      "data",            // Index to be queried (required)
    "type":
      "resource"         // Type to be queried (required)
  },
  "external_templates": { // External template service (optional)
    "local_path":
      "/path/to/external_templates", // Path to save external templates locally
    "host":
      "www.eea.europa.eu",          // Host to query for external templates
    "head_path":                    // Path on host for the page HEAD
      "/templates/v2/getRequiredHead?jsdisable=all",
    "header_path":                  // Path on host for the page HEADER
      "/templates/v2/getHeader?jsdisable=all",
    "footer_path":                  // Path on host for the page FOOTER
      "/templates/v2/getFooter"
  },
  "switch_condition_value_percent": -5  // resync protection condition
}
```

#### Running a simple express app

```js
var eeasearch = require('eea-searchserver');
// create a base app
var app = express();
...
// load app settings
var settingsFile = '/path/to/settings.json';
// create server
server = eeasearch.Server(app, settingsFile)
// start the app
server.run('runserver', [], function(err, server) {
    console.log("Started server");
}
```

#### Easy to add management commands:

```js
var eeasearch = require('eea-searchserver');
// create a base app
var app = express();
...
// add management commands
app.set('managementCommands', {'cmd': function(args) { console.log(args); }});
// load app settings
var settingsFile = '/path/to/settings.json';
// create server
server = eeasearch.Server(app, settingsFile, function(err, server) {
    if (err) console.log("The app was poorly configured: " + err.message);
})
// start the app
server.run('cmd', ['foo', 'bar'], function(err, server) {
    if (err) {
        console.log("Something went wrong when running the command");
    }
    console.log("Ran custom command, should see ['foo', 'bar'] on screen");
}
```

### Routes
#### Invalidate Templates

Any POST request to ```invalidate_templates``` will get the templates from
the host which was set up in the ```settings.json``` file and save them to the
local path.

```js
var app = express();
app.post('/invalidate_templates', eeasearch.routes.invalidateTemplates);
```

#### Elastic Proxy

Any GET request with the parameter ```source``` set as a valid Elastic query
or Any POST request with the body an valid Elastic query will be forwarded
to the Elastic host set up in the ```settings.json``` file.

The queries will be carried out to the index and type configured in
```settings.json``` .

```js
var app = express();
app.post('/api', eeasearch.routes.elasticProxy);
```

### Middleware
#### Automatic template loading

Use this to load templates automatically on the first request on the app.
This will ensure that the external templates exist on disk before
rendering the page.

```js
var app=express();
app.use(eeasearch.middleware.templateRequired);
```

### Util
#### On demand template loading

This will send requests and update the external templates using the
configuration in ```settings.json```

```js
eeasearch.util.invalidateTemplates()
```


### esAPI

A lightweight REST api for Elastic index management commands.
To chain the commands use chained calls like in the following example.
Otherwise, the order of the requests is asynchronous.

The REST calls are executed when ```.execute()``` is called. If any error
occurs while executing a request, the others are not run.

__Note:__. This API does not use ```settings.json``` configured Elastic host
__Note:__. A successful run means any response from the server (500, 200, etc.)

```js
var options = {
    "es_host": "http://host:port/path/to/endpoint",
    "auth": {"user": user, "pass": pass} # optional if elastic needs auth
}
esAPI(options).DELETE("/index/type/_mappings",
                      function(err, code, header, body) {
                        // Code can be any valid HTTP code
                        // HTTP error codes (500, 403, ...)
                        // are not marked as errors
                        CallbackLogic();
                      })
              .PUT("/index/type/_mappings",
                      function(err, code, header, body) {
                        OtherLogic();
                      })
              .execute();
```

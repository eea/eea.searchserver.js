var sentry_dsn = document.getElementsByTagName("body")[0].getAttribute("data-sentry-dsn");
var sentry_ver = document.getElementsByTagName("body")[0].getAttribute("data-sentry-ver");
var sentry_env = document.getElementsByTagName("body")[0].getAttribute("data-sentry-env");
var sentry_instance = document.getElementsByTagName("body")[0].getAttribute("data-sentry-instance");
var sentry_app_name = document.getElementsByTagName("body")[0].getAttribute("data-sentry-app-name");
if (sentry_dsn){
    Raven.config(sentry_dsn, {
        logger: 'javascript',
        release: sentry_ver,
        environment: sentry_env,
        tags: {app_name: sentry_app_name, instance: sentry_instance},
        ignoreErrors: [
            'jQuery is not defined',
             '$ is not defined',
             'Can\'t find variable: jQuery',
             'Socialite is not defined',
             'Persistent storage maximum size reached'
        ]
    }).install();
}

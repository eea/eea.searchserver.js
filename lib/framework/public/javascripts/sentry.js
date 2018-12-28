var sentry_dsn = document.getElementsByTagName("body")[0].getAttribute("data-sentry-dsn");
var sentry_ver = document.getElementsByTagName("body")[0].getAttribute("data-sentry-ver");
if (sentry_dsn){
    Raven.config(sentry_dsn, {
        logger: 'javascript',
        release: sentry_ver,
        ignoreErrors: [
            'jQuery is not defined',
             '$ is not defined',
             'Can\'t find variable: jQuery',
             'Socialite is not defined',
             'Persistent storage maximum size reached'
        ]
    }).install();
}

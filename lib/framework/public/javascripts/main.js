// insert the logo also on the navbar for the bootstrap menu
// this ensures that switching from portrait to landscape is without any flash since
// we can show and hide with css

var default_language, languages;
const translation = window.settings_translation;

var langObj = {};

if (translation && translation.enabled) {
    default_language = translation.default_language ? translation.default_language : 'en';
    languages = translation.languages ? translation.languages : { default_language: '' };

    $('#app').loading({
        overlay: $('#loading-overlay')
    });
}

function setupHoverHandlers(){
    $(window).one('results_ready', function() {
        // show and hide remove icon on hovering over added filters
/*        $("#facetview_selected_filters").on("hover", ".facetview_selection", function(){
            $(this).find('i').toggleClass('hidden');
        }, function(){
            $(this).find('i').toggleClass('hidden');
        });*/

        $('#facetview_rightcol').on('hover', '.eea-tileBody', function() {
            var $this = $(this);
            var $eea_tile_head = $this.prev();
            var $description = $this.find('.eea-tileDescription');
            if (!$description.html()) {
                return;
            }
            $eea_tile_head.find('.eea-tileThumb').toggleClass('eea-tileHovered');
            $description.stop().animate({
                height: "toggle",
                opacity: 'toggle'
            });
        });
    });
}

function setupDraft(){
    if ((typeof settings_draft !== 'undefined') && (settings_draft)){
        $("#content").css("background", "url(http://www.eea.europa.eu/draft.png)");
    }
}

function getQueryLang(query){
    if (query.hasOwnProperty('lang')) {
        return query['lang'];
    }
    return false;
}

function getQueryParams(queryString) {
    var query = {};
    queryString.replace('?', '').split('&').forEach(function(param) {
        if (param.includes('=')) {
            query[param.split('=')[0]] = param.split('=')[1];
        }
    })
    return query;
}

function getQueryString(queryParams) {
    var queryString = '?'
    Object.keys(queryParams).forEach(function (param, index) {
        queryString += param + '=' + queryParams[param]
        if (index < Object.keys(queryParams).length - 1) {
            queryString += '&'
        }
    })
    return queryString
}

function fetchObject($, path) {
    return $.getJSON(path);
}

function translateChooselang() {
    var query = getQueryParams(window.location.search);
     //  Set HTML value of language selector with the correct lang
     if (getQueryLang(query)) {
        $('#siteaction-chooselang-menu span.siteaction-title').html(getQueryLang(query).toUpperCase());
    } else {
        $('#siteaction-chooselang-menu span.siteaction-title').html(default_language.toUpperCase());
    }
    //  Set links
    var languagesLinks = $('.panel #chooselang').find('a');

    for (var i = 0; i < languagesLinks.length; i++) {
        var link = {};
        var lang = '';
        var old_href = $(languagesLinks[i]).attr('href');

        lang = old_href.slice(old_href.lastIndexOf('/') + 1);
        if (lang === '') lang = 'en';

        link.href = window.location.href;
        link.origin = link.href.split('?')[0];
        link.queryString = '?' + link.href.split('?')[1];
        link.queryParams = getQueryParams(link.queryString);

        if (!getQueryLang(link.queryParams)) {
            if (lang !== default_language && languages[lang]) {
                link.queryParams = Object.assign({
                    lang: lang
                }, link.queryParams);
            } else {
                link.queryParams = Object.assign({
                    lang: default_language
                }, link.queryParams);
            }
        } else {
            if (lang !== default_language && languages[lang]) {
                link.queryParams['lang'] = lang;
            } else {
                link.queryParams['lang'] = default_language;
            }
        }

        link.queryString = getQueryString(link.queryParams)

        $(languagesLinks[i]).attr('href', link.origin + link.queryString);
    }
}

(function($) {
    $.fn.i18nTranslateList = function(source, values){
        var translatedValues = [];
        values.forEach(function(value){
            translatedValues.push(langObj[langObj['lang']]["Facet_" + source.charAt(0).toUpperCase() + source.slice(1) + "_Item(" + value + ")"] || value);
        });
        return (translatedValues);
    }
    $.fn.i18nRender = function (langObj, lang) {
        //  Translate all elements with i18n class
        var i18nElements = $('.i18n');
        for (var element = 0; element < i18nElements.length; element++) {
            var changes = $(i18nElements[element]).attr('i18n-change').split(',');
            changes.forEach(function(change){
                var variable = $(i18nElements[element]).attr('i18n-variable');
                if (variable && langObj[lang] && langObj[lang][variable]) {
                    if (change === 'html') {
                        $(i18nElements[element]).html(
                            langObj[lang][variable]
                        )
                    } else {
                        $(i18nElements[element]).attr(
                            change,
                            langObj[lang][variable]
                        )
                    }
                }
            })
        }
        //  Add language to all link that have i18n-link class
        var i18nLinkElements = $('.i18n-link');
        for (let element = 0; element < i18nLinkElements.length; element++) {
            var href = $(i18nLinkElements[element]).attr("href")
            if (href.includes("?")) {
                href.replace("?", `?lang=${lang}&`)
            } else {
                href += `?lang=${lang}`
            }
            $(i18nLinkElements[element]).attr("href", href)
        }

        setTimeout(function() {
            $('#app').loading('stop');
        }, 500)
    }

    $.fn.i18nProcess = function () {
        $('#app').loading();
        var process = $.Deferred();
        var query = getQueryParams(window.location.search);
        //  Create local language i18n object with translations 
        var i18n_generic = 'i18n_generic/';
        var i18n = 'i18n/';
        var lang = '';

        if (getQueryLang(query)) {
            i18n_generic += getQueryLang(query);
            i18n += getQueryLang(query);
            lang = getQueryLang(query);
        } else {
            i18n_generic += default_language;
            i18n += default_language;
            lang = default_language;
        }
        langObj['i18n_generic'] = `${i18n_generic}.json`;
        langObj['i18n'] = `${i18n}.json`;
        langObj['lang'] = `${lang}`;

        fetchObject($, langObj['i18n'])
            .done(function(i18n) {
                fetchObject($, langObj['i18n_generic'])
                    .done(function(i18n_generic) {
                        langObj[langObj['lang']] = {};
                        for(var prop in i18n_generic) {
                            langObj[langObj['lang']][prop] = i18n_generic[prop];
                        }
                        for(var prop in i18n) {
                            langObj[langObj['lang']][prop] = i18n[prop];
                        }
                        $('#app').loading('stop');
                        process.resolve(true)
                    })
                    .fail(function() {
                        langObj[langObj['lang']] = {};
                        for(var prop in i18n) {
                            langObj[langObj['lang']][prop] = i18n[prop];
                        }
                        console.log(langObj['i18n_generic'] + " is invalid or nonexistent.")
                        $('#app').loading('stop');
                        process.resolve(true)
                    })
            })
            .fail(function() {
                fetchObject($, langObj['i18n_generic'])
                    .done(function(i18n_generic) {
                        langObj[langObj['lang']] = {};
                        for(var prop in i18n_generic) {
                            langObj[langObj['lang']][prop] = i18n_generic[prop];
                        }
                        process.resolve(true)
                    })
                    .fail(function() {
                        langObj[default_language] = `i18n/${default_language}.json`;
                        console.log(langObj['i18n_generic'] + " is invalid or nonexistent.")
                        process.resolve(true)
                    })
                console.log(langObj['i18n'] + " is invalid or nonexistent.")
            })
        return process.promise();
    }
})(jQuery)

window.jQuery(document).ready(function($){
    var initialLoad = true
    var initialTimeStamp = 0
    setupHoverHandlers();
    setupDraft();
    if ($.fn.Lazy) {
        $(window).on('facet_ready', function(event) {
            if (translation && translation.enabled) {
                filtersPopulatingCount--;
                if (filtersPopulatingCount === 0) {
                    if (initialLoad) {
                        initialTimeStamp = event.timeStamp
                        initialLoad = false
                        setTimeout(() => {
                            translateChooselang();
                            $.fn.i18nRender(langObj, langObj['lang']);
                        }, 0)
                    } else if (event.timeStamp - initialTimeStamp > 2000) {
                        setTimeout(() => {
                            $.fn.i18nRender(langObj, langObj['lang']);
                        }, 0)
                    }
                    if (event.timeStamp - initialTimeStamp > 2000) {
                        initialTimeStamp = event.timeStamp
                        if ($('#landing').is(':hidden')) {
                            $('#app').loading();
                        }
                    }
                }
            }
        });
        $(window).on('results_ready', function(event) {
            $(".lazyLoad").Lazy();
        });
    }
});
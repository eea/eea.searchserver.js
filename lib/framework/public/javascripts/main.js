// insert the logo also on the navbar for the bootstrap menu
// this ensures that switching from portrait to landscape is without any flash since
// we can show and hide with css

const default_language = window.settings_default_language
var query = {}

function setupHoverHandlers(){
    $(window).one('results_ready', function() {
        // show and hide remove icon on hovering over added filters
        $("#facetview_selected_filters").on("hover", ".facetview_selection", function(){
            $(this).find('i').toggleClass('hidden');
        }, function(){
            $(this).find('i').toggleClass('hidden');
        });

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

function getQueryLang(query){
    if (query.hasOwnProperty('lang')) {
        return query['lang']
    }
    return false
}

function getQueryParams() {
    var query = {}
    window.location.search.replace('?', '').split('&').forEach(function(param) {
        query[param.split('=')[0]] = param.split('=')[1]
    })
    return query
}

function fetchObject($, path) {
    return $.getJSON(path)
}

(function($) {
    $.fn.i18nRender = function (langObj, lang) {
        //  Set i18n locale language
        $.i18n().locale = lang
        $.i18n().load(langObj).done(function() {
            //  Set filters i18n values
            var facetviewFilters = document.getElementsByClassName('facetview_filter')
            for (var filter = 0; filter < facetviewFilters.length; filter++) {
                var facetHeaderCollection = facetviewFilters[filter].getElementsByTagName('h2')

                if (facetHeaderCollection.length > 0) {
                    $(facetHeaderCollection[0]).text($.i18n(facetHeaderCollection[0].getAttribute('title')))
                }
            }

            var i18nElements = $('.i18n')
            for (let element = 0; element < i18nElements.length; element++) {
                if ($(i18nElements[element]).attr('i18n-change') === 'html') {
                    $(i18nElements[element]).html(
                        $.i18n(
                            $(i18nElements[element]).attr('i18n-variable')
                        )
                    )
                } else {
                    $(i18nElements[element]).attr(
                        $(i18nElements[element]).attr('i18n-change'),
                        $.i18n(
                            $(i18nElements[element]).attr('i18n-variable')
                        )
                    )
                }
            }
        });
    }

    $.fn.i18nProcess = function () {
        query = getQueryParams()
        //  Set HTML value of language selector with the correct lang
        if (getQueryLang(query)) {
            $('#siteaction-chooselang-menu span.siteaction-title').html(getQueryLang(query).toUpperCase())
        } else {
            $('#siteaction-chooselang-menu span.siteaction-title').html(default_language.toUpperCase())
        }
        //  Set links
        var languagesLinks = $('#chooselang').find('a')

        for (var i = 0; i < languagesLinks.length; i++) {
            var href = ''
            var lang = ''
            var old_href = $(languagesLinks[i]).attr('href')

            lang = old_href.slice(old_href.lastIndexOf('/') + 1)
            if (lang === '') lang = 'en'

            if (lang !== default_language) {
                href = window.location.origin + `/?lang=${lang}`
            } else {
                href = window.location.origin + `/?lang=${default_language}`
            }

            $(languagesLinks[i]).attr('href', href)
        }

        //  Create local language i18n object with translations
        var langObj = {}
        var i18n_generic = 'i18n_generic/'
        var i18n = 'i18n/'
        var lang = ''

        if (getQueryLang(query)) {
            i18n_generic += getQueryLang(query)
            i18n += getQueryLang(query)
            lang = getQueryLang(query)
        } else {
            i18n_generic += default_language
            i18n += default_language
            lang = default_language
        }

        langObj['i18n_generic'] = `${i18n_generic}.json`
        langObj['i18n'] = `${i18n}.json`
        langObj['lang'] = `${lang}`

        fetchObject($, langObj['i18n_generic'])
            .done(function(i18n_generic) {
                fetchObject($, langObj['i18n'])
                    .done(function(i18n) {
                        langObj[langObj['lang']] = {}
                        for(var prop in i18n_generic) {
                            langObj[langObj['lang']][prop] = i18n_generic[prop]
                        }
                        for(var prop in i18n) {
                            langObj[langObj['lang']][prop] = i18n[prop]
                        }
                        $.fn.i18nRender(langObj, langObj['lang'])
                    })
                    .fail(function() {
                        langObj[langObj['lang']] = {}
                        for(var prop in i18n_generic) {
                            langObj[langObj['lang']][prop] = i18n_generic[prop]
                        }
                        $.fn.i18nRender(langObj, langObj['lang'])
                    })
            })
            .fail(function() {
                langObj[default_language] = `i18n/${default_language}.json`
                $.fn.i18nRender(langObj, default_language)
            })
    }
})(jQuery)

window.jQuery(document).ready(function($){

    setupHoverHandlers();
    if ($.fn.Lazy) {
        $(window).on('results_ready', function() {
            $(".lazyLoad").Lazy();
            $.fn.i18nProcess()
        });
    }
    
});
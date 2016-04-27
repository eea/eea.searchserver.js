/* EXTERNAL DEPENDENCIES: ++resource++plone.app.jquerytools.js tabs */

/* javascript tabs
 * eg: http://www.eea.europa.eu/code/design-elements#tab-first-tab
 * used in relatedItems tabs
 * http://www.eea.europa.eu/publications/eu-2010-biodiversity-baseline
 * */

jQuery(document).ready(function($) {

    $(window).bind('eea.tags.loaded', function (evt, tab) {
        if (!tab) {
            return;
        }
        var options = $.data(tab, 'eea-tabs-options');
        if (options) {
            if (options['disable_hash_change']) {
                return;
            }
        }
        var $tab = $(tab);
        $tab.find('a').bind('click', function(ev){
            window.location.hash = this.id;
        });
    });

    var eea_tabs = function(options){
        var $eea_tabs = $(".eea-tabs"), eea_tabs_length = $eea_tabs.length,
            $eea_tabs_panels = $(".eea-tabs-panels"), i = 0;
        var $eea_tab, $eea_tab_parent, $eea_tabs_panel, $eea_panels, $eea_tab_children;
        if (eea_tabs_length) {
            for (i; i < eea_tabs_length; i += 1) {
                $eea_tab = $eea_tabs.eq(i);
                if (options) {
                    $.data($eea_tab[0], 'eea-tabs-options', options);
                }
                $eea_tab_parent = $eea_tab.parent();
                // #70069 break out early if whatsnewgallery tabs if found as they
                // are constructed with another logic
                if ($eea_tab_parent.attr('id') === 'whatsnew-gallery') {
                    continue;
                }
                // don't run tab logic if tab already contains tab data
                if ($eea_tab.data('tabs')) {
                    $(window).trigger('eea.tags.loaded', $eea_tab);
                    continue;
                }
                // hide tab while dom manipulation is performed for better performance
                $eea_tab.hide();
                $eea_tabs_panel = $eea_tabs_panels.eq(i);
                // #70069 take into consideration that you might have more eea-tabs
                // classes and yet less panels such as the case where there is the
                // relatedContent tabs and a whatsnewgallery found on the themes dc page
                if (!$eea_tabs_panel.length) {
                    $eea_tabs_panel = $eea_tabs_panels.eq(i - 1);
                }

                $eea_panels = $eea_tabs_panel.children();
                // append eea-tabs-title elements if found in eea-tabs-panel
                $eea_panels.find('.eea-tabs-title').detach().appendTo($eea_tab);

                $eea_tab_children = $eea_tab.children();
                var j = 0, tabs_length = $eea_tab_children.length,
                    $tab_title, tab_title_text, tab_title_id, tab_id;

                // the tabs need a link so we append a link if one is not found
                for (j; j < tabs_length; j += 1) {
                    $tab_title = $($eea_tab_children[j]);
                    // IE 7 encloses surrounding elements withing the li so we
                    // feed it p tags and convert it to li afterwards
                    if ($tab_title[0].tagName === "P") {
                        $tab_title.replaceWith("<li>" + $tab_title.html() + "</li>");
                    }
                    if (!$tab_title.find('a').length) {
                        tab_title_text = $tab_title.text();
                        tab_title_id = tab_title_text.toLowerCase().replace(/\s/g, '-');
                        $tab_title.text("");
                        if ($('#tab-' + tab_title_id).length) {
                            tab_id = 'tab-' + tab_title_id + '-' + 1;
                        }
                        else {
                            tab_id = 'tab-' + tab_title_id;
                        }
                        $('<a />').attr({'href' :'#tab-' + tab_title_id, 'id': tab_id}).html(tab_title_text).appendTo($tab_title);
                    }
                }
                // redo children assignment since they could have been changed from
                // p to li
                $eea_tab_children = $eea_tab.children();

                // load panel data through ajax if eea-tabs-ajax class is present
                if ($eea_tab.hasClass('eea-tabs-ajax')) {
                    $eea_tab.tabs($eea_panels, {effect: 'ajax', history: true});
                }
                else {
                    $eea_tab.tabs($eea_panels);
                }

                $eea_tab.show();

                $(window).trigger('eea.tags.loaded', $eea_tab);
            }
        }

    };
    window.EEA = window.EEA || {};
    // expose eea_tabs function to the global window for reuse in other scripts
    window.EEA.eea_tabs = eea_tabs;
    eea_tabs();

    $(window).bind('hashchange', function (evt) {
        // #14564 trigger click only if hash contains tab and use find to avoid
        // js syntax error
        var $tab_target;
        if (window.location.hash.indexOf('tab') !== -1) {
            try {
                $tab_target = $("#content").find(window.location.hash);
                if ($tab_target.length && !$tab_target.hasClass("current")) {
                    $tab_target.click();
                }

            } catch(e) {
                // catch potential error that can occour if we have query parameter
                // in location such as #tab?some=none
            }
        }
    });

    $(window).trigger('eea.tags.loaded', $('#whatsnew-gallery').find('.eea-tabs'));

    if (window.location.hash) {
        $(window).trigger('hashchange');
    }

});

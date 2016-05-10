/*
 * jquery.facetview.js
 *
 * displays faceted browse results by querying a specified elasticsearch index
 * can read config locally or can be passed in as variable when executed
 * or a config variable can point to a remote config
 *
 * created by Mark MacGillivray - mark@cottagelabs.com
 *
 * http://cottagelabs.com
 *
 * There is an explanation of the options below.
 *
 */

// first define the bind with delay function from (saves loading it separately)
// https://github.com/bgrins/bindWithDelay/blob/master/bindWithDelay.js

function DoubleScroll(element) {
    var scrollbar= document.createElement('div');
    scrollbar.className = "abovescrollbar";
    scrollbar.appendChild(document.createElement('div'));
    scrollbar.style.overflow= 'auto';
    scrollbar.style.overflowY= 'hidden';
    scrollbar.firstChild.style.width= element.scrollWidth+'px';
    scrollbar.firstChild.style.paddingTop= '1px';
    scrollbar.firstChild.appendChild(document.createTextNode('\xA0'));
    scrollbar.onscroll= function() {
        element.scrollLeft= scrollbar.scrollLeft;
    };
    element.onscroll= function() {
        scrollbar.scrollLeft= element.scrollLeft;
    };
    element.parentNode.insertBefore(scrollbar, element);
}

(function($) {
    $.fn.bindWithDelay = function(type, data, fn, timeout, throttle) {
        var wait = null;
        var that = this;

        if ($.isFunction(data)) {
            throttle = timeout;
            timeout = fn;
            fn = data;
            data = undefined;
        }

        function cb() {
            var e = $.extend(true, { }, arguments[0]);
            var throttler = function() {
                wait = null;
                fn.apply(that, [e]);
            };

            if (!throttle) { clearTimeout(wait); }
            if (!throttle || !wait) { wait = setTimeout(throttler, timeout); }
        }

        return this.bind(type, data, cb);
    };
})(jQuery);

// add extension to jQuery with a function to get URL parameters
jQuery.extend({
    getUrlVars: function() {
        var newval;
        var params = {};
        var hashes = window.location.href.slice(
            window.location.href.indexOf('?') + 1).split('&');
        for (var i = 0; i < hashes.length; i++) {
            hash = hashes[i].split('=');
            if (hash.length > 1) {
                if (hash[1].replace(/%22/gi, '')[0] == '[' ||
                    hash[1].replace(/%22/gi, '')[0] == '{') {
                    hash[1] = hash[1].replace(/^%22/, '').replace(/%22$/, '');
                    newval = JSON.parse(
                        unescape(hash[1].replace(/%22/gi, '"')));
                } else {
                    newval = unescape(hash[1].replace(/%22/gi, '"'));
                }
                params[hash[0]] = newval;
            }
        }
        return params;
    },
    getUrlVar: function(name) {
        return jQuery.getUrlVars()[name];
    }
});


// Deal with indexOf issue in <IE9
// provided by commentary in repo issue -
//https://github.com/okfn/facetview/issues/18
if (!Array.prototype.indexOf) {
    Array.prototype.indexOf = function(searchElement /*, fromIndex */) {
        'use strict';
        if (this === null) {
            throw new TypeError();
        }
        var t = Object(this);
        var len = t.length >>> 0;
        if (len === 0) {
            return -1;
        }
        var n = 0;
        if (arguments.length > 1) {
            n = Number(arguments[1]);
            if (n != n) { // shortcut for verifying if it's NaN
                n = 0;
            } else if (n !== 0 && n !== Infinity && n !== -Infinity) {
                n = (n > 0 || -1) * Math.floor(Math.abs(n));
            }
        }
        if (n >= len) {
            return -1;
        }
        var k = n >= 0 ? n : Math.max(len - Math.abs(n), 0);
        for (; k < len; k++) {
            if (k in t && t[k] === searchElement) {
                return k;
            }
        }
        return -1;
    };
}

/* EXPLAINING THE FACETVIEW OPTIONS

Facetview options can be set on instantiation. The list below details which
options are available.

Options can also be set and retrieved externally via $.fn.facetview.options.

Query values can also be read from the query parameters of the current page, or
provided in
the "source" option for initial search.

Also, whilst facetview is executing a query, it will "show" any element with
the "notify-loading" class.
So that class can be applied to any element on a page that can be used to
signify loading is taking place.

Once facetview has executed a query, the querystring used is available under
"options.querystring".
And the result object as retrieved directly from the index is available under
"options.rawdata".

searchbox_class
---------------
This should only be set if embedded_search is set to false, and if an
alternative search box on the page should be used as the source of search
terms. If so, this should be set to the class name (including preceding .)
of the text input that should be used as the source of the search terms.
It is only a class instead of an ID so that it can be applied to fields that
may already have an ID - it should really identify a unique box on the page for
entering search terms for this instance of facetview.
So an ID could actually also be used - just precede with # instead of .
This makes it possible to embed a search box anywhere on a page and have it be
used as the source of simple search parameters for the facetview. Only the last
text box with this clas will be used.

embedded_search
---------------
Default to true, in which case full search term functionality is created and
displayed on the page.
If this is false, the search term text box and options will be hidden, so that
new search terms cannot be provided by the user.
It is possible to set an alternative search term input box on the page instead,
by setting this to false and also setting a searchbox_class value to identify
the basic source of search terms, in which case such a box must be manually
created elsewhere on the page.

searchbox_shade
---------------
The background colour to apply to the search box

sharesave_link
--------------
Default to true, in which case the searchbox - if drawn by facetview - will be
appended with a button that shows the full current search parameters as a URL.

config_file
-----------
Specify as a URL from which to pull a JSON config file specifying these options.

facets
------
A list of facet objects which should be created as filter options on the page.
As per elasticsearch facets settings, plus "display" as a display name for the
facet, instead of field name.
If these should be nested, define them with full scope
e.g. nestedobj.nestedfield.

extra_facets
------------
An object of named extra facet objects that should be submitted and executed on
each query.
These will NOT be used to generate filters on the page, but the result object
can be queried for their content for other purposes.

searchbox_fieldselect
---------------------
A list of objects specifying fields to which search terms should be restricted.
Each object should have a "display" value for displaying as the name of the
option, and a "field" option specifying the field to restrict the search to.

search_sortby
----------------
A list of objects describing sort option dropdowns.
Each object requires a "display" value, and "field" value upon which to sort
results.
NOTE sort fields must be unique on the ES index, NOT lists. Otherwise it will
fail silently. Choose wisely.

enable_rangeselect
------------------
RANGES NEED SOME WORK AFTER RECENT UPDATE, KEEP DISABLED FOR NOW
Enable or disable the ability to select a range of filter values

include_facets_in_querystring
-----------------------------
Default to false.
Whether or not to include full facet settings in the querystring when it is
requested for display.
This makes it easier to get the querystring for other purposes, but does not
change the query that is sent to the index.

result_display
--------------
A display template for search results. It is a list of lists.
Each list specifies a line. Within each list, specify the contents of the line
using objects to describe them. Each content piece should pertain to a
particular "field" of the result set, and should specify what to show "pre" and
"post" the given field

display_images
--------------
Default to true, in which case any image found in a given result object will be
displayed to the left in the result object output.

description
-----------
Just an option to provide a human-friendly description of the functionality of
the instantiated facetview.
Like "search my shop". Will be displayed on the page.

search_url
----------
The URL at the index to which searches should be submitted in order to retrieve
JSON results.

datatype
--------
The datatype that should be used when submitting a search to the index - e.g.
JSON for local, JSONP for remote.

initialsearch
-------------
Default to true, in which case a search-all will be submitted to the index on
page load.
Set to false to wait for user input before issuing the first search.

fields
------
A list of which fields the index should return in result objects (by default
elasticsearch returns them all).

partial_fields
--------------
A definition of which fields to return, as per elasticsearch docs
http://www.elasticsearch.org/guide/reference/api/search/fields.html

nested
------
A list of keys for which the content should be considered nested for query and
facet purposes.
NOTE this requires that such keys be referenced with their full scope e.g.
nestedobj.nestedfield.
Only works on top-level keys so far.

default_url_params
------------------
Any query parameters that the index search URL needs by default.

freetext_submit_delay
---------------------
When search terms are typed in the search box, they are automatically submitted
to the index.
This field specifies in milliseconds how long to wait before sending another
query - e.g. waiting for the user to finish typing a word.

q
-
Specify a query value to start with when the page is loaded. Will be submitted
as the initial search value if initialsearch is enabled. Will also be set as
the value of the searchbox on page load.

predefined_filters
------------------
Facet / query values to apply to all searches. Give each one a reference key,
then in each object define it as per an elasticsearch query for appending to
the bool must.
If these filters should be applied at the nested level, then prefix the name
with the relevant nesting prefix.
e.g. if the nested object is called stats, call the filter stats.MYFILTER.

filter
-------
JSON document describing an `elasticsearch filter
<http://www.elasticsearch.org/guide/reference/api/search/filter/>`_

paging
------
An object defining the paging settings:

    from
    ----
    Which result number to start displaying results from

    size
    ----
    How many results to get and display per "page" of results

pager_on_top
------------
Default to false, in which case the pager - e.g. result count and prev / next
page buttons - only appear at the bottom of the search results.
Set to true to show the pager at the top of the search results as well.

pager_slider
------------
If this is set to true, then the paging options will be a left and right arrow
at the bottom, with the count in between, but a bit bigger and more slider-y
than the standard one. Works well for displaying featured content, for example.

sort
----
A list of objects defining how to sort the results, as per elasticsearch
sorting.

searchwrap_start
searchwrap_end
----------------
HTML values in which to wrap the full result set, to style them into the page
they are being injected into.

resultwrap_start
resultwrap_end
----------------
HTML values in which to wrap each result object

result_box_colours
------------------
A list of background colours that will be randomly assigned to each result
object that has the "result_box" class. To use this, specify the colours in
this list and ensure that the "result_display" option uses the "result_box"
class to wrap the result objects.

fadein
------
Define a fade-in delay in milliseconds so that whenever a new list of results
is displays, it uses the fade-in effect.

post_search_callback
--------------------
This can define or reference a function that will be executed any time new
search results are retrieved and presented on the page.

post_init_callback
------------------
This can define or reference a function that will be executed any time new
facetview object is being created

pushstate
---------
Updates the URL string with the current query when the user changes the search
terms

linkify
-------
Makes any URLs in the result contents into clickable links

default_operator
----------------
Sets the default operator in text search strings - elasticsearch uses OR by
default, but can also be AND

default_freetext_fuzzify
------------------------
If this exists and is not false, it should be either * or ~. If it is * then *
will be prepended and appended to each string in the freetext search term, and
if it is ~ then ~ will be appended to each string in the freetext search term.
If * or ~ or : are already in the freetext search term, it will be assumed the
user is already trying to do a complex search term so no action will be taken.
NOTE these changes are not replicated into the freetext search box - the end
user will not know they are happening.

add_undefined
-------------
Adds a new value to each set, 'undefined', coresponding to the facet response
'missing'.
For each property, 'undefined' will cover all objects that do not have a value
for it.

static_filter
-------------
A static filter with predefined values that can be included in the search.

oneorless
---------
An option for static filters saying that the user can either select a value, or
not select anything. Therefore, when a new value is selected, the previous one,
if it exists, will be disabled.

hierarchy
---------
When this exists and it is not false, it defines a controled vocabulary for the
facet values. The values are classified into categories, sub-categories... with
an unlimited number of possible children. All the categories are possible
facets but they are not obtained from the data.

permanent_filters
-----------------
When this is set to true, the main filters (the defined facet values) will
remain visible even if there is only one possible value.

facet_display_options
---------------------
When this parameter is not an empty list, it defines a list of settings for
displaying facet values.
Possible values:
    checkbox - when included, a checkbox is displayed in front of the options
    sort - when included, one can sort the facet values
The checkbox option is only possible for one layer trees

enable_wildcard_search
----------------------
When this parameter is set to true, wildcards in the query string will be
parsed.

querystr_filtered_chars
-----------------------
Add a string with the chars that should be filtered out when performing the
search. Use this when you want to escape wildcards added by the user.

no_results_message
------------------
Custom message to display when there are no results found for the search. The
default one is "Not found..."


*/

function sortNumber(a,b){
    return a-b;
}

// now the facetview function
(function($) {

    $.fn.facetview = function(options) {

        // a big default value (pulled into options below)
        // demonstrates how to specify an output style based on the fields that
        //can be found in the result object where a specified field is not
        //found, the pre and post for it are just ignored
        var resdisplay = [
                [
                    {
                        'field': 'author.name'
                    },
                    {
                        'pre': '(',
                        'field': 'year',
                        'post': ')'
                    }
                ],
                [
                    {
                        'pre': '<strong>',
                        'field': 'title',
                        'post': '</strong>'
                    }
                ],
                [
                    {
                        'field': 'howpublished'
                    },
                    {
                        'pre': 'in <em>',
                        'field': 'journal.name',
                        'post': '</em>,'
                    },
                    {
                        'pre': '<em>',
                        'field': 'booktitle',
                        'post': '</em>,'
                    },
                    {
                        'pre': 'vol. ',
                        'field': 'volume',
                        'post': ','
                    },
                    {
                        'pre': 'p. ',
                        'field': 'pages'
                    },
                    {
                        'field': 'publisher'
                    }
                ],
                [
                    {
                        'field': 'link.url'
                    }
                ]
            ];


        // specify the defaults
        var defaults = {
            'config_file': false,
            'embedded_search': true,
            'searchbox_class': '',
            'searchbox_fieldselect': [],
            'searchbox_shade': '#ececec',
            'search_sortby': [],
            'save_link': true,
            'sharesave_link': false,
            'description': '',
            'facets': [],
            'extra_facets': {},
            'enable_rangeselect': false,
            'include_facets_in_querystring': false,
            'result_display': resdisplay,
            'display_images': true,
            'search_url': '',
            'datatype': 'jsonp',
            'initialsearch': true,
            'fields': false,
            'partial_fields': false,
            'nested': [],
            'default_url_params': {},
            'freetext_submit_delay': '500',
            'q': '',
            'sort': [],
            'predefined_filters': {},
            'paging': {
                'from': 0,
                'size': 10
            },
            'pager_on_top': false,
            'pager_slider': false,
            'searchwrap_start': '<table class="table table-striped ' +
                'table-bordered" id="facetview_results">',
            'searchwrap_end': '</table>',
            'resultwrap_start': '<tr><td>',
            'resultwrap_end': '</td></tr>',
            'result_box_colours': [],
            'fadein': 800,
            'post_search_callback': false,
            'post_init_callback': false,
            'pushstate': true,
            'linkify': true,
            'default_operator': 'OR',
            'default_freetext_fuzzify': false,
            'static_filters': [],
            'hierarchy': false,
            'permanent_filters': false,
            'query_filter': false,
            'facet_display_options' : [],
            'enable_wildcard_search' : true,
            'querystr_filtered_chars' : '',
            'no_results_message' : false,
            "default_sort":{},
            "resizable": true
        };

        if (defaults.sharesave_link) {
            $("<div>")
                .addClass("facet-share")
                .insertBefore(".facet-view-simple");

            $("<a>")
                .addClass("facetview-share")
                .text("Share this search")
                .appendTo(".facet-share");
            $("<i>")
                .addClass("share-icon")
                .prependTo(".facetview-share");
        }

        // and add in any overrides from the call
        // these options are also overridable by URL parameters
        // facetview options are declared as a function so they are available
        // externally
        // (see bottom of this file)
        var provided_options = $.extend(defaults, options);
        var url_options = $.getUrlVars();
        $.fn.facetview.options = $.extend(provided_options, url_options);
        var options = $.fn.facetview.options;

        // if hierarchy is missing create a default one
        if (!options.hierarchy) {
            options.hierarchy = {};
            for (var i = 0; i < options.facets.length; i++) {
                options.hierarchy[options.facets[i].field] = [];
            }
        }

        window.embed = url_options.embed;

        if (url_options.source) {
            var from = url_options.source.from;
            options.paging.from = !from ? options.paging.from : from;
            var size = url_options.source.size;
            options.paging.size = !size ? options.paging.size : size;
            var sort = url_options.source.sort;
            options.sort = !sort ? options.sort : sort;
        }
        // ===============================================
        // functions to do with filters
        // ===============================================

        // show the filter values
        var showfiltervals = function(event) {
            event.preventDefault();
            if ($(this).hasClass('facetview_open')) {
                $(this).children('i').removeClass('icon-minus');
                $(this).children('i').addClass('icon-plus');
                $(this).removeClass('facetview_open');
                $('[id="facetview_' + $(this).attr('rel') + '"]', obj)
                    .children().find('.facetview_filtervalue').hide();
                $(this).parent().parent()
                    .siblings('.facetview_filtervalue_hierarchic').hide();
                $(this).parent().parent()
                    .siblings('.facetview_filterdiv_hierarchic').hide();
                $(this).siblings('.facetview_filteroptions').hide();
            } else {
                $(this).children('i').removeClass('icon-plus');
                $(this).children('i').addClass('icon-minus');
                $(this).addClass('facetview_open');
                $('[id="facetview_' + $(this).attr('rel') + '"]', obj)
                    .children().find('.facetview_filtervalue').show();
                $(this).parent().parent()
                    .siblings('.facetview_filtervalue_hierarchic').show();
                $(this).parent().parent()
                    .siblings('.facetview_filterdiv_hierarchic').show();
                $(this).siblings('.facetview_filteroptions').show();

                var ml_button = $(this).parent()
                    .children('.facetview_filteroptions')
                        .children('.facetview_moreless');
                if (ml_button.text() == 'Less') {
                    ml_button.trigger('click');
                } else {
                    ml_button.trigger('click');
                    ml_button.trigger('click');
                }
            }
        };

        // show the filter values - the tree version
        var showfiltervalues = function(event) {
            event.preventDefault();
            event.target = $(event.target).closest(".facetview_filter").find(".facetview_showtree");
            var these = $(this);
            if (these.hasClass('facetview_open')) {
                these.removeClass('facetview_open');
                these.siblings().hide();
                //   these.siblings('.facetview_tree').jstree('open_all');
            } else {
                these.addClass('facetview_open');
                if ($.inArray($(event.target).attr("id"), options.rangefacets) !== -1){
                    these.parent().find(".facetview_rangecontainer").show();
                    facetrange(event);
                    return;
                }
                if ($.inArray($(event.target).attr("id"), options.geofacets) !== -1){
                    these.parent().find(".facetview_geocontainer").show();
                    facetgeo(event);
                    return;
                }
                var siblings = these.siblings();
                these.siblings('.facetview_tree').jstree('close_all');
                siblings.show();
                var or_button = these.siblings('.facetview_filter_options')
                                        .find('.facetview_or').attr('rel');
                if (or_button === 'AND') {
                    var children = siblings.children().children();
                    var c_len = children.length;
                    for (var childID = 0; childID < c_len; childID++) {
                        var child = $(children[childID]);
                        if (child.text().indexOf('(0)') > -1) {
                            child.hide();
                        }
                    }
                }
                //find out if the list is ckecbox type
                var checkbox = false;
                var length = options.facets.length;
                var title = these.attr('title');
                var facet_rel = title;
                //in the case of a checkbox list, disable the checked option
                for (var i = 0; i < length; i++) {
                    var item = options.facets[i];
                    if ('field' in item && (item.field === title || item.display === title)) {
                        display_opt = item.facet_display_options;
                        facet_rel = item.field;
                        for (var opt in display_opt) {
                            if (display_opt[opt] === 'checkbox') {
                                checkbox = true;
                                break;
                            }
                        }
                        break;
                    }
                }
                if (checkbox) {
                    /* if the checkbox display option is set, checked values
                    should be as many as the ones in facetview_filterselected
                    */
                    var selected = $('.facetview_filterselected[rel="' +
                                     facet_rel + '"]');
                    var len = selected.length;
                    var checked = these.siblings('.jstree')
                                        .find('.jstree-clicked').length;
                    if (checked !== len) {
                        for (i = 0; i <= len; i++) {
                            var option = selected[i];
                            var rel = $(option).attr('rel');
                            var href = $(option).attr('href');
                            var box = $('li[rel="' + rel + '"][title="' +
                                        href + '"]');
                            box.find('.jstree-checkbox').trigger('click');
                        }
                    }
                }
                //adjust the tree height
                var nodes = $('.jstree-node');
                var lineHeight = nodes.height();
                var id = 0;
                while (!lineHeight) {
                    lineHeight = $(nodes[id]).height();
                    id += 1;
                }

                var tree = these.siblings('.jstree');
                var ulTree = tree.children('.jstree-container-ul');
                var ulHeight = ulTree.height();
                ulTree.addClass('facetview_tree_container');
                tree.height(Math.min(ulHeight, 10 * lineHeight) + 'px');
            }
        };

        //recursive function that returns the json in a hierarchy
        var getJson = function(value, property, rel) {
            var count = '';
            count = ' (0)';
            var jsonval = [];
            if (typeof value === 'string') {
                jsonval.push(
                    {
                        'text': value + count,
                        'li_attr' : {
                            'rel' : property,
                            'class' : 'facetview_filterchoice leaf',
                            'title' : value
                        }
                    }
                );
                return jsonval;
            }
            if (value instanceof Array) {
                for (var element in value) {
                    jsonval = jsonval.concat(getJson(value[element], property));
                }
                return jsonval;
            }
            for (var element in value) {
                var children = value[element];
                if (children.length > 0) {
                    jsonval.push({
                        'text': element + count,
                        'state': {
                            'opened' : true,
                            'selected' : false
                        },
                        'li_attr' : {
                            'rel' : property,
                            'class' : 'facetview_filterchoice',
                            'title' : element
                        },
                        'children': getJson(children, property)
                    });
                } else {
                    jsonval = jsonval.concat(getJson(element, property));
                }

            }
            return jsonval;
        };

        // function to switch filters to OR instead of AND
        var orfilters = function(event) {
            event.preventDefault();
            var that = $(this);
            var id = 'facetview_group_' +
                that.attr('href').replace(/\./gi, '_').replace(/\:/gi, '_');
            if (that.attr('rel') === 'AND') {
                that.attr('rel', 'OR');
                that.text('OR');
                that.css({'color': '#333'});
                toc = $('[id="' + id + '"]')
                        .children('.rel-between').text('OR');
                $('.facetview_filterselected[rel="' +
                    that.attr('href') + '"]', obj)
                        .addClass('facetview_logic_or');
            } else {
                that.attr('rel', 'AND');
                that.text('AND');
                $('[id="' + id + '"]').children('.rel-between').text('AND');
                that.css({'color': '#aaa'});
                $('.facetview_filterselected[rel="' +
                    that.attr('href') + '"]', obj)
                        .removeClass('facetview_logic_or');
            }
            dosearch();
        };

        function createtreefromdata(tree, ord, opt, values) {
            var facet = tree.attr("rel");
            var tmp_values = values;
            if (jQuery.inArray(facet, options.rangefacets) !== -1){
                if (values.length > 1){
                    tmp_values = []
                    tmp_values.push(values[0]);
                    tmp_values.push(values[values.length - 1]);
                }
            }
            if (!opt) {
                opt = [];
            }
            tree.jstree({
                'plugins' : opt,
                'core' : {
                    'animation': 0,
                    'data' : tmp_values,
                    'check_callback' : true,
                    'themes' : {
                        'name' : 'default',
                        'icons' : false,
                        'dots': true
                    }
                },
                'checkbox' : {
                    'whole_node' : true,
                    'keep_selected_style' : false,
                    'tie_selection': false
                },
                'sort' : function(a, b) {
                    var a_text = this.get_node(a).text;
                    var b_text = this.get_node(b).text;
                    if (ord === 'term') {
                        return a_text > b_text ? 1 : -1;
                    } else if (ord === 'reverse_term') {
                        return a_text > b_text ? -1 : 1;
                    } else {
                        var a_size = a_text.substring(
                            a_text.lastIndexOf('(') + 1,
                            a_text.lastIndexOf(')'));
                        a_size = parseInt(a_size);

                        var b_size = b_text.substring(
                            b_text.lastIndexOf('(') + 1,
                            b_text.lastIndexOf(')'));
                        b_size = parseInt(b_size);
                        if (ord === 'count') {
                            return a_size - b_size;
                        }
                        else {
                            return b_size - a_size;
                        }
                    }
                }
            })
            .bind('select_node.jstree', function(event, data) {
                var attributes = data.node.li_attr;
                if (attributes.class.indexOf('leaf') > -1) {
                    clickfilterchoice(false, attributes.rel,
                        attributes.title, false);
                    dosearch();
                } else {
                    var children = data.node.children_d;
                    var branch = $('#' + data.node.id);
                    tree.jstree('open_all', branch);

                    children.map(function(childID) {
                        var child = $('#' + childID);
                        if (child.hasClass('jstree-leaf')) {
                            clickfilterchoice(false, child.attr('rel'),
                                            child.attr('title'), false);
                        }
                    });
                    dosearch();
                }
            })
            .bind('deselect_node.jstree', function(event, data) {
                var attributes = data.node.li_attr;
                $('.facetview_filterselected[rel="' + attributes.rel +
                  '"][href="' + attributes.title + '"]').trigger('click');
                //reset
                var parent_tree = $(this);
                var lineHeight = parent_tree.find('.jstree-leaf').height();
                parent_tree.height(10 * lineHeight + 'px');
            })
            .on('open_node.jstree', function(event, data) {
                var children = data.node.children;
                var len = children.length;
                for (var idx = 0; idx < len; idx++) {
                    var child = $('#' + children[idx]);
                    if (child.children('a.jstree-anchor')
                             .text().indexOf('(0)') != -1) {
                        child.hide();
                    }
                }
            });
        }

        // function to perform for sorting of filters
        var sortfilters = function(event) {
            event.preventDefault();

            var sortwhat = $(this).attr('href');
            var tree = $('.facetview_tree[rel="' + sortwhat + '"]');
            var which = 0;
            var length = options.facets.length;
            for (var i = 0; i < length; i++) {
                var item = options.facets[i];
                if ('field' in item) {
                    if (item.field === sortwhat) {
                        which = i;
                    }
                }
            }

            // iterate to next sort type on click. order is term, rterm,
            //count, rcount
            if ($(this).hasClass('facetview_term')) {
                options.facets[which].order = 'reverse_term';
                $(this).html('a-z <i class="icon-arrow-up"></i>');
                $(this).removeClass('facetview_term')
                            .addClass('facetview_rterm');
            } else if ($(this).hasClass('facetview_rterm')) {
                options.facets[which].order = 'count';
                $(this).html('count <i class="icon-arrow-down"></i>');
                $(this).removeClass('facetview_rterm')
                            .addClass('facetview_count');
            } else if ($(this).hasClass('facetview_count')) {
                options.facets[which].order = 'reverse_count';
                $(this).html('count <i class="icon-arrow-up"></i>');
                $(this).removeClass('facetview_count')
                            .addClass('facetview_rcount');
            } else if ($(this).hasClass('facetview_rcount')) {
                options.facets[which].order = 'term';
                $(this).html('a-z <i class="icon-arrow-down"></i>');
                $(this).removeClass('facetview_rcount')
                            .addClass('facetview_term');
            }

            var thejson = tree.jstree(true).get_json('#');
            tree.jstree('destroy');
            createtreefromdata(tree, options.facets[which].order,
                               options.facets[which].facet_display_options,
                               thejson);
            
            correctFacetRenderer();

        };
        // insert a geo facet once selected
        var dofacetgeo = function(rel, dothesearch) {
            if (dothesearch === undefined){
                dothesearch = true;
            }
            $('a.facetview_filterselected[rel="' + rel + '"]').remove();
            $('#facetview_georesults_' + rel, obj).remove();
            $('#facetview_group_' + rel, obj).remove();
            // TODO: get the values

            var type = $('#facetview_geoplaceholder_' + rel, obj).find(".facetview_geo_type_"+rel).attr("value");

            var facet_display_value = "";
            var data = {};
            if (type === "distance"){
                var lat = $('#facetview_geoplaceholder_' + rel + ' .facetview_latval_' + rel, obj).attr("value");
                var lon = $('#facetview_geoplaceholder_' + rel + ' .facetview_lonval_' + rel, obj).attr("value");
                var dist = $('#facetview_geoplaceholder_' + rel + ' .facetview_distval_' + rel, obj).attr("value");
                facet_display_value = "("  + lat + ", " + lon + ") - " + dist;
                data = {type:type, lat:lat, lon:lon, dist:dist};
            }
            else {
                var lat1 = $('#facetview_geoplaceholder_' + rel + ' .facetview_latval1_' + rel, obj).attr("value");
                var lon1 = $('#facetview_geoplaceholder_' + rel + ' .facetview_lonval1_' + rel, obj).attr("value");
                var lat2 = $('#facetview_geoplaceholder_' + rel + ' .facetview_latval2_' + rel, obj).attr("value");
                var lon2 = $('#facetview_geoplaceholder_' + rel + ' .facetview_lonval2_' + rel, obj).attr("value");
                facet_display_value = "("  + lat1 + ", " + lon1 + ") - ("  + lat2 + ", " + lon2 + ")";
                data = {type:type, lat1:lat1, lon1:lon1, lat2:lat2, lon2:lon2};

            }

            var href = $(this).attr('href');
            var newobj = [
                '<div style="display:none;" class="btn-group"',
                'id="facetview_georesults_',
                rel,
                '"> ',
                '<a class="facetview_filterselected facetview_facetgeo facetview_logic_or fores ',
                'facetview_clear btn btn-info"',
                'facettype="geo"',
                ' rel="',
                rel,
                '" alt="remove" title="remove" href="',
                href,
                '">',
                ' <i class="icon-white icon-remove"></i></a></div>'
            ].join('');
            $('#facetview_selectedfilters', obj).append(newobj);
            $('#facetview_georesults_' + rel + " .facetview_filterselected").data("geo_data", data);

            options.paging.from = 0;

            var relclean = rel.replace(/\./gi, '_').replace(/\:/gi, '_');

            var myobj = '<div class="facetview_selection"> <a ' +
                        'class="facetview_filterselected facetview_logic_or facetview_facetgeo facetview_clear btn';

            myobj = [myobj,
                     '" ',
                     'facettype="geo"',
                     ' rel="',
                     rel,
                     '" alt="remove" title="remove" href="',
                     href,
                     '">',
                     ' <i class="icon-white icon-remove" ',
                     'style="margin-top:1px;"></i></a>',
                     facet_display_value,
                     '</div>'
                    ].join('');

            if ($('div[id="facetview_group_' + relclean + '"]', obj).length) {
                myobj = '<a class="btn btn-small rel-between" rel="' + href +
                    '" style="color:#aaa">' + op_text + '</a>' + myobj;
                $('div[id="facetview_group_' + relclean + '"]', obj)
                    .append(myobj);

            } else {
                var pobj = [
                            '<div id="facetview_group_',
                            relclean,
                            '" class="btn-group facetview_selected">',
                            myobj,
                            '</div>'
                            ].join('');
                if ($('div.facetview_selected').length) {
                    pobj = '<div class="facet-rel-between"> <a class="btn ' +
                            'btn-small facet_operator"> AND</a></div>' + pobj;
                }

            }

            $('#facetview_selected_filters', obj).append(pobj);
            if ($('.current-filters:hidden')) {
                $('.current-filters').show();
            }
            $('.facetview_filterselected[facettype="geo"]', obj).unbind('click', clearfacetgeo);
            $('.facetview_filterselected[facettype="geo"]', obj).bind('click', clearfacetgeo);

            if (dothesearch){
                dosearch();
            }
        };

        // insert a facet range once selected
        // TODO: UPDATE
        var dofacetrange = function(rel) {
            $('a.facetview_filterselected[rel="' + rel + '"]').remove();
            $('#facetview_rangeresults_' + rel, obj).remove();
            $('#facetview_group_' + rel, obj).remove();
            var values = $('#facetview_slider_' + rel).slider('values');
            var min = $('#facetview_slider_' + rel).slider('option', 'min');
            var max = $('#facetview_slider_' + rel).slider('option', 'max');
            if (min === values[0] && max === values[1]){
                dosearch();
                return;
            }
            var range = $('#facetview_rangechoices_' + rel, obj).html();
            var href = $(this).attr('href');
            var newobj = [
                '<div style="display:none;" class="btn-group"',
                'id="facetview_rangeresults_',
                rel,
                '"> ',
                '<a class="facetview_filterselected facetview_facetrange ',
                'facetview_clear btn btn-info"',
                'facettype="range"',
                ' rel="',
                rel,
                '" alt="remove" title="remove" href="',
                href,
                '">',
                range,
                ' <i class="icon-white icon-remove"></i></a></div>'
            ].join('');

            $('#facetview_selectedfilters', obj).append(newobj);

            options.paging.from = 0;

            var relclean = rel.replace(/\./gi, '_').replace(/\:/gi, '_');

            var myobj = '<div class="facetview_selection"> <a ' +
                        'class="facetview_filterselected facetview_clear btn';
            var lowval = $("#facetview_rangechoices_" + rel + " .facetview_lowrangeval_" + rel).html();
            var highval = $("#facetview_rangechoices_" + rel + " .facetview_highrangeval_" + rel).html();
            var operation = $('.facetview_or[href="' + rel + '"]', obj);
            var op_text = 'AND';
            myobj = [myobj,
                     '" ',
                     'facettype="range"',
                     ' rel="',
                     rel,
                     '" alt="remove" title="remove" href="',
                     href,
                     '">',
                     ' <i class="icon-white icon-remove" ',
                     'style="margin-top:1px;"></i></a>',
                     lowval,
                     ' - ',
                     highval,
                     '</div>'
                    ].join('');
            if ($('div[id="facetview_group_' + relclean + '"]', obj).length) {
                myobj = '<a class="btn btn-small rel-between" rel="' + href +
                    '" style="color:#aaa">' + op_text + '</a>' + myobj;
                $('div[id="facetview_group_' + relclean + '"]', obj)
                    .append(myobj);

            } else {
                var pobj = [
                            '<div id="facetview_group_',
                            relclean,
                            '" class="btn-group facetview_selected">',
                            myobj,
                            '</div>'
                            ].join('');
                if ($('div.facetview_selected').length) {
                    pobj = '<div class="facet-rel-between"> <a class="btn ' +
                            'btn-small facet_operator"> AND</a></div>' + pobj;
                }

            }

            $('#facetview_selected_filters', obj).append(pobj);
            if ($('.current-filters:hidden')) {
                $('.current-filters').show();
            }
            $('.facetview_filterselected[facettype="range"]', obj).unbind('click', clearfacetrange);
            $('.facetview_filterselected[facettype="range"]', obj).bind('click', clearfacetrange);


            dosearch();
        };
        // clear a facet geo
        var clearfacetgeo = function(event) {
            event.preventDefault();
            var rel = $(this).attr('rel');

            $('a.facetview_filterselected[rel="' + rel + '"]').remove();
            $('#facetview_georesults_' + rel, obj).remove();
            $('#facetview_group_' + rel, obj).remove();

            $('#facetview_geoplaceholder_' + rel + ' .facetview_latval_' + rel, obj).attr("value", "");
            $('#facetview_geoplaceholder_' + rel + ' .facetview_lonval_' + rel, obj).attr("value", "");
            $('#facetview_geoplaceholder_' + rel + ' .facetview_distval_' + rel, obj).attr("value", "");
            $('#facetview_geoplaceholder_' + rel + ' .facetview_latval1_' + rel, obj).attr("value", "");
            $('#facetview_geoplaceholder_' + rel + ' .facetview_lonval1_' + rel, obj).attr("value", "");
            $('#facetview_geoplaceholder_' + rel + ' .facetview_latval2_' + rel, obj).attr("value", "");
            $('#facetview_geoplaceholder_' + rel + ' .facetview_lonval2_' + rel, obj).attr("value", "");

            dosearch();
        };
        // clear a facet range
        var clearfacetrange = function(event) {
            event.preventDefault();
            var rel = $(this).attr('rel');
            var min = $('#facetview_slider_' + rel).slider('option', 'min');
            var max = $('#facetview_slider_' + rel).slider('option', 'max');
            delete options.facets[parseFloat(rel)].default_values;
            $('#facetview_slider_' + rel).slider('values',[min, max]);

            $('a.facetview_filterselected[rel="' + rel + '"]').remove();
            $('#facetview_rangeresults_' + rel, obj).remove();
            $('#facetview_group_' + rel, obj).remove();

            dosearch();
        };

        var createfacetgeo = function (options){
            var rel = options.rel;
            if ($("[id='facetview_geoplaceholder_" + rel + "']").length > 0) {
                return;
            }
            var defaults = $('a.facetview_filterselected[rel="' + rel + '"].fores').data("geo_data");

            var geoselect = [
                '<div id="facetview_geoplaceholder_',
                rel,
                '" class="facetview_geocontainer clearfix"> ',
                '<div class="clearfix">',
                    '<div id="geo-facet-tabs_' + rel +'">',
                        '<input class="facetview_geo_type_'+rel+'" type="text" style="display:none">',
                        '<ul>',
                            '<li><a href="#geo-distance-tab" class="geo-facet-type">Distance</a></li>',
                            '<li><a href="#geo-bounding-box-tab" class="geo-facet-type">Bounding Box</a></li>',
                        '</ul>',
                        '<div id="geo-distance-tab">',
                            '<span>latitude</span><input class="facetview_latval_'+rel+'" type="text"><br/>',
                            '<span>longitude</span><input class="facetview_lonval_'+rel+'" type="text"><br/>',
                            '<span>distance(km)</span><input class="facetview_distval_'+rel+'" type="text"><br/>',
                        '</div>',
                        '<div id="geo-bounding-box-tab">',
                            '<span style="font-weight:bold; width:100px;">Top Left</span><br/>',
                            '<div style="clear:both"><!-- --></div>',
                            '<span style="padding-left:10px">latitude</span><input class="facetview_latval1_'+rel+'" type="text"><br/>',
                            '<span style="padding-left:10px">longitude</span><input class="facetview_lonval1_'+rel+'" type="text"><br/>',
                            '<span style="font-weight:bold; width:100px;">Bottom Right</span><br/>',
                            '<div style="clear:both"><!-- --></div>',
                            '<span style="padding-left:10px">latitude</span><input class="facetview_latval2_'+rel+'" type="text"><br/>',
                            '<span style="padding-left:10px">longitude</span><input class="facetview_lonval2_'+rel+'" type="text"><br/>',
                        '</div>',
                    '</div>',
                '</div></div>'
            ].join('');
            $("[id='" + options.id + "']").after(geoselect);
            var activetab = 0;
            if (defaults !== undefined){
                var placeholder = $("#facetview_geoplaceholder_" + rel);
                placeholder.find(".facetview_geo_type_" + rel).attr("value", defaults.type)
                if (defaults.type === "distance"){
                    placeholder.find('.facetview_latval_'+rel).attr("value", defaults.lat);
                    placeholder.find('.facetview_lonval_'+rel).attr("value", defaults.lon);
                    placeholder.find('.facetview_distval_'+rel).attr("value", defaults.dist);
                }
                else {
                    activetab = 1;
                    placeholder.find('.facetview_latval1_'+rel).attr("value", defaults.lat1);
                    placeholder.find('.facetview_lonval1_'+rel).attr("value", defaults.lon1);
                    placeholder.find('.facetview_latval2_'+rel).attr("value", defaults.lat2);
                    placeholder.find('.facetview_lonval2_'+rel).attr("value", defaults.lon2);
                }
            }
            $('.facetview_facetgeo_remove[facettype="geo"]', obj)
                .unbind('click', clearfacetgeo);
            $('.facetview_facetgeo_remove[facettype="geo"]', obj)
                .bind('click', clearfacetgeo);
            var valsobj = $('.facetview_tree[rel="'+options.id+'"]', obj);
            var facet = options.id;
            $( "#geo-facet-tabs_" + rel ).tabs({active:activetab});

            $("#facetview_geoplaceholder_" + rel + " input", obj).change(function(){
                if ($('#facetview_geoplaceholder_' + rel, obj).find("#geo-distance-tab").is(":visible")){
                    $('#facetview_geoplaceholder_' + rel, obj).find(".facetview_geo_type_"+rel).attr("value", "distance");
                }
                else {
                    $('#facetview_geoplaceholder_' + rel, obj).find(".facetview_geo_type_"+rel).attr("value", "bounding-box");
                }

                dofacetgeo(rel);
            });
        };

        // build a facet geo selector
        var facetgeo = function(event) {
            event.preventDefault();
            var options = {rel : $(event.target).attr('eea_rel'),
                            id : $(event.target).attr('id')
            };
            createfacetgeo(options);

        };
        // build a facet range selector
        var facetrange = function(event) {
            // TODO: when a facet range is requested, should hide the facet
            //list from the menu should perhaps also remove any selections
            //already made on that facet
            event.preventDefault();
            var rel = $(event.target).attr('eea_rel');
            if ($("[id='facetview_rangeplaceholder_" + rel + "']").length > 0) {
                return;
            }
            var rangeselect = [
                '<div id="facetview_rangeplaceholder_',
                rel,
                '" class="facetview_rangecontainer clearfix"> ',
                '<div class="clearfix"> <h3 id="facetview_rangechoices_',
                rel,
                '" style="margin-left:10px; margin-right:10px; float:left; ',
                'clear:none;" class="clearfix"> <span ',
                'class="facetview_lowrangeval_',
                rel,
                '">...</span> <small>to&nbsp;</small>',
                '<span class="facetview_highrangeval_',
                rel,
                '">...</span></h3> <div style="float:right;" ',
                'class="btn-group"> <a class="facetview_facetrange_remove ',
                'btn" rel="',
                rel,
                '" alt="remove" title="remove" href="#"><i ',
                'class="icon-remove"> </i></a></div></div> <div ',
                'class="clearfix" style="margin:20px;" id="facetview_slider_',
                rel,
                '"></div> </div>'
            ].join('');

            $("[id='" + $(event.target).attr('id') + "']").after(rangeselect);
            $('.facetview_facetrange_remove[facettype="range"]', obj)
                .unbind('click', clearfacetrange);
            $('.facetview_facetrange_remove[facettype="range"]', obj)
                .bind('click', clearfacetrange);
            var valsobj = $('.facetview_tree[rel="'+$(event.target).attr('id')+'"]', obj);
            var facet = $(event.target).attr('id');
            var minval = null;
            var maxval = null;
            for (var i = 0; i < options.facets.length; i++){
                if (options.facets[i].field === facet){
                    if (options.facets[i].default_values !== undefined){
                        minval = parseFloat(options.facets[i].default_values[0]);
                        maxval = parseFloat(options.facets[i].default_values[1]);
                    }
                }
            }
            var values = valsobj.data("values");

            var min = 0;
            var max = values.length - 1;

            for (var i = 0; i < values.length; i++){
                if (values[i] === minval){
                    min = i;
                }
                if (values[i] === maxval){
                    max = i;
                }
            }
            var facet = $(event.target).attr('id');
            min = Math.max(0, min);
            max = Math.min(values.length - 1, max);
            $('#facetview_slider_' + rel, obj).slider({
                range: true,
                min: 0,
                max: values.length - 1,
                values: [min, max],
                slide: function( event, ui ) {
                    $('#facetview_rangechoices_' + rel + ' .facetview_lowrangeval_' + rel, obj).html( values[ ui.values[0] ] );
                    $('#facetview_rangechoices_' + rel + ' .facetview_highrangeval_' + rel, obj).html( values[ ui.values[1] ] );
                },
                change: function( event, ui ) {
                    if (ui === undefined){
                        return;
                    }
                    $('#facetview_rangechoices_' + rel + ' .facetview_lowrangeval_' + rel, obj).html( values[ ui.values[0] ] );
                    $('#facetview_rangechoices_' + rel + ' .facetview_highrangeval_' + rel, obj).html( values[ ui.values[1] ] );
                    dofacetrange( rel );
                }
            });
            $('#facetview_rangechoices_' +
                rel +
                ' .facetview_lowrangeval_' +
                rel, obj
            ).html(values[min]);
            $('#facetview_rangechoices_' +
                rel +
                ' .facetview_highrangeval_' +
                rel, obj
            ).html(values[max]);
        };

        // pass a list of filters to be displayed
        var buildfilters = function() {
            if (options.facets.length > 0) {

                var filters = options.facets;

                //Create a jstree from the hierarchy, that will be populated
                //with the results
                var trees = $('#facetview_trees');
                var html = '';

                var orderConstants = {
                    'term': {'text' : 'a-z', 'direction' : 'down'},
                    'rterm' : {'text' : 'a-z', 'direction' : 'up'},
                    'count' : {'text' : 'count', 'direction' : 'down'},
                    'rcount' : {'text' : 'count', 'direction' : 'up'}};

                for (var prop in options.hierarchy) {
                    var valuetext = '';
                    var ord = '';
                    for (var idx in filters) {
                        var facet = filters[idx];
                        if (facet.field === prop) {
                            valuetext = facet.display;
                            ord = facet.order;
                            break;
                        }
                    }
                    var rel = facet.operator;
                    if (rel === undefined) {
                        rel = 'AND';
                        facet.operator = 'AND';
                    }
                    var style = 'color:#aaa;';
                    if ($('.facetview_logic_or[rel="' + prop + '"]').length) {
                        rel = 'OR';
                    } else if (
                        $('.facetview_filterselected[rel="' + prop + '"]')
                            .length) {
                        rel = 'AND';
                    }
                    var myOrder = orderConstants[ord];

                    var eea_rel = "";
/*                    if ( options.enable_rangeselect ) {
                        range_btn = '<a class="btn btn-small facetview_facetrange" title="make a range selection on this filter" rel="' + idx + '" href="' + prop + '" style="color:#aaa;">range</a>';

                    }*/
                    html = [html,
                            '<div class="facetview_filter"> <h2 ',
                            'class="facetview_showtree " title="',
                            valuetext,
                            '" id="',
                            prop,
                            '" eea_rel="',
                            idx,
                            '">',
                            '<div class="facetview_showtree_eealabel">',
                            valuetext,
                            '</div>',
                            '<span class="facetview_arrow_right"/> <div style="clear:both"> </div></h2> ',
                            '<div class="btn-group facetview_filter_options" ',
                            'style="display:none; margin-top:5px;">',
                            '<div class="facet_order"><span> Order by </span>',
                            '<a class="btn btn-small facetview_sort ',
                            'facetview_term ',
                            ord,
                            '" title="filter value order" href="',
                            prop,
                            '">',
                            myOrder.text,
                            '<i class="icon-arrow-',
                            myOrder.direction,
                            '"></i> </a> </div> <div class="facet_cond"><span> Condition </span> ',
                            '<a class="btn btn-small facetview_or"',
                            ' title="select another option from this filter" ',
                            'rel="',
                            rel,
                            '" href="',
                            prop,
                            '" >',
                            rel,
                            '</a> </div></div>',
                            '<div class="facetview_tree" style="display:none;',
                            ' border:solid #f0f0f0 1px; height:250px" rel="',
                            prop,
                            '"></div></div>'
                        ].join('');
                    if ( options.enable_rangeselect ) {
                        html = [html
                                ];
                    }

                }
                trees.append(html);


                for (var prop in options.hierarchy) {
                    var tree = $('.facetview_tree[rel="' + prop + '"]');
                    var children = options.hierarchy[prop];
                    var rel = facet.operator;
                    var which = 0;
                    for (var i = 0; i < options.facets.length; i++) {
                        var item = options.facets[i];
                        if ('field' in item) {
                            if (item.field === prop) {
                                which = i;
                            }
                        }
                    }
                    createtreefromdata(tree,
                                       options.facets[which].order,
                                       options.facets[which].facet_display_options,
                                       getJson(children, prop, rel));
                }

                $('.facetview_sort', obj).bind('click', sortfilters);
                $('.facetview_or', obj).bind('click', orfilters);
                $('.facetview_showtree', obj).bind('click', showfiltervalues);
                if (options.description) {
                    $('#facetview_trees', obj)
                        .append('<div>' + options.description + '</div>');
                }
            }
        };

        // trigger a search when a filter choice is clicked
        // or when a source param is found and passed on page load
        var clickfilterchoice = function(event, rel, href, initor) {
            if (event) {
                event.preventDefault();
                var rel = $(this).attr('rel');
                var href = $(this).attr('href');
            }
            var relclean = rel.replace(/\./gi, '_').replace(/\:/gi, '_');

            // Do nothing if element already exists.
            if ($('a.facetview_filterselected[href="' + href +
                    '"][rel="' + rel + '"]').length) {
                return null;
            }

            var myobj = '<div class="facetview_selection"> <a ' +
                        'class="facetview_filterselected facetview_clear btn';
            var operation = $('.facetview_or[href="' + rel + '"]', obj);
            var op_text = 'AND';
            if (operation.attr('rel') === 'OR' || initor) {
                myobj += ' facetview_logic_or';
                op_text = 'OR';
            }
            myobj = [myobj,
                     '" rel="',
                     rel,
                     '" alt="remove" title="remove" href="',
                     href,
                     '">',
                     ' <i class="icon-white icon-remove" ',
                     'style="margin-top:1px;"></i></a>',
                     href,
                     '</div>'
                    ].join('');

            if ($('div[id="facetview_group_' + relclean + '"]', obj).length) {
                myobj = '<a class="btn btn-small rel-between" rel="' + href +
                    '" style="color:#aaa">' + op_text + '</a>' + myobj;
                $('div[id="facetview_group_' + relclean + '"]', obj)
                    .append(myobj);

            } else {
                var pobj = [
                            '<div id="facetview_group_',
                            relclean,
                            '" class="btn-group facetview_selected">',
                            myobj,
                            '</div>'
                            ].join('');
                if ($('div.facetview_selected').length) {
                    pobj = '<div class="facet-rel-between"> <a class="btn ' +
                            'btn-small facet_operator"> AND</a></div>' + pobj;
                }

                //$('#facetview_selectedfilters', obj).append(pobj);
                $('#facetview_selected_filters', obj).append(pobj);
                if ($('.current-filters:hidden')) {
                    $('.current-filters').show();
                }
            }

            $('.facetview_filterselected:not([facettype])', obj).unbind('click', clearfilter);
            $('.facetview_filterselected:not([facettype])', obj).bind('click', clearfilter);

            if (event) {
                options.paging.from = 0;
                dosearch();
            }
        };

        // clear a filter when clear button is pressed, and re-do the search
        var clearfilter = function(event) {
            event.preventDefault();
            var that = $(this);
            var rel = that.attr('rel');
            var display_opt = [];
            var length = options.facets.length;

            //in the case of a checkbox list, disable the checked option
            for (var i = 0; i < length; i++) {
                var item = options.facets[i];
                if ('field' in item && item.field === rel) {
                    display_opt = item.facet_display_options;
                }
            }
            for (var opt in display_opt) {
                if (display_opt[opt] === 'checkbox') {
                    var box = $('li[rel="' + rel + '"][title="' +
                                that.attr('href') + '"]');
                    box.children('.jstree-clicked')
                       .children('.jstree-checkbox').trigger('click');
                    break;
                }
            }

            var toDelete = that.parent();

            if (toDelete.siblings().length <= 1) {
                var parent = toDelete.parent();
                var facetrel = parent.next();

                if (!facetrel.length) {
                    facetrel = parent.prev();
                }
                facetrel.remove();
                parent.remove();
            } else {
                var button = toDelete.siblings('[rel="' + that.attr('href') + '"]');
                if (button.length === 0) {
                    $(toDelete.siblings('.rel-between')[0]).remove();
                } else {
                    button.remove();
                }
                toDelete.remove();
            }

            //if it was the last filter, hide header
            if ($('.facetview_selected').length === 0) {
                $('.current-filters').hide();
            }
            options.paging.from = 0;
            dosearch();
        };

        // ===============================================
        // functions to do with building results
        // ===============================================

        // returns an object for the facet, with values and their counts
        var parsefacet = function(facet) {
            var facetsobj = {};
            for (var thing = 0; thing < facet.terms.length; thing++) {
                facetsobj[facet.terms[thing].term] = facet.terms[thing].count;
            }
            if (options.add_undefined) {
                var undefCount = facet.missing;
                if (undefCount > 0) {
                    facetsobj.undefined = undefCount;
                }
            }
            return facetsobj;
        };

        // read the result object and return useful vals
        // returns an object that contains things like ["data"] and ["facets"]
        var parseresults = function(dataobj) {
            var resultobj = {};
            resultobj.records = new Array();
            resultobj.start = '';
            resultobj.found = '';
            resultobj.facets = {};
            for (var item = 0; item < dataobj.hits.hits.length; item++) {
                if (options.fields) {
                    resultobj.records.push(dataobj.hits.hits[item].fields);
                } else if (options.partial_fields) {
                    var keys = [];
                    for (var key in options.partial_fields) {
                        keys.push(key);
                    }
                    resultobj.records.push(
                        dataobj.hits.hits[item].fields[keys[0]]);
                } else {
                    resultobj.records.push(dataobj.hits.hits[item]._source);
                }
            }
            resultobj.start = '';
            resultobj.found = dataobj.hits.total;
            for (var item in dataobj.facets) {
                resultobj.facets[item] = parsefacet(dataobj.facets[item]);
            }
            return resultobj;
        };

        // decrement result set
        var decrement = function(event) {
            event.preventDefault();
            if ($(this).html() !== '..') {
                options.paging.from = options.paging.from - options.paging.size;
                if (options.paging.from < 0) {
                    options.paging.from = 0;
                }
                dosearch();
            }
        };
        // increment result set
        var increment = function(event) {
            event.preventDefault();
            if ($(this).html() != '..') {
                options.paging.from = parseInt($(this).attr('href'));
                dosearch();
            }
        };

        // used to get value by dotted notation in result_display
        var getvalue = function(obj, dotted_notation) {
            if ((typeof(obj) === 'string') && (dotted_notation === '')){
              return obj;
            }
            var parts = dotted_notation.split('.');
            parts.reverse();
            var ref = [parts.pop()];
            while (parts.length && !(ref.join('.') in obj)) {
                ref.push(parts.pop());
            }
            var addressed_ob = obj[ref.join('.')];
            var left = parts.reverse().join('.');

            if (addressed_ob &&
                addressed_ob.constructor.toString().indexOf('Array') === -1) {
                if (parts.length) {
                    return getvalue(addressed_ob, left);
                }
                else {
                    return addressed_ob;
                }
            } else {
                if (addressed_ob !== undefined) {
                    var thevalue = [];
                    for (var row = 0; row < addressed_ob.length; row++) {
                        thevalue.push(getvalue(addressed_ob[row], left));
                    }
                    return thevalue.sort();
                } else {
                    return undefined;
                }
            }
        };

        // given a result record, build how it should look on the page
        var buildrecord = function(index) {
            var record = options.data.records[index];
            var result = options.resultwrap_start;
            // add first image where available
            if (options.display_images) {
                var recstr = JSON.stringify(record);
                var regex = /(http:\/\/\S+?\.(jpg|png|gif|jpeg))/;
                var img = regex.exec(recstr);
                if (img) {
                    result = [
                        result,
                        '<img class="thumbnail" style="float:left; ',
                        'width:100px; margin:0 5px 10px 0; ',
                        'max-height:150px;" src="',
                        img[0],
                        '" />'
                    ].join('');
                }
            }
            // add the record based on display template if available
            var display = options.result_display;
            var lines = '';
            for (var lineitem = 0; lineitem < display.length; lineitem++) {
                line = '';
                for (var object = 0; object < display[lineitem].length;
                    object++) {
                    var thekey = display[lineitem][object]['field'];
                    var thevalue = getvalue(record, thekey);
                    if (thevalue && thevalue.toString().length) {
                        display[lineitem][object]['pre'] ?
                            line += display[lineitem][object]['pre'] : false;
                        if (typeof(thevalue) === 'object') {
                            for (var val = 0; val < thevalue.length; val++) {
                                val !== 0 ? line += ', ' : false;
                                line += thevalue[val];
                            }
                        } else {
                            line += thevalue;
                        }
                        display[lineitem][object].post ?
                            line += display[lineitem][object].post :
                            line += ' ';
                    }
                    else {
                        display[lineitem][object]['pre'] ?
                            line += display[lineitem][object]['pre'] : false;
                        display[lineitem][object]['post'] ?
                            line += display[lineitem][object]['post'] : false;
                    }
                }
                if (line) {
                    lines += line.replace(/^\s/, '').replace(/\s$/, '')
                                .replace(/\,$/, '') + '<br />';
                }
            }
            lines ? result += lines : result += JSON.stringify(
                                                    record, '', '    ');
            result += options.resultwrap_end;
            return result;
        };

        //returns the number of results of the element's children
        var getValCount = function(element) {
            var result = 0;
            var nonrecursiveChildren = element.find('.facetview_filterchoice');
            for (var idx = 0; idx < nonrecursiveChildren.length; idx++) {
                var val = $(nonrecursiveChildren[idx]).text();
                var start = val.indexOf('(');
                var stop = val.indexOf(')');
                val = parseInt(val.substring(start + 1, stop)) || 0;
                result += val;
            }
            return result;
        };

        // view a full record when selected
        var viewrecord = function(event) {
            event.preventDefault();
            var record = options.data.records[$(this).attr('href')];
            alert(JSON.stringify(record, '', '    '));
        };

        //converts results to json
        var resultsToJson = function(results, property, rel) {
            var jsonval = [];
            if (rel === 'AND' || rel === 'OR') {
                for (var element in results) {
                    jsonval.push({'text' : element + ' (' + results[element] + ')',
                                  'li_attr' : {
                                        'rel' : property,
                                        'class' : 'facetview_filterchoice leaf',
                                        'title' : element
                                    }
                    });
                }
            } else {
                for (var element in results) {
                    jsonval.push({'text' : element,
                                  'li_attr' : {
                                        'rel' : property,
                                        'class' : 'facetview_filterchoice leaf',
                                        'title' : element
                                  }
                    });
                }
            }
            return jsonval;
        };

        var updateJson = function(results, property, json, rel) {

            var new_json = resultsToJson(results, property, rel);

            for (var element in json) {
                var value = json[element];
                for (var new_json_element in new_json) {
                    if (new_json[new_json_element].li_attr.title === json[element].li_attr.title){
                        new_json[new_json_element] = json[element];
                        value = new_json[new_json_element];
                    }
                }
                var text = value.li_attr.title;
                var result_val = results[text];
                if (result_val === undefined) {
                    value.text = text + ' (0)';
                } else {
                    value.text = text + ' (' + result_val + ')';
                }
            }
            return new_json;
        };

        var addValuesToTree = function(orRel, facetName, tree, records, order, doptions) {
            if (options.hierarchy && options.hierarchy[facetName].length > 0) {
                //set the values for the leaves
                for (var item in records) {
                    var record = records[item];
                    var inTree = tree.find('.jstree-leaf[title="' + item + '"]');

                    if (inTree.length > 0) {
                        tree.jstree(true).rename_node(
                            inTree, item + ' (' + record + ')');
                    }
                }

                //hide the ones with no values
                values = $('.jstree-node[rel="' + facetName + '"]');
                for (id = 0; id < values.length; id++) {
                    var value = values[id];
                    if (records[value.title] === undefined) {
                        $(value).hide();
                    }
                }
            } else {
                var oldJson = tree.jstree(true).get_json('#');
                tree.jstree('destroy');
                if (oldJson.length === 0) {
                    createtreefromdata(
                        tree,
                        order,
                        doptions,
                        resultsToJson(records, facetName, orRel));
                } else {
                    createtreefromdata(
                        tree,
                        order,
                        doptions,
                        updateJson(records, facetName, oldJson, orRel)
                    );

                    var children = tree.find('.jstree-leaf');
                    children.show();
                    for (var id = 0; id < children.length; id++) {
                        var child = children[id];
                        if (child.textContent.indexOf('(0)') > -1) {
                            $(child).hide();
                        }
                    }
                }
                correctFacetRenderer();
            }

            // Expand tree to desired height
            var prefHeight = 10 * tree.find('.jstree-leaf').height();
            var leaves = tree.find('.jstree-leaf:visible')
            var ulHeight = leaves.height() * leaves.length;
            var treeHeight = Math.min(ulHeight, prefHeight);
            tree.height(treeHeight + 'px');
        };

        //put facet values for an 'OR' facet
        var setFacetValues = function(sdata) {
            var facet = Object.keys(sdata.facets)[0];
            var tree = $('.facetview_tree[rel="' + facet + '"]');
            //todo, see if can be better, check parseresults
            var records = parsefacet(sdata.facets[facet]);
            var order = 'term';
            var doptions = [];
            //Get facet order and options
            var facets = options.facets;
            for (var fct in facets) {
                var curr_fct = facets[fct];
                if(curr_fct.field === facet) {
                    order = curr_fct.order;
                    doptions = curr_fct.facet_display_options;
                    break;
                }
            }
            addValuesToTree('OR', facet, tree, records, order, doptions);
            correctFacetRenderer();
        };
        
        var correctFacetRenderer = function(){
            //set resizable facet
            if(options.resizable){
                if($('div.facetview_tree').hasClass('ui-resizable')){
                    $('div.facetview_tree').resizable('destroy');
                }
                $('div.facetview_tree').resizable({   handles: 's' });
                $('div.facetview_tree .ui-resizable-handle').append(
                    '<div class="ui-icon ui-icon-grip-solid-horizontal"/>'
                );
            }
            $('div.abovescrollbar').remove();
            DoubleScroll(document.getElementById('facetview_results'));
            
            $('.jstree').each(function( index ) {
                var tree = $(this);
                if( tree.siblings('.facetview_open').length > 0){
                    var ulTree = tree.children('.jstree-container-ul');
                    ulTree.addClass('facetview_tree_container');
                }
            });
        };
        
        // put the results on the page
        var showresults = function(sdata) {
            options.rawdata = sdata;
            // get the data and parse from the es layout
            var data = parseresults(sdata);
            options.data = data;

            var choices = $('.facetview_filterchoice');
            for (var choice = 0; choice < choices.length; choice++) {
                var current = $(choices[choice]);
                current.text(current.attr('href'));
                current.parent().hide();
            }
            var open = $('.jstree-open');

            // for each filter setup, find the results for it and append them
            //to the relevant filter
            for (var each = 0; each < options.facets.length; each++) {
                var current_filter = options.facets[each];
                var facet = current_filter.field;
                var facetclean = current_filter.field
                                .replace(/\./gi, '_').replace(/\:/gi, '_');
                var records = data.facets[facet];

                var tree = $('.facetview_tree[rel="' + facet + '"]');
                var or_button = tree
                        .siblings('.facetview_filter_options')
                            .find('.facetview_or');
                var or_buttton_rel = or_button.attr('rel');
                if ($.inArray(facet, options.rangefacets) !== -1){
                    var esquery = JSON.parse(elasticsearchquery());
                    var newQuery = {};
                    $.extend(newQuery, esquery);
                    newQuery.query = {"match_all":{}};
                    newQuery.facets = {};
                    newQuery.facets[facet] = esquery.facets[facet];
                    newQuery = JSON.stringify(newQuery)
                    $.ajax({
                        type: 'get',
                        url: options.search_url,
                        data: {source: newQuery},
                        dataType: options.datatype,
                        success: function(sdata) {
                            data = parseresults(sdata);
                            var tmp_facet;
                            for (var key in data.facets) {
                                tmp_facet = key;
                            }
                            var rangevalues = []
                            for ( var item in data.facets[tmp_facet] ) {
                                rangevalues.push(parseFloat(item));
                            }
                            rangevalues = rangevalues.sort(sortNumber);

                            var tree = $('.facetview_tree[rel="' + tmp_facet + '"]');
                            $('.facetview_tree[rel="' + tmp_facet + '"]')
                                .addClass("hasData")
                                .data("values", rangevalues);

                            tree.jstree('destroy');
                            createtreefromdata(
                                tree,
                                "term",
                                ["sort", "checkbox"],
                                resultsToJson([0,1], tmp_facet, 'OR'));
                            correctFacetRenderer();
                        }
                    });
                }
                if (or_buttton_rel === 'OR') {

                    //query ES to get results without current facet options
                    var esquery = JSON.parse(elasticsearchquery());
                    var filters = esquery.query.filtered;

                    if (!filters) {
                        addValuesToTree('OR', facet, tree, records, current_filter.order, current_filter.facet_display_options);
                    } else {
                        var newQuery = {'query': filters.query};
                        filters = filters.filter;

                        if ('and' in filters) {
                            var and = filters.and;
                            var newand = [];
                            for (var aval in and) {
                                var filter = and[aval].bool.should;
                                var newfilter = [];
                                for (var flt in filter) {
                                    var currflt = filter[flt];
                                    if ((currflt.term !== undefined) && (facet in currflt.term)) {
                                        continue;
                                    }
                                    newfilter.push(currflt);
                                }
                                if (newfilter.length > 0) {
                                    newand.push({'bool': {'should': newfilter}});
                                }
                            }
                            if (newand.length > 1) {
                                filters.and = newand;
                            } else {
                                filters = newand[0];
                            }
                        } else {
                            filters.bool = filters.bool || {};
                            var filter = filters.bool.should || [];
                            var newfilter = [];
                            for (var flt in filter) {
                                var currflt = filter[flt];
                                if (currflt.term && facet in currflt.term) {
                                    continue;
                                }
                                newfilter.push(currflt);
                            }
                            if (newfilter.length === 0) {
                                filters = {};
                            } else {
                                filters.bool.should = newfilter;
                            }
                        }
                        if ('bool' in filters || 'and' in filters) {
                            newQuery = {'query': {'filtered': {'query': newQuery.query, 'filter': filters}}};
                        }
                        newQuery.facets = {};
                        newQuery.facets[facet] = esquery.facets[facet];
                        newQuery = JSON.stringify(newQuery);
                        //Ajax call
                        $.ajax({
                            type: 'get',
                            url: options.search_url,
                            data: {source: newQuery},
                            dataType: options.datatype,
                            success: setFacetValues
                        });
                    }

                } else {
                    addValuesToTree('AND', facet, tree, records,
                                    current_filter.order,
                                    current_filter.facet_display_options);
                }

                //hide hierarchic parents with no results
                if (options.hierarchy) {
                    var parents = $('.facetview_filterparent');
                    for (var idx = 0; idx < parents.length; idx++) {
                        var parent = $(parents[idx]);
                        var text = parent.text();
                        var rel = parent.attr('rel');
                        var start = text.indexOf('(');
                        var stop = text.indexOf(')');
                        text = parseInt(text.substring(start + 1, stop)) || 0;
                        if (text === 0) {
                            $(parents[idx]).parent().hide();
                        } else {
                            $(parents[idx]).parent().show();
                        }
                    }
                }
            }

            // put result metadata on the page
            if (typeof(options.paging.from) != 'number') {
                options.paging.from = parseInt(options.paging.from);
            }
            if (typeof(options.paging.size) != 'number') {
                options.paging.size = parseInt(options.paging.size);
            }
            if (options.pager_slider) {
                var metaTmpl = [
                    '<div style="font-size:20px;font-weight:bold;margin:5px 0',
                    ' 10px 0;padding:5px 0 5px 0;border:1px solid #eee;',
                    'border-radius:5px;-moz-border-radius:5px;',
                    '-webkit-border-radius:5px;">',
                    '<a alt="previous" title="previous" ',
                    'class="facetview_decrement" style="color:#333;float:left;',
                    'padding:0 40px 20px 20px;" href="{{from}}">&lt;</a> ',
                    '<span style="margin:30%;">{{from}} &ndash; {{to}} of ',
                    '{{total}}</span> ',
                    '<a alt="next" title="next" class="facetview_increment" ',
                    'style="color:#333;float:right;padding:0 20px 20px 40px;"',
                    ' href="{{to}}">&gt;</a></div>'
                ].join('');
            } else {
                var metaTmpl = [
                    '<div class="pagination"> <ul> ',
                    '<li class="prev"><a class="facetview_decrement" ',
                    'href="{{from}}">&laquo; back</a></li> ',
                    '<li class="active"><a>{{from}} &ndash; {{to}} of ',
                    '{{total}}</a></li> ',
                    '<li class="next"><a class="facetview_increment" ',
                    'href="{{to}}">next &raquo;</a></li> </ul> </div>'
                ].join('');
            }
            $('.facetview_metadata', obj).html('');
            if (options.no_results_message) {
                $('.facetview_metadata', obj).first().html(options.no_results_message);
            } else {
                $('.facetview_metadata', obj).first().html('Not found...');
            }

            if (data.found) {
                var from = options.paging.from + 1;
                var size = options.paging.size;
                if (!size) {
                    size = 10;
                }
                var to = options.paging.from + size;
                if (data.found < to) {
                    to = data.found;
                }
                var meta = metaTmpl.replace(/{{from}}/g, from);
                meta = meta.replace(/{{to}}/g, to);
                meta = meta.replace(/{{total}}/g, data.found);
                $('.facetview_metadata', obj).html('').append(meta);
                $('.facetview_decrement', obj).bind('click', decrement);
                if (from < size) {
                    $('.facetview_decrement', obj).html('..');
                }
                $('.facetview_increment', obj).bind('click', increment);
                if (data.found <= to) {
                    $('.facetview_increment', obj).html('..');
                }
            }

            // put the filtered results on the page
            $('#facetview_results', obj).html('');
            var infofiltervals = new Array();
            $.each(data.records, function(index, value) {
                // write them out to the results div
                 $('#facetview_results', obj).append(buildrecord(index));
                 options.linkify ?
                    $('#facetview_results tr:last-child', obj).linkify() :
                    false;
            });
            if (options.result_box_colours.length > 0) {
                jQuery('.result_box', obj).each(function() {
                    var colour = options.result_box_colours[
                        Math.floor(
                            Math.random() * options.result_box_colours.length)];
                    jQuery(this).css('background-color', colour);
                });
            }
            $('#facetview_results', obj).children()
                                            .hide()
                                            .fadeIn(options.fadein);
            $('.facetview_viewrecord', obj).bind('click', viewrecord);
            jQuery('.notify_loading').hide();
            jQuery('.download_data').show();
            // if a post search callback is provided, run it
            if (typeof options.post_search_callback == 'function') {
                options.post_search_callback.call(this);
            }

            //set tree height as the last user setting or 10 lines
            var trees = $('div.facetview_tree');
            var treeNum = trees.length;
            
            correctFacetRenderer();
            
       };

        //get a cookie by name
        function getCookie (cookieName) {
            var cookies = document.cookie.split(';');
            for (var ci = 0; ci < cookies.length; ci++) {
                var cookie = cookies[ci].trim();
                var id = cookie.indexOf(cookieName);
                var clen = cookieName.length;
                if (id === 0 && cookie.indexOf('=') === clen ) {
                    return cookie.substring(clen + 1, cookie.length);
                }
            }
            return '';
        }

        // ===============================================
        // functions to do with searching
        // ===============================================

        // filter out unwanted chars
        var filterQueryStrChars = function(querystr) {
            var res = querystr;
            options.querystr_filtered_chars.split('').forEach(
                    function(c) {
                        while (res.indexOf(c) > 0) res = res.replace(c, '');
                    });
            return res;
        };

        // fuzzify the freetext search query terms if required
        var fuzzify = function(querystr) {
            if (querystr.slice(-1) === '\"' &&
                querystr.charAt(querystr.length - 1) === '\"') {
                return querystr;
            }
            var rqs = querystr;
            if (options.default_freetext_fuzzify) {
                if (options.default_freetext_fuzzify === '*' ||
                    options.default_freetext_fuzzify.indexOf('~') > -1) {
                    if (querystr.indexOf('*') === -1 &&
                        querystr.indexOf('~') === -1 &&
                        querystr.indexOf(':') === -1) {
                        var optparts = querystr.split(' ');
                        pq = '';
                        for (var oi = 0; oi < optparts.length; oi++) {
                            var oip = optparts[oi];
                            if (oip.length > 0) {
                                oip = oip + options.default_freetext_fuzzify;
                                if (options.default_freetext_fuzzify === '*') {
                                        oip = '*' + oip;
                                }
                                pq += oip + ' ';
                            }
                        }
                        rqs = pq;
                    }
                }
            }
            return rqs;
        };

        var buildqueryval = function() {
            var qrystr = filterQueryStrChars(options.q);
            var qryval = {'query': fuzzify(qrystr)};
            $('.facetview_searchfield', obj).val() != '' ?
                qryval.default_field = $('.facetview_searchfield', obj).val() :
                '';

            options.default_operator !== undefined ?
                qryval.default_operator = options.default_operator : false;

            if (options.enable_wildcard_search)
                qryval.analyze_wildcard = true;

            return qryval;
        };

        // build the search query URL based on current params
        var elasticsearchquery = function() {
            var qs = {};
            var bool = false;
            var filter = false;
            var nested = false;
            var seenor = []; // track when an or group are found and processed
            $('.facetview_filterselected', obj).each(function() {
                !bool ? bool = {'must': [] } : '';
                if ($(this).hasClass('facetview_facetrange')) {
                    var rngs = {
                        'from': $('.facetview_lowrangeval_' +
                                $(this).attr('rel'), this).html(),
                        'to': $('.facetview_highrangeval_' +
                                $(this).attr('rel'), this).html()
                    };
                    var rel = options.facets[$(this).attr('rel')].field;
                    var robj = {'range': {}};
                    robj.range[rel] = rngs;
                    // check if this should be a nested query
                    var parts = rel.split('.');
                    if (options.nested.indexOf(parts[0]) != -1) {
                        !nested ? nested = {
                                'nested': {
                                    '_scope': parts[0],
                                    'path': parts[0],
                                    'query': {
                                        'bool': {'must': [robj]}
                                    }
                                }
                            } : nested.nested.query.bool.must.push(robj);
                    } else {
                        bool.must.push(robj);
                    }
                } else {
                    // TODO: check if this has class facetview_logic_or
                    // if so, need to build a should around it and its siblings

                    if ($(this).hasClass('facetview_logic_or')) {
                        //check if seenor contains rel
                        var rel = $(this).attr('rel');
                        if ($.inArray(rel, seenor) === -1) {
                            seenor.push(rel);
                            var myfilter = {'bool': {'should': []}};
                            $('.facetview_filterselected[rel="' +
                                $(this).attr('rel') + '"]').each(function() {
                                if ($(this).hasClass('facetview_logic_or')) {
                                    if ($(this).hasClass('facetview_facetgeo')) {
                                        if ($(this).hasClass('fores')){
                                            var data = $(this).data("geo_data");

                                            if (data.type === "distance"){
                                                if (parseFloat(data.lat) && parseFloat(data.lon) && parseFloat(data.dist)){
                                                    var tmp_rel = options.facets[$(this).attr('rel')].field;
                                                    var ob = {};
                                                    ob['geo_distance'] = {};
                                                    ob['geo_distance']['distance'] = data.dist + "km";
                                                    ob['geo_distance'][tmp_rel] = {"lat":data.lat, "lon":data.lon};
                                                    myfilter.bool.should.push(ob);
                                                }
                                            }
                                            else {
                                                if (parseFloat(data.lat1) && parseFloat(data.lon1) && parseFloat(data.lat2) && parseFloat(data.lon2)){
                                                    var tmp_rel = options.facets[$(this).attr('rel')].field;
                                                    var ob = {}
                                                    ob['geo_bounding_box'] = {};
                                                    ob['geo_bounding_box'][ tmp_rel ] = {};
                                                    ob['geo_bounding_box'][ tmp_rel ].top_left = {"lat":data.lat1, "lon":data.lon1};
                                                    ob['geo_bounding_box'][ tmp_rel ].bottom_right = {"lat":data.lat2, "lon":data.lon2};

                                                    myfilter.bool.should.push(ob);
                                                }
                                            }
                                        }
                                    }
                                    else {
                                        var value = $(this).attr('href');
                                        var ob;
                                        if (value === 'undefined') {
                                            ob = {'missing': {'field': []}};
                                            ob.missing.field.push(
                                                $(this).attr('rel'));
                                        } else {
                                            ob = {'term': {}};
                                            ob.term[$(this).attr('rel')] = value;
                                       }
                                       myfilter.bool.should.push(ob);
                                    }
                                }
                            });
                            if (myfilter.bool.should.length === 0) {
                                myfilter = false;
                            } else {
                                // A real filter is found
                                if (!filter) {
                                    filter = myfilter;
                                } else if (!filter.and) {
                                    //two or filters on different relations
                                    filter = {'and': [filter, myfilter]};
                                } else {
                                    filter.and.push(myfilter);
                                }
                            }
                        }
                    } else {
                        var value = $(this).attr('href');
                        if (value === 'undefined') {
                            var myfilter = { 'missing': {
                                'field': $(this).attr('rel')}};
                            if (!filter) {
                                filter = myfilter;
                            } else if (filter.and) {
                                filter.and.push(myfilter);
                            } else {
                                filter = {'and': [filter, myfilter]};
                            }
                        } else {
                            var bobj = false;
                            if (($(this).attr('facettype') !== 'range') && ($(this).attr('facettype') !== 'geo')){
                                var bobj = {'term': {}};
                                bobj['term'][$(this).attr('rel')] = value;
                            }
                        }
                    }

                    // check if this should be a nested query
                    var parts = $(this).attr('rel').split('.');
                    if (options.nested.indexOf(parts[0]) != -1) {
                        !nested ? nested = {
                            'nested': {
                                '_scope': parts[0],
                                'path': parts[0],
                                'query': {
                                    'bool': {'must': [bobj]}
                                }
                            }
                        } : nested.nested.query.bool.must.push(bobj);
                    } else {
                        !bobj ? '' : bool['must'].push(bobj);
                    }
                }
            });
            for (var item in options.predefined_filters) {
                !bool ? bool = {'must': [] } : '';
                var pobj = options.predefined_filters[item];
                var parts = item.split('.');
                if (options.nested.indexOf(parts[0]) != -1) {
                    !nested ? nested = {
                        'nested': {
                            '_scope': parts[0],
                            'path': parts[0],
                            'query': {
                                'bool': {'must': [pobj]}
                            }
                        }
                    } : nested.nested.query.bool.must.push(pobj);
                } else {
                    bool['must'].push(pobj);
                }
            }
            if (bool) {
                if (options.q != '') {
                    var qryval = buildqueryval();
                    bool['must'].push({'query_string': qryval });
                }
                nested ? bool['must'].push(nested) : '';
                bool['must'].length > 0 ?
                    qs['query'] = {'bool': bool} :
                    qs['query'] = {'match_all' : {}};
            } else {
                if (options.q != '') {
                    var qryval = buildqueryval();
                    qs['query'] = {'query_string': qryval};
                } else {
                    qs['query'] = {'match_all': {}};
                }
            }
            if (filter) {
                qs['query'] = {
                    'filtered': {
                        'query': qs['query'],
                        'filter': filter
                    }
                };
            }
            // set any paging
            options.paging.from != 0 ? qs['from'] = options.paging.from : '';
            options.paging.size != 10 ? qs['size'] = options.paging.size : '';
            // set any sort or fields options
            options.sort.length > 0 ? qs['sort'] = options.sort : '';
            options.fields ? qs['fields'] = options.fields : '';
            options.partial_fields ?
                qs['partial_fields'] = options.partial_fields :
                '';
            // set any facets
            qs['facets'] = {};
            for (var item = 0; item < options.facets.length; item++) {
                var fobj = jQuery.extend(true, {}, options.facets[item]);
                delete fobj['display'];
                delete fobj['min_size'];
                delete fobj['operator'];
                delete fobj['facet_display_options'];
                delete fobj['default_values'];
                qs['facets'][fobj['field']] = {'terms': fobj};
                for (var ni; ni < options.nested.length; ni++) {
                    if (fobj['field'].indexOf(options.nested[i]) === 0) {
                         nested ?
                            qs['facets'][fobj['field']]['scope'] =
                                options.nested[i] :
                            qs['facets'][fobj['field']]['nested'] =
                                options.nested[i];
                    }
                }
            }
            jQuery.extend(true, qs['facets'], options.extra_facets);
            // set elasticsearch filter, if any
            // set any filter
            if (options.filter) {
                qs['filter'] = options.filter;
            }
            qy = JSON.stringify(qs);
            if (options.include_facets_in_querystring) {
                options.querystring = qy;
            } else {
                delete qs.facets;
                options.querystring = JSON.stringify(qs);
            }
            options.save_link ?
                $('.facetview_sharesaveurl.download_query', obj)
                    .val('http://' + window.location.host +
                        window.location.pathname +
                        '?source=' + options.querystring) :
                '';
            return qy;
        };

        // execute a search
        var dosearch = function() {
            jQuery('.notify_loading').show();
            jQuery('.download_data').hide();
            // update the options with the latest q value
            if (options.searchbox_class.length === 0) {
                options.q = $('.facetview_freetext', obj).val();
            } else {
                options.q = $(options.searchbox_class).last().val();
            }

            //set the default sort
            if ((options.sort.length === 0) && (!jQuery.isEmptyObject(options.default_sort))){
                options.sort = options.default_sort;
            }
            // make the search query
            var qrystr = elasticsearchquery();
            if (qrystr === options.lastqrystr){
                jQuery('.notify_loading').hide();
                jQuery('.download_data').show();
                return;
            }
            options.lastqrystr = qrystr;
            // augment the URL bar if possible
            if (window.history.pushState && options.pushstate) {
                var currurl = '?source=' + options.querystring;
                window.history.pushState('', 'search', currurl);
            }
            $.ajax({
                type: 'get',
                url: options.search_url,
                data: {source: qrystr},
                // processData: false,
                dataType: options.datatype,
                success: showresults
            });
        };

        // adds extra functionality before performing a search
        var do_special_search = function() {
            options.paging.from = 0;
            if (options.selected_sort) {
                options.sort = options.selected_sort;
            }
            else {
                var order_options = $('.facetview_orderby')[0].children;
                for (var order_option in order_options) {
                    if (order_options[order_option].value === '')
                        order_options[order_option].selected = 'select';
                }
                options.sort = [];
            }
            dosearch();
        };

        // show search help
        var learnmore = function(event) {
            event.preventDefault();
            $('#facetview_learnmore', obj).toggle();
        };

        // adjust how many results are shown
        var howmany = function(event) {
            event.preventDefault();
            var newhowmany = prompt('Currently displaying ' +
                options.paging.size +
                ' results per page. How many would you like instead?');
            if (newhowmany) {
                options.paging.size = parseInt(newhowmany);
                options.paging.from = 0;
                $('.facetview_howmany', obj).html(options.paging.size);
                dosearch();
            }
        };

        // change the search result order
        var order = function(event) {
            event.preventDefault();
            if ($(this).attr('href') === 'desc') {
                $(this).html('<i class="icon-arrow-up"></i>');
                $(this).attr('href', 'asc');
                $(this).attr('title',
                    'current order ascending. Click to change to descending');
            } else {
                $(this).html('<i class="icon-arrow-down"></i>');
                $(this).attr('href', 'desc');
                $(this).attr('title',
                    'current order descending. Click to change to ascending');
            }
            orderby();
        };

        var orderby = function(event) {
            event ? event.preventDefault() : '';
            var sortchoice = $('.facetview_orderby :selected').val();
            var sortoption = $('.facetview_orderby :selected').attr('href');
            if (sortchoice && sortchoice.length != 0) {
                var sorting = {};
                var sorton = sortchoice;
                sorting[sorton] = {
                    'order': sortoption
                };
                options.sort = [sorting];
                options.selected_sort = [sorting];
            } else {
                options.sort = [];
                options.selected_sort = [];
            }
            options.paging.from = 0;
            dosearch();
        };

        // parse any source params out for an initial search
        var parsesource = function() {
            var qrystr = options.source.query;
            var pre_filters = options.predefined_filters;
            function clickfacetvalues(aquery, or) {
                if (typeof aquery === 'string') {
                    clickfilterchoice(false, aquery, 'undefined', or);
                    return;
                }
                if (aquery instanceof Array) {
                    for (var id in aquery) {
                       clickfilterchoice(false, aquery[id], 'undefined', or);
                    }
                    return;
                }
                for (var key in aquery) {
                    var curr_query = aquery[key];
                    if (key === 'term') {
                        for (var t in curr_query) {
                            clickfilterchoice(false, t, curr_query[t], or);
                        }
                    } else if (key === 'missing') {
                        for (var t in curr_query['field']) {
                            clickfilterchoice(false, curr_query['field'][t],
                                                'undefined', or);
                        }
                    } else if (key === 'geo_distance') {
                        var rel = '';
                        var facet = '';
                        for (tmp_key in aquery.geo_distance){
                            if (tmp_key !== "distance"){
                                facet = tmp_key;
                            }
                        }
                        for (var i = 0; i < options.facets.length; i++){
                            if (options.facets[i].field === facet){
                                rel = i.toString();
                            }
                        }
                        var geoselect = [
                            '<div id="facetview_geoplaceholder_',
                            rel,
                            '" class="facetview_geocontainer clearfix dummytoremove" style="display:none"> ',
                            '<div class="clearfix">',
                                '<div id="geo-facet-tabs_' + rel +'">',
                                '<input class="facetview_geo_type_'+rel+'" type="text" style="display:none">',
                                '<ul>',
                                    '<li><a href="#geo-distance-tab" class="geo-facet-type">Distance</a></li>',
                                    '<li><a href="#geo-bounding-box-tab" class="geo-facet-type">Bounding Box</a></li>',
                                '</ul>',
                                '<div id="geo-distance-tab">',
                                    '<span>latitude</span><input class="facetview_latval_'+rel+'" type="text"><br/>',
                                    '<span>longitude</span><input class="facetview_lonval_'+rel+'" type="text"><br/>',
                                    '<span>distance(km)</span><input class="facetview_distval_'+rel+'" type="text"><br/>',
                                '</div>',
                                '<div id="geo-bounding-box-tab">',
                                    '<span style="font-weight:bold;">Top Left</span><br/>',
                                    '<span style="padding-left:10px">latitude</span><input class="facetview_latval1_'+rel+'" type="text"><br/>',
                                    '<span style="padding-left:10px">longitude</span><input class="facetview_lonval1_'+rel+'" type="text"><br/>',
                                    '<span style="font-weight:bold;">Bottom Right</span><br/>',
                                    '<span style="padding-left:10px">latitude</span><input class="facetview_latval2_'+rel+'" type="text"><br/>',
                                    '<span style="padding-left:10px">longitude</span><input class="facetview_lonval2_'+rel+'" type="text"><br/>',
                                '</div>',
                            '</div>',
                            '</div></div>'
                        ].join('');
                        $(geoselect).appendTo(".facet-view-simple");
                        $(".facetview_geo_type_"+rel).attr("value", "distance");
                        $('#facetview_geoplaceholder_' + rel + ' .facetview_latval_' + rel).attr("value", aquery.geo_distance[facet].lat);
                        $('#facetview_geoplaceholder_' + rel + ' .facetview_lonval_' + rel).attr("value", aquery.geo_distance[facet].lon);
                        $('#facetview_geoplaceholder_' + rel + ' .facetview_distval_' + rel).attr("value", parseFloat(aquery.geo_distance.distance));

                        dofacetgeo(rel, false);
                        $(".dummytoremove").remove();
                    } else if (key === 'geo_bounding_box') {
                        var rel = '';
                        var facet = '';
                        for (tmp_key in aquery.geo_bounding_box){
                            facet = tmp_key;
                        }
                        for (var i = 0; i < options.facets.length; i++){
                            if (options.facets[i].field === facet){
                                rel = i.toString();
                            }
                        }
                        var geoselect = [
                            '<div id="facetview_geoplaceholder_',
                            rel,
                            '" class="facetview_geocontainer clearfix dummytoremove" style="display:none"> ',
                            '<div class="clearfix">',
                                '<div id="geo-facet-tabs_' + rel +'">',
                                '<input class="facetview_geo_type_'+rel+'" type="text" style="display:none">',
                                '<ul>',
                                    '<li><a href="#geo-distance-tab" class="geo-facet-type">Distance</a></li>',
                                    '<li><a href="#geo-bounding-box-tab" class="geo-facet-type">Bounding Box</a></li>',
                                '</ul>',
                                '<div id="geo-distance-tab">',
                                    '<span>latitude</span><input class="facetview_latval_'+rel+'" type="text"><br/>',
                                    '<span>longitude</span><input class="facetview_lonval_'+rel+'" type="text"><br/>',
                                    '<span>distance(km)</span><input class="facetview_distval_'+rel+'" type="text"><br/>',
                                '</div>',
                                '<div id="geo-bounding-box-tab">',
                                    '<span style="font-weight:bold;">Top Left</span><br/>',
                                    '<span style="padding-left:10px">latitude</span><input class="facetview_latval1_'+rel+'" type="text"><br/>',
                                    '<span style="padding-left:10px">longitude</span><input class="facetview_lonval1_'+rel+'" type="text"><br/>',
                                    '<span style="font-weight:bold;">Bottom Right</span><br/>',
                                    '<span style="padding-left:10px">latitude</span><input class="facetview_latval2_'+rel+'" type="text"><br/>',
                                    '<span style="padding-left:10px">longitude</span><input class="facetview_lonval2_'+rel+'" type="text"><br/>',
                                '</div>',
                            '</div>',
                            '</div></div>'
                        ].join('');
                        $(geoselect).appendTo(".facet-view-simple");
                        $(".facetview_geo_type_"+rel).attr("value", "bounding-box");
                        $('#facetview_geoplaceholder_' + rel + ' .facetview_latval1_' + rel).attr("value", aquery.geo_bounding_box[facet].top_left.lat);
                        $('#facetview_geoplaceholder_' + rel + ' .facetview_lonval1_' + rel).attr("value", aquery.geo_bounding_box[facet].top_left.lon);
                        $('#facetview_geoplaceholder_' + rel + ' .facetview_latval2_' + rel).attr("value", aquery.geo_bounding_box[facet].bottom_right.lat);
                        $('#facetview_geoplaceholder_' + rel + ' .facetview_lonval2_' + rel).attr("value", aquery.geo_bounding_box[facet].bottom_right.lon);

                        dofacetgeo(rel, false);
                        $(".dummytoremove").remove();
                    }
                }

            }

            function selectrangevalues(rangefacet, from, to){
                var rel = -1;
                for (var i = 0; i < options.facets.length; i++){
                    if (options.facets[i].field === rangefacet){
                        options.facets[i].default_values = [from, to];
                        rel = i.toString();
                    }
                }

                var lowval = from;
                var highval = to;

                var range = ' <span class="facetview_lowrangeval_' + rel + '">' + lowval + '</span> <small>to</small><span class="facetview_highrangeval_' + rel + '">' + highval + '</span>';
                var href = "";
                var newobj = [
                    '<div style="display:none;" class="btn-group"',
                    'id="facetview_rangeresults_',
                    rel,
                    '"> ',
                    '<a class="facetview_filterselected facetview_facetrange ',
                    'facetview_clear btn btn-info"',
                    'facettype="range"',
                    ' rel="',
                    rel,
                    '" alt="remove" title="remove" href="',
                    href,
                    '">',
                    range,
                    ' <i class="icon-white icon-remove"></i></a></div>'
                ].join('');

                $('#facetview_selectedfilters', obj).append(newobj);


                var relclean = rel.replace(/\./gi, '_').replace(/\:/gi, '_');

                var myobj = '<div class="facetview_selection"> <a ' +
                        'class="facetview_filterselected facetview_clear btn';
                var operation = $('.facetview_or[href="' + rel + '"]', obj);
                var op_text = 'AND';
                myobj = [myobj,
                         '" ',
                         'facettype="range"',
                         ' rel="',
                         rel,
                         '" alt="remove" title="remove" href="',
                         href,
                         '">',
                         ' <i class="icon-white icon-remove" ',
                         'style="margin-top:1px;"></i></a>',
                         lowval,
                         ' - ',
                         highval,
                         '</div>'
                        ].join('');
                var pobj = [
                            '<div id="facetview_group_',
                            relclean,
                            '" class="btn-group facetview_selected">',
                            myobj,
                            '</div>'
                            ].join('');
                if ($('div.facetview_selected').length) {
                    pobj = '<div class="facet-rel-between"> <a class="btn ' +
                            'btn-small facet_operator"> AND</a></div>' + pobj;
                }

                $('#facetview_selected_filters', obj).append(pobj);
                    if ($('.current-filters:hidden')) {
                    $('.current-filters').show();
                }
                $('.facetview_filterselected[facettype="range"]', obj).unbind('click', clearfacetrange);
                $('.facetview_filterselected[facettype="range"]', obj).bind('click', clearfacetrange);
            }
            if ('filtered' in qrystr) {
                var qrys = [];
                var flts = [];
                var or = false;
                var qryflt = qrystr.filtered;
                if ('query' in qryflt && 'bool' in qryflt.query) {
                    var qrybool = qryflt.query.bool;
                    if ('must' in qrybool) {
                        qrys = qrybool.must;
                    } else if ('should' in qrybool) {
                        qrys = qrybool.should;
                    }
                }
                if ('filter' in qryflt) {
                    var qry_flt = qryflt.filter;
                    if ('missing' in qry_flt && 'field' in qry_flt.missing) {
                        flts = [qry_flt.missing.field];
                    } else if ('bool' in qry_flt && 'should' in qry_flt.bool) {
                        var value = qry_flt.bool.should;
                        if (flts instanceof Array) {
                            ftls = [];
                            var len = value.length;
                            for (var idx = 0; idx < len; idx++) {
                                var curr_flts = value[idx];
                                if ('missing' in curr_flts &&
                                    'field' in curr_flts.missing) {
                                    flts.push(curr_flts.missing.field);
                                } else if (('term' in curr_flts) || ('geo_distance' in curr_flts) || ('geo_bounding_box' in curr_flts)) {
                                    flts.push(curr_flts);
                                    or = true;
                                }
                            }
                            //flts = flts.missing.field;
                        } else {
                            or = true;
                            flts = value;
                        }
                    } else if ('and' in qry_flt) {
                        var andfilter = qry_flt.and;
                        var len = andfilter.length;
                        for (var p = 0; p < len; p++) {
                            or = true;
                            var currflt = andfilter[p];
                            if ('bool' in currflt &&
                                'should' in currflt.bool) {
                                flts.push(currflt.bool.should);
                            } else if ('missing' in currflt &&
                                'field' in currflt.missing) {
                                flts.push(currflt.missing.field);
                            }
                        }
                    }
                }

                for (var qry = 0; qry < qrys.length; qry++) {
                    var curr_qry = qrys[qry];
                    var in_pre = false;
                    for (var p = 0; p < pre_filters.length; p++) {
                        if (JSON.stringify(curr_qry) ===
                            JSON.stringify(pre_filters[p])) {
                            in_pre = true;
                            break;
                        }
                    }
                    if (in_pre)
                        continue;

                    for (var key in curr_qry) {
                        if (key === 'term') {
                            var curr_qry_key = curr_qry[key];
                            for (var t in curr_qry_key) {
                                clickfilterchoice(false, t,
                                    curr_qry_key[t], false);
                            }
                        } else if (key === 'bool') {
                        //TODO: handle sub-bools
                        } else if (key === 'range') {
                            for (var t in curr_qry[key]) {
                                selectrangevalues(t, curr_qry[key][t].from, curr_qry[key][t].to);
                            }
                        }
                    }
                }

                for (var flt = 0; flt < flts.length; flt++) {
                    var curr_flt = flts[flt];
                    var in_pre = false;
                    for (var p = 0; p < pre_filters.length; p++) {
                        if (JSON.stringify(curr_flt) ===
                            JSON.stringify(pre_filters[p])) {
                            in_pre = true;
                            break;
                        }
                    }
                    if (in_pre)
                        continue;

                    if (or) {
                        if (curr_flt instanceof Array) {
                            for (var id = 0; id < curr_flt.length; id++) {
                                clickfacetvalues(curr_flt[id], or);
                            }
                        } else if (typeof curr_flt === 'string') {
                            clickfilterchoice(false, curr_flt,
                                'undefined', true);
                        } else {
                            clickfacetvalues(curr_flt, or);
                        }
                    } else {
                        if (curr_flt instanceof Array) {
                            for (var id = 0; id < curr_flt.length; id++) {
                                clickfacetvalues(curr_flt[id], or);
                            }
                        } else if (typeof curr_flt === 'string') {
                            clickfilterchoice(false, curr_flt,
                                'undefined', false);
                        } else {
                            //TODO: Decide what to do for unknown options
                        }
                    }
                }
            } else {
                if ('bool' in qrystr) {
                    var qrys = [];
                    // TODO: check for nested
                    if ('must' in qrystr.bool) {
                        qrys = qrystr.bool.must;
                    } else if ('should' in qrystr.bool) {
                        qrys = qrystr.bool.should;
                    }
                    for (var qry = 0; qry < qrys.length; qry++) {
                        var curr_qry = qrys[qry];
                        var in_pre = false;
                        for (var p = 0; p < pre_filters.length; p++) {
                            if (JSON.stringify(curr_qry) ===
                                JSON.stringify(pre_filters[p])) {
                                in_pre = true;
                                break;
                            }
                        }
                        if (in_pre)
                            continue;

                        for (var key in curr_qry) {
                            if (key == 'term') {
                                for (var t in curr_qry[key]) {
                                    clickfilterchoice(false, t,
                                        curr_qry[key][t], false);
                                }
                            } else if (key === 'range') {
                                for (var t in curr_qry[key]) {
                                    selectrangevalues(t, curr_qry[key][t].from, curr_qry[key][t].to);
                                }
                            } else if (key == 'query_string') {
                                typeof(curr_qry[key]['query']) === 'string' ?
                                    options.q = curr_qry[key]['query'] : '';
                            } else if (key == 'bool') {
                                // TODO: handle sub-bools
                            }
                        }
                    }
                } else if ('query_string' in qrystr) {
                    typeof(qrystr.query_string.query) === 'string' ?
                        options.q = qrystr.query_string.query : '';
                }
            }
        };

        // show the current url with the result set as the source param
        var sharesave = function(event) {
            event.preventDefault();
            $('.facetview_sharesavebox', obj).toggle();
        };

        // adjust the search field focus
        var searchfield = function(event) {
            event.preventDefault();
            options.paging.from = 0;
            dosearch();
        };

        // a help box for embed in the facet view object below
        var thehelp = [
            '<div id="facetview_learnmore" ',
            'class="well" style="margin-top:10px; ',
            'display:none;">'
        ].join('');
        options.sharesave_link ?
            thehelp += '<p><b>Share</b> or <b>save</b> the current search ' +
                'by clicking the share/save arrow button on the right.</p>' :
            '';
        thehelp = [
            thehelp,
            '<p><b>Remove all</b> search values and settings by clicking the ',
            '<b>X</b> icon at the left of the search box above.</p> ',
            '<p><b>Partial matches with wildcard</b> can be performed by using',
            ' the asterisk <b>*</b> wildcard. For example, <b>einste*</b>, ',
            '<b>*nstei*</b>.</p> <p><b>Fuzzy matches</b> can be performed ',
            'using tilde <b>~</b>. For example, <b>einsten~</b> may help find',
            ' <b>einstein</b>.</p> <p><b>Exact matches</b> can be performed ',
            'with <b>"</b> double quotes. For example <b>"einstein"</b> or ',
            '<b>"albert einstein"</b>.</p> <p>Match all search terms by ',
            'concatenating them with <b>AND</b>. For example <b>albert AND ',
            'einstein</b>.</p> <p>Match any term by concatenating them with ',
            '<b>OR</b>. For example <b>albert OR einstein</b>.</p> <p><b>',
            'Combinations</b> will work too, like <b>albert OR einste~</b>, or',
            ' <b>"albert" "einstein"</b>.</p> <p><b>Result set size</b> can ',
            'be altered by clicking on the result size number preceding the ',
            'search box above.</p>'
        ].join('');
        if (options.searchbox_fieldselect.length > 0) {
            thehelp += [
                '<p>By default, terms are searched for across entire record ',
                'entries. This can be restricted to particular fields by ',
                'selecting the field of interest from the <b>search field',
                '</b> dropdown</p>'
            ].join('');
        }
        if (options.search_sortby.length > 0) {
            thehelp = [
                thehelp,
                '<p>Choose a field to <b>sort the search results</b> ',
                'by clicking the double arrow above.</p>'
            ].join('');
        }
        if (options.facets.length > 0) {
            thehelp = [
                thehelp,
                '<hr></hr>',
                '<p>Use the <b>filters</b> on the left to directly select ',
                'values of interest. Click the filter name to open the list ',
                'of available terms and show further filter options.</p> ',
                '<p><b>Filter list size</b> can be altered by clicking on the ',
                'filter size number.</p> <p><b>Filter list order </b> can be ',
                'adjusted by clicking the order options - from a-z ascending ',
                'or descending, or by count ascending or descending.</p> ',
                '<p>Filters search for unique values by default; to do an ',
                '<b>OR</b> search - e.g. to look for more than one value ',
                'for a particular filter - click the OR button for the ',
                'relevant filter then choose your values.</p> <p>To further ',
                'assist discovery of particular filter values, use in ',
                'combination with the main search bar - search terms entered ',
                'there will automatically adjust the available filter values.',
                '</p>'
            ].join('');
            if (options.enable_rangeselect) {
                thehelp = [
                    thehelp,
                    '<p><b>Apply a filter range</b> rather than just selecting',
                    ' a single value by clicking on the <b>range</b> button. ',
                    'This enables restriction of result sets to within a range',
                    ' of values - for example from year 1990 to 2012.</p> ',
                    '<p>Filter ranges are only available across filter values',
                    ' already in the filter list; so if a wider filter range ',
                    'is required, first increase the filter size then select ',
                    'the filter range.</p>'
                ].join('');
            }
        }
        thehelp = [
            thehelp,
            '<p><a class="facetview_learnmore label" href="#">close the help',
            '</a></p></div>'
        ].join('');

        // the facet view object to be appended to the page
        var thefacetview = [
            '<div id="facetview"><div class="row-fluid">',
            '<div class="facetview_search_options_container span12"> <div ',
            'class="btn-group" style="display:inline-block; margin-right:5px;',
            ' width:100%"> <a class="btn btn-small facetview_learnmore" ',
            'style="float:right" title="click to view search help information"',
            ' href="#"><b>?</b></a><a class="btn btn-small facetview_howmany"',
            ' title="change result set size" href="#">{{HOW_MANY}}</a>'
            ].join('');
        if (options.save_link) {
            thefacetview = [
                thefacetview,
                '<a class="btn facetview_sharesave" title="share or save this',
                ' search" href="" style="float:right"> <i ',
                'class="icon-share-alt"></i></a><div ',
                'class="facetview_sharesavebox alert alert-info" ',
                'style="float:right; display:none; "> <button type="button" ',
                'class="facetview_sharesave close">×</button><p>Share or save',
                ' this search:</p>',
                '<form id="eea_download_form" action="download">',
                ' <textarea name="download_query" class="facetview_sharesaveurl download_query" ',
                'style="width:100%;height:100px;">http://',
                window.location.host,
                window.location.pathname,
                '?source=',
                options.querystring,
                '</textarea>',
                '<input type="hidden" name="download_format"/>',
                '</form>',
                ' </div>',
                thehelp
            ].join('');
        }

        thefacetview = [
            thefacetview,
            '<div style="clear:both;" class="btn-toolbar" ',
            'id="facetview_selectedfilters"></div>',
            '</div></div><div class="span12" style="margin-left:0px">'
            ].join('');

        if (options.facets.length > 0 || options.static_filters.length > 0) {
            thefacetview = [
                thefacetview,
                '<div class="span3 right-column-area eea-section eea-right-section" style="margin-left:0px">',
                '<div id="facetview_filters"><h2>Filter your results</h2>',
                '</div><div class="current-filters" style="display:none">',
                '<div class="filters-header">',
                '<strong>Current filters</strong><small> ',
                '<a class="clear-all" href="{{REFRESH}}">Clear all</a></small>',
                ' </div> <div class="facetview-filter-values" ',
                'id="facetview_selected_filters"></div></div>',
                '<div id="facetview_trees" style="padding-top:0px;">',
                '</div></div><div class="span9" id="facetview_rightcol">',
                '<input type="text" class="facetview_freetext span9" ',
                'style="display:block; margin-left:auto; margin-right: auto; ',
                'background:',
                options.searchbox_shade,
                '; name="q" value="" placeholder="search term" />'
            ].join('');
        } else {
            thefacetview += [
                '<div class="span12" id="facetview_rightcol">',
                '<input type="text" class="facetview_freetext span11" ',
                'style="display:block; margin-left:auto; margin-right: auto; ',
                'background:',
                options.searchbox_shade,
                '; name="q" value="" placeholder="search term" />'
                ].join('');
        }

        thefacetview += '<div class="facetview_top">' +
            '<div class="top-pagination">';
        if (options.pager_on_top) {
            thefacetview += '<div class="facetview_metadata"/>';
        }
        thefacetview += '</div><div class="order-by">';

        if (options.search_sortby.length >= 0) {
            thefacetview = [
                thefacetview,
                '<span class="orderby">Order by &nbsp;</span>',
                '<select class="facetview_orderby">',
                '<option value="">Relevance</option> '
            ].join('');
            for (var each = 0; each < options.search_sortby.length; each++) {
                var selectThis = false;
                var obj = options.search_sortby[each];
                var order = undefined;
                if (!options.selected_sort &&
                    options.sort[0][obj['field']] != undefined &&
                    options.sort[0][obj['field']]['order'] != undefined) {
                        selectThis = true;
                        order = options.sort[0][obj['field']]['order'];
                }
                var sortAsc = obj['display_asc'] ||
                              (obj['display'] + ' ascending');
                var sortDesc = obj['display_desc'] ||
                               (obj['display'] + ' descending');
                thefacetview += [
                    '<option value="',
                    obj['field'],
                    '" href="asc" ',
                    selectThis && order == 'asc' ? 'selected=""' : '',
                    '> ',
                    sortAsc,
                    ' </option> <option value="',
                    obj['field'],
                    '" href="desc" ',
                    selectThis && order == 'desc' ? 'selected=""' : '',
                    '> ',
                    sortDesc,
                    ' </option>'
                ].join('');
            }
            thefacetview += '</select>';
        }

        thefacetview += '</div>'; /* /span3 */

        thefacetview += '<div class="notify_loading"></div>';


        if (options.searchbox_fieldselect.length > 0) {
            thefacetview = [
                thefacetview,
                '<select class="facetview_searchfield" ',
                ';"><option value="">search all</option>'
            ].join('');
            var field_len = options.searchbox_fieldselect.length;
            for (var each = 0; each < field_len; each++) {
                var obj = options.searchbox_fieldselect[each];
                thefacetview = [
                    thefacetview,
                    '<option value="',
                    obj['field'],
                    '">',
                    obj['display'],
                    '</option>'
                ].join('');
            }
            thefacetview += '</select>';
        }

        thefacetview += options.searchwrap_start + options.searchwrap_end;
        thefacetview += '<div class="facetview_metadata">' +
            '</div></div></div></div></div>';

        var obj = undefined;

        // ===============================================
        // now create the plugin on the page
        return this.each(function() {
            // get this object
            obj = $(this);

            // what to do when ready to go
            var whenready = function() {
                // append the facetview object to this object
                thefacetview = thefacetview.replace(
                    /{{HOW_MANY}}/gi,
                    options.paging.size);

                var href = window.location.origin + window.location.pathname;
                thefacetview = thefacetview.replace(/{{REFRESH}}/gi, href);
                obj.append(thefacetview);
                !options.embedded_search ?
                    $('.facetview_search_options_container', obj).hide() : '';


                var filter_div = $('<div class="eea-section-trigger pull-right"><a href="#">Filters <span class="eea-icon eea-icon-bars"></span></a></div>');
                filter_div.insertAfter('.top-pagination');


                // bind learn more and how many triggers

                $('.facetview_learnmore', obj).bind('click', learnmore);
                $('.facetview_howmany', obj).bind('click', howmany);
                $('.facetview_searchfield', obj).bind('change', searchfield);
                $('.facetview_orderby', obj).bind('change', orderby);
                if (options.save_link) {
                    var html = [
                        '<div ',
                        'class="facetview_sharesavebox alert alert-info" ',
                        'style="float:right; display:none; "> <button type="button" ',
                        'class="facetview_sharesave close">×</button><p>Share or save',
                        ' this search:</p> <textarea class="facetview_sharesaveurl" ',
                        'style="width:100%;height:100px;">http://',
                        window.location.host,
                        window.location.pathname,
                        '?source=',
                        options.querystring,
                        '</textarea></div>'
                        ].join('');
                    $('.facet-share').appendTo(".share-panel");

                    $('.facet-share').append(html);
                    $('.facetview-share').bind('click', sharesave);
                } else {
                    $('.facetview_sharesave', obj).bind('click', sharesave);
                }


                // check paging info is available
                !options.paging.size && options.paging.size != 0 ?
                    options.paging.size = 10 : '';
                !options.paging.from ? options.paging.from = 0 : '';

                // handle any source options
                if (options.source) {
                    parsesource();
                    delete options.source;
                }

                // set any default search values into the search bar and create
                // any required filters
                if (options.searchbox_class.length === 0) {
                    var q = options.q.trim();
                    var wildc = options.default_freetext_fuzzify;
                    if (wildc != undefined) {
                        var indexof = q.indexOf(wildc);
                        var wildchars = wildc.length;
                        if (indexof === 0) {
                            q = q.slice(1);
                        }
                        if (indexof + wildchars === q.length) {
                            q = q.slice(0, - wildchars);
                        }
                    }

                    options.q != '' ?
                        $('.facetview_freetext', obj).val(q) : '';
                    buildfilters();
                    $('.facetview_freetext', obj).bindWithDelay(
                        'keyup',
                        do_special_search,
                        options.freetext_submit_delay);
                } else {
                    options.q != '' ?
                        $(options.searchbox_class).last().val(options.q) : '';
                    buildfilters();
                    $(options.searchbox_class).bindWithDelay(
                        'keyup',
                        dosearch,
                        options.freetext_submit_delay);
                }

                options.source || options.initialsearch ? dosearch() : '';

            };

            // check for remote config options, then do first search
            if (options.config_file) {
                $.ajax({
                    type: 'get',
                    url: options.config_file,
                    dataType: 'jsonp',
                    success: function(data) {
                        options = $.extend(options, data);
                        whenready();
                    },
                    error: function() {
                        $.ajax({
                            type: 'get',
                            url: options.config_file,
                            success: function(data) {
                                options = $.extend(options, $.parseJSON(data));
                                whenready();
                            },
                            error: function() {
                                whenready();
                            }
                        });
                    }
                });
            } else {
                whenready();
            }

            if (options.post_init_callback) {
                options.post_init_callback();
            }

        }); // end of the function


    };


    // facetview options are declared as a function so that they can be
    // retrieved externally (which allows for saving them remotely etc)
    $.fn.facetview.options = {};

})(jQuery);

$(document).ready(function($){
    $(this).delegate(".eea_download_btn","click", function(event){
        event.preventDefault();
        $("input[name='download_format']").attr("value",  $(this).attr("download_type"));
        $("#eea_download_form").submit();
    })
});

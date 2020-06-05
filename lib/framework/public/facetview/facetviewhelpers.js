/* eslint-disable no-unused-vars,no-constant-condition */
/*global $, jQuery, field_base, eea_mapping */

function markNavigationTab(label) {
    if ((label !== '') && (label !== undefined)){
        $("#portaltab-" + label).removeClass("plain").addClass("eea-nav-current")
    }
}

function add_EEA_settings() {
    //Accordion settings
    $('#facetview_trees')
        .addClass('eea-accordion-panels collapsed-by-default non-exclusive');
    $('.facetview_filter').addClass('eea-accordion-panel');
    $('.facetview_showtree').addClass('notoc eea-icon-right-container');
    $('.facetview_arrow_right').addClass('eea-icon eea-icon-right');
    //Remove results button
    $('.facetview_howmany').hide();
    //Remove facetview help
    $('.facetview_learnmore').hide();
    //Remove share button
    $('.facetview_sharesave').hide();
    //replace share icon
    $('.icon-share-alt').addClass('eea-icon eea-icon-share-alt');
    $('.eea-icon-share-alt').removeClass('icon-share-alt');
    $('.share-icon').addClass('eea-icon eea-icon-share-alt');
    //replace remove icon
    $('.icon-remove').addClass('eea-icon eea-icon-times');
    $('.eea-icon-times').removeClass('icon-remove');
    $('.eea-icon-times').removeClass('hidden');
    //change pagination
    $('.pagination').addClass('paginator listingBar');
    //Change top pagination
    var results = $($('.pagination').find('.active')[0]).text(), //x-y of z
        split = results.split(' of ');
    if (split.length === 2) {
        var html = [
            '<span class="default_pagination">',
            '<span class="results i18n" i18n-variable="App_Word(Results)" i18n-change="html">Results</span> ',
            split[0],
            ' <span class="i18n" i18n-variable="App_Word(Of)" i18n-change="html">of</span> ',
            '<strong class="eea_results_count">',
            split[1],
            '</strong></span>'].join('');
        $('.top-pagination').html(html);
    } else {
        $('.top-pagination').html('');
    }
    updateCurrentFacetsCounter();
}

function updateCurrentFacetsCounter(){
    $(".filters-header__counter").text($(".facetview-filter-values").find(".facetview_clear").length);
}

function buildFacets(mapping_facets) {
    var range_facets = [],
        rangehistogram_facets = [],
        aggregation_options = [],
        geo_facets = [],
        facets = [];
    for (var i = 0; i < mapping_facets.length; i++){
        var facet = mapping_facets[i];

        if (facet.type === 'range'){
            range_facets.push(field_base + facet.name);
            facet.order = 'term';
            facet.size = 10000000;
        }
        if(facet.type === 'rangehistogram'){
            rangehistogram_facets.push(field_base + facet.name);
            facet.order = 'term';
            facet.size = 10000000;
        }
        if(facet.type === 'aggregation_options'){
            aggregation_options.push(field_base + facet.name);
        }
        if (facet.type === 'geo'){
            geo_facets.push(field_base + facet.name);
            facet.size = 2;
        }
        if (facet.type === 'facet'){
            facet.size = Math.min(facet.size, 1000);
        }

        var facet_obj = {
            field: field_base + facet.name,
            display: facet.title,
            size: facet.size,
            order: facet.order,
            facet_display_options: facet.facet_display_options,
            default_values: facet.default_values,
            autocomplete_placeholder: facet.autocomplete_placeholder,
            empty_message: facet.empty_message,
            short_name: facet.short_name,
            fixed_order: facet.fixed_order,
            allow_exact: facet.allow_exact,
            values_whitelist: facet.values_whitelist,
            values_blacklist: facet.values_blacklist,
            type: facet.type,
            autocomplete: facet.autocomplete,
            chart_config: facet.chart_config || null,
            interval: facet.interval || null,
            histogram_config: facet.histogram_config || null,
            aggregation_options: facet.groups || null
        };

        if (facet.operator !== undefined){
            facet_obj.operator = facet.operator;
        }
        facets.push(facet_obj);
    }

    return {range_facets: range_facets,rangehistogram_facets: rangehistogram_facets,
        geo_facets: geo_facets, facets: facets,
        aggregation_options: aggregation_options};
}

function buildListing(mapping_listing) {
    var result_display = [];
    for (var i = 0; i < mapping_listing.length; i++){
        var listing = mapping_listing[i];
        var display = {
            pre : '<td>',
            field : field_base + listing.name,
            post: '</td>'
        };
        if (listing.display !== undefined){
            display = listing.display;
            display.field = field_base + display.field;
        }
        result_display.push(display);
    }
    return result_display;
}

function buildHeaders(mapping_listing) {
    var headers = "";
    for (var i = 0; i < mapping_listing.length; i++){
        var listing = mapping_listing[i];
        if ((listing.title !== "") && (listing.title !== undefined)){
            var header_width = "";
            if ((listing.width !== "") && (listing.width !== undefined)) {
                header_width = "style  = 'width:" + listing.width + "'";
            }
            headers += "<th class='i18n' i18n-variable='Table_Header(" + listing.title + ")' i18n-change='title' title='" + listing.title + "'><div "+ header_width+"class='i18n' i18n-variable='Table_Header(" + listing.title + ")' i18n-change='html' >" + listing.title + "</div></th>";
        }
    }
    return headers;
}

function addHeaders(element) {
    var headers = buildHeaders(eea_mapping.listing);

    $(element).append("<thead><tr>" + headers +  "</tr></thead>");

    $.each($(element).find("th div"), function(idx, header){
        while (true){
            var visibleWidth = $(header).width();
            var visibleHeight = $(header).height();
            var scrollWidth = $(header)[0].scrollWdith;
            var scrollHeight = $(header)[0].scrollHeight;

            if ((scrollHeight > visibleHeight) || (scrollWidth > visibleWidth)){
                $(header).text($(header).text().substr(0, $(header).text().length - 4) + "...");
                continue;
            }
            else {
                break;
            }
        }
    });
}

if (window.NodeList && !NodeList.prototype.forEach) {
    NodeList.prototype.forEach = function (callback, thisArg) {
        thisArg = thisArg || window;
        for (var i = 0; i < this.length; i++) {
            callback.call(thisArg, this[i], i, this);
        }
    };
}
function fixDataTitles() {
    var th_list = [];
    var facet_results = document.getElementById("facetview_results");
    if (!facet_results) {
        return;
    }
    facet_results.style.display = 'none';
    var ths = facet_results.querySelectorAll("th");
    ths.forEach(function(th){
        th_list.push(th.innerText);
    });
    facet_results.querySelectorAll('tr').forEach(function(tr){
        tr.querySelectorAll("td").forEach(function(td, td_idx){
           // data-title is used on mobile views to set column name to the left of the data
           if (td.innerText.length) {
               td.setAttribute('data-title', th_list[td_idx]);
               td.title = td.innerText;
               td.innerHTML = "<span class='results_text'>" + td.innerHTML + "</span>";
           }
        });
    });
    facet_results.style.display = 'block';
}

function replaceNumbers() {
    var possibleContainers = ['.results_text', '#facetview_results th div'];
    var chemsMapping = {'CH4':'CH<sub>4</sub>',
                        'CO2':'CO<sub>2</sub>',
                        'SO2':'SO<sub>2</sub>',
                        'O3':'O<sub>3</sub>',
                        'N2O':'N<sub>2</sub>O',
                        'NO2':'NO<sub>2</sub>',
                        'NOx':'NO<sub>x</sub>',
                        'NH3':'NH<sub>3</sub>',
                        'C6H6':'C<sub>6</sub>H<sub>6</sub>',
                        'SF6':'SF<sub>6</sub>'};
    jQuery.each(possibleContainers, function(idx, container){
        var elems = jQuery(container);
        jQuery.each(elems, function(idx, elem){
            var shouldReplace = false;
            var replacedText = elem.innerHTML;
            jQuery.each(chemsMapping, function(key, value){
                if (replacedText.indexOf(key) !== -1){
                    replacedText = replacedText.split(key).join(value);
                    shouldReplace = true;
                }
            });
            if (shouldReplace){
                elem.innerHTML = replacedText;
            }
        });
    });
}

function addExactOnCurrentFacets(){
    var hasExact = false;
    $(".facetview_selected:visible").each(function(){
        var $selected_filter = $(this).find(".facetview_filterselected");
        var id = $selected_filter.attr("rel");
        var $header = $("#facetview_trees").find('h2').filter("[id='" + id + "']");
        if ($header.length && !$header.hasClass('facetview_open') && $selected_filter.attr('facettype') !== 'range') {
            $header.click();
        }
        var clean_id = id.replace(/\./gi, '_').replace(/\:/gi, '_');
        var group_id = 'facetview_group_' + clean_id;
        var operator = 'any';
        if ($("a.facetview_or[href='" + id + "']").text().indexOf("all") !== -1){
            operator = 'all';
        }
        var exact = '';
        if ($(".facetview_exact[href='" + id + "']").attr("checked") === "checked"){
            exact = 'exact';
            hasExact = true;
        }

        var text = operator;
        if ((exact !== '') && (exact !== undefined)){
            text = text + ", " + exact;
        }
        $('[id="' + group_id + '"]').find(".facetview_group_title").find("span").not('.title').text("(Match: " + text +")").addClass("i18n").attr("i18n-variable", "App_Sentence(Match: " + text + ")").attr("i18n-change", "html");
    });
    if (hasExact){
        $("[name='exact_results'][value='exact']").prop("checked", "checked");
    }
}
function viewReady() {
    //generic method called usually post search
    addHeaders("#facetview_results");
    fixDataTitles();
    addExactOnCurrentFacets();
    if ($("#landing").length > 0){
        $("#landing").trigger("results_ready");
    }
    else {
        $(window).trigger("results_ready");
    }
}

function getTodayWithTime() {
    var d = new Date();
    var month = d.getMonth() + 1;
    var day = d.getDate();
    var hour = d.getHours();
    var minute = d.getMinutes();
    var second = d.getSeconds();

    var output = [
      d.getFullYear(),
      '-',
      (month < 10 ? '0' : ''),
      month,
      '-',
      (day < 10 ? '0' : ''),
      day,
      'T',
      (hour < 10 ? '0' : ''),
      hour,
      ':',
      (minute < 10 ? '0' : ''),
      minute,
      ':',
      (second < 10 ? '0' : ''),
      second,
      'Z'
      ].join('');
    return output;
}

function getToday() {
    var d = new Date();
    var month = d.getMonth() + 1;
    var day = d.getDate();

    var output = [
      d.getFullYear(),
      '-',
      (month < 10 ? '0' : ''),
      month,
      '-',
      (day < 10 ? '0' : ''),
      day].join('');
    return output;
}

function toEmpty(v) {
	if((!v) || (v==='') || (typeof(v)==='undefined')) { v = ''; }
	return v;
}

function replace_variables_in_text(text, variables){
    return text.replace(/\$\{(.*?)\}/gi, function(matched) {
        return variables[matched];
    });
}

function get_widget_card(result) {
    var template = $("#card_view_template").attr("value");
    return $(replace_variables_in_text(template, result));
}

function get_widget_list(result) {
    var template = $("#list_view_template").attr("value");
    return $(replace_variables_in_text(template, result));
}

var displayFields = {
    'title': null,
    'description': null,
    'url': null,
    'date': null,
    'topics': null,
    'types': null
};

function buildDisplayFields(mapping_struct, mapping_display) {
    var display_fields = $.extend({}, mapping_struct);
    for (var i = 0; i < mapping_display.length; i++){
        var display_field = mapping_display[i];
        display_fields[display_field.field] = {'field': display_field.name, 'default': display_field.default, "type": display_field.type};
    }
    return display_fields;
}

function getDisplayFieldValue(element, display_fields, attr) {
    var v = null;
    var display_field = display_fields[attr];
    if (display_field!==null) {
        v = element[display_field.field];
        if((v===null) || (typeof(v)==='undefined') || (($.isArray(v)) && (v.length === 0))) { v = display_field['default']; }
    }
    return toEmpty(v);
}

function simpleValue(value){
    if ($.isArray(value)){
        value = value[0];
    }
    return value;
}

function get_image(target, element, templateVariables, rule){
    var img_vars = {};
    var img_template;
    var img_var;
    var img_var_value;
    for (var img_var_count = 0; img_var_count < rule[target].variables.length; img_var_count++) {
        img_template = rule[target].template;
        img_var = rule[target].variables[img_var_count];
        if (img_var.type === "field") {
            img_var_value = element[img_var.field];
        }
        if (img_var.type === "variable") {
            img_var_value = templateVariables[img_var.variable];
        }
        img_vars["${" + img_var.name + "}"] = img_var_value;
    }
    return replace_variables_in_text(img_template, img_vars);
}

function showRelevanceDebug(){
    $('#relevanceDebug').remove();
    var previousRelevance = window.try_settings_relevance || window.settings_relevance;
    $('<div id="relevanceDebug">' +
            '<span style="font-weight:bold">' +
                'Relevance configuration:' +
            '</span>' +
            '<div style="clear:both"></div>' +
            '<textarea rows="35" style="width:50%;float:left">' +
                JSON.stringify(previousRelevance, null, 4) +
            '</textarea>' +
            '<span style="padding-left:10px;width:45%;float:left">'+
            '<h3>Hints</h3>'+
            '<h4>Explanation of elastic score</h4>'+
                '<b>boost_mode</b><br/>' +
                    '<span style="padding-left:20px">sum</span><br/>' +
                        '<span style="padding-left:40px">sum</span><br/>' +
                            '<span style="padding-left:60px">max</span><br/>' +
                                '<span style="padding-left:80px"><b>fields_boosting</b></span><br/>'+
                            '<span style="padding-left:60px">extra scores from query</span><br/>'+
                        '<span style="padding-left:40px">extra scores from query</span><br/>'+
                    '<span style="padding-left:20px"><b>score_mode</b></span><br/>'+
                        '<span style="padding-left:40px"><b>functions</b></span><br/>'+
                        '<span style="padding-left:40px"><b>facet_decay_functions</b></span><br/>'+
            '<h4>fields_boosting</h4>' +
                'Specify the weight of each field. The biggest value will be used for calculating the score'+
            '<h4>functions</h4>' +
                'Functions for specific fields, the operator from score_mode will be used on these results' +
            '<h4>score_mode</h4>' +
                'Available values: multiply, sum, avg, first, max, min' +
            '<h4>boost_mode</h4>' +
                'Specifies the operator to be used for the result of '+
                '<b>Fields boosting</b> and <b>Functions</b><br/>'+
                'Available options: multiply, replace, sum, avg, max, min'+
            '<h4>facet_decay_functions</h4>' +
                'Specify extra decay functions for the case when a facet is used'+
            '</span>'+
            '<div style="clear:both"></div>' +
            '<input type="button" value="Try the new relevance configuration" onclick="tryRelevance()">' +
            '</input>' +
    '</div>').insertBefore("#facetview_results_wrapper");
}

function tryRelevance(){
    try{
        window.try_settings_relevance = JSON.parse($("#relevanceDebug textarea").attr('value'));
        $('.facet-view-simple').facetview.dosearch();
    }
    catch (e){
        alert ("Not a valid JSON");
    }
}

function display_results(display_fields, $results, widget_callback, resultModifier) {
    var data = $.fn.facetview.options.data;
    for (var i = 0; i < data.records.length; i++) {
        var element = data.records[i];

        var templateVariables = {};

        $.each(display_fields, function(key, value){
            templateVariables[key] = getDisplayFieldValue(element, display_fields, key);
            if (value){
                if ((value.type === "simple") || (value.type === "date")){
                    templateVariables[key] = simpleValue(templateVariables[key]);
                }
                if (value.type === "list"){
                    if (!(templateVariables[key] instanceof Array)){
                        templateVariables[key] = [templateVariables[key]];
                    }
                }
            }
        });
        if (resultModifier !== undefined){
            templateVariables = resultModifier(element, templateVariables);
        }

        var result = {};

        $.each(templateVariables, function(key, value){
            if (value instanceof Array){
                value = value.join(', ');
            }
            result['${' + key + '}'] = value;
            result['${' + key + '_text}'] = $("<div>"+value+"</div>").text();
        });

        var $result = $(widget_callback(result));
        $result.find('img').load(function() {
            var aspectRatio = this.naturalWidth / this.naturalHeight;
            if (aspectRatio >= 16 / 9) {
              $(this).addClass('img-wider');
            } else {
              $(this).addClass('img-narrower');
            }
        });
        if (window.isInDebugMode){
            $result.append("<div class='explanation'></div>");
            var $table = $result.find(".explanation").append("<table></table")
            Object.keys(element._explanation).forEach(function(value){
                if (value !== 'formula'){
                    $table.append("<tr><td>" + element._explanation[value].boost + "</td><td style='font-weight:bold'>" + element._explanation[value].value + "</td></tr>");
                }
            })
            $result.find(".explanation").append("<span style='font-weight:bold'>Details</span>");
            var $expl_tree = $('<div></div>').jstree({ 'core' : {
                'themes':{"icons":false},
                'data' : element._explanation.formula
                }
            });

            $result.find(".explanation").append($expl_tree)
        }
        $results.append($result);
    }
    $('#facetview_results_wrapper').append($results);

    if (window.isInDebugMode){
        showRelevanceDebug();
    }
}

function eea_facetview(element, options){
    var translation = window.settings_translation;
    var mapping_facets = eea_mapping.facets;
    var mapping_listing = eea_mapping.listing;

    var facets = buildFacets(mapping_facets);
    var listing = buildListing(mapping_listing);

    options.facets = facets.facets;
    options.rangefacets = facets.range_facets;

    options.rangehistogramfacets = facets.rangehistogram_facets;
    options.aggregation_options = facets.aggregation_options;
    options.geofacets = facets.geo_facets;
    options.fields_card = buildDisplayFields(displayFields, eea_mapping.card);
    options.fields_list = buildDisplayFields(displayFields, eea_mapping.list);

    options.result_display = [listing];

    if (translation && translation.enabled) {
        $.fn.i18nProcess()
            .then(function() {
                $('.facet-view-simple').facetview(options);
            })
    } else {
        $('.facet-view-simple').facetview(options);
    }
    $(".current-filters-collapsible").click(function(el){
        if ($(el.target).closest("a").length === 0){
            $(".facetview-filter-values").slideToggle("fast")
            $(".filters-header__header").toggleClass("facetview_open");
        }
    })
}

function uniqueArray( ar ) {
    var j = {};

    ar.forEach( function(v) {
        j[v+ '::' + typeof v] = v;
    });

    return Object.keys(j).map(function(v){
        return j[v];
    });
}

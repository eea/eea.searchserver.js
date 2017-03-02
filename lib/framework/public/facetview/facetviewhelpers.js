/*global $, jQuery, eea_mapping, field_base */

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
    //change pagination
    $('.pagination').addClass('paginator listingBar');
    //Change top pagination
    var results = $($('.pagination').find('.active')[0]).text(), //x-y of z
        split = results.split(' of ');
    if (split.length === 2) {
        var html = [
            '<span>Results ',
            split[0],
            ' of <strong class="eea_results_count">',
            split[1],
            '</strong></span>'].join('');
        $('.top-pagination').html(html);
    } else {
        $('.top-pagination').html('');
    }
}

function buildFacets(mapping_facets) {
    var range_facets = [],
        geo_facets = [],
        facets = [];
    for (var i = 0; i < mapping_facets.length; i++){
        var facet = mapping_facets[i];
        if (facet.type === 'range'){
            range_facets.push(field_base + facet.name);
            facet.size = 10000000;
        }
        if (facet.type === 'geo'){
            geo_facets.push(field_base + facet.name);
            facet.size = 2;
        }
        if (facet.type === 'facet'){
            facet.size = Math.min(facet.size, 100);
        }
        var facet_obj = {
            field: field_base + facet.name,
            display: facet.title,
            size: facet.size,
            order: facet.order,
            facet_display_options: facet.facet_display_options,
            default_values: facet.default_values,
            desctext: facet.desctext,
            allow_exact: facet.allow_exact,
            values_whitelist: facet.values_whitelist,
            values_blacklist: facet.values_blacklist,
            type: facet.type
        };
        if (facet.operator !== undefined){
            facet_obj.operator = facet.operator;
        }
        facets.push(facet_obj);

    }
    return {range_facets: range_facets, geo_facets: geo_facets, facets: facets};
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
            headers += "<th  title='" + listing.title + "'><div "+ header_width+" >" + listing.title + "</div></th>";
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

function fixDataTitles() {
    var th_list = [];
    $("#facetview_results thead th").each(function(idx, th){
        th_list.push($(th).text());

    });
    $("#facetview_results tr").each(function(tr_idx, tr){
        $(tr).find("td").each(function(td_idx, td){
            $(td).attr("data-title", th_list[td_idx]);
        });
    });
}

function replaceNumbers() {
    var possibleContainers = ['a', 'td', 'th'];
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
            if ((jQuery(elem).children().length === 0) || (container === 'a')){
                var shouldReplace = false;
                var replacedText = jQuery(elem).html();
                jQuery.each(chemsMapping, function(key, value){
                    if (replacedText.indexOf(key) !== -1){
                        replacedText = replacedText.split(key).join(value);
                        shouldReplace = true;
                    }
                });
                if (shouldReplace){
                    jQuery(elem).html(replacedText);
                }
            }
        });
    });
}

function addExactOnCurrentFacets(){
    var hasExact = false;
    $(".facetview_selected:visible").each(function(){
        var id = $(this).find(".facetview_filterselected").attr("rel");
        var clean_id = id.replace(/\./gi, '_').replace(/\:/gi, '_');
        var group_id = 'facetview_group_' + clean_id;
        var operator = 'any';
        if ($('[id="' + group_id + '"]').find(".facetview_group_title").find("span").text().indexOf("all") !== -1){
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
        $('[id="' + group_id + '"]').find(".facetview_group_title").find("span").text(" (Match: " + text +")");
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
    $("#landing").trigger("results_ready");
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
        if((v===null) || (typeof(v)==='undefined')) { v = display_field['default']; }
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

function display_results(display_fields, $results, widget_callback) {
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
        templateVariables.contentType = 'generic';
        var contentTypes = {};

        if (eea_mapping.types !== undefined){
            if (eea_mapping.types.defaultContentType !== undefined){
                templateVariables.contentType = eea_mapping.types.defaultContentType;
            }
            if (eea_mapping.types.contentTypeNormalize !== undefined){
                contentTypes = eea_mapping.types.contentTypeNormalize;
            }
        }

        templateVariables.type = '';
        templateVariables.typeClass = '';

        if (!$.isArray(templateVariables.types)){
            templateVariables.types = [templateVariables.types];
        }

        if (templateVariables.types.length>0) {
            var pos = templateVariables.types.length - 1;
            while(true){
                templateVariables.type = templateVariables.types[pos];
                templateVariables.typeClass = templateVariables.type.toLowerCase().replace(/\s/g, '-');
                if (contentTypes[templateVariables.typeClass]){
                    templateVariables.contentType = contentTypes[templateVariables.typeClass];
                    break;
                }
                pos--;
                if (pos < 0){
                    break;
                }
            }
        }
        if ((eea_mapping.types !== undefined) && (eea_mapping.types.images !== undefined) && (eea_mapping.types.images.rules !== undefined)){
            if (eea_mapping.types.images.fallback_thumb !== undefined){
                templateVariables.thumbUrl = eea_mapping.types.images.fallback_thumb;
            }
            if (eea_mapping.types.images.fallback_icon !== undefined){
                templateVariables.typeIcon = eea_mapping.types.images.fallback_icon;
            }
            var found_rule_for_resource = false;
            for (var rule_count = 0; rule_count < eea_mapping.types.images.rules.length; rule_count++){
                if (!found_rule_for_resource){
                    var rule = eea_mapping.types.images.rules[rule_count];
                    var field_for_rule = simpleValue(element[rule.field]);
                    var compare_result = false;
                    if (rule.rule === 'startsWith'){
                        compare_result = (field_for_rule.startsWith(rule.value));
                    }
                    if (rule.rule === 'contains'){
                        if (field_for_rule.indexOf(rule.value) !== -1){
                            compare_result = true;
                        }
                    }
                    if (rule.operator === 'not'){
                        compare_result = !compare_result;
                    }
                    found_rule_for_resource = compare_result;
                    if (found_rule_for_resource){
                        templateVariables.thumbUrl = get_image("thumb_template", element, templateVariables, rule);
                        templateVariables.typeIcon = get_image("icon_template", element, templateVariables, rule);
                    }
                }
            }
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

        $results.append($result);
    }
    $('#facetview_results_wrapper').append($results);
}

function eea_facetview(element, options){
    var mapping_facets = eea_mapping.facets;
    var mapping_listing = eea_mapping.listing;

    var facets = buildFacets(mapping_facets);
    var listing = buildListing(mapping_listing);
    options.facets = facets.facets;
    options.rangefacets = facets.range_facets;
    options.geofacets = facets.geo_facets;

    options.fields_card = buildDisplayFields(displayFields, eea_mapping.card);
    options.fields_list = buildDisplayFields(displayFields, eea_mapping.list);

    options.result_display = [listing];
    $('.facet-view-simple').facetview(options);
}

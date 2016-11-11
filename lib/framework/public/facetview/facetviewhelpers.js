/*global $ */

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
            ' of <strong>',
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
        var facet_obj = {
            field: field_base + facet.name,
            display: facet.title,
            size: facet.size,
            order: facet.order,
            facet_display_options: facet.facet_display_options,
            default_values: facet.default_values
        };
        if (facet.operator !== undefined){
            facet_obj.operator = facet.operator
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
        }
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
            var header_width = ""
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
                $(header).text($(header).text().substr(0, $(header).text().length - 4) + "...")
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

    })
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

function viewReady() {
    //generic method called usually post search
    addHeaders("#facetview_results");
    fixDataTitles();
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
	if((!v) || (v=='') || (typeof(v)=='undefined')) v = '';
	return v;
}

function get_widget_card(result) {
    var template = '<div class="eea-tile"> \
        <a class="eea-tileInner" title="${result.title}" href="${result.url}"> \
            <div class="eea-tileThumb" style="background-image: url(${result.thumbUrl})"><img src="${result.thumbUrl}" alt="${result.title}" /></div> \
            <div class="eea-tileBody"> \
                <p class="eea-tileUrl">${result.url}</p> \
                <strong class="eea-tileType" title="${result.type}" style="background-image: url(${result.typeIcon})"><span class="eea-tileTypeIcon eea-tileType-${result.typeClass}" title="${result.type}"></span> ${result.type}</strong> \
                <h4 class="eea-tileTitle">${result.title}</h4> \
                <span class="eea-tileTopic" title="${result.topic}">${result.topic}</span> \
                <time class="eea-tileIssued" datetime="${result.datestamp}">${result.date}</time> \
            </div> \
        </a> \
    </div>';
    return $(
        template.replace(/\$\{(.*?)\}/gi, function(matched) {
            return result[matched];
        })
    );
}

function get_widget_list(result) {
    var template = '<div class="tileItem visualIEFloatFix"> \
        <a title="${result.title}" href="${result.url}" class="tileImage "><img alt="${result.title}" title="${result.title}" src="${result.thumbUrl}" /></a> \
        <div class="tileContent"> \
            <h2 class="tileHeadline" id="data-centre-overview"><a title="${result.title}" class="state-published" href="${result.url}">${result.title}</a></h2> \
            <span class="date">${result.date}</span> \
        <p class="eea-tileUrl">${result.url}</p> \
        </div> \
        <p class="tileBody"><span class="description">${result.description}</span></p> \
        <p class="tileFooter"><a class="moreLink" href="${result.url}">Read more</a></p> \
        <div style="padding-bottom:1.0em;" class="visualClear"><!-- --></div> \
    </div>';
    return $(
        template.replace(/\$\{(.*?)\}/gi, function(matched) {
            return result[matched];
        })
    );
}

var contentTypes = {
    'highlight': 'highlight',
    'press-release': 'pressrelease',
    'news': 'highlight',
    'news-item': 'news-item',
    'event': 'event',
    'promotion': 'generic',
    'article': 'article',
    'eco-tip': 'ecotip',
    'image': 'generic',
    'video': 'cloudvideo',
    'report': 'report',
    'publication': 'report',
    'dataset': 'data',
    'data': 'data',
    'data-visualization': 'davizvisualization',
    'indicator-specification': 'specification',
    'indicator-factsheet': 'assessment',
    'indicator-assessment': 'assessment',
    'infographic': 'interactive-data',
    'briefing': 'fiche',
    'page': 'document',
    'link': 'link',
    'data-file': 'datafile',
    'assessment-part': 'assessmentpart',
    'file': 'file',
    'eea-job-vacancy': 'eeavacancy',
    'epub-file': 'epubfile',
    'external-data-reference': 'externaldataspec',
    'eyewitness-story': 'generic',
    'figure': 'eeafigure',
    'figure-file': 'eeafigurefile',
    'folder': 'folder',
    'gis-map-application': 'gis-application',
    'methodology-reference': 'generic',
    'organization': 'organisation',
    'organisation': 'organisation',
    'policy-question': 'policyquestion',
    'policy-document': 'policydocumentreference',
    'rationale-reference': 'rationalereference',
    'soer-key-fact': 'soerkeyfact',
    'soer-message': 'soermessage',
    'sparql': 'sparql',
    'data-table-via-sparql': 'sparql',
    'speech': 'news-item',
    'text': 'document',
    'work-item': 'generic',
    'collection---old-style ':'topic',
    'legislation-instrument': 'legislation-instrument'
};

var displayFields = {
    'title': null,
    'description': null,
    'url': null,
    'datestamp': null,
    'topics': null,
    'types': null
};

function buildDisplayFields(mapping_struct, mapping_display) {
    var display_fields = $.extend({}, mapping_struct);
    for (var i = 0; i < mapping_display.length; i++){
        var display_field = mapping_display[i];
        display_fields[display_field.field] = {'field': display_field.name, 'default': display_field.default};
    }
    return display_fields;
}

function getDisplayFieldValue(element, display_fields, attr) {
    var v = null;
    var display_field = display_fields[attr];
    if (display_field!=null) {
        v = element[display_field['field']];
        if((v==null) || (typeof(v)=='undefined')) v = display_field['default'];
    }
    return toEmpty(v);
}

function display_results(display_fields, $results, widget_callback) {
    var data = $.fn.facetview.options.data;
    for (var i = 0; i < data.records.length; i++) {
        var element = data.records[i];

        var title = getDisplayFieldValue(element, display_fields, 'title');
        var description = getDisplayFieldValue(element, display_fields, 'description');
        var url = getDisplayFieldValue(element, display_fields, 'url');
        var datestamp = getDisplayFieldValue(element, display_fields, 'datestamp');
        var topics = getDisplayFieldValue(element, display_fields, 'topics');
        var types = getDisplayFieldValue(element, display_fields, 'types');
        var contentType = 'generic';
        var type = '';
        var typeClass = '';
        var image_scale = '/image_preview';
        var thumbUrl = url + image_scale;

        var date = $.datepicker.formatDate('dd M yy', new Date(datestamp));
        if (!(topics instanceof Array)) {
            topics = [topics];
        }        
        if (!(types instanceof Array)) {
            types = [types];
        }
        if (types.length>0) {
            var pos = types.length - 1;
            while(true){
                type = types[pos];
                typeClass = type.toLowerCase().replace(/\s/g, '-');
                if (contentTypes[typeClass]){
                    contentType = contentTypes[typeClass];
                    break;
                }
                pos--;
                if (pos < 0){
                    break;
                }
            }
        }
        // if the result is from external sites just fall back to type depiction.
        if (!(url.startsWith('http://www.eea.europa.eu'))) {
            thumbUrl = 'http://www.eea.europa.eu/portal_depiction/' + (contentType) + '/image_preview';
        }

        var result = {
            '${result.title}': title,
            '${result.description}': description,
            '${result.url}': url,
            '${result.thumbUrl}': thumbUrl,
            '${result.type}': type,
            '${result.typeClass}': typeClass,
            '${result.typeIcon}': 'http://www.eea.europa.eu/portal_depiction/' + (contentType) + '/image_thumb',
            '${result.topic}': topics.join(', '),
            '${result.datestamp}': datestamp,
            '${result.date}': date,
        };

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

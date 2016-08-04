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
    var results = $($('.pagination').find('.active')[0]).text(); //x-y of z
    var split = results.split(' of ');
    if (split.length === 2) {
      var html = [
        '<span>Results ',
        split[0],
        ' of <strong>',
        split[1],
        '</strong></span>'
        ].join('');
    $('.top-pagination').html(html);
    } else {
      $('.top-pagination').html('');
    }
}

function buildFacets(mapping_facets){
    var range_facets = [];
    var geo_facets = [];
    var facets = [];
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
        };
        if (facet.operator !== undefined){
            facet_obj.operator = facet.operator
        }
        facets.push(facet_obj);

    }
    return {range_facets: range_facets, geo_facets: geo_facets, facets: facets};
}

function buildListing(mapping_listing){
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

function buildHeaders(mapping_listing){
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

function addHeaders(element){
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

function fixDataTitles(){
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

function replaceNumbers(){
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

function viewReady(){
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

var template_card = '<div class="eea-tile"> <a class="eea-tileInner"title="{{ tile-title }}"href="{{ tile-url }}"> <div class="eea-tileThumb" style="background-image: url({{ thumb-url }})"> <img src="{{ thumb-url }}"> </div> <div class="eea-tileBody"> <strong class="eea-tileType" style="background-image: url({{ tile-typeIcon }})"> <span class="eea-tileTypeIcon eea-tileType-{{ tile-typeClass }}" title="{{ tile-type }}"></span> {{ tile-type }} </strong> <h4 class="eea-tileTitle">{{ tile-title }}</h4> <span class="eea-tileTopic" title="{{ tile-topic }}">{{ tile-topic }}</span> <time class="eea-tileIssued" datetime="{{ tile-datestamp }}">{{ tile-date }}</time> </div> </a> </div> ';
var template_list = '<div class="tileItem visualIEFloatFix"><a title="{{ tile-title }}" href="{{ tile-url }}" class="tileImage "><img alt="{{ tile-title }}" title="{{ tile-title }}" src="{{ thumb-url }}"></a><div class="tileContent"><h2 class="tileHeadline" id="data-centre-overview"><a title="{{ tile-title }}" class="state-published" href="{{ tile-url }}">{{ tile-title }}</a></h2><span class="date">{{ tile-date }}</span></div><p class="tileBody"><span class="description">{{ tile-description }}</span></p><p class="tileFooter"><a class="moreLink" href="{{ tile-url }}">Read more</a></p><div style="padding-bottom:1.0em;" class="visualClear"><!-- --></div></div>';
                    
function display_results($results, template) {
    var data = $.fn.facetview.options.data;
    for (var i = 0; i < data.records.length; i++) {
        var element = data.records[i];
        
        var title = element['title'];
        var description = element['description'];                        
        var url = element['visualization'];
        var type = [''];
        var contentType = 'davizvisualization';
        var topics = [];                       
        var datestamp = element['created'];
        var date = $.datepicker.formatDate('dd M yy', new Date(datestamp));;
        
        templateItems = {
            '{{ tile-title }}': title,
            '{{ tile-description }}': description,
            '{{ tile-url }}': url,
            '{{ thumb-url }}': url + '/image_mini',
            '{{ tile-type }}': type,
            '{{ tile-typeIcon }}': 'http://www.eea.europa.eu/portal_depiction/' + (contentType) + '/image_icon',
            '{{ tile-topic }}': topics.join(', '),
            '{{ tile-datestamp }}': datestamp,
            '{{ tile-date }}': date,
        };
        
        var $result = $(
            template.replace(/\{\{(.*?)\}\}/gi, function(matched){
                return templateItems[matched];
            })
        );
        $result.find('img').load(function() {
            aspectRatio = this.naturalWidth / this.naturalHeight;
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

    facets = buildFacets(mapping_facets);
    listing = buildListing(mapping_listing);
    options.facets = facets.facets;
    options.rangefacets = facets.range_facets;
    options.geofacets = facets.geo_facets;

    options.result_display = [listing];
    $('.facet-view-simple').facetview(options);
}

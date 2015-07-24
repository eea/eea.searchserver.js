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


function sort_elements(a, b) {
    return a.pos - b.pos
}

function buildFacets(mapping_facets){
    mapping_facets.sort(sort_elements);
    var range_facets = [];
    var geo_facets = [];
    var facets = [];
    for (var i = 0; i < mapping_facets.length; i++){
        var facet = mapping_facets[i];
        if (facet.type === 'range'){
            range_facets.push(facet.name);
            facet.size = 10000000;
        }
        if (facet.type === 'geo'){
            geo_facets.push(facet.name);
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
    mapping_listing.sort(sort_elements);
    var result_display = [];
    for (var i = 0; i < mapping_listing.length; i++){
        var listing = mapping_listing[i];
        var display = {
            pre : '<td>',
            field : field_base + listing.name,
            post: '</td>'
        }
        if (listing.display !== undefined){
            display = listing.display
        }
        result_display.push(display);
    }
    return result_display;
}

function buildHeaders(mapping_listing){
    mapping_listing.sort(sort_elements);
    var headers = "";
    for (var i = 0; i < mapping_listing.length; i++){
        var listing = mapping_listing[i];
        headers += "<th>" + listing.title + "</th>";
    }
    return headers;
}

function addHeaders(element){
    var mapping_listing = [];
    for (var i = 0; i < eea_mapping.fields_mapping.length; i++){
        var field = eea_mapping.fields_mapping[i];
        if ((field.listing !== undefined) &&
            (field.listing.visible === true)){
            field.listing.name = field.name;
            mapping_listing.push(field.listing);
        }
    }
    headers = buildHeaders(mapping_listing);

    $(element).append("<thead><tr>" + headers +  "</tr></thead>");
}

function eea_facetview(element, options){
    var mapping_facets = [];
    var mapping_listing = [];
    for (var i = 0; i < eea_mapping.fields_mapping.length; i++){
        var field = eea_mapping.fields_mapping[i];
        if ((field.facet !== undefined) &&
            (field.facet.visible === true)){
            field.facet.name = field.name;
            mapping_facets.push(field.facet);
        }
        if ((field.listing !== undefined) &&
            (field.listing.visible === true)){
            field.listing.name = field.name;
            mapping_listing.push(field.listing);
        }
    }
    facets = buildFacets(mapping_facets);
    listing = buildListing(mapping_listing);
    options.facets = facets.facets;
    options.rangefacets = facets.range_facets;
    options.geofacets = facets.geo_facets;

    options.result_display = [listing];
    $('.facet-view-simple').facetview(options);
}

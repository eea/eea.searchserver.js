// insert the logo also on the navbar for the bootstrap menu
// this ensures that switching from portrait to landscape is without any flash since
// we can show and hide with css
$(document).ready(function(){
    var $navbar_header = $(".navbar-header");
    $("#portal-logo-link").clone().attr('id', 'portal-logo-link-header').prependTo($navbar_header);
    var $selected_filters = $(".facetview_selection");
    $selected_filters.find('i').hide();
    $selected_filters.hover(function(){
        $(this).find('i').show();
    }, function(){
        $(this).find('i').hide();
    });
});

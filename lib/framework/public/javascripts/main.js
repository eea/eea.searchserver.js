// insert the logo also on the navbar for the bootstrap menu
// this ensures that switching from portrait to landscape is without any flash since
// we can show and hide with css
window.jQuery(document).ready(function($){
    var $navbar_header = $(".navbar-header");
    $("#portal-logo-link").clone().attr('id', 'portal-logo-link-header').prependTo($navbar_header);
    // show and hide remove icon on hovering over added filters
    $("#facetview_selected_filters").on("hover", ".facetview_selection", function(){
        $(this).find('i').toggleClass('hidden');
    }, function(){
        $(this).find('i').toggleClass('hidden');
    });
   //$(window).one('results_ready', function() {
   //    $('.eea-tile').hover(function() {
   //        $(this).find('.eea-tileDescription').stop().animate({
   //            height: "toggle",
   //            opacity: "toggle"
   //        }, 300);
   //    });
   //});
});


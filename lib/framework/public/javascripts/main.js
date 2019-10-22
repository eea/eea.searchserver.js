// insert the logo also on the navbar for the bootstrap menu
// this ensures that switching from portrait to landscape is without any flash since
// we can show and hide with css

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

function setupDraft(){
    if ((typeof settings_draft !== 'undefined') && (settings_draft)){
        $("#content").css("background", "url(http://www.eea.europa.eu/draft.png)");
    }
}

window.jQuery(document).ready(function($){

    setupHoverHandlers();
    setupDraft();
    if ($.fn.Lazy) {
        $(window).on('results_ready', function() {
                $(".lazyLoad").Lazy();
        });
    }
    
});


$.widget('ui.autocompleteForFacet', $.ui.autocomplete,{
    _resizeMenu: function () {
        var ul = this.menu.element;
        ul.outerWidth(this.element.outerWidth());
    },

    _renderItem: function( ul, item ) {
        var formatted_hint = "<span class='facet_label_count'>" + item.count + "</span><span class='facet_label_text'>" + item.term + "</span>";

        return $( "<li class='autocomplete_facet_value'>" ).html(formatted_hint).appendTo( ul );
    },

    _renderMenu: function( ul, items) {
        var that = this;
        if (items.length > 0){
            var rel = items[0].rel;
            ul.attr("rel", rel);
        }
        $.each( items, function( index, item ) {
            that._renderItemData( ul, item );
        });
        ul.find("li").bind("click", function(){
            $('.facetview_freetext').trigger('keyup');
        });
    }
});
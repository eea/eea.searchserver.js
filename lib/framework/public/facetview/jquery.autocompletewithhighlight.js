$.widget('ui.autocompleteWithHighlight', $.ui.autocomplete,{
    _resizeMenu: function () {
        var ul = this.menu.element;
        ul.outerWidth(this.element.outerWidth());
    },

    _renderItem: function( ul, item ) {
        var search_term = $(".facetview_freetext").val();
        var clean_search_term = search_term.split(" ").filter(function(value){return value.length !== 0}).join(" ");

        var formatted_hint = "";
        var clean_label = item.label.split(" ").filter(function(value){return value.length !== 0}).join(" ");
        formatted_hint = clean_search_term + "<strong>" + clean_label.substr(clean_search_term.length) + "</strong>";

        return $( "<li>" ).html(formatted_hint).appendTo( ul );
    },

    _renderMenu: function( ul, items ) {
        var that = this;
        $.each( items, function( index, item ) {
            that._renderItemData( ul, item );
        });
        ul.find("li").bind("click", function(){
            $('.facetview_freetext').trigger('keyup');
        });
    }
});
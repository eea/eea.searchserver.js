$.widget('ui.autocompleteWithHighlight', $.ui.autocomplete,{
    _resizeMenu: function () {
        var ul = this.menu.element;
        ul.outerWidth(this.element.outerWidth());
    },

    _renderItem: function( ul, item ) {
        var search_term_array = $(".facetview_freetext").val().split(" ").filter(function(value) { return value.length > 0; });
        var clean_search_term = [];
        search_term_array.forEach(function(value, index) {
            //  Get corresponding autocomplete word
            var word = item.label.split(' ')[index]
            if (value.length !== 0 && word.length !== 0) {
                var indexOfDistinction = getIndexOfDistinction(value, word)
                //  Check if there is a distinction between 'index' term of search_term_array
                //  and the corresponding autocomplete word and bold it
                if (indexOfDistinction != -1 && indexOfDistinction < word.length) {
                    clean_search_term.push(word.slice(0, indexOfDistinction) + "<strong>" + word.slice(indexOfDistinction) + "</strong>")
                } else {
                    clean_search_term.push(word)
                }
            }
        })
        clean_search_term = clean_search_term.join(' ')
        var formatted_hint = "";
        var clean_label = item.label.split(" ").filter(function(value, index){return index > search_term_array.length - 1 && value.length > 0}).join(" ");
        formatted_hint = clean_search_term + " <strong>" + clean_label + "</strong>";

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

function getIndexOfDistinction(a, b)
{
    var i = 0;

    while (i < b.length)
    {
        if (a[i] != b[i] || i == a.length)
            return i
        i++;
    }
    return -1;
}

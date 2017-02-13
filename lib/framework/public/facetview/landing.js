/* globals jQuery, $ */

$.fn.landingTile = function(settings) {
    this.data("options", settings);


    var options = $(this).data("options");
    if (options.type === "simple"){
        $(this).css("cursor","pointer");
    }

    this.bind("click", function () {
        if (!$("#landing").is(":visible")){
            return;
        }
        var options = $(this).data("options");
        var $simple_facet;
        if (options.type === "simple"){
            $simple_facet = $("[id='" + options.facet + "']");
            if (!$simple_facet.hasClass("facetview_open")){
                $simple_facet.click();
            }
        }
    });
};

$.fn.landingView = function(settings){
    this.data("options", settings);

    for (var i = 0; i < settings.tiles.length; i++){
        $(settings.tiles[i].tile).landingTile(settings.tiles[i]);
    }

    var setCachedValues = function(values){
        var data = {};
        for (var i = 0; i < values.length; i++){
            data[values[i].name] = values[i].value;
        }
        $.ajax({
            type: "PUT",
            url: "setlandingvalue",
            contentType: "application/json",
            data: JSON.stringify(data)
        });
    };

    var getValueFromFacet = function(facet, value){
        var retVal = 0;
        var tree = $("[id='" + facet + "']").closest(".facetview_filter").find(".facetview_tree");
        var visibleValues = tree.find("li").filter(function(idx, el) { return el.style.display !== "none";});
        var values;
        if (value === "count"){
            retVal = visibleValues.length;
        }
        if (value === "min"){
            values = jQuery.map(visibleValues, function(element) {
                if (jQuery(element).find(".facet_label_text").text() !== 'undefined') {
                    return jQuery(element).find(".facet_label_text").text();
                }
            });
            values.sort();
            retVal = values[0];
        }
        if (value === "max"){
            values = jQuery.map(visibleValues, function(element) {
                if (jQuery(element).find(".facet_label_text").text() !== 'undefined') {
                    return jQuery(element).find(".facet_label_text").text();}
            });
            values.sort();
            retVal = values[values.length - 1];
        }
        return retVal;
    };


    this.bind("custom_ready", function(event, result) {
        $(this).find("."+ result.name).text(result.value);
        setCachedValues([{name:result.name, value:result.value}]);
    });

    this.bind("results_ready", function (event){
        if (!$("#landing").is(":visible")){
            return;
        }
        var options = $(this).data("options");
        var hasZeroValues = false;
        cachedValues = [];
        for (var i = 0; i < options.tiles.length; i++){
            var tile = options.tiles[i];
            for (var j = 0; j < tile.values.length; j++){
                var valueSettingsForTile = {"type": "facet", "facet": tile.facet};
                jQuery.extend(valueSettingsForTile, tile.values[j]);
                var value = 0;
                var updateValues = false;
                if (valueSettingsForTile.type === "facet"){
                    value = getValueFromFacet(valueSettingsForTile.facet, valueSettingsForTile.value);
                    if (value !== 0){
                        updateValues = true;
                    }
                    else {
                        hasZeroValues = true;
                    }
                }
                if (valueSettingsForTile.type === "fixed"){
                    value = valueSettingsForTile.value;
                    if (value !== 0){
                        updateValues = true;
                    }
                }
                if (valueSettingsForTile.type === "results"){
                    if (valueSettingsForTile.method !== undefined){
                        valueSettingsForTile.method(valueSettingsForTile.name);
                    }
                    else {
                        if (valueSettingsForTile.value === "rows"){
                            if($.fn.facetview.options.rawdata){
                                $("[class='"+valueSettingsForTile.name+"']").empty();
                                var results = $.fn.facetview.options.rawdata.hits.hits;
                                value = "";
                                for (var res_count = 0; res_count < 3; res_count++){
                                    var result = {};
                                    $.extend(result, results[res_count]._source);
                                    var result_for_template = {};
                                    $.each(result, function(key,value){
                                        result_for_template["${"+key+"}"] = value;
                                    });
                                    value += replace_variables_in_text(valueSettingsForTile.template, result_for_template);
                                    updateValues = true;
                                }
                            }
                        }
                    }
                }

                if (updateValues){
                    var cachedVal = {name:valueSettingsForTile.name, value:value}
                    cachedValues.push(cachedVal);
                    $(this).find("."+ valueSettingsForTile.name).html(value);
                }
            }
        }
        if (hasZeroValues){
            setTimeout(function(){ $("#landing").trigger("results_ready");}, 1000);
        }
        else {
            setCachedValues(cachedValues);
        }
    });
};

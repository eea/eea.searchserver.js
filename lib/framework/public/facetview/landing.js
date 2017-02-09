/* globals jQuery, $ */
$.fn.landingTile = function(settings) {
    this.data("options", settings);


    var options = $(this).data("options");
    if (options.type === "simple"){
        $(this).css("cursor","pointer");
    }

    var setCachedValue = function(field, value){
        var data = {};
        data[field] = value;
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

    this.bind("facet_ready", function (){
        if (!$("#landing").is(":visible")){
            return;
        }
        var options = $(this).data("options");
        var valueSettingsForTile;
        if (options.values !== undefined){
            for (var i = 0; i < options.values.length; i++){
                valueSettingsForTile = {"type": "facet", "facet": options.facet};
                jQuery.extend(valueSettingsForTile, options.values[i]);
                if ((valueSettingsForTile.type !== "facet") && (valueSettingsForTile.type !== "fixed")) {
                    return;
                }
                var value = 0;
                if (valueSettingsForTile.type === "facet"){
                    value = getValueFromFacet(valueSettingsForTile.facet, valueSettingsForTile.value);
                }
                if (valueSettingsForTile.type === "fixed"){
                    value = valueSettingsForTile.value;
                }
                if (value !== 0){
                    $(this).find("."+ valueSettingsForTile.name).text(value);
                    setCachedValue(valueSettingsForTile.name, value);
                }
            }
        }
    });

    this.bind("custom_ready", function(event, value) {
        if (!$("#landing").is(":visible")){
            return;
        }
        var options = $(this).data("options");
        var valueSettingsForTile;
        if (options.values !== undefined){
            for (var i = 0; i < options.values.length; i++){
                valueSettingsForTile = {"type": "facet", "facet": options.facet};
                jQuery.extend(valueSettingsForTile, options.values[i]);
                if (valueSettingsForTile.type === "results"){
                    if (valueSettingsForTile.method !== undefined){
                        if (value !== 0){
                            $(this).find("."+ valueSettingsForTile.name).text(value);
                            setCachedValue(valueSettingsForTile.name, value);
                        }
                    }
                }
            }
        }
    });

    this.bind("results_ready", function (){
        if (!$("#landing").is(":visible")){
            return;
        }
        var options = $(this).data("options");
        var valueSettingsForTile;
        if (options.values !== undefined){
            for (var i = 0; i < options.values.length; i++){
                valueSettingsForTile = {"type": "facet", "facet": options.facet};
                jQuery.extend(valueSettingsForTile, options.values[i]);
                if (valueSettingsForTile.type === "results"){
                    if (valueSettingsForTile.method !== undefined){
                        valueSettingsForTile.method(valueSettingsForTile.value, valueSettingsForTile.name);
                    }
                    else {
                        if (valueSettingsForTile.value === "rows"){
                            if($.fn.facetview.options.rawdata){
                                $("[class='"+valueSettingsForTile.name+"']").empty();
                                var results = $.fn.facetview.options.rawdata.hits.hits;
                                for (var res_count = 0; res_count < 3; res_count++){
                                    var result = {};
                                    $.extend(result, results[res_count]._source);
                                    var result_for_template = {};
                                    $.each(result, function(key,value){
                                        result_for_template["${"+key+"}"] = value;
                                    });
                                    var snippet = replace_variables_in_text(valueSettingsForTile.template, result_for_template);
                                    $("[class='"+valueSettingsForTile.name+"']").append($(snippet));
                                }
                                setCachedValue(valueSettingsForTile.name, $("[class='"+valueSettingsForTile.name+"']").html());
                            }
                        }
                    }
                }
            }
        }
    });

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

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
    this.data("loading", true);

    var new_values = {};
    var original_values = {};
    for (var i = 0; i < settings.tiles.length; i++){
        $(settings.tiles[i].tile).landingTile(settings.tiles[i]);
        for (var j = 0; j < settings.tiles[i].values.length; j++){
            new_values[settings.tiles[i].values[j].name] = '';
            original_values[settings.tiles[i].values[j].name] = $("." + settings.tiles[i].values[j].name).html();
        }
    }
    $("#landing").data("new_values", new_values);
    $("#landing").data("original_values", original_values);
    var setCachedValues = function(){
        var new_values = $("#landing").data("new_values");

        var hasEmpty = false;

        $.each(new_values, function(key,value){
            if ((value === '') || (parseInt(value) === 0)){
                hasEmpty = true;
            }
        })

        if (hasEmpty) {
            setTimeout(function(){ $("#landing").trigger("results_ready");}, 1000);
        }
        else {
            var shouldUpdate = false;
            var original_values = $("#landing").data("original_values");
            $.each(original_values, function(key,value){
                if (new_values[key] !== value){
                    shouldUpdate = true;
                }
            });
            if (shouldUpdate){
                $.ajax({
                    type: "PUT",
                    url: "setlandingvalues",
                    contentType: "application/json",
                    data: JSON.stringify(new_values)
                });
            }
            $("#landing").data("loading", false);
        }
    };

    var getValueFromFacet = function(facet, value){
        var retVal = 0;
        var tree = $("[id='" + facet + "']").closest(".facetview_filter").find(".facetview_tree");
        var visibleValues = tree.data("records");
        if (visibleValues === undefined){
            return retVal;
        }

//        var visibleValues = tree.find("li").filter(function(idx, el) { return el.style.display !== "none";});
        var values;
        if (value === "full_count"){
            retVal = tree.data("values_count");
        }
        if (value === "count"){
            retVal = Object.keys(visibleValues).length;
        }
        if (value === "min"){
            values = Object.keys(visibleValues);
            clearValues = [];
            for (var i = 0; i < values.length; i++){
                if (values[i] !== 'undefined'){
                    clearValues.push(values[i]);
                }
            }
            clearValues.sort();
            retVal = clearValues[0];
        }
        if (value === "max"){
            values = Object.keys(visibleValues);
            clearValues = [];
            for (var i = 0; i < values.length; i++){
                if (values[i] !== 'undefined'){
                    clearValues.push(values[i]);
                }
            }
            clearValues.sort();
            retVal = clearValues[clearValues.length - 1];
        }
        return retVal;
    };


    this.bind("custom_ready", function(event, result) {
        if (!$("#landing").data("loading")){
            return;
        }

        var new_values = $("#landing").data("new_values");
        if (!$("#landing").is(":visible")){
            return;
        }
        if (!isNaN(result.value)){
            var oldValue = parseInt($(this).find("."+ result.name).eq(0).text());
            if (isNaN(oldValue)){
                oldValue = 0;
            }
            var newValue = parseInt(result.value);
            if (oldValue <= newValue){
                new_values[result.name] = result.value;
                $(this).find("."+ result.name).text(result.value);
            }
        }
        else {
            new_values[result.name] = result.value;
            $(this).find("."+ result.name).text(result.value);
        }
        $("#landing").data("new_values", new_values);
    });

    this.bind("results_ready", function (event){
        if (!$("#landing").data("loading")){
            return;
        }

        var new_values = $("#landing").data("new_values");
        if (!$("#landing").is(":visible")){
            return;
        }
        var options = $(this).data("options");
        for (var i = 0; i < options.tiles.length; i++){
            var tile = options.tiles[i];
            for (var j = 0; j < tile.values.length; j++){
                var valueSettingsForTile = {"type": "facet", "facet": tile.facet};
                jQuery.extend(valueSettingsForTile, tile.values[j]);
                var value = 0;
                var updateValues = false;
                if (valueSettingsForTile.type === "facet"){
                    value = getValueFromFacet(valueSettingsForTile.facet, valueSettingsForTile.value);
                    if ((value !== 0) && (value !== undefined)){
                        updateValues = true;
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
                        var newCachedValue = {name:valueSettingsForTile.name, value:value};
                        new_values[valueSettingsForTile.name] = value;
                        $(this).find("."+ valueSettingsForTile.name).html(value);
                }
            }
        }

        $("#landing").data("new_values", new_values);

        setCachedValues();
    });
};

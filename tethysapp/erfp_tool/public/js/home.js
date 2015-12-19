/*****************************************************************************
 * FILE:    ECMWF-RAPID Home
 * DATE:    6/6/15
 * AUTHOR:  Curtis Rae
 * COPYRIGHT: (c) 2014 Brigham Young University
 * LICENSE: BSD 2-Clause
 *****************************************************************************/

var loadFeatures;
var map = TETHYS_MAP_VIEW.getMap();
//add the vector layers to the map
var addLayerToMap = function(layer_features){
    var map = TETHYS_MAP_VIEW.getMap();
    var geojson_format = new ol.format.GeoJSON();
    var preview_vector_source = new ol.source.Vector({
        loader: function (extent, resolution, projection) {
        for(var i = 0; i < layer_features.length; i++) {
            var geoserver_url = layer_features[i][1];
            var layer_name = layer_features[i][3];
            if(geoserver_url && layer_name){
                var url = geoserver_url + '/wfs?service=WFS&' +
                    'version=1.1.0&request=GetFeature&typename=' + layer_name + '&' +
                    'outputFormat=text/javascript&format_options=callback:loadFeatures' +
                    '&srsname=EPSG:3857&bbox=' + extent.join(',') + ',EPSG:3857';
                // use jsonp: false to prevent jQuery from adding the "callback"
                // parameter to the URL
                $.ajax({
                    url: encodeURI(url),
                    dataType: 'jsonp',
                    jsonp: false
                });
            }
        }
        },
        strategy: ol.loadingstrategy.tile(new ol.tilegrid.XYZ({
            maxZoom: 19
        })),
    });
    var timeout;
    map.getView().setZoom(0);
    loadFeatures = function (response) {
        if(response.features.length > 0) {
            if (typeof response.features[0].properties.watershed != 'undefined') {
                var watershed_name = response.features[0].properties.watershed.toLowerCase();
            }
            for(var i= 0, len=layer_features.length; i < len; i++){
                feature = layer_features[i];
                if(watershed_name == feature[0]){
                    preview_vector_source.addFeatures(geojson_format.readFeatures(response));
                }
            }
        }
        var map_extent = ol.extent.createEmpty();
        //get extent to zoom to layer
        ol.extent.extend(map_extent, preview_vector_source.getExtent());
        clearTimeout(timeout);
        timeout = setTimeout(function(){
            zoomToAll(map_extent);
        },150);


    };

    var preview_vector = new ol.layer.Vector({
        source: preview_vector_source,
    });
    map.addLayer(preview_vector);
    return preview_vector;
};

//FUNCTION: zooms to all kml files
var zoomToAll = function(map_extent) {
    TETHYS_MAP_VIEW.getMap().getView().fitExtent(map_extent, TETHYS_MAP_VIEW.getMap().getSize());
};

$(document).ready(function(){

    /************************************************************************
    *                      MODULE LEVEL / GLOBAL VARIABLES
    *************************************************************************/
    var layer_features;

    /************************************************************************
    *                  INITIALIZATION / CONSTRUCTOR
    *************************************************************************/
    var map = TETHYS_MAP_VIEW.getMap();
    var selected_feature = null;
    layer_features = $('#map-select').attr('data-resources');
    layer_features = JSON.parse(layer_features);

    //addLayerToMap(layer_features);

    //make layers selectable
    //var  selectionInteraction = new ol.interaction.Select();
    //var selectionInteractionFeatures = selectionInteraction.getFeatures();

    //map.addInteraction(selectionInteraction);

    //based on where the user clicks, populate the dropdown
    //selectionInteractionFeatures.on('change:length', function(e){
    //    if (e.target.getArray().length === 0) {
    //        // this means it's changed to no features selected
    //        $('#watershed_select').select2('val', '');
    //    }else{
    //        var layer_id_list = [];
    //        array_length = (e.target.getArray().length);
    //        for (var j = 0; j < array_length; j++) {
    //            selected_feature = e.target.item(j);
    //            var watershed = selected_feature.getProperties()['watershed'].toLowerCase();
    //            for (var i = 0; i < layer_features.length; i++) {
    //                if (watershed == layer_features[i][0]) {
    //                    layer_id_list.push(layer_features[i][2]);
    //                }
    //            }
    //        }
    //        $('#watershed_select').select2('val', layer_id_list);
    //        if (layer_id_list.length > 1) {
    //            $('#too-many-watersheds-alert').removeClass('hidden');
    //        }
    //        else{
    //            $('#too-many-watersheds-alert').addClass('hidden');
    //        }
    //    }
    //});

    //from the dropdown make the map mirror it

    $('#watershed_select').on('change', function(e){
        var selectionInteractionFeaturesArray = selectionInteractionFeatures.getArray();
        var layer_properties = map.getLayers().getArray()[1].getSource().getFeatures();
        var dropdown_values = $('#watershed_select').select2('val');
        var map_values = [];
        //get ids of layers selected on map
        for (var i=0; i < selectionInteractionFeaturesArray.length; i++){
            var watershed = selectionInteractionFeaturesArray[i].getProperties()['watershed'].toLowerCase();
            for (var j = 0; j < layer_features.length; j++) {
                if (watershed == layer_features[j][0]) {
                    map_values.push(layer_features[j][2].toString());
                }
            }
        }
        var num_selected = $('#watershed_select option:selected').length;
        //if the user deselected something in the dropdown box
        if (selectionInteractionFeaturesArray.length >= num_selected) {
            selectionInteractionFeatures.clear();
            var layers_selected = [];
            for (var i = 0; i < dropdown_values.length; i++) {
                for (var l = 0; l < layer_features.length; l++) {
                    if (dropdown_values[i] == layer_features[l][2]) {
                        layers_selected.push(layer_features[l][0]);
                    }
                }
            }
            for (var i = 0; i < layers_selected.length; i++) {
                for (var k = 0; k < layer_properties.length; k++) {
                    if(layer_properties[k].getProperties()['watershed'] == null ||
                            typeof layer_properties[k].getProperties()['watershed'] == 'undefined'){}
                    else if (layers_selected[i] == layer_properties[k].getProperties()['watershed'].toLowerCase()){
                        selectionInteractionFeatures.push(layer_properties[k]);
                    }
                }
            }
        }
        else{
            //find the id that is in the dropdown but not on the map
            var missing_val =$(dropdown_values).not(map_values).get();
            //find the name that corresponds to the missing id
            var missing_name = '';
            for (var j = 0; j < layer_features.length; j++) {
                if (missing_val == layer_features[j][2]) {
                    missing_name = layer_features[j][0].toLowerCase();
                }
            }
            for (var k=0; k < layer_properties.length; k++){
                if(layer_properties[k].getProperties()['watershed'] == null ||
                    typeof layer_properties[k].getProperties()['watershed'] == 'undefined'){}
                else if (missing_name == layer_properties[k].getProperties()['watershed'].toLowerCase()){
                    selectionInteractionFeatures.push(layer_properties[k]);
                }
            }
        }
    });

    var get_list_info;
    $('#watershed_group_select').on('change',function(e){
        $('html, body').animate({
            scrollTop: $("#map-select").offset().top
        }, 500);
        var layers_removed = map.getLayers().getArray();
        for (var i = 1; i < layers_removed.length; i++){
            map.removeLayer(layers_removed[i]);
        }
        selectionInteractionFeatures.clear();
        var group_id = $('#watershed_group_select').val();
        if (get_list_info) {
            get_list_info.abort();
        }
        get_list_info = jQuery.ajax({
            type: "GET",
            url: "outline-get-list-info",
            dataType: "json",
            data: {
                group_id: group_id
            }
        });
        get_list_info.done(function(data){
            if ("success" in data) {
                if ("dropdown_list" in data) {
                   var dropdown_menu = $('#watershed_select')
                   dropdown_menu.empty();
                   var dropdown_options = data.dropdown_list;
                   for (var i = 0; i < dropdown_options.length; i++){
                        dropdown_menu.append(new Option(dropdown_options[i][0], dropdown_options[i][1]));
                   }
                }
                if ("outline_list" in data){
                    var outline_list = data.outline_list;
                    addLayerToMap(outline_list);
                    layer_features = outline_list;
                }
            }
        });
    });

    $('#select-all').on('click',function(){
        var dropdown_options =[];
        $('#watershed_select option').each(function(){
           dropdown_options.push($(this).val());
        });
        $('#watershed_select').select2('val',dropdown_options);
        if (dropdown_options.length > 1){
            $('#too-many-watersheds-alert').removeClass('hidden');
        }
    });
});
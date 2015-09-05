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
var addLayerToMap = function(map_layers){
    var map = TETHYS_MAP_VIEW.getMap();
    var geojson_format = new ol.format.GeoJSON();
    var preview_vector_source = new ol.source.Vector({
        loader: function (extent, resolution, projection) {
        for(var i = 0; i < map_layers.length; i++) {
            var watershed = map_layers[i][0];
            var subbasin = map_layers[i][1];
            var geoserver_url = map_layers[i][2];
            var app_instance_id = map_layers[i][3];
            var url = geoserver_url + '/wfs?service=WFS&' +
                'version=1.1.0&request=GetFeature&typename=spt-' + app_instance_id + ':' +
                watershed + '-' + subbasin + '-outline' + '&' +
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
        },
        strategy: ol.loadingstrategy.tile(new ol.tilegrid.XYZ({
            maxZoom: 19
        })),
    });
    // TODO Add as a group for quicker response
    loadFeatures = function (response) {
        preview_vector_source.addFeatures(geojson_format.readFeatures(response));
    };

    var preview_vector = new ol.layer.Vector({
        source: preview_vector_source,
    });
    map.addLayer(preview_vector);
    return preview_vector;
};

$(document).ready(function(){
    /************************************************************************
    *                      MODULE LEVEL / GLOBAL VARIABLES
    *************************************************************************/
    var map_layers;

    /************************************************************************
    *                  INITIALIZATION / CONSTRUCTOR
    *************************************************************************/
    var map = TETHYS_MAP_VIEW.getMap();
    var selected_feature = null;
    map_layers = $('#map-select').attr('data-resources');
    map_layers = JSON.parse(map_layers);

    addLayerToMap(map_layers);

    //make layers selectable
    var  selectionInteraction = new ol.interaction.Select();
    var selectionInteractionFeatures = selectionInteraction.getFeatures();

    map.addInteraction(selectionInteraction);

    //based on where the user clicks, populate the select2
    selectionInteractionFeatures.on('change:length', function(e){
        if (e.target.getArray().length === 0) {
            // this means it's changed to no features selected
            $('#watershed_select').select2('val', '');
        }else{
            var layer_id_list = [];
            array_length = (e.target.getArray().length);
            for (var j = 0; j < array_length; j++) {
                selected_feature = e.target.item(j);
                var watershed = selected_feature.getProperties()['watershed'].toLowerCase();
                for (var i = 0; i < map_layers.length; i++) {
                    if (watershed == map_layers[i][0]) {
                        layer_id_list.push(map_layers[i][4]);
                    }
                }
            }
            $('#watershed_select').select2('val', layer_id_list);
            if (layer_id_list.length > 1) {
                $('#too-many-watersheds-alert').removeClass('hidden');
            }
            else{
                $('#too-many-watersheds-alert').addClass('hidden');
            }
        }
    });

    //from the select2 make the map mirror it

    $('#watershed_select').on('change', function(e){
        //selectionInteractionFeatures.push(layers_loaded[0]);
        var selectionInteractionFeaturesArray = selectionInteractionFeatures.getArray();
        var layer_properties = map.getLayers().getArray()[1].getSource().getFeatures();
        var dropdown_values = $('#watershed_select').select2('val');
        var map_values = [];
        //get ids of layers selected on map
        for (var i=0; i < selectionInteractionFeaturesArray.length; i++){
            var watershed = selectionInteractionFeaturesArray[i].getProperties()['watershed'].toLowerCase();
            for (var j = 0; j < map_layers.length; j++) {
                if (watershed == map_layers[j][0]) {
                    map_values.push(map_layers[j][4].toString());
                }
            }
        }
        console.log("map ", map_values, 'dropdown ',dropdown_values);
        var num_selected = $('#watershed_select option:selected').length;
        //if the user deselected something in the dropdown box
        if (selectionInteractionFeaturesArray.length >= num_selected) {
            selectionInteractionFeatures.clear();
            var layers_selected = [];
            for (var i = 0; i < dropdown_values.length; i++) {
                for (var l = 0; l < map_layers.length; l++) {
                    if (dropdown_values[i] == map_layers[l][4]) {
                        layers_selected.push(map_layers[l][0]);
                        console.log('I went here', layers_selected);
                    }
                }
            }
            for (var i = 0; i < layers_selected.length; i++) {
                for (var k = 0; k < layer_properties.length; k++) {
                    if (layers_selected[i] == layer_properties[k].getProperties()['watershed'].toLowerCase()) {
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
            for (var j = 0; j < map_layers.length; j++) {
                if (missing_val == map_layers[j][4]) {
                    missing_name = map_layers[j][0].toLowerCase();
                }
            }
            for (var k=0; k < layer_properties.length; k++){
                if (missing_name == layer_properties[k].getProperties()['watershed'].toLowerCase()){
                    selectionInteractionFeatures.push(layer_properties[k]);
                }
            }
        }
    });
});
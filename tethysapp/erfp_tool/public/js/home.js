/*****************************************************************************
 * FILE:    ECMWF-RAPID Home
 * DATE:    6/6/15
 * AUTHOR:  Curtis Rae
 * COPYRIGHT: (c) 2014 Brigham Young University
 * LICENSE: BSD 2-Clause
 *****************************************************************************/

var loadFeatures
var map = TETHYS_MAP_VIEW.getMap();

//add the vector layers to the map
var addLayerToMap = function(watershed, subbasin, geoserver_url, app_instance_id){
    var map = TETHYS_MAP_VIEW.getMap();
    var geojson_format = new ol.format.GeoJSON();

    var preview_vector_source = new ol.source.Vector({
        loader: function (extent, resolution, projection) {
            var url = geoserver_url + '/wfs?service=WFS&' +
                'version=1.1.0&request=GetFeature&typename=spt-'+ app_instance_id +':' +
                watershed + '-' + subbasin + '-outline' +'&' +
                'outputFormat=text/javascript&format_options=callback:loadFeatures' +
                '&srsname=EPSG:3857&bbox=' + extent.join(',') + ',EPSG:3857';
            // use jsonp: false to prevent jQuery from adding the "callback"
            // parameter to the URL
            $.ajax({
                url: encodeURI(url),
                dataType: 'jsonp',
                jsonp: false
            });

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
    //preview_vector.setOpacity(0);
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
    var layers_loaded = [];
    var selected_feature = null;
    map_layers = $('#map-select').attr('data-resources');
    map_layers = JSON.parse(map_layers);
    for(var i = 0; i < map_layers.length; i++) {
        var watershed = map_layers[i][0];
        var subbasin = map_layers[i][1];
        var geoserver_url = map_layers[i][2];
        var app_instance_id = map_layers[i][3];
        var layer = addLayerToMap(watershed, subbasin, geoserver_url, app_instance_id);
        layers_loaded.push(layer);
    }

    //make layers selectable
    var selectionInteraction = new ol.interaction.Select({
                                    layers: layers_loaded,
                                });

    map.addInteraction(selectionInteraction);

    //based on where the user clicks, populate the select2
    selectionInteraction.getFeatures().on('change:length', function(e){
        if (e.target.getArray().length === 0) {
            // this means it's changed to no features selected
            $('#watershed_select').select2('val', '');
        }else{
            array_length = (e.target.getArray().length);
            var layer_id_list = [];
            for (var j = 0; j < array_length; j++) {
                selected_feature = e.target.item(j);
                for (var key in selected_feature.getProperties()) {
                    if ('watershed' == key.toLowerCase()) {
                        var key_feature = (selected_feature.get(key)).toLowerCase();
                        for (var i = 0; i < map_layers.length; i++) {
                            if (key_feature == map_layers[i][0]) {
                                layer_id_list.push(map_layers[i][4]);
                            }
                        }
                    }
                }
            }
            $('#watershed_select').select2('val', layer_id_list);
            $('#watershed_select').trigger('change');
        }
    });
});
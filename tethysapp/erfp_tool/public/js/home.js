/**
 * Created by crae2244 on 7/23/15.
 */

var loadFeatures
var map = TETHYS_MAP_VIEW.getMap();

var add_layer_to_map = function(watershed, subbasin, geoserver_url, app_instance_id){
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

    map.addLayer(preview_vector);
};

$(function(){
    /************************************************************************
    *                      MODULE LEVEL / GLOBAL VARIABLES
    *************************************************************************/
    var map_layers;

    /************************************************************************
    *                  INITIALIZATION / CONSTRUCTOR
    *************************************************************************/
    var map = TETHYS_MAP_VIEW.getMap();
    //var layers = map.getLayers();
    map_layers = $('#map-select').attr('data-resources');
    map_layers = JSON.parse(map_layers);
    console.log(map_layers);
    //http://127.0.0.1:8181/geoserver/
    //http://ciwmap.chpc.utah.edu:8080/geoserver/
    for(var i = 0; i < map_layers.length; i++) {
        var watershed = map_layers[i][0];
        var subbasin = map_layers[i][1];
        var geoserver_url = map_layers[i][2];
        var app_instance_id = map_layers[i][3];
        add_layer_to_map(watershed, subbasin, geoserver_url, app_instance_id);
    }
});
/**
 * Created by crae2244 on 7/23/15.
 */

var loadFeatures
var map = TETHYS_MAP_VIEW.getMap();

var add_layer_to_map = function(layername){
    var map = TETHYS_MAP_VIEW.getMap();
    var geojson_format = new ol.format.GeoJSON();
    preview_vector_source = new ol.source.Vector({
        loader: function (extent, resolution, projection) {
            var url = 'http://ciwmap.chpc.utah.edu:8080/geoserver/wfs?service=WFS&' +
                'version=1.1.0&request=GetFeature&typename=spt-9bbf4592d00f501b82ef58c3297cec78:' + layername +'&' +
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
    var map_layers,
        nfie_regions,
        preview_vector_source;

    /************************************************************************
    *                  INITIALIZATION / CONSTRUCTOR
    *************************************************************************/
    nfie_regions= ['great_basin-nfie_region-outline', 'california-nfie_region-outline', 'colorado-nfie_region-outline','mississippi-nfie_region-outline', 'great_lakes-nfie_region-outline'];
    var map = TETHYS_MAP_VIEW.getMap();
    //var layers = map.getLayers();

    //http://127.0.0.1:8181/geoserver/
    //http://ciwmap.chpc.utah.edu:8080/geoserver/
    for(var i = 0; i < nfie_regions.length; i++) {
        console.log(nfie_regions[i]);
        curr_region = nfie_regions[i];
        add_layer_to_map(curr_region);
    }
    var layers = map.getLayers();
});
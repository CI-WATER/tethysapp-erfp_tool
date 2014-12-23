/*****************************************************************************
 * FILE:    ECMWF-RAPID Map Tool
 * DATE:    12/22/2014
 * AUTHOR:  Alan Snow
 * COPYRIGHT: (c) 2014 Brigham Young University
 * LICENSE: BSD 2-Clause
 *****************************************************************************/

/*****************************************************************************
 *                      LIBRARY WRAPPER
 *****************************************************************************/

var ERFP_MAP = (function() {
    // Wrap the library in a package function
    "use strict"; // And enable strict mode for this library
    
    /************************************************************************
    *                      MODULE LEVEL / GLOBAL VARIABLES
    *************************************************************************/
    var public_interface,                // Object returned by the module
       m_map,                    // the main map
       m_kml_drainage_line_layers, m_kml_catchment_layers,
       m_popup, m_popup_element,
       m_map_extent; 
        
    
    /************************************************************************
    *                    PRIVATE FUNCTION DECLARATIONS
    *************************************************************************/
    var updateExtents,toTitleCase, displayHydrograph;


    /************************************************************************
    *                    PRIVATE FUNCTION IMPLEMENTATIONS
    *************************************************************************/
    
    //FUNCTION: zooms to all kml files
    updateExtents = function() {
        var new_extent = ol.extent.createEmpty();
        var coordinates = [];
        m_kml_drainage_line_layers.map(function(kml_vector_layer){
            var vector_source = kml_vector_layer.getSource();
            if (vector_source.getState() == 'ready') {
                ol.extent.extend(extent, vector_source.getExtent());
            }
        });
        m_map.getView().fixExtent(new_extent, m_map.getSize());
    };
    
    toTitleCase = function(str)
    {
        return str.replace(/\w\S*/g, function(txt){return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();});
    }

    //FUNCTION: displays hydrograph at stream segment
    displayHydrograph = function(feature) {
        var id = feature.get('name');
        var watershed = feature.get("watershed_name");
        var subbasin = feature.get("subbasin_name")
        //get chart data
        jQuery.ajax({
            type: "GET",
            url: "get-hydrograph",
            dataType: "json",
            data: {
                watershed_name: watershed,
                subbasin_name: subbasin,
                reach_id: id                    
            },
            success: function(data) {
                $("#erfp-chart").empty();
                if("success" in data) {
                    $("#erfp-chart").highcharts({
                        title: { text: toTitleCase(watershed)},
                        subtitle: {text: toTitleCase(subbasin) + ": " + id},
                        plotOptions: {
                            series: {
                                marker: {
                                    enabled: false
                                }
                            }
                        },
                        xAxis: {
                            type: 'datetime',
                            title: {
                                text: 'Date'
                            },
                            dateTimeLabelFormats: { // don't display the dummy year
                                month: '%e. %b',
                                year: '%b'
                            },
                        },
                        yAxis: {            
                            title: {
                                text: 'Flow (cms)'
                            },
                            min: 0
                        },
                        series: [
                            {
                                name: "Maximum",
                                data: data['max']
                            },
                            {
                                name: "Mean Plus Std. Dev.",
                                data: data['mean_plus_std']
                            },
                            {
                                name: "Mean",
                                data: data['mean']
                            },
                            {
                                name: "Mean Minus Std. Dev.",
                                data: data['mean_minus_std']
                            },
                            {
                                name: "Minimum",
                                data: data['min']
                            },
                        ]
                    });
                    
                } else {
                    $("#erfp-chart").text("Error: " + data["error"])
                    console.log(data);
                }
            }
        });


    };

    
    /************************************************************************
    *                        DEFINE PUBLIC INTERFACE
    *************************************************************************/
    /*
     * Library object that contains public facing functions of the package.
     * This is the object that is returned by the library wrapper function.
     * See below.
     * NOTE: The functions in the public interface have access to the private
     * functions of the library because of JavaScript function scope.
     */
    public_interface = {
        hello_goodbye: function() {
        },
    };
    
    /************************************************************************
    *                  INITIALIZATION / CONSTRUCTOR
    *************************************************************************/
    
    // Initialization: jQuery function that gets called when 
    // the DOM tree finishes loading
    $(function() {

        var apiKey = "AiW41aALyX4pDfE0jQG93WywSHLih1ihycHtwbaIPmtpZEOuw1iloQuuBmwJm5UA";

        var kml_catchment_urls = JSON.parse($("#map").attr('catchment-kml-urls'));
        var kml_drainage_line_urls = JSON.parse($("#map").attr('drainage-line-kml-urls'));
        //load catchment kml layers
        m_kml_catchment_layers = [];
        kml_catchment_urls.map(function(kml_url) {
            var new_layer = new ol.layer.Vector({
                selectable: false,
                source: new ol.source.KML({
                    projection: new ol.proj.get('EPSG:3857'),
                    url: kml_url,
                }),
            });
            m_kml_catchment_layers.push(new_layer);
        });
        //load drainage line kml layers
        m_kml_drainage_line_layers = [];
        kml_drainage_line_urls.map(function(kml_url) {
            var new_layer = new ol.layer.Vector({
                selectable: true,
                source: new ol.source.KML({
                    projection: new ol.proj.get('EPSG:3857'),
                    url: kml_url,
                }),
            });
            m_kml_drainage_line_layers.push(new_layer);
        });

        //send message to user if Drainage Line KML file not found
        if (kml_drainage_line_urls.length <= 0) {
            $("#erfp-chart").text("No Drainage Line KML files found. Please upload to begin.");
        }

        //make drainage line layers selectable
        var select_interaction = new ol.interaction.Select({
                                    layers: m_kml_drainage_line_layers,
                                });

        //make chart control in map
        var chart_control = new ol.control.Control({element: $("#erfp-chart").get(0)});

        //combine kml layers
        var all_kml_layers = m_kml_catchment_layers.concat(m_kml_drainage_line_layers);

        //create map
        m_map = new ol.Map({
            target: 'map',
            controls: ol.control.defaults().extend([
                new ol.control.FullScreen(),
                new ol.control.ZoomToExtent(),
                chart_control
            ]),
            interactions: ol.interaction.defaults().extend([
                new ol.interaction.DragRotateAndZoom(),
                select_interaction,

            ]),
            layers : [
                new ol.layer.Tile({
                    source: new ol.source.BingMaps({key: apiKey, imagerySet: "Aerial"}),
                }),
                new ol.layer.Group({ 
                    layers: all_kml_layers,
                })

            ],
            view: new ol.View({
                center: [-33519607, 5616436],
                zoom: 8
            })
        });

        //wait for kml layers to load and then zoom to them
        var m_map_extent = ol.extent.createEmpty();
        m_kml_drainage_line_layers.map(function(kml_vector_layer){
            var vector_source = kml_vector_layer.getSource();
            var listener_key = vector_source.on('change', 
                function() {
                    if (vector_source.getState() == 'ready') {
                        ol.extent.extend(m_map_extent, vector_source.getExtent());
                        m_map.getView().fitExtent(m_map_extent, m_map.getSize());
                    }
            });
        });

        //when selected, call function to make hydrograph
        select_interaction.getFeatures().on('change:length', function(e) {
          if (e.target.getArray().length === 0) {
            // this means it's changed to no features selected
          } else {
            // this means there is at least 1 feature selected
            displayHydrograph(e.target.item(0)); // 1st feature in Collection
          }
        });


    });

    return public_interface;

}()); // End of package wrapper 
// NOTE: that the call operator (open-closed parenthesis) is used to invoke the library wrapper 
// function immediately after being parsed.
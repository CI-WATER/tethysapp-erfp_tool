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
       m_map_extent;            //the extent of all objects in map
        
    
    /************************************************************************
    *                    PRIVATE FUNCTION DECLARATIONS
    *************************************************************************/
    var bindInputs, zoomToAll, zoomToLayer, toTitleCase, updateInfoAlert, 
        getChartData, displayHydrograph;


    /************************************************************************
    *                    PRIVATE FUNCTION IMPLEMENTATIONS
    *************************************************************************/
    //FUNCTION: binds dom elements to layer
    bindInputs = function(layerid, layer) {
      new ol.dom.Input($(layerid + ' .visible')[0])
          .bindTo('checked', layer, 'visible');
      $.each(['opacity'],
          function(i, v) {
            new ol.dom.Input($(layerid + ' .' + v)[0])
                .bindTo('value', layer, v)
                .transform(parseFloat, String);
          }
      );
    }    
    //FUNCTION: zooms to all kml files
    zoomToAll = function() {
        m_map.getView().fitExtent(m_map_extent, m_map.getSize());
    };
    //FUNCTION: zooms to kml layer with id layer_id
    zoomToLayer = function(layer_id) {
        m_map.getLayers().forEach(function(layer, i) {
            if (layer instanceof ol.layer.Group) {
                layer.getLayers().forEach(function(sublayer, j) {
                    if(sublayer.get('layer_id') == layer_id) {
                        var source = sublayer.getSource();
                        m_map.getView().fitExtent(source.getExtent(), m_map.getSize());
                        return;
                    }
                });
            }
        });    
    };

    //FUNCTION: converts string to title case  
    toTitleCase = function(str)
    {
        return str.replace(/\w\S*/g, function(txt){return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();});
    }

    //FUNCTION: displays alert to user
    updateInfoAlert = function(css_alert_class, alert_message) {
        $("#erfp-info").removeClass('alert-info');
        $("#erfp-info").removeClass('alert-warning');
        $("#erfp-info").removeClass('alert-danger');
        $("#erfp-info").addClass(css_alert_class);
        var glyphycon = '';
        if(css_alert_class == 'alert-info') {
            glyphycon = '<span class="glyphicon glyphicon-info-sign" aria-hidden="true"></span> ';
        }
        else if(css_alert_class == 'alert-warning') {
            glyphycon = '<span class="glyphicon glyphicon-exclamation-sign" aria-hidden="true"></span> ';
        }
        else if(css_alert_class == 'alert-danger') {
            glyphycon = '<span class="glyphicon glyphicon-fire" aria-hidden="true"></span> ';
        }

        $("#erfp-chart").html(glyphycon + alert_message);

    }

    getChartData = function(id, watershed, subbasin, start_folder) {
        //clear old chart
        var highcharts_attr = $('#erfp-chart').attr('data-highcharts-chart');              
        // For some browsers, `attr` is undefined; for others,
        // `attr` is false.  Check for both.
        if (typeof highcharts_attr !== typeof undefined && highcharts_attr !== false) {
            $('#erfp-chart').highcharts().destroy();
            $('#erfp-chart').empty();
        }

        //get chart data
        jQuery.ajax({
            type: "GET",
            url: "get-hydrograph",
            dataType: "json",
            data: {
                watershed_name: watershed,
                subbasin_name: subbasin,
                reach_id: id,
                start_folder: start_folder,                    
            },
            success: function(data) {
                if("success" in data) {
                    $("#erfp-chart").highcharts({
                        title: { text: toTitleCase(watershed)},
                        subtitle: {text: toTitleCase(subbasin) + ": " + id},
                        chart: {zoomType: 'x',},
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
                            minRange: 1 * 24 * 3600000 // one day
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
                    updateInfoAlert('alert-danger', "Error: " + data["error"]);
                }
            },
            error: function(request, status, error) {
                updateInfoAlert('alert-danger', "Error: " + error);
            },
        });
    };

    //FUNCTION: displays hydrograph at stream segment
    displayHydrograph = function(feature) {
        var id = feature.get('name');
        var watershed = feature.get("watershed_name");
        var subbasin = feature.get("subbasin_name");
        getChartData(id, watershed, subbasin, "most_recent");
        //get the select data
        jQuery.ajax({
            type: "GET",
            url: "get-avaialable-dates",
            dataType: "json",
            data: {
                watershed_name: watershed,
                subbasin_name: subbasin,
                reach_id: id                    
            },
            success: function(data) {
                if("success" in data) {
                    //sort to get first element 
                    var select2_data = data['output_directories'];
                    select2_data.sort(function(a,b) {
                        b.id.localeCompare(a);
                    });
                    //create new select2
                    $('#erfp-select').select2({data: select2_data,
                                                placeholder: select2_data[0]['text']});
                    $('#erfp-select').removeClass('hidden');
                    //add on change function
                    $('#erfp-select').change(function() {
                        var folder = $(this).select2('data').id;
                        getChartData(id, watershed, subbasin, folder);
                    });
                } else {
                    updateInfoAlert('alert-danger', "Error: " + data["error"]);
                    $('#erfp-select').addClass('hidden');
                }
            },
            error: function(request, status, error) {
                updateInfoAlert('alert-danger', "Error: " + error);
                $('#erfp-select').addClass('hidden');
            },
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
        zoomToAll: function() {
            zoomToAll();
        },
    };
    
    /************************************************************************
    *                  INITIALIZATION / CONSTRUCTOR
    *************************************************************************/
    
    // Initialization: jQuery function that gets called when 
    // the DOM tree finishes loading
    $(function() {

        var apiKey = "AiW41aALyX4pDfE0jQG93WywSHLih1ihycHtwbaIPmtpZEOuw1iloQuuBmwJm5UA";

        //load drainage line kml layers
        var kml_urls = JSON.parse($("#map").attr('kml-urls'));
        var all_group_layers = [];
        var kml_drainage_line_layers = [];
        //get sorted list of watersheds
        var watershed_list = [];
        for (var watershed in kml_urls) {
            if(kml_urls.hasOwnProperty(watershed)) {
                watershed_list.push(watershed);
            }
        };
        watershed_list.sort();
        //add each watershed kml group
        watershed_list.forEach(function(watershed, group_index) {
            var kml_layers = [];                
            //add catchment if exists
            if('catchment' in kml_urls[watershed]) {
                var catchment = new ol.layer.Vector({
                    source: new ol.source.KML({
                        projection: new ol.proj.get('EPSG:3857'),
                        url: kml_urls[watershed]['catchment'],
                    }),
                });
                catchment.set('layer_id', 'layer' + group_index + 1);
                kml_layers.push(catchment);
            }
            
            //add drainage line if exists
            if('drainage_line' in kml_urls[watershed]) {
                var drainage_line = new ol.layer.Vector({
                    source: new ol.source.KML({
                        projection: new ol.proj.get('EPSG:3857'),
                        url: kml_urls[watershed]['drainage_line'],
                    }),
                });
                drainage_line.set('layer_id', 'layer' + group_index + 0);
                kml_drainage_line_layers.push(drainage_line);
                kml_layers.push(drainage_line);
            }
            var group_layer = new ol.layer.Group({ 
                    layers: kml_layers,
            });
            all_group_layers.push(group_layer);
        });


        //send message to user if Drainage Line KML file not found
        if (kml_drainage_line_layers.length <= 0) {
            updateInfoAlert('alert-warning', 'No Drainage Line KML files found. Please upload to begin.');
        }

        //make drainage line layers selectable
        var select_interaction = new ol.interaction.Select({
                                    layers: kml_drainage_line_layers,
                                });

        //make chart control in map
        var chart_control = new ol.control.Control({element: $("#erfp-info").get(0)});

        var basemap_layer = new ol.layer.Tile({
                                source: new ol.source.BingMaps({key: apiKey, imagerySet: "Aerial"}),
                            });

        var all_map_layers = [basemap_layer].concat(all_group_layers);
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
            layers : all_map_layers,
            view: new ol.View({
                center: [-33519607, 5616436],
                zoom: 8
            })
        });
        //wait for kml layers to load and then zoom to them
        var m_map_extent = ol.extent.createEmpty();
        all_group_layers.forEach(function(kml_group_layer){
            if (kml_group_layer instanceof ol.layer.Group) {
                kml_group_layer.getLayers().forEach(function(kml_vector_layer, j) {
                    var vector_source = kml_vector_layer.getSource();
                    var listener_key = vector_source.on('change', 
                        function() {
                            if (vector_source.getState() == 'ready') {
                                bindInputs('#'+kml_vector_layer.get('layer_id'), kml_vector_layer);
                                ol.extent.extend(m_map_extent, vector_source.getExtent());
                                m_map.getView().fitExtent(m_map_extent, m_map.getSize());
                            }
                    });
                });
            }
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

        
        //create function to zoom to feature
        $('.zoom-to-layer').click(function() {
            var layer_id = $(this).parent().parent().attr('id');
            zoomToLayer(layer_id);
        });


    });

    return public_interface;

}()); // End of package wrapper 
// NOTE: that the call operator (open-closed parenthesis) is used to invoke the library wrapper 
// function immediately after being parsed.
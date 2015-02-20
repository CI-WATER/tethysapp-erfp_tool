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
       m_chart,  //highcharts chart
       m_map_extent,           //the extent of all objects in map
       m_select_interaction,
       m_geoserver_drainage_line_layers,
       m_selected_feature,
       m_selected_watershed,
       m_selected_subbasin,
       m_selected_reach_id,
       m_selected_guess_index,
       m_selected_usgs_id,
       m_selected_nws_id,
       m_downloading_hydrograph,
       m_downloading_select,
       m_downloading_usgs,
       m_downloading_nws,
       m_chart_data_ajax_handle,
       m_select_data_ajax_handle;
        
    
    /************************************************************************
    *                    PRIVATE FUNCTION DECLARATIONS
    *************************************************************************/
    var bindInputs, zoomToAll, zoomToLayer, toTitleCase, datePadString,  
        updateInfoAlert, getBaseLayer, clearMessages, clearOldChart, 
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
                        if(sublayer.get('layer_type') == "kml") {
                            var source = sublayer.getSource();
                            m_map.getView().fitExtent(source.getExtent(), m_map.getSize());
                            return;
                        } else if (sublayer.get('layer_type') == "geoserver") {
                            m_map.getView().fitExtent(sublayer.get('extent'), m_map.getSize());
                            return;
                        }
                    }
                });
            }
        });    
    };

    //FUNCTION: converts string to title case  
    toTitleCase = function(str)
    {
        return str.replace(/\w\S*/g, function(txt){return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();});
    };
    //FUNCTION: to convert date to string
    datePadString = function(i) {
        return (i < 10) ? "0" + i : "" + i; 
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
        $("#erfp-message").removeClass('hidden');
        $("#erfp-message").html(glyphycon + alert_message);

    };

    //FUNCTION: adds appropriate base layer based on name
    getBaseLayer = function(base_layer_name, api_key) {
        if(base_layer_name == "BingMaps") {
            return new ol.layer.Tile({
                        source: new ol.source.BingMaps({key: api_key, imagerySet: "AerialWithLabels"}),
                    });
        } 
        else if (base_layer_name == "OSM") {

            return new ol.layer.Tile({
                        source: new ol.source.OSM(),
                    });
        }
        return new ol.layer.Group({
                        style: 'AerialWithLabels',
                        layers: [
                          new ol.layer.Tile({
                            source: new ol.source.MapQuest({layer: 'sat'})
                          }),
                          new ol.layer.Tile({
                            source: new ol.source.MapQuest({layer: 'hyb'})
                          })
                        ]
                });

    };

    clearMessages = function() {
        $('#erfp-message').addClass('hidden');
        $('#erfp-message').empty();
    };

    clearOldChart = function() {
       //clear old chart
        var highcharts_attr = $('#erfp-chart').attr('data-highcharts-chart');              
        // For some browsers, `attr` is undefined; for others,
        // `attr` is false.  Check for both.
        if (typeof highcharts_attr !== typeof undefined && highcharts_attr !== false) {
            $("#erfp-chart").highcharts().destroy();
            $('#erfp-chart').empty();
        }
    };

    getChartData = function(start_folder) {
        m_chart_data_ajax_handle = null;
        //make sure old chart is removed
        clearOldChart();
        if(!m_downloading_hydrograph && !m_downloading_select) {
            updateInfoAlert('alert-info', "Retrieving Data ...");
            m_downloading_hydrograph = true;
            $('#erfp-select').addClass('hidden');
            $('#erfp-chart').removeClass('hidden');
            $("#erfp-chart").highcharts({
                title: { text: toTitleCase(m_selected_watershed)},
                subtitle: {text: toTitleCase(m_selected_subbasin) + ": " + m_selected_reach_id},
                chart: {
                    zoomType: 'x',
                },
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
            });

            //get ecmwf data
            m_chart_data_ajax_handle = jQuery.ajax({
                type: "GET",
                url: "get-hydrograph",
                dataType: "json",
                data: {
                    watershed_name: m_selected_watershed,
                    subbasin_name: m_selected_subbasin,
                    reach_id: m_selected_reach_id,
                    guess_index:  m_selected_guess_index, 
                    start_folder: start_folder,                    
                },
                success: function(data) {
                    if("success" in data) {
                        var chart = $("#erfp-chart").highcharts();
                        if("max" in data) {
                            chart.addSeries({
                                                name: "Maximum",
                                                data: data['max'],
                                                color: '#BE2625',
                                            });
                        }
                        if("mean_plus_std" in data) {
                            chart.addSeries({
                                                name: "Mean Plus Std. Dev.",
                                                data: data['mean_plus_std'],
                                                color: '#61B329',
                                            });
                        }                        
                        if("mean" in data) {
                            chart.addSeries({
                                                name: "Mean",
                                                data: data['mean'],
                                                color: '#00688B',
                                            });
                        }
                        if("mean_minus_std" in data) {
                            chart.addSeries({
                                                name: "Mean Minus Std. Dev.",
                                                data: data['mean_minus_std'],
                                                color: '#61B329',
                                            });
                        }
                        if("min" in data) {
                            chart.addSeries({
                                                name: "Minimum",
                                                data: data['min'],
                                                color: '#BE2625',
                                            });
                        }
                        if("high_res" in data) {
                            chart.addSeries({
                                                name: "High Res.",
                                                data: data['high_res'],
                                                dashStyle: 'longdash',
                                                color: '#ffa500'
                                            });
                        }
                        if("hrrr_data" in data) {
                            chart.addSeries({
                                                name: "WRF-Hydro",
                                                data: data['hrrr_data'],
                                                dashStyle: 'longdash',
                                            });
                        }
                        $('#erfp-select').removeClass('hidden');
                         clearMessages();
                    } else {
                        updateInfoAlert('alert-danger', "Error: " + data["error"]);
                        $('#erfp-chart').addClass('hidden');
                    }
                },
                error: function(request, status, error) {
                    updateInfoAlert('alert-danger', "Error: " + error);
                    $('#erfp-chart').addClass('hidden');
                },
            })
            .always(function() {
                m_downloading_hydrograph = false;
            });
            //get dates
            var date_now = new Date();
            var date_now_string = datePadString(date_now.getFullYear()) + "-" +
                                  datePadString(1 + date_now.getMonth()) + "-" +
                                  datePadString(date_now.getDate());
            var date_past = new Date();
            date_past.setDate(date_now.getDate()-7);
            var date_past_string = datePadString(date_past.getFullYear()) + "-" +
                                  datePadString(1 + date_past.getMonth()) + "-" +
                                  datePadString(date_past.getDate());
            var date_future = new Date();
            date_future.setDate(date_now.getDate()+7);
            var date_future_string = datePadString(date_future.getFullYear()) + "-" +
                                  datePadString(1 + date_future.getMonth()) + "-" +
                                  datePadString(date_future.getDate());
            if(typeof m_selected_usgs_id != 'undefined' && !isNaN(m_selected_usgs_id) && m_selected_usgs_id.length >= 8) {
                m_downloading_usgs = true;;
                //get USGS data
                var chart_usgs_data_ajax_handle = jQuery.ajax({
                    type: "GET",
                    url: "http://waterservices.usgs.gov/nwis/iv/",
                    dataType: "json",
                    data: {
                        format: 'json',
                        sites: m_selected_usgs_id,
                        startDT: date_past_string,
                        endDT:  date_now_string, 
                        parameterCd: '00060',                    
                    },
                    success: function(data) {
                        if(typeof data != 'undefined') {
                            var time_series = [];
                            try {
                                data.value.timeSeries[0].values[0].value.map(function(data) {
                                    time_series.push([Date.parse(data.dateTime), parseFloat(data.value)]);
                                });
                                var chart = $("#erfp-chart").highcharts();
                                chart.addSeries({
                                                name: "USGS",
                                                data: time_series,
                                                dashStyle: 'longdash',
                                            });
                            } catch (e) {
                                if (e instanceof TypeError) {
                                    console.log(data);
                                } 
                            }
                        }
                    },
                    error: function(request, status, error) {
                        updateInfoAlert('alert-danger', "Error: " + error);
                    },
                })
                .always(function() {
                    m_downloading_usgs = false;
                });
            }
            if(typeof m_selected_nws_id != 'undefined' && !isNaN(m_selected_nws_id)) {
                m_downloading_nws = true;
                //get NWS data
                var chart_nws_data_ajax_handle = jQuery.ajax({
                    type: "GET",
                    url: "http://wwokiweb01.cloudapp.net:8080/KiWIS/KiWIS",
                    dataType: "json",
                    data: {
                        service: 'kisters',
                        type: 'queryServices',
                        request: 'getTimeseriesValues',
                        datasource: '0',
                        format: 'json',
                        ts_id: m_selected_nws_id,
                        from: date_now_string,
                        to:  date_future_string, 
                    },
                    success: function(data) {
                        var time_series = [];
                        data[0].data.map(function(data) {
                            time_series.push([Date.parse(data[0]), parseFloat(data[1])]);
                        });
                        var chart = $("#erfp-chart").highcharts();
                        chart.addSeries({
                                        name: "NWS",
                                        data: time_series,
                                        dashStyle: 'longdash',
                                    });
                    },
                    error: function(request, status, error) {
                        updateInfoAlert('alert-danger', "Error: " + error);
                    },
                })
                .always(function() {
                    m_downloading_nws = false;
                });
            }
        }
        else {
             //updateInfoAlert
            updateInfoAlert('alert-warning', "Please wait for datasets to download before making another selection.");
       }
    };

    //FUNCTION: displays hydrograph at stream segment
    displayHydrograph = function(feature, reach_id, watershed, subbasin, guess_index, usgs_id, nws_id) {
        //remove old chart reguardless
        clearOldChart();
        //check if old ajax call still running
        if(!m_downloading_hydrograph && !m_downloading_select) {
            m_selected_feature = feature;
            m_selected_reach_id = reach_id;
            m_selected_watershed = watershed;
            m_selected_subbasin = subbasin;
            m_selected_guess_index = guess_index;
            m_selected_usgs_id = usgs_id;
            m_selected_nws_id = nws_id;
            $('#erfp-select').addClass('hidden');
            getChartData("most_recent");
            //get the select data
            m_downloading_select = true;
            m_select_data_ajax_handle = jQuery.ajax({
                type: "GET",
                url: "get-avaialable-dates",
                dataType: "json",
                data: {
                    watershed_name: m_selected_watershed,
                    subbasin_name: m_selected_subbasin,
                    reach_id: m_selected_reach_id,                   
                },
                success: function(data) {
                    if("success" in data) {
                        //remove select2 if exists
                        if($('#erfp-select').data('select2')) {
                            //remove event handler
                            $('#erfp-select').off();
                            //remove selection
                            $('#erfp-select').select2('val', '');
                            //destroy
                            $('#erfp-select').select2('destroy');
                        }
                        
                        //sort to get first element 
                        var select2_data = data['output_directories'];
    
                        //create new select2
                        $('#erfp-select').select2({data: select2_data,
                                                    placeholder: "Select a Date"});
                        //add on change event handler
                        $('#erfp-select').change(function() {
                            var folder = $(this).select2('data').id;
                            getChartData(folder);
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
            })
            .always(function() {
                m_downloading_select = false;
            });
        }
        else {
            //updateInfoAlert
            updateInfoAlert('alert-warning', "Please wait for datasets to download before making another selection.");
            //clear selection and select previously selected feature
            m_select_interaction.getFeatures().clear();
            m_select_interaction.getFeatures().push(m_selected_feature);
        }

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
        //initialize map global variables
        m_selected_feature = null;
        m_selected_watershed = null;
        m_selected_subbasin = null;
        m_selected_reach_id = null;
        m_selected_guess_index = null;
        m_selected_usgs_id = null;
        m_selected_nws_id = null;
        m_downloading_hydrograph = false;
        m_downloading_select = false;
        m_downloading_usgs = false;
        m_downloading_nws = false;
        m_chart_data_ajax_handle = null;
        m_select_data_ajax_handle = null;
        m_map_extent = ol.extent.createEmpty();
        //load base layer
        var base_layer_info = JSON.parse($("#map").attr('base-layer-info'));
        
        var basemap_layer = getBaseLayer(base_layer_info.name,base_layer_info.api_key);
        
        //load drainage line kml layers
        var kml_info = JSON.parse($("#map").attr('layer-info'));
        var all_group_layers = [];
        var drainage_line_layers = [];
        //add each watershed kml group
        kml_info.forEach(function(kml_url, group_index) {
            var layers = [];
            if('geoserver_url' in kml_url) {
                //add catchment if exists
                if('catchment' in kml_url) {
                    var catchment = new ol.layer.Tile({
                        source: new ol.source.TileWMS({
                            url: kml_url['geoserver_url'],
                            params: {'LAYERS': kml_url['catchment']['name'], 
                                     'TILED': true},
                            serverType: 'geoserver',
                        }),
                    });
                    catchment.set('extent', ol.proj.transformExtent(kml_url['catchment']['latlon_bbox'].map(Number), 
                                                            'EPSG:4326',
                                                            'EPSG:3857'));
                    catchment.set('layer_id', 'layer' + group_index + 1);
                    catchment.set('layer_type', 'geoserver');
                    layers.push(catchment);
                }
                
                //add drainage line if exists
                if('drainage_line' in kml_url) {
                    var drainage_line_vector_source = new ol.source.ServerVector({
                        format: new ol.format.GeoJSON(),
                        loader: function(extent, resolution, projection) {
                            var stream_flow_limit = 100;
                            var map_zoom = m_map.getView().getZoom();
                            if (map_zoom > 10) {
                                stream_flow_limit = 20;
                            } else if (map_zoom > 15) {
                                stream_flow_limit = 0;
                            }
                            var url = kml_url['drainage_line']['geojsonp'] + 
                                  '&format_options=callback:loadFeatures' +
                                  '&PROPERTYNAME=the_geom,COMID' +
                                  '&CQL_FILTER=Natur_Flow > ' + stream_flow_limit +
                                  ' AND bbox(the_geom,' + extent.join(',') + 
                                  ',\'EPSG:3857\')' +
                                  '&srsname=EPSG:3857';
                            jQuery.ajax({
                                url: encodeURI(url),
                                dataType: 'jsonp',
                                jsonpCallback: 'loadFeatures',
                                success: function(response) {
                                    drainage_line_vector_source.addFeatures(drainage_line_vector_source.readFeatures(response));
                                },
                            });
                          },
                          strategy: function(extent, resolution) {
                              var zoom_range = 1;
                              var map_zoom = m_map.getView().getZoom();
                              if (map_zoom > 10) {
                                  zoom_range = 2;
                              } else if (map_zoom > 15) {
                                  zoom_range = 3;
                              }
                              if(zoom_range != this.zoom_range && typeof this.zoom_range != 'undefined') {
                                  this.clear();  
                              }
                              this.zoom_range = zoom_range;
                              return [extent];
                          },
                          projection: 'EPSG:3857'
                    });
                    var drainage_line = new ol.layer.Vector({
                        source: drainage_line_vector_source,
                    });
                    drainage_line.set('watershed_name', kml_url['watershed']);
                    drainage_line.set('subbasin_name', kml_url['subbasin']);
                    drainage_line.set('extent', ol.proj.transformExtent(kml_url['drainage_line']['latlon_bbox'].map(Number), 
                                                            'EPSG:4326',
                                                            'EPSG:3857'));
                    drainage_line.set('layer_id', 'layer' + group_index + 0);
                    drainage_line.set('layer_type', 'geoserver');
                    drainage_line_layers.push(drainage_line);
                    layers.push(drainage_line);
                }
            } else {                
                //add catchment if exists
                if('catchment' in kml_url) {
                    var catchment = new ol.layer.Vector({
                        source: new ol.source.KML({
                            projection: new ol.proj.get('EPSG:3857'),
                            url: kml_url['catchment'],
                        }),
                    });
                    catchment.set('layer_id', 'layer' + group_index + 1);
                    catchment.set('layer_type', 'kml');
                    layers.push(catchment);
                }
                
                //add drainage line if exists
                if('drainage_line' in kml_url) {
                    var drainage_line = new ol.layer.Vector({
                        source: new ol.source.KML({
                            projection: new ol.proj.get('EPSG:3857'),
                            url: kml_url['drainage_line'],
                        }),
                    });
                    drainage_line.set('layer_id', 'layer' + group_index + 0);
                    drainage_line.set('layer_type', 'kml');
                    drainage_line_layers.push(drainage_line);
                    layers.push(drainage_line);
                }
            }
            var group_layer = new ol.layer.Group({ 
                    layers: layers,
            });
            all_group_layers.push(group_layer);
        });


        //send message to user if Drainage Line KML file not found
        if (drainage_line_layers.length <= 0) {
            updateInfoAlert('alert-warning', 'No Drainage Line files found. Please upload to begin.');
        }

        //make drainage line layers selectable
        m_select_interaction = new ol.interaction.Select({
                                    layers: drainage_line_layers,
                                });

        //make chart control in map
        var chart_control = new ol.control.Control({element: $("#erfp-info").get(0)});

        var all_map_layers = [basemap_layer].concat(all_group_layers);
        //var all_map_layers = all_group_layers;
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
                m_select_interaction,

            ]),
            layers : all_map_layers,
            view: new ol.View({
                center: [-33519607, 5616436],
                zoom: 8
            })
        });
        //wait for kml layers to load and then zoom to them
        all_group_layers.forEach(function(group_layer){
            if (group_layer instanceof ol.layer.Group) {
                group_layer.getLayers().forEach(function(vector_layer, j) {
                    if(vector_layer.get('layer_type') == "kml") {
                        var vector_source = vector_layer.getSource();
                        var listener_key = vector_source.on('change', 
                            function() {
                                if (vector_source.getState() == 'ready') {
                                    bindInputs('#'+vector_layer.get('layer_id'), vector_layer);
                                    ol.extent.extend(m_map_extent, vector_source.getExtent());
                                    m_map.getView().fitExtent(m_map_extent, m_map.getSize());
                                }
                        });
                    } else if (vector_layer.get('layer_type') == "geoserver") {
                        bindInputs('#'+vector_layer.get('layer_id'), vector_layer);
                        ol.extent.extend(m_map_extent, vector_layer.get('extent'));
                        m_map.getView().fitExtent(m_map_extent, m_map.getSize());
                    }
                });
            }
        });

        

        //when selected, call function to make hydrograph
        m_select_interaction.getFeatures().on('change:length', function(e) {
          if (e.target.getArray().length === 0) {
            // this means it's changed to no features selected
          } else {
           // this means there is at least 1 feature selected
            var selected_feature = e.target.item(0); // 1st feature in Collection
            var reach_id = selected_feature.get('name');
            var watershed_name = selected_feature.get("watershed_name");
            var subbasin_name = selected_feature.get("subbasin_name");
            var guess_index = selected_feature.get("guess_index");
            var usgs_id = selected_feature.get("usgs_id");
            var nws_id = selected_feature.get("nws_id");
            
            if(typeof reach_id == 'undefined' || isNaN(reach_id)) {
                var reach_id = selected_feature.get('COMID');
            }

            if(typeof watershed_name == 'undefined') {
                var watershed_name = "huc region 12";
                var subbasin_name = "region 12";
            }

            if(typeof usgs_id != 'undefined' && !isNaN(usgs_id) && usgs_id.length < 8) {
                usgs_id = '0' + usgs_id;
            }

            displayHydrograph(selected_feature, 
                            reach_id,
                            watershed_name,
                            subbasin_name, 
                            guess_index,
                            usgs_id,
                            nws_id); 
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
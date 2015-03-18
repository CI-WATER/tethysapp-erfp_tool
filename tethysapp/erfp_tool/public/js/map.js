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
       m_map_projection, //main map projection
       m_map_extent,           //the extent of all objects in map
       m_drainage_line_layers,
       m_select_interaction,
       m_chart,  //highcharts chart
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
       m_searching_for_reach,
       m_chart_data_ajax_handle,
       m_chart_data_ajax_load_failed,
       m_select_data_ajax_handle,
       m_units;
        
    
    /************************************************************************
    *                    PRIVATE FUNCTION DECLARATIONS
    *************************************************************************/
    var bindInputs, convertTimeSeriesMetricToEnglish, convertTimeSeriesEnglishToMetric,
        isNotLoadingPastRequest, zoomToAll, zoomToLayer, zoomToFeature, toTitleCase, 
        removeInfoDivClases, datePadString, updateInfoAlert, getBaseLayer, 
        getTileLayer, getKMLLayer, clearMessages, clearOldChart, 
        clearChartSelect2, getChartData, displayHydrograph, 
        loadHydrographFromFeature;


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
    
    //FUNCTION: convert units from metric to english
    convertTimeSeriesMetricToEnglish = function(time_series) {
        if(m_units=="english") {
            var new_time_series = [];
            time_series.map(function(data) {
                new_time_series.push([data[0], 
                                        data[1]*35.3146667]);
            });
            return new_time_series;
        }
        return time_series;
    };
    //FUNCTION: convert units from english to metric
    convertTimeSeriesEnglishToMetric = function(time_series, series_name) {
        var new_time_series = [];
        var date_time_value, data_value;
        var conversion_factor = 1;
        try {
            if (m_units == "metric") {
                conversion_factor = 35.3146667;
            }
            time_series.map(function(data) {
               if (series_name=="USGS") {
                   data_value = data.value;
                   date_time_value = data.dateTime;
               } else {
                   date_time_value = data[0];
                   data_value = data[1];
               }
               new_time_series.push([Date.parse(date_time_value), 
                                        parseFloat(data_value)/conversion_factor]);
            });
        } catch (e) {
            if (e instanceof TypeError) {
                updateInfoAlert('alert-danger', "Error loading " + series_name + " data.");
            }
        }
        return new_time_series;
    };
    //FUNCTION: check if loading past request
    isNotLoadingPastRequest = function() {
        return !m_downloading_hydrograph && !m_downloading_select && 
            !m_downloading_usgs && !m_downloading_nws;
    }
    //FUNCTION: zooms to all kml files
    zoomToAll = function() {
        m_map.getView().fitExtent(m_map_extent, m_map.getSize());
    };

    //FUNCTION: zooms to layer with id layer_id
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

    //FUNCTION: zooms to feature in layer
    zoomToFeature = function(watershed_info, reach_id) {
        if(!m_searching_for_reach) {
            $("#reach-id-help-message").text('');
            $("#reach-id-help-message").parent().removeClass('alert-danger');
            var search_id_button = $("#submit-search-reach-id");
            var search_id_button_html = search_id_button.html();
            search_id_button.text('Searching ...');
            var watershed_split = watershed_info.split(":");        
            var watershed_name = watershed_split[0];
            var subbasin_name = watershed_split[1];
            
            m_drainage_line_layers.forEach(function(drainage_line_layer, j) {
                if(drainage_line_layer.get('watershed_name') == watershed_name &&
                    drainage_line_layer.get('subbasin_name') == subbasin_name) {
                    if(drainage_line_layer.get('layer_type') == "kml") {
                        var features = drainage_line_layer.getSource().getFeatures();
                        for(var i=0; features.length>i; i++) {
                            var feature_reach_id = features[i].get('COMID');
                            if(typeof feature_reach_id == 'undefined' || isNaN(feature_reach_id)) {
                                var feature_reach_id = features[i].get('name');
                            }
    
                            if (feature_reach_id == reach_id) {
                                var geometry = features[i].get('geometry');
                                m_map.getView().fitExtent(geometry.getExtent(), m_map.getSize());
                                search_id_button.html(search_id_button_html);
                                m_select_interaction.getFeatures().clear();
                                m_select_interaction.getFeatures().push(features[i]);
                                return;
                            }
                        }
                        $("#reach-id-help-message").text('Reach ID ' + reach_id + ' not found');
                        $("#reach-id-help-message").parent().addClass('alert-danger');
                        search_id_button.html(search_id_button_html);
                        return;
                    } else if (drainage_line_layer.get('layer_type') == "geoserver") {
                        m_searching_for_reach = true;
                        var url = drainage_line_layer.get('geoserver_url') + 
                              '&format_options=callback:searchFeatures' +
                              '&CQL_FILTER=COMID =' + reach_id +
                              '&srsname=' + m_map_projection;
                        jQuery.ajax({
                            url: encodeURI(url),
                            dataType: 'jsonp',
                            jsonpCallback: 'searchFeatures',
                            success: function(response) {
                                console.log(response);
                                if (response.totalFeatures > 0) {
                                    var features = drainage_line_layer.getSource().readFeatures(response);
                                    m_map.getView().fitExtent(features[0].getGeometry().getExtent(), m_map.getSize());
                                    m_select_interaction.getFeatures().clear();
                                    m_select_interaction.getFeatures().push(features[0]);
                                } else {
                                    $("#reach-id-help-message").text('Reach ID ' + reach_id + ' not found');
                                    $("#reach-id-help-message").parent().addClass('alert-danger');
                                }
                            },
                        }).always(function() {
                            m_searching_for_reach = false;
                            search_id_button.html(search_id_button_html);
                        });
                        return;
                    }
                }
            });
        }   
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

    //FUNCTION: resets info div css
    removeInfoDivClases = function() {
        $("#erfp-info").removeClass('alert-info');
        $("#erfp-info").removeClass('alert-warning');
        $("#erfp-info").removeClass('alert-danger');
    };

    //FUNCTION: displays alert to user
    updateInfoAlert = function(css_alert_class, alert_message) {
        removeInfoDivClases();
        var glyphycon = '';
        if(css_alert_class == 'alert-info') {
            $("#erfp-info").addClass(css_alert_class);
            glyphycon = '<span class="glyphicon glyphicon-info-sign" aria-hidden="true"></span> ';
        }
        else if(css_alert_class == 'alert-warning') {
            $("#erfp-info").addClass(css_alert_class);
            glyphycon = '<span class="glyphicon glyphicon-exclamation-sign" aria-hidden="true"></span> ';
        }
        else if(css_alert_class == 'alert-danger') {
            $("#erfp-info").addClass(css_alert_class);
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
        else if (base_layer_name == "Esri") {
            return new ol.layer.Tile({
              source: new ol.source.XYZ({
                attributions: [new ol.Attribution({
                  html: 'Tiles &copy; <a href="http://services.arcgisonline.com/ArcGIS/' +
                      'rest/services/World_Topo_Map/MapServer">ArcGIS</a>'
                })],
                url: 'http://server.arcgisonline.com/ArcGIS/rest/services/' +
                    'World_Topo_Map/MapServer/tile/{z}/{y}/{x}'
              })
            });
        }
        //default to mapquest
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

    //FUNCTION: gets KML layer for geoserver
    getKMLLayer = function(layer_info, layer_id, watershed_name, subbasin_name) {
        var layer = new ol.layer.Vector({
            source: new ol.source.KML({
                projection: new ol.proj.get(m_map_projection),
                url: layer_info,
            }),
        });
        layer.set('layer_id', layer_id);
        layer.set('layer_type', 'kml');
        if( typeof watershed_name != 'undefined') {
            layer.set('watershed_name', watershed_name);
        }
        if( typeof subbasin_name != 'undefined') {
            layer.set('subbasin_name', subbasin_name);
        }
        return layer;
    };

    //FUNCTION: gets tile layer for geoserver
    getTileLayer = function(layer_info, geoserver_url, layer_id) {
        var layer = new ol.layer.Tile({
            source: new ol.source.TileWMS({
                url: geoserver_url,
                params: {'LAYERS': layer_info['name'], 
                         'TILED': true},
                serverType: 'geoserver',
            }),
        });
        layer.set('extent', ol.proj.transformExtent(layer_info['latlon_bbox'].map(Number), 
                                                'EPSG:4326',
                                                m_map_projection));
        layer.set('layer_id', layer_id);
        layer.set('layer_type', 'geoserver');
        return layer;
    };

    //FUNCTION: removes message and hides the div
    clearMessages = function() {
        removeInfoDivClases();
        $('#erfp-message').addClass('hidden');
        $('#erfp-message').empty();
    };

    //FUNCTION: removes highchart
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

    //FUNCTION: removes chart select2
    clearChartSelect2 = function() {
        if($('#erfp-select').data('select2')) {
            $('#erfp-select').off('change.select2') //remove event handler
                             .select2('val', '') //remove selection
                             .select2('destroy'); //destroy
        }

    };

    //FUNCTION: gets all data for chart
    getChartData = function(start_folder) {
        m_chart_data_ajax_handle = null;
        m_chart_data_ajax_load_failed = false;
        if(isNotLoadingPastRequest()) {
            //make sure old chart is removed
            clearOldChart();
            //turn off select interaction
            m_map.removeInteraction(m_select_interaction);
            updateInfoAlert('alert-info', "Retrieving Data ...");
            m_downloading_hydrograph = true;
            $('#erfp-select').addClass('hidden');
            $('#erfp-reset').addClass('hidden');
            var y_axis_title = "Flow (cms)";
            if (m_units == "english") {
                y_axis_title = "Flow (cfs)";
            }
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
                        text: y_axis_title
                    },
                    min: 0
                },
            });
            $('#erfp-chart').addClass('hidden');

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
                                                data: convertTimeSeriesMetricToEnglish(data['max']),
                                                color: '#BE2625',
                                            });
                        }
                        if("mean_plus_std" in data) {
                            chart.addSeries({
                                                name: "Mean Plus Std. Dev.",
                                                data: convertTimeSeriesMetricToEnglish(data['mean_plus_std']),
                                                color: '#61B329',
                                            });
                        }                        
                        if("mean" in data) {
                            chart.addSeries({
                                                name: "Mean",
                                                data: convertTimeSeriesMetricToEnglish(data['mean']),
                                                color: '#00688B',
                                            });
                        }
                        if("mean_minus_std" in data) {
                            chart.addSeries({
                                                name: "Mean Minus Std. Dev.",
                                                data: convertTimeSeriesMetricToEnglish(data['mean_minus_std']),
                                                color: '#61B329',
                                            });
                        }
                        if("min" in data) {
                            chart.addSeries({
                                                name: "Minimum",
                                                data: convertTimeSeriesMetricToEnglish(data['min']),
                                                color: '#BE2625',
                                            });
                        }
                        if("high_res" in data) {
                            chart.addSeries({
                                                name: "High Res.",
                                                data: convertTimeSeriesMetricToEnglish(data['high_res']),
                                                dashStyle: 'longdash',
                                                color: '#ffa500'
                                            });
                        }
                        if("hrrr_data" in data) {
                            chart.addSeries({
                                                name: "WRF-Hydro",
                                                data: convertTimeSeriesMetricToEnglish(data['hrrr_data']),
                                                dashStyle: 'longdash',
                                            });
                        }
                        $('#erfp-select').removeClass('hidden');
                        $('#erfp-reset').removeClass('hidden');
                        $('#erfp-chart').removeClass('hidden');
                        clearMessages();
                    } else {
                        m_chart_data_ajax_load_failed = true;
                        updateInfoAlert('alert-danger', "Error: " + data["error"]);
                        clearChartSelect2();
                    }
                },
                error: function(request, status, error) {
                    m_chart_data_ajax_load_failed = true;
                    updateInfoAlert('alert-danger', "Error: " + error);
                    clearChartSelect2();
                },
            })
            .always(function() {
                m_downloading_hydrograph = false;
                m_map.addInteraction(m_select_interaction);
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
            if(typeof m_selected_usgs_id != 'undefined' && !isNaN(m_selected_usgs_id) &&
                m_selected_usgs_id != null) {
                if(m_selected_usgs_id.length >= 8) {
                    m_downloading_usgs = true;
                    //get USGS data
                    var chart_usgs_data_ajax_handle = jQuery.ajax({
                        type: "GET",
                        url: "http://waterservices.usgs.gov/nwis/iv/",
                        dataType: "json",
                        data: {
                            format: 'json',
                            sites: m_selected_usgs_id,
                            startDT: date_past_string,
                            endDT: date_now_string,
                            parameterCd: '00060',
                        },
                        success: function (data) {
                            if (typeof data != 'undefined') {
                                var time_series = [];
                                try {
                                    var chart = $("#erfp-chart").highcharts();
                                    chart.addSeries({
                                        name: "USGS (" + m_selected_usgs_id + ")",
                                        data: convertTimeSeriesEnglishToMetric(data.value.timeSeries[0].values[0].value, "USGS"),
                                        dashStyle: 'longdash',
                                    });
                                    $("#erfp-chart").removeClass("hidden");
                                } catch (e) {
                                    if (e instanceof TypeError) {
                                        updateInfoAlert('alert-danger', "Error loading USGS data.");
                                    }
                                }
                            }
                        },
                        error: function (request, status, error) {
                            updateInfoAlert('alert-danger', "Error: " + error);
                        },
                    })
                    .always(function () {
                        m_downloading_usgs = false;
                    });
                }
            }
            if(typeof m_selected_nws_id != 'undefined' && !isNaN(m_selected_nws_id) &&
                m_selected_nws_id != null) {
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
                        var chart = $("#erfp-chart").highcharts();
                        chart.addSeries({
                                        name: "NWS (" + m_selected_nws_id + ")",
                                        data: convertTimeSeriesEnglishToMetric(data[0].data, "NWS"),
                                        dashStyle: 'longdash',
                                    });
                        $("#erfp-chart").removeClass("hidden");
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
        //check if old ajax call still running
        if(isNotLoadingPastRequest()) {
            //remove old chart reguardless
            clearOldChart();
            m_selected_feature = feature;
            m_selected_reach_id = reach_id;
            m_selected_watershed = watershed;
            m_selected_subbasin = subbasin;
            m_selected_guess_index = guess_index;
            m_selected_usgs_id = usgs_id;
            m_selected_nws_id = nws_id;
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
            })
            .done(function(data) {
                if("success" in data && !m_chart_data_ajax_load_failed) {
                    //remove select2 if exists
                    clearChartSelect2();
                    $('#erfp-select').removeClass('hidden');
                    //sort to get first element 
                    var select2_data = data['output_directories'];

                    //create new select2
                    $('#erfp-select').select2({data: select2_data,
                                                placeholder: "Select a Date"});
                    if (m_downloading_hydrograph) {
                        $('#erfp-select').addClass('hidden');
                    }
                    //add on change event handler
                    $('#erfp-select').on('change.select2', function() {
                        var folder = $(this).select2('data').id;
                        getChartData(folder);
                    });
                } else if ("error" in data) {
                    updateInfoAlert('alert-danger', "Error: " + data["error"]);
                    clearChartSelect2();
                }
            })
            .fail(function(request, status, error) {
                updateInfoAlert('alert-danger', "Error: " + error);
                clearChartSelect2();
            })
            .always(function() {
                m_downloading_select = false;
            });
        }
        else {
            //updateInfoAlert
            updateInfoAlert('alert-warning', "Please wait for datasets to download before making another selection.");
        }

    };
    //FUNCTION: Loads Hydrograph from Selected feature
    loadHydrographFromFeature = function(selected_feature) {
        //get attributes
        var reach_id = selected_feature.get('COMID'); 
        var watershed_name = selected_feature.get("watershed_name");
        var subbasin_name = selected_feature.get("subbasin_name");
        var guess_index = selected_feature.get("guess_index");
        var usgs_id = selected_feature.get("usgs_id");
        var nws_id = selected_feature.get("nws_id");
        
        //in case the reach_id is in a differen location
        if(typeof reach_id == 'undefined' || isNaN(reach_id)) {
            var reach_id = selected_feature.get('name');
        }
        if(typeof watershed_name == 'undefined') {
            var watershed_name = selected_feature.get('watershed');
        }
        if(typeof subbasin_name == 'undefined') {
            var subbasin_name = selected_feature.get('subbasin');
        }

        if(typeof usgs_id != 'undefined' && !isNaN(usgs_id) && usgs_id != null) {
            //add zero in case it was removed when converted to a number
            if(usgs_id.length < 8) {
                usgs_id = '0' + usgs_id;
            }
        }
        if(typeof reach_id != 'undefined' &&  
           typeof watershed_name != 'undefined' &&
           typeof subbasin_name != 'undefined')
        {
            displayHydrograph(selected_feature, 
                            reach_id,
                            watershed_name,
                            subbasin_name, 
                            guess_index,
                            usgs_id,
                            nws_id); 
        } else {
            updateInfoAlert('alert-warning', 'The attributes in the file are faulty. Please fix and upload again.');
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
        $('#map_top_navigation').find('.form-group').addClass('inline-block');
        $('.bootstrap-switch-id-units-toggle').parent().addClass('units-toggle').addClass('ol-control');
        //initialize map global variables
        m_map_projection = 'EPSG:3857';
        m_map_extent = ol.extent.createEmpty();
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
        m_searching_for_reach = false;
        m_chart_data_ajax_handle = null;
        m_chart_data_ajax_load_failed = false;
        m_select_data_ajax_handle = null;
        m_units = "metric";
        //load base layer
        var base_layer_info = JSON.parse($("#map").attr('base-layer-info'));
        
        var basemap_layer = getBaseLayer(base_layer_info.name,base_layer_info.api_key);
        
        //load drainage line kml layers
        var layers_info = JSON.parse($("#map").attr('layers-info'));
        var all_group_layers = [];
        m_drainage_line_layers = [];
        //add each watershed kml group
        layers_info.forEach(function(layer_info, group_index) {
            var layers = [];
            if('geoserver_url' in layer_info) {
                //add catchment if exists
                if('catchment' in layer_info) {
                    layers.push(getTileLayer(layer_info['catchment'], layer_info['geoserver_url'], 'layer' + group_index + 'g' + 1));
                }
                //add gage if exists
                if('gage' in layer_info) {
                    layers.push(getTileLayer(layer_info['gage'], layer_info['geoserver_url'], 'layer' + group_index + 'g' + 2));
                }
                //add drainage line if exists
                if('drainage_line' in layer_info) {
                    var drainage_line_layer_id = 'layer' + group_index + 'g' + 0;
                    //check if required parameters exist
                    if(layer_info['drainage_line']['missing_attributes'].length > 0) {
                        updateInfoAlert('alert-danger', 'The drainage line layer for ' + 
                                                          layer_info['watershed'] + '(' +
                                                          layer_info['subbasin'] + ') ' +
                                                          'is missing '+ 
                                                          layer_info['drainage_line']['missing_attributes'] +
                                                          ' attributes and will not function properly.');
                    } 
                    //check layer capabilites
                    if(layer_info['drainage_line']['geoserver_method'] == "natur_flow_query") {
                        var load_features_xhr = null;
                        var drainage_line_vector_source = new ol.source.ServerVector({
                            format: new ol.format.GeoJSON(),
                            loader: function(extent, resolution, projection) {
                                var stream_flow_limit = 5000;
                                var map_zoom = m_map.getView().getZoom();
                                if (map_zoom >= 12) {
                                    stream_flow_limit = 0;
                                } else if (map_zoom >= 11) {
                                    stream_flow_limit = 20;
                                } else if (map_zoom >= 10) {
                                    stream_flow_limit = 100;
                                } else if (map_zoom >= 9) {
                                    stream_flow_limit = 1000;
                                } else if (map_zoom >= 8) {
                                    stream_flow_limit = 3000;
                                } else if (map_zoom >= 7) {
                                    stream_flow_limit = 4000;
                                }
                                var url = layer_info['drainage_line']['geojsonp'] + 
                                      '&format_options=callback:loadFeatures' + 
                                      drainage_line_layer_id +
                                      '&PROPERTYNAME=the_geom,' +
                                      layer_info['drainage_line']['contained_attributes'] +
                                      '&CQL_FILTER=Natur_Flow > ' + stream_flow_limit +
                                      ' AND bbox(the_geom,' + extent.join(',') + 
                                      ',\'' + m_map_projection + '\')' +
                                      '&srsname=' + m_map_projection;
                                //cancel load featues if still active
                                if(load_features_xhr != null) {
                                    load_features_xhr.abort();
                                }
                                //TODO: ADD LOADING MESSAGE
                                load_features_xhr = jQuery.ajax({
                                    url: encodeURI(url),
                                    dataType: 'jsonp',
                                    jsonpCallback: 'loadFeatures' + drainage_line_layer_id,
                                })
                                .done(function(response){
                                    drainage_line_vector_source.addFeatures(drainage_line_vector_source.readFeatures(response));
                                })
                                .always(function() {
                                   load_features_xhr = null;
                                });
                                //ON ERROR ADD MESSAGE
                                //ALWAYS REMOVE LOADING MESSAGE
                              },
                              strategy: function(extent, resolution) {
                                  var zoom_range = 1;
                                  var map_zoom = m_map.getView().getZoom();
                                  if (map_zoom >= 12) {
                                      zoom_range = 2;
                                  } else if (map_zoom >= 11) {
                                      zoom_range = 3;
                                  } else if (map_zoom >= 10) {
                                      zoom_range = 4;
                                  } else if (map_zoom >= 9) {
                                      zoom_range = 5;
                                  } else if (map_zoom >= 8) {
                                      zoom_range = 6;
                                  } else if (map_zoom >= 7) {
                                      zoom_range = 7;
                                  }

                                  if(zoom_range != this.zoom_range && typeof this.zoom_range != 'undefined') {
                                      this.clear();  
                                  }
                                  this.zoom_range = zoom_range;
                                  return [extent];
                              },
                              projection: m_map_projection,
                        });
                    } else { //layer_info['drainage_line']['geoserver_method'] == "simple"
                        var drainage_line_vector_source = new ol.source.ServerVector({
                            format: new ol.format.GeoJSON(),
                            loader: function(extent, resolution, projection) {
                                var url = layer_info['drainage_line']['geojsonp'] + 
                                      '&format_options=callback:loadFeatures' +
                                      drainage_line_layer_id +
                                      '&PROPERTYNAME=the_geom,' +
                                      layer_info['drainage_line']['contained_attributes'].join() +
                                      '&BBOX=' + extent.join(',') + 
                                      ','+ m_map_projection +
                                      '&srsname=' + m_map_projection;
                                jQuery.ajax({
                                    url: encodeURI(url),
                                    dataType: 'jsonp',
                                    jsonpCallback: 'loadFeatures' + drainage_line_layer_id,
                                    success: function(response) {
                                        drainage_line_vector_source.addFeatures(drainage_line_vector_source.readFeatures(response));
                                    },
                                });
                              },
                              strategy: ol.loadingstrategy.bbox,
                              projection: m_map_projection
                        });
                        
                    }
                    var drainage_line = new ol.layer.Vector({
                        source: drainage_line_vector_source,
                    });
                    drainage_line.set('geoserver_url', layer_info['drainage_line']['geojsonp'])
                    drainage_line.set('watershed_name', layer_info['watershed']);
                    drainage_line.set('subbasin_name', layer_info['subbasin']);
                    drainage_line.set('extent', ol.proj.transformExtent(layer_info['drainage_line']['latlon_bbox'].map(Number), 
                                                            'EPSG:4326',
                                                            m_map_projection));
                    drainage_line.set('layer_id', drainage_line_layer_id);
                    drainage_line.set('layer_type', 'geoserver');
                    m_drainage_line_layers.push(drainage_line);
                    layers.push(drainage_line);
                }
            } else { //assume KML                
                //add catchment if exists
                if('catchment' in layer_info) {
                    layers.push(getKMLLayer(layer_info['catchment'],'layer' + group_index + 'g' + 1));
                }
                //add gage if exists
                if('gage' in layer_info) {
                    layers.push(getKMLLayer(layer_info['gage'],'layer' + group_index + 'g' + 2));
                }
                //add drainage line if exists
                if('drainage_line' in layer_info) {
                    var drainage_line_layer = getKMLLayer(layer_info['drainage_line'],
                                                          'layer' + group_index + 'g' + 0, 
                                                          layer_info['watershed'], 
                                                          layer_info['subbasin'])
                    layers.push(drainage_line_layer);
                    m_drainage_line_layers.push(drainage_line_layer);
                }
            }
            //make sure there are layers to add
            if (layers.length > 0) {
                var group_layer = new ol.layer.Group({ 
                        layers: layers,
                });
                all_group_layers.push(group_layer);
            }
        });


        //send message to user if Drainage Line KML file not found
        if (m_drainage_line_layers.length <= 0) {
            updateInfoAlert('alert-danger', 'No valid drainage line layers found. Please upload to begin.');
        }

        //make drainage line layers selectable
        m_select_interaction = new ol.interaction.Select({
                                    layers: m_drainage_line_layers,
                                });

        //make chart control in map
        var chart_control = new ol.control.Control({element: $("#erfp-info").get(0)});
        var units_control = new ol.control.Control({element: $('#units-toggle').parent().parent().parent().get(0)});

        var all_map_layers = [basemap_layer].concat(all_group_layers);
        //var all_map_layers = all_group_layers;
        //create map
        m_map = new ol.Map({
            target: 'map',
            controls: ol.control.defaults().extend([
                new ol.control.FullScreen(),
                new ol.control.ZoomToExtent(),
                chart_control,
                units_control
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

            loadHydrographFromFeature(selected_feature);

          }
        });

        
        //create function to zoom to layer
        $('.zoom-to-layer').off().click(function() {
            var layer_id = $(this).parent().parent().attr('id');
            zoomToLayer(layer_id);
        });

        //function to zoom to feature by id
        $('#submit-search-reach-id').off().click(function() {
            var watershed_info = $(this).parent().parent().find('#watershed_select').select2('val');
            var reach_id = $(this).parent().parent().find('#reach-id-input').val();
            zoomToFeature(watershed_info, reach_id);
        });
        //zoom to all
        $('.ol-zoom-extent').off().click(function() {
            zoomToAll();
        });
        //reset chart area
        $('#erfp-reset').off().click(function() {
            clearOldChart();
            clearChartSelect2();
            updateInfoAlert('alert-info', 'Click on a reach to view flow predictions.');
            $('#erfp-reset').addClass('hidden');
            $('#erfp-select').addClass('hidden');
            m_selected_feature = null;

       });
        //show hide elements based on shape upload toggle selection
        $('#units-toggle').on('switchChange.bootstrapSwitch', function(event, state) {
            if(state) {
                //units metric
                m_units = "metric";
            } else {
                //units english
                m_units = "english";
            }
            if (m_selected_feature != null) {
                loadHydrographFromFeature(m_selected_feature);
            }
            
        });


    });

    return public_interface;

}()); // End of package wrapper 
// NOTE: that the call operator (open-closed parenthesis) is used to invoke the library wrapper 
// function immediately after being parsed.
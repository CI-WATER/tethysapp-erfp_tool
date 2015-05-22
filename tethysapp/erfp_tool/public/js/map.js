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
        m_selected_feature,
        m_selected_watershed,
        m_selected_subbasin,
        m_selected_reach_id,
        m_selected_guess_index,
        m_selected_usgs_id,
        m_selected_nws_id,
        m_selected_hydroserver_url,
        m_downloading_ecmwf_hydrograph,
        m_downloading_long_term_select,
        m_downloading_short_term_select,
        m_downloading_wrf_hydro_hydrograph,
        m_downloading_usgs,
        m_downloading_nws,
        m_downloading_hydroserver,
        m_searching_for_reach,
        m_long_term_chart_data_ajax_load_failed,
        m_long_term_select_data_ajax_handle,
        m_short_term_chart_data_ajax_load_failed,
        m_short_term_select_data_ajax_handle,
        m_ecmwf_start_folder,
        m_wrf_hydro_date_string,
        m_units,
        m_ecmwf_show,
        m_wrf_show;



    /************************************************************************
     *                    PRIVATE FUNCTION DECLARATIONS
     *************************************************************************/
    var resizeAppContent, bindInputs, convertTimeSeriesMetricToEnglish, getCI,
        convertTimeSeriesEnglishToMetric, isNotLoadingPastRequest, zoomToAll,
        zoomToLayer, zoomToFeature, toTitleCase, removeInfoDivClasses,
        datePadString, updateInfoAlert, getBaseLayer, getTileLayer,
        getKMLLayer, clearAllMessages, clearInfoMessages, clearOldChart, dateToUTCString,
        clearChartSelect2, getChartData, displayHydrograph,
        loadHydrographFromFeature,resetChart, addECMWFSeriesToCharts,
        addSeriesToCharts, isThereDataToLoad;


    /************************************************************************
     *                    PRIVATE FUNCTION IMPLEMENTATIONS
     *************************************************************************/
    resetChart =  function(model_name){
        clearOldChart(model_name);
        clearChartSelect2(model_name);
        updateInfoAlert('alert-info', 'Click on a reach to view flow predictions.');
        $("#" + model_name + "-reset").addClass('hidden');
        $("#" + model_name + "-select").addClass('hidden');
        m_selected_feature = null;
    };


    resizeAppContent = function() {
        var nav_open = $('#app-content-wrapper').hasClass('show-nav');
        if (nav_open) {
            var lg_col = $('.col-md-7')
            lg_col.removeClass('col-md-7');
            lg_col.addClass('col-md-4');
        } else {
            var sm_col = $('.col-md-4')
            sm_col.removeClass('col-md-4');
            sm_col.addClass('col-md-7');
        }
    };

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
    };

    //FUNCTION: check to see if there is data to redraw on chart
    isThereDataToLoad = function(){
        return (m_ecmwf_show || m_wrf_show
               || (typeof m_selected_usgs_id != 'undefined' && !isNaN(m_selected_usgs_id) && m_selected_usgs_id != null)
               || (typeof m_selected_nws_id != 'undefined' && !isNaN(m_selected_nws_id) && m_selected_nws_id != null)
               || (typeof m_selected_hydroserver_url != 'undefined' && m_selected_hydroserver_url != null));
    };
    
    //FUNCTION: convert units from metric to english
    convertTimeSeriesMetricToEnglish = function(time_series) {
        var new_time_series = [];
        var conversion_factor = 1;
        if(m_units=="english") {
            conversion_factor = 35.3146667;
        }
        time_series.map(function(data) {
            new_time_series.push([data[0],
                parseFloat((data[1]*conversion_factor).toFixed(5))]);
        });
        return new_time_series;
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
                appendErrorMessage("Error loading " + series_name + " data.", "load_series_error", "message-error");
            }
        }
        return new_time_series;
    };

    //FUNCTION: ol case insensitive get feature property
    getCI = function(obj,prop){
      prop = prop.toLowerCase();
      for(var key in obj.getProperties()){
         if(prop == key.toLowerCase()){
               return obj.get(key);
          }
       }
    }

    //FUNCTION: check if loading past request
    isNotLoadingPastRequest = function() {
        return !m_downloading_ecmwf_hydrograph && !m_downloading_long_term_select &&
            !m_downloading_usgs && !m_downloading_nws && !m_downloading_hydroserver &&
            !m_downloading_short_term_select && !m_downloading_wrf_hydro_hydrograph;
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
                            var feature_reach_id = getCI(features[i],'COMID');
                            if(typeof feature_reach_id == 'undefined' || isNaN(feature_reach_id)) {
                                var feature_reach_id = getCI(features[i],'hydroid');
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
                        //TODO: Make query more robust
                        var url = drainage_line_layer.get('geoserver_url') + 
                              '&format_options=callback:searchFeatures' +
                              '&CQL_FILTER=COMID =' + reach_id +
                              '&srsname=' + m_map_projection;
                        jQuery.ajax({
                            url: encodeURI(url),
                            dataType: 'jsonp',
                            jsonpCallback: 'searchFeatures',
                            success: function(response) {
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
    removeInfoDivClasses = function() {
        $("#erfp-info").removeClass('alert-info');
        $("#erfp-info").removeClass('alert-warning');
        $("#erfp-info").removeClass('alert-danger');
    };

    //FUNCTION: displays alert to user
    updateInfoAlert = function(css_alert_class, alert_message) {
        removeInfoDivClasses();
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
    clearInfoMessages = function() {
        $('#message').addClass('hidden');
        $('#message').empty();
    };

    clearAllMessages = function() {
        clearInfoMessages();
        $('#message-error').addClass('hidden');
        $('#message-error').empty();
    }

    //FUNCTION: removes highchart
    clearOldChart = function(model_name) {
       //clear old chart
        var highcharts_attr = $('#' + model_name + '-chart').attr('data-highcharts-chart');
        // For some browsers, `attr` is undefined; for others,
        // `attr` is false.  Check for both.
        if (typeof highcharts_attr !== typeof undefined && highcharts_attr !== false) {
            $("#" + model_name +"-chart").highcharts().destroy();
            $('#' + model_name + '-chart').empty();
        }
    };

    //FUNCTION: removes chart select2
    clearChartSelect2 = function(model_name) {
        if($('#' + model_name + '-select').data('select2')) {
            $('#' + model_name + '-select').off('change.select2') //remove event handler
                             .select2('val', '') //remove selection
                             .select2('destroy'); //destroy
        }

    };
    //FUNCTION: converts date to UTC string in the format yyyy-mm-dd
    dateToUTCString = function(date) {
        return datePadString(date.getUTCFullYear()) + "-" +
              datePadString(1 + date.getUTCMonth()) + "-" +
              datePadString(date.getUTCDate());
    };
    //FUNCTION: adds a series to both the chart
    addECMWFSeriesToCharts = function(series_name, series_data, series_color){
        var long_term_chart = $("#long-term-chart").highcharts();
        long_term_chart.addSeries({
                    name: series_name,
                    data: convertTimeSeriesMetricToEnglish(series_data),
                    color: series_color,
                });
    };

    //FUNCTION: adds data to the chart
    addSeriesToCharts = function(series){
        var long_term_chart = $("#long-term-chart").highcharts();
        long_term_chart.addSeries(series);
        $("#long-term-chart").removeClass("hidden");
    };


    //FUNCTION: gets all data for chart
    getChartData = function() {
        $('.short-term-select').addClass('hidden');
        $('.long-term-select').addClass('hidden');
        //make sure old chart is removed
        clearOldChart('long-term');
        //clear messages
        clearAllMessages();
        if(!isNotLoadingPastRequest()) {
            //updateInfoAlert
            addWarningMessage("Please wait for datasets to download before making another selection.");

        } else if (!isThereDataToLoad()) {
            //updateInfoAlert
            addWarningMessage("No data found to load. Please toggle on a dataset.");
        } else {
            m_long_term_chart_data_ajax_load_failed = false;
            //turn off select interaction
            m_map.removeInteraction(m_select_interaction);
            addInfoMessage("Retrieving Data ...");
            var y_axis_title = "Flow (cms)";
            if (m_units == "english") {
                y_axis_title = "Flow (cfs)";
            }
            var default_chart_settings = {
                title: { text: "Forecast"},
                subtitle: {text: toTitleCase(m_selected_watershed) + " (" +
                                 toTitleCase(m_selected_subbasin) + "): " + m_selected_reach_id},
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
            };

            $("#long-term-chart").highcharts(default_chart_settings);
            //$('#long-term-chart').addClass('hidden');

            //get ecmwf data
            if (m_ecmwf_show) {
                m_downloading_ecmwf_hydrograph = true;
                jQuery.ajax({
                    type: "GET",
                    url: "ecmwf-get-hydrograph",
                    dataType: "json",
                    data: {
                        watershed_name: m_selected_watershed,
                        subbasin_name: m_selected_subbasin,
                        reach_id: m_selected_reach_id,
                        guess_index: m_selected_guess_index,
                        start_folder: m_ecmwf_start_folder,
                    },

                    success: function (data) {
                        if ("success" in data) {
                            if ("max" in data) {
                                addECMWFSeriesToCharts("ECMWF - Maximum", data['max'], '#BE2625');
                            }
                            if ("mean_plus_std" in data) {
                                addECMWFSeriesToCharts("ECMWF - Mean Plus Std. Dev.", data['mean_plus_std'], '#61B329');
                            }
                            if ("mean" in data) {
                                addECMWFSeriesToCharts("ECMWF - Mean", data['mean'], '#00688B');
                            }
                            if ("mean_minus_std" in data) {
                                addECMWFSeriesToCharts("ECMWF - Mean Minus Std. Dev.", data['mean_minus_std'], '#61B329');
                            }
                            if ("min" in data) {
                                addECMWFSeriesToCharts("ECMWF - Minimum", data['min'], '#BE2625');
                            }
                            if ("high_res" in data) {
                                addECMWFSeriesToCharts("ECMWF -High Res.", data['high_res'], '#ffa500');
                            }
                            $('.long-term-select').removeClass('hidden');
                            $('#long-term-chart').removeClass('hidden');
                        } else {
                            m_long_term_chart_data_ajax_load_failed = true;
                            appendErrorMessage(data["error"], "ecmwf_error", "message-error");
                            clearChartSelect2('long-term');
                        }
                    },
                    error: function (request, status, error) {
                        m_long_term_chart_data_ajax_load_failed = true;
                        appendErrorMessage("Error: " + error, "ecmwf_error", "message-error");
                        clearChartSelect2('long-term');
                    },
                })
                .always(function () {
                    m_downloading_ecmwf_hydrograph = false;
                    m_map.addInteraction(m_select_interaction);
                    if(isNotLoadingPastRequest()){
                        clearInfoMessages();
                    }
                });
            }
            //if there is a wrf watershed & subbasin attribute
            if (m_wrf_show) {
                m_downloading_wrf_hydro_hydrograph = true;
                jQuery.ajax({
                    type: "GET",
                    url: "wrf-hydro-get-hydrograph",
                    dataType: "json",
                    data: {
                        watershed_name: m_selected_watershed,
                        subbasin_name: m_selected_subbasin,
                        reach_id: m_selected_reach_id,
                        date_string: m_wrf_hydro_date_string,
                    },

                    success: function (data) {
                        if ("success" in data) {
                            //wrf_hydro
                            if ("wrf_hydro" in data) {
                                var wrf_series = {
                                    name: "WRF-Hydro (HRRR)",
                                    data: convertTimeSeriesMetricToEnglish(data.wrf_hydro),
                                    dashStyle: 'longdash',
                                };
                                var long_term_chart = $("#long-term-chart").highcharts();
                                long_term_chart.addSeries(wrf_series);
                                $('.short-term-select').removeClass('hidden');
                                $('#long-term-chart').removeClass('hidden');
                            }
                        } else {
                            m_short_term_chart_data_ajax_load_failed = true;
                            appendErrorMessage("Error: " + data["error"], "wrf_hydro_error", "message-error");
                            clearChartSelect2('short-term');
                        }
                    },
                    error: function (request, status, error) {
                        m_short_term_chart_data_ajax_load_failed = true;
                        appendErrorMessage("Error: " + error, "wrf_hydro_error", "message-error");
                        clearChartSelect2('short-term');
                    },
                })
                .always(function () {
                    m_downloading_wrf_hydro_hydrograph = false;
                    m_map.addInteraction(m_select_interaction);
                    if(isNotLoadingPastRequest()){
                        clearInfoMessages();
                    }
                });
            }
            //get dates
            var date_now = new Date();
            var date_past = new Date();
            date_past.setUTCDate(date_now.getUTCDate()-3);
            var date_future = new Date();
            date_future.setUTCDate(date_now.getUTCDate()+15);
            var date_observed_start = date_past;
            var date_observed_end = date_now;
            var date_nws_start = date_now;
            var date_nws_end = date_future;       

            //get forcast dates if available
            if(m_ecmwf_start_folder != null && typeof m_ecmwf_start_folder != "undefined" &&
                m_ecmwf_start_folder != "most_recent" && m_ecmwf_show) {
                var forecast_start_year = parseInt(m_ecmwf_start_folder.substring(0,4));
                var forecast_start_month = parseInt(m_ecmwf_start_folder.substring(4,6));
                var forecast_start_day = parseInt(m_ecmwf_start_folder.substring(6,8));
                var forecast_start_hour = parseInt(m_ecmwf_start_folder.split(".")[1].substring(0,2));
                var date_forecast_begin = new Date(Date.UTC(forecast_start_year, forecast_start_month-1,
                    forecast_start_day, forecast_start_hour));
                var date_forecast_end = new Date();
                date_forecast_end.setUTCDate(date_forecast_begin.getUTCDate()+15);

                //make corrections to dates if needed
                //USGS Dates
                if (date_forecast_begin<date_observed_start) {
                    date_observed_start = date_forecast_begin;
                }
                if (date_forecast_end<date_observed_end) {
                    date_observed_end = date_forecast_end;
                }
                //NWS Dates
                if (date_forecast_begin<date_nws_start) {
                    date_nws_start = date_forecast_begin;
                }
                if (date_forecast_end<date_nws_end) {
                    date_nws_end = date_forecast_end;
                }
            }
            //Get USGS data if USGS ID attribute exists
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
                            startDT: dateToUTCString(date_observed_start),
                            endDT: dateToUTCString(date_observed_end),
                            parameterCd: '00060',
                        },
                        success: function (data) {
                            if (typeof data != 'undefined') {
                                try {
                                    var usgs_series = {
                                        name: "USGS (" + m_selected_usgs_id + ")",
                                        data: convertTimeSeriesEnglishToMetric(data.value.timeSeries[0].values[0].value, "USGS"),
                                        dashStyle: 'longdash',
                                    };
                                    addSeriesToCharts(usgs_series);
                                } catch (e) {
                                    if (e instanceof TypeError) {
                                        appendErrorMessage("Recent USGS data not found.", "usgs_error", "message-error");
                                    }
                                }
                            }
                        },
                        error: function (request, status, error) {
                            appendErrorMessage("Error: " + error, "usgs_error", "message-error");
                        },
                    })
                    .always(function () {
                        m_downloading_usgs = false;
                        if(isNotLoadingPastRequest()){
                           clearInfoMessages();
                        }
                    });
                }
            }
            //Get AHPS data if NWD ID attribute exists
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
                        from: dateToUTCString(date_nws_start),
                        to:  dateToUTCString(date_nws_end), 
                    },
                    success: function(data) {
                        var ahps_series = {
                                        name: "AHPS (" + m_selected_nws_id + ")",
                                        data: convertTimeSeriesEnglishToMetric(data[0].data, "NWS"),
                                        dashStyle: 'longdash',
                        };
                        addSeriesToCharts(ahps_series);
                        $('#long-term-chart').removeClass('hidden');

                    },
                    error: function(request, status, error) {
                        appendErrorMessage("Error: " + error, "ahps_error", "message-error");
                    },
                })
                .always(function() {
                    m_downloading_nws = false;
                    if(isNotLoadingPastRequest()){
                       clearInfoMessages();
                    }
                });
            }
            //Get HydroServer Data if Available
            if(typeof m_selected_hydroserver_url != 'undefined' && m_selected_hydroserver_url != null) {
                m_downloading_hydroserver = true;
                //get WorldWater data
                var chart_ww_data_ajax_handle = jQuery.ajax({
                    type: "GET",
                    url: m_selected_hydroserver_url,
                    data: {
                        startDate: dateToUTCString(date_observed_start),
                        endDate:  dateToUTCString(date_observed_end), 
                    },
                    success: function(data) {
                        var series_data = WATERML.get_json_from_waterml(data, m_units);
                        if(series_data == null) {
                            appendErrorMessage("No data found for WorldWater", "hydro_server_error", "message-error");
                        } else {

                            var hydro_server_series = {
                                            name: "HydroServer",
                                            data: series_data[0],
                                            dashStyle: 'longdash',
                                        };
                            addSeriesToCharts(hydro_server_series);
                        }
                    },
                    error: function(request, status, error) {
                        appendErrorMessage("Error: " + error, "hydro_server_error", "message-error");
                    },
                })
                .always(function() {
                    m_downloading_hydroserver = false;
                    if(isNotLoadingPastRequest()){
                       clearInfoMessages();
                    }
                });
            }


        }
    };

    //FUNCTION: displays hydrograph at stream segment
    displayHydrograph = function(feature, reach_id, watershed, subbasin, guess_index, usgs_id, nws_id, hydroserver_url) {
         //remove old chart reguardless
        clearOldChart('long-term');
        $('.short-term-select').addClass('hidden');
        $('.long-term-select').addClass('hidden');
        //clear messages
        clearAllMessages();
        //check if old ajax call still running
        if(!isNotLoadingPastRequest()) {
            //updateInfoAlert
            appendWarningMessage("Please wait for datasets to download before making another selection.", "wait_warning");

        } else if (!isThereDataToLoad()) {
            //updateInfoAlert
            addWarningMessage("No data found to load. Please toggle on a dataset.");
            m_selected_feature = feature;
        }
        else {
            m_selected_feature = feature;
            m_selected_reach_id = reach_id;
            m_selected_watershed = watershed;
            m_selected_subbasin = subbasin;
            m_selected_guess_index = guess_index;
            m_selected_usgs_id = usgs_id;
            m_selected_nws_id = nws_id;
            m_selected_hydroserver_url = hydroserver_url;
            //Get chart data
            m_ecmwf_start_folder = "most_recent";
            m_wrf_hydro_date_string = "most_recent";
            getChartData();
            //Get available ECMWF Dates
            if (m_ecmwf_show)
            {
                m_downloading_long_term_select = true;
                m_long_term_select_data_ajax_handle = jQuery.ajax({
                    type: "GET",
                    url: "ecmwf-get-avaialable-dates",
                    dataType: "json",
                    data: {
                        watershed_name: m_selected_watershed,
                        subbasin_name: m_selected_subbasin,
                        reach_id: m_selected_reach_id,
                    },
                })
                .done(function (data) {
                    if ("success" in data && !m_long_term_chart_data_ajax_load_failed) {
                        //remove select2 if exists
                        clearChartSelect2('long-term');
                        $('.long-term-select').removeClass('hidden');
                        //create new select2
                        $('#long-term-select').select2({
                            data: data.output_directories,
                            placeholder: "Select a Date"
                        });
                        if (m_downloading_ecmwf_hydrograph) {
                            $('.long-term-select').addClass('hidden');
                        }
                        //add on change event handler
                        $('#long-term-select').on('change.select2', function () {
                            m_ecmwf_start_folder = $(this).select2('data').id;
                            getChartData();
                        });
                    } else if ("error" in data) {
                        appendErrorMessage("Error: " + data.error, "ecmwf_error", "message-error");
                        clearChartSelect2('long-term');
                    }
                })
                .fail(function (request, status, error) {
                    appendErrorMessage("Error: " + error, "ecmwf_error", "message-error");
                    clearChartSelect2('long-term');
                })
                .always(function () {
                    m_downloading_long_term_select = false;
                    if(isNotLoadingPastRequest()){
                       clearInfoMessages();
                    }
                });
            }
            //Get available WRF-Hydro Dates
            if (m_wrf_show) {
                m_downloading_short_term_select = true;
                m_short_term_select_data_ajax_handle = jQuery.ajax({
                    type: "GET",
                    url: "wrf-hydro-get-avaialable-dates",
                    dataType: "json",
                    data: {
                        watershed_name: m_selected_watershed,
                        subbasin_name: m_selected_subbasin,
                    },
                })
                .done(function (data) {
                    if ("success" in data && !m_short_term_chart_data_ajax_load_failed) {
                        //remove select2 if exists
                        clearChartSelect2('short-term');
                        $('.short-term-select').removeClass('hidden');
                        //create new select2
                        $('#short-term-select').select2({
                            data: data.output_files,
                            placeholder: "Select a Date"
                        });
                        if (m_downloading_wrf_hydro_hydrograph) {
                            $('.short-term-select').addClass('hidden');
                        }
                        //add on change event handler
                        $('#short-term-select').on('change.select2', function () {
                            m_wrf_hydro_date_string = $(this).select2('data').id;
                            getChartData();
                        });
                    } else if ("error" in data) {
                        appendErrorMessage("Error: " + data.error, "wrf_hydro_error", "message-error");
                        clearChartSelect2('short-term');
                    }
                })
                .fail(function (request, status, error) {
                    appendErrorMessage("Error: " + error, "wrf_hydro_error", "message-error");
                    clearChartSelect2('short-term');
                })
                .always(function () {
                    m_downloading_short_term_select = false;
                    if(isNotLoadingPastRequest()){
                       clearInfoMessages();
                    }
                });
            }

        }
    };
    //FUNCTION: Loads Hydrograph from Selected feature
    loadHydrographFromFeature = function(selected_feature) {
        //get attributes
        var reach_id = getCI(selected_feature, 'COMID'); 
        var watershed_name = getCI(selected_feature, "watershed");
        var subbasin_name = getCI(selected_feature, "subbasin");
        var guess_index = getCI(selected_feature, "guess_index");
        var usgs_id = getCI(selected_feature, "usgs_id");
        var nws_id = getCI(selected_feature, "nws_id");
        var hydroserver_url = getCI(selected_feature, "hydroserve");
        
        //in case the reach_id is in a different location
        if(typeof reach_id == 'undefined' || isNaN(reach_id)) {
            var reach_id = getCI(selected_feature, 'hydroid');
        }

        if(typeof watershed_name == 'undefined') {
            var watershed_name = getCI(selected_feature, 'watershed_name');
        }
        if(typeof subbasin_name == 'undefined') {
            var subbasin_name = getCI(selected_feature, 'subbasin_name');
        }
        //clean up usgs_id
        if(typeof usgs_id != 'undefined' && !isNaN(usgs_id) && usgs_id != null) {
            usgs_id = usgs_id.trim();
            //add zero in case it was removed when converted to a number
            if(usgs_id.length < 8 && usgs_id.length > 0) {
                usgs_id = '0' + usgs_id;
            }
            //set to null if it is empty string
            if (usgs_id.length <= 0) {
                usgs_id = null;
            }
        }
        //clean up nws_id
        if(typeof nws_id != 'undefined' && !isNaN(nws_id) && nws_id != null) {
            nws_id = nws_id.trim();
            //set to null if it is empty string
            if (nws_id.length <= 0) {
                nws_id = null;
            }
        }
        //clean up hydroserver_url
        if(typeof hydroserver_url != 'undefined' && hydroserver_url != null) {
            hydroserver_url = hydroserver_url.trim();
            //set to null if it is empty string
            if (hydroserver_url.length <= 0) {
                hydroserver_url = null;
            }
        }

        if(typeof reach_id != 'undefined' &&
           reach_id != null &&  
           typeof watershed_name != 'undefined' &&
           watershed_name != null &&  
           typeof subbasin_name != 'undefined' &&
           subbasin_name != null)
        {
            displayHydrograph(selected_feature, 
                            reach_id,
                            watershed_name,
                            subbasin_name, 
                            guess_index,
                            usgs_id,
                            nws_id,
                            hydroserver_url); 
        } else {
            appendErrorMessage('The attributes in the file are faulty. Please fix and upload again.',
                                "file_attr_error",
                                "message-error");
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
        resizeAppContent();
        $('#map_top_navigation').find('.form-group').addClass('inline-block');
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
        m_selected_hydroserver_url = null;
        m_downloading_ecmwf_hydrograph = false;
        m_downloading_long_term_select = false;
        m_downloading_wrf_hydro_hydrograph = false;
        m_downloading_short_term_select = false;
        m_downloading_usgs = false;
        m_downloading_nws = false;
        m_downloading_hydroserver = false;
        m_searching_for_reach = false;
        m_long_term_chart_data_ajax_load_failed = false;
        m_short_term_chart_data_ajax_load_failed = false;
        m_long_term_select_data_ajax_handle = null;
        m_ecmwf_start_folder = "most_recent";
        m_wrf_hydro_date_string = "most_recent";
        //Init from toggle
        m_units = "metric";
        if(!$('#units-toggle').bootstrapSwitch('state')) {
            m_units = "english";
        }
        m_wrf_show = $('#wrf-toggle').bootstrapSwitch('state');
        m_ecmwf_show = $('#ecmwf-toggle').bootstrapSwitch('state');

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
                        appendErrorMessage('The drainage line layer for ' +
                                          layer_info['watershed'] + '(' +
                                          layer_info['subbasin'] + ') ' +
                                          'is missing '+
                                          layer_info['drainage_line']['missing_attributes'] +
                                          ' attributes and will not function properly.', "layer_loading_error", "message-error");
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
                                      layer_info['drainage_line']['contained_attributes'] +
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
            appendErrorMessage('No valid drainage line layers found. Please upload to begin.', "drainage_line_error", "message-error");
        }

        //make drainage line layers selectable
        m_select_interaction = new ol.interaction.Select({
                                    layers: m_drainage_line_layers,
                                });

        var all_map_layers = [basemap_layer].concat(all_group_layers);
        //var all_map_layers = all_group_layers;
        //create map
        m_map = new ol.Map({
            target: 'map',
            controls: ol.control.defaults().extend([
                new ol.control.FullScreen(),
                new ol.control.ZoomToExtent(),
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

         $('#ecmwf-toggle').on('switchChange.bootstrapSwitch', function(event, state) {
             m_ecmwf_show = state;
             if (m_selected_feature != null) {
                 loadHydrographFromFeature(m_selected_feature);
             }
        });

        $('#wrf-toggle').on('switchChange.bootstrapSwitch', function(event, state) {
            m_wrf_show = state;
            if (m_selected_feature != null) {
                loadHydrographFromFeature(m_selected_feature);
            }
        });

        $('.toggle-nav').click(function() {
            resizeAppContent();
            //redraw highchart
            var long_term_chart = $("#long-term-chart").highcharts();
            if (typeof long_term_chart != 'undefined') {
                getChartData();
            }
            //reset charts
            /**var short_term_chart = $("#short-term-chart").highcharts();
            if (typeof short_term_chart != 'undefined') {
                short_term_chart.addSeries({name: "dummy_data", data: [0, 0]});
                //console.log(short_term_chart.series.dummy_data.data);
                //short_term_chart.redraw();
                short_term_chart.series[short_term_chart.series.length - 1].remove();
                short_term_chart.redraw(true);
                short_term_chart.setSize($("#short-term-row").width() , $("#short-term-row").height());
            }

            var long_term_chart = $("#long-term-chart").highcharts();
             if (typeof long_term_chart != 'undefined') {
                 long_term_chart.addSeries({name: "dummy_data", data: [0, 0]});
                 long_term_chart.redraw();
                 //long_term_chart.series[long_term_chart.series.length - 1].remove();
             }*/
        });

    });

    return public_interface;

}()); // End of package wrapper 
// NOTE: that the call operator (open-closed parenthesis) is used to invoke the library wrapper 
// function immediately after being parsed.
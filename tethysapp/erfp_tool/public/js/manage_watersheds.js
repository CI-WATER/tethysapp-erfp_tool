/*****************************************************************************
 * FILE:    Manage Watersheds
 * DATE:    2/26/2015
 * AUTHOR:  Alan Snow
 * COPYRIGHT: (c) 2015 Brigham Young University
 * LICENSE: BSD 2-Clause
 *****************************************************************************/

/*****************************************************************************
 *                      LIBRARY WRAPPER
 *****************************************************************************/

var ERFP_MANAGE_WATERSHEDS = (function() {
    // Wrap the library in a package function
    "use strict"; // And enable strict mode for this library
    
    /************************************************************************
    *                      MODULE LEVEL / GLOBAL VARIABLES
    *************************************************************************/
    var m_uploading_data, m_results_per_page;

    /************************************************************************
     *                    PRIVATE FUNCTION DECLARATIONS
     *************************************************************************/
    var initializeTableFunctions, initializeModal, getTablePage, displayResultsText,
        getModalHTML;


    /************************************************************************
     *                    PRIVATE FUNCTION IMPLEMENTATIONS
     *************************************************************************/
    getModalHTML = function(watershed_id, reload) {
        reload = typeof reload !== 'undefined' ? reload : false;
        $.ajax({
            url: 'edit',
            method: 'GET',
            data: {
                'watershed_id': watershed_id
            },
            success: function(data) {
                $("#edit_watershed_modal").find('.modal-body').html(data);
                initializeModal();
                if (reload) {
                    addSuccessMessage("Watershed Update Complete!");
                }
            }
        });
    };

    initializeModal = function() {
        //turn the select options into select2
        $("#data-store-select").select2();
        $("#geoserver-select").select2();

        // Initialize any switch elements
        $('.bootstrap-switch').each(function () {
            $(this).bootstrapSwitch();
        });

        //initialize gizmo classes
        $('#ecmwf-data-store-watershed-name-input').parent().parent().addClass('data_store');
        $('#ecmwf-data-store-subbasin-name-input').parent().parent().addClass('data_store');
        $('#wrf-hydro-data-store-watershed-name-input').parent().parent().addClass('data_store');
        $('#wrf-hydro-data-store-subbasin-name-input').parent().parent().addClass('data_store');

        $('#geoserver-drainage-line-input').parent().parent().addClass('shapefile');
        $('#geoserver-catchment-input').parent().parent().addClass('shapefile');
        $('#geoserver-gage-input').parent().parent().addClass('shapefile');
        $('#geoserver-ahps-station-input').parent().parent().addClass('shapefile');
        $('#geoserver-outline-input').parent().parent().addClass('shapefile');
        $('#shp-upload-toggle').parent().parent().parent().addClass('shapefile');

        //show/hide elements based on data store selection
        $('#data-store-select').change(function() {
            var select_val = $(this).val();
            if(select_val == 1) {
                //local upload
                $('.data_store').addClass('hidden');
            } else {
                $('.data_store').removeClass('hidden');
            }

        });

        $("#data-store-select").change();

        //show/hide elements based on geoserver selection
        $('#geoserver-select').change(function() {
            var select_val = $(this).val();
            if(select_val == 1) {
                //local upload
                $('.kml').removeClass('hidden');
                $('.shapefile').addClass('hidden');
            } else {
                //file located on geoserver
                $('.kml').addClass('hidden');
                $('.shapefile').removeClass('hidden');
                $('#shp-upload-toggle').bootstrapSwitch('state',false);
                $('.upload').addClass('hidden');
                $('#geoserver-drainage-line-input').parent().parent().removeClass('hidden');
                $('#geoserver-catchment-input').parent().parent().removeClass('hidden');
                $('#geoserver-gage-input').parent().parent().removeClass('hidden');
                $('#geoserver-ahps-station-input').parent().parent().removeClass('hidden');
                $('#geoserver-outline-input').parent().parent().removeClass('hidden');
            }

        });

        //trigger change event to initialize page
        $("#geoserver-select").change();

        //show hide elements based on shape upload toggle selection
        $('#shp-upload-toggle').on('switchChange.bootstrapSwitch', function(event, state) {
            if(state) {
                //show file upload
                $('.upload').removeClass('hidden');
                $('#geoserver-drainage-line-input').parent().parent().addClass('hidden');
                $('#geoserver-catchment-input').parent().parent().addClass('hidden');
                $('#geoserver-gage-input').parent().parent().addClass('hidden');
                $('#geoserver-ahps-station-input').parent().parent().addClass('hidden');
                $('#geoserver-outline-input').parent().parent().addClass('hidden');
            } else {
                $('.upload').addClass('hidden');
                $('#geoserver-drainage-line-input').parent().parent().removeClass('hidden');
                $('#geoserver-catchment-input').parent().parent().removeClass('hidden');
                $('#geoserver-gage-input').parent().parent().removeClass('hidden');
                $('#geoserver-ahps-station-input').parent().parent().removeClass('hidden');
                $('#geoserver-outline-input').parent().parent().removeClass('hidden');
            }

        });

        //handle the submit event
        $('.modal-footer').find('.btn-success').off().click(function () {
             //scroll back to top
            window.scrollTo(0,0);
            //clear messages
            $('#message').addClass('hidden');
           //clear message div
            $('#message').empty()
                .addClass('hidden')
                .removeClass('alert-success')
                .removeClass('alert-info')
                .removeClass('alert-warning')
                .removeClass('alert-danger');

            //check data store input
            var safe_to_submit = {val: true};
            var watershed_id = $("#watershed_id").val();
            var watershed_name = checkInputWithError($('#watershed-name-input'),safe_to_submit);
            var subbasin_name = checkInputWithError($('#subbasin-name-input'),safe_to_submit);
            var data_store_id = checkInputWithError($('#data-store-select'),safe_to_submit, true);
            var geoserver_id = checkInputWithError($('#geoserver-select'),safe_to_submit, true);

            //initialize values
            var ecmwf_data_store_watershed_name = "";
            var ecmwf_data_store_subbasin_name = "";
            var wrf_hydro_data_store_watershed_name = "";
            var wrf_hydro_data_store_subbasin_name = "";
            var geoserver_drainage_line_layer = "";
            var geoserver_catchment_layer = "";
            var geoserver_gage_layer = "";
            var geoserver_ahps_station_layer = "";
            var geoserver_outline_layer = "";
            var drainage_line_shp_files = [];
            var catchment_shp_files = [];
            var gage_shp_files = [];
            var ahps_station_shp_files = [];
            var outline_shp_files = [];
            var drainage_line_kml_file = null;
            var catchment_kml_file = null;
            var gage_kml_file = null;
            var kml_drainage_line_layer = "";
            var kml_catchment_layer = "";
            var kml_gage_layer = "";

            //Initialize Data Store Data
            if(data_store_id>1) {
                //check ecmwf inputs
                var ecmwf_ready = false
                ecmwf_data_store_watershed_name = $('#ecmwf-data-store-watershed-name-input').val();
                ecmwf_data_store_subbasin_name = $('#ecmwf-data-store-subbasin-name-input').val();
                if (typeof ecmwf_data_store_watershed_name == 'undefined' || 
                    typeof ecmwf_data_store_subbasin_name == 'undefined') {
                    ecmwf_data_store_watershed_name = "";
                    ecmwf_data_store_subbasin_name = "";
                } else {
                    ecmwf_data_store_watershed_name = ecmwf_data_store_watershed_name.trim();
                    ecmwf_data_store_subbasin_name = ecmwf_data_store_subbasin_name.trim();
                    ecmwf_ready = (ecmwf_data_store_watershed_name.length > 0 &&
                                   ecmwf_data_store_subbasin_name.length > 0);
                }

                //check wrf-hydro inputs
                var wrf_hydro_ready = false;
                wrf_hydro_data_store_watershed_name = $('#wrf-hydro-data-store-watershed-name-input').val();
                wrf_hydro_data_store_subbasin_name = $('#wrf-hydro-data-store-subbasin-name-input').val();
                if (typeof wrf_hydro_data_store_watershed_name == 'undefined' || 
                    typeof wrf_hydro_data_store_subbasin_name == 'undefined') {
                    wrf_hydro_data_store_watershed_name = "";
                    wrf_hydro_data_store_subbasin_name = "";
                } else {
                    wrf_hydro_data_store_watershed_name = wrf_hydro_data_store_watershed_name.trim();
                    wrf_hydro_data_store_subbasin_name = wrf_hydro_data_store_subbasin_name.trim();
                    wrf_hydro_ready = (wrf_hydro_data_store_watershed_name.length > 0 && 
                                       wrf_hydro_data_store_subbasin_name.length > 0);
                }
                //need at least one to be OK to proceed
                if(!ecmwf_ready && !wrf_hydro_ready) {
                    safe_to_submit.val = false;
                    safe_to_submit.error = "Need ECMWF or WRF-Hydro watershed and subbasin names to proceed";
             
                }
            }

            //initialize geoserver data
            if(geoserver_id==1){
                //kml upload
                kml_drainage_line_layer = $('#drainage-line-kml-upload-input').data('kml_drainage_line_layer');
                drainage_line_kml_file = $('#drainage-line-kml-upload-input')[0].files[0];
                if(typeof drainage_line_kml_file != 'undefined') {
                    if(!checkKMLfile(drainage_line_kml_file, safe_to_submit)) {
                        $('#drainage-line-kml-upload-input').parent().addClass('has-error');
                        safe_to_submit.val = false;
                    } else {
                        $('#drainage-line-kml-upload-input').parent().removeClass('has-error');
                    }
                } else {
                    drainage_line_kml_file = null;
                }
                kml_catchment_layer = $('#catchment-kml-upload-input').data('kml_catchment_layer');
                catchment_kml_file = $('#catchment-kml-upload-input')[0].files[0];
                if(typeof catchment_kml_file != 'undefined') {
                    if(!checkKMLfile(catchment_kml_file,safe_to_submit)) {
                        $('#catchment-kml-upload-input').parent().addClass('has-error');
                    } else {
                        $('#catchment-kml-upload-input').parent().removeClass('has-error');
                    }
                } else {
                    catchment_kml_file = null;
                }
                kml_gage_layer = $('#gage-kml-upload-input').data('kml_gage_layer');
                gage_kml_file = $('#gage-kml-upload-input')[0].files[0];
                if(typeof gage_kml_file != 'undefined') {
                    if(!checkKMLfile(gage_kml_file, safe_to_submit)) {
                        $('#gage-kml-upload-input').parent().addClass('has-error');
                    } else {
                        $('#gage-kml-upload-input').parent().removeClass('has-error');
                    }
                } else {
                    gage_kml_file = null;
                }
            } else {
                //geoserver update
                geoserver_drainage_line_layer = $('#geoserver-drainage-line-input').val();
                geoserver_catchment_layer = $('#geoserver-catchment-input').val(); //optional
                geoserver_gage_layer = $('#geoserver-gage-input').val(); //optional
                geoserver_ahps_station_layer = $('#geoserver-ahps-station-input').val(); //optional
                geoserver_outline_layer = $('#geoserver-outline-input').val();
                //geoserver upload
                drainage_line_shp_files = $('#drainage-line-shp-upload-input')[0].files;
                if (drainage_line_shp_files.length > 0) {
                    if (!checkShapefile(drainage_line_shp_files, safe_to_submit)) {
                        $('#drainage-line-shp-upload-input').parent().addClass('has-error');
                    } else {
                        $('#drainage-line-shp-upload-input').parent().removeClass('has-error');
                    }
                }
                catchment_shp_files = $('#catchment-shp-upload-input')[0].files;
                if (catchment_shp_files.length > 0) {
                    if(!checkShapefile(catchment_shp_files, safe_to_submit)) {
                        $('#catchment-shp-upload-input').parent().addClass('has-error');
                    } else {
                        $('#catchment-shp-upload-input').parent().removeClass('has-error');
                    }
                }
                gage_shp_files = $('#gage-shp-upload-input')[0].files;
                if (gage_shp_files.length > 0) {
                    if(!checkShapefile(gage_shp_files, safe_to_submit)) {
                        $('#gage-shp-upload-input').parent().addClass('has-error');
                    } else {
                        $('#gage-shp-upload-input').parent().removeClass('has-error');
                    }
                }
                ahps_station_shp_files = $('#ahps-station-shp-upload-input')[0].files;
                if (ahps_station_shp_files.length > 0) {
                    if(!checkShapefile(ahps_station_shp_files, safe_to_submit)) {
                        $('#ahps-station-shp-upload-input').parent().addClass('has-error');
                    } else {
                        $('#ahps-station-shp-upload-input').parent().removeClass('has-error');
                    }
                }
                outline_shp_files = $('#outline-shp-upload-input')[0].files;
                if (outline_shp_files.length > 0) {
                    if(!checkShapefile(outline_shp_files, safe_to_submit)) {
                        $('#outline-shp-upload-input').parent().addClass('has-error');
                    } else {
                        $('#outline-shp-upload-input').parent().removeClass('has-error');
                    }
                }
            }

            //submit if the form is ok
            if (safe_to_submit.val && !m_uploading_data) {
                if (window.confirm("Are you sure? You will delete prediction files " +
                    "if either of the watershed or subbasin data store names are changed.")) {

                    m_uploading_data = true;
                    var submit_button = $(this);
                    var submit_button_html = submit_button.html();
                    var xhr = null;
                    var xhr_no_files = null;
                    var xhr_catchment = null;
                    var xhr_gage = null;
                    var xhr_ahps_station = null;
                    var xhr_outline = null;
                    var xhr_ecmwf_rapid = null;
                    //give user information
                    addInfoMessage("Submiting data. Please be patient! " +
                    "This may take a few minutes ...");
                    submit_button.text('Submitting ...');
                    //update database
                    if (geoserver_id == 1 || $('#shp-upload-toggle').bootstrapSwitch('state')) {
                        //file upload
                        if (drainage_line_kml_file != null ||
                            kml_drainage_line_layer.length > 0 ||
                            drainage_line_shp_files.length >= 4 ||
                            geoserver_drainage_line_layer.length > 0) {
                            var data = new FormData();
                            data.append("watershed_id", watershed_id);
                            data.append("watershed_name", watershed_name);
                            data.append("subbasin_name", subbasin_name);
                            data.append("data_store_id", data_store_id);
                            data.append("ecmwf_data_store_watershed_name",ecmwf_data_store_watershed_name);
                            data.append("ecmwf_data_store_subbasin_name",ecmwf_data_store_subbasin_name);
                            data.append("wrf_hydro_data_store_watershed_name",wrf_hydro_data_store_watershed_name);
                            data.append("wrf_hydro_data_store_subbasin_name",wrf_hydro_data_store_subbasin_name);
                            data.append("geoserver_id", geoserver_id);
                            data.append("geoserver_drainage_line_layer", geoserver_drainage_line_layer);
                            data.append("geoserver_catchment_layer", geoserver_catchment_layer);
                            data.append("geoserver_gage_layer", geoserver_gage_layer);
                            data.append("geoserver_ahps_station_layer", geoserver_ahps_station_layer);
                            data.append("geoserver_outline_layer", geoserver_outline_layer);
                            for (var i = 0; i < drainage_line_shp_files.length; i++) {
                                data.append("drainage_line_shp_file", drainage_line_shp_files[i]);
                            }
                            data.append("kml_drainage_line_layer", drainage_line_kml_file);
                            data.append("kml_catchment_layer", kml_catchment_layer);
                            data.append("kml_gage_layer", kml_gage_layer);
                            data.append("drainage_line_kml_file", drainage_line_kml_file);
                            data.append("catchment_kml_file", catchment_kml_file);
                            data.append("gage_kml_file", gage_kml_file);
                            var drainage_success_message = "Drainage Line Upload Success!";
                            if (drainage_line_kml_file != null || drainage_line_shp_files.length >= 4) {
                                appendInfoMessage("Uploading Drainage Line ...", "message_drainage_line");
                            } else {
                                appendInfoMessage("Uploading Watershed Data ...", "message_drainage_line");
                                drainage_success_message = "Watershed Data Upload Success!"
                            }
                            //needs to be outside
                            xhr = ajax_update_database_multiple_files("submit",
                                data,
                                drainage_success_message,
                                "message_drainage_line");

                            //upload catchment when drainage line finishes if catchment exist
                            jQuery.when(xhr).done(function (return_data) {
                                if (return_data != null && typeof return_data != 'undefined') {
                                    if ('geoserver_drainage_line_layer' in return_data) {
                                        geoserver_drainage_line_layer = return_data['geoserver_drainage_line_layer'];
                                    }
                                    if ('kml_drainage_line_layer' in return_data) {
                                        kml_drainage_line_layer = return_data['kml_drainage_line_layer'];
                                    }
                                }
                                //upload catchment when  drainage line finishes if exists
                                if (catchment_kml_file != null || catchment_shp_files.length >= 4) {
                                    appendInfoMessage("Uploading Catchment ...", "message_catchment");
                                    var data = new FormData();
                                    data.append("watershed_id", watershed_id);
                                    data.append("watershed_name", watershed_name);
                                    data.append("subbasin_name", subbasin_name);
                                    data.append("data_store_id", data_store_id);
                                    data.append("ecmwf_data_store_watershed_name",ecmwf_data_store_watershed_name);
                                    data.append("ecmwf_data_store_subbasin_name",ecmwf_data_store_subbasin_name);
                                    data.append("wrf_hydro_data_store_watershed_name",wrf_hydro_data_store_watershed_name);
                                    data.append("wrf_hydro_data_store_subbasin_name",wrf_hydro_data_store_subbasin_name);
                                    data.append("geoserver_id", geoserver_id);
                                    data.append("geoserver_drainage_line_layer", geoserver_drainage_line_layer);
                                    data.append("geoserver_catchment_layer", geoserver_catchment_layer);
                                    data.append("geoserver_gage_layer", geoserver_gage_layer);
                                    data.append("geoserver_ahps_station_layer", geoserver_ahps_station_layer);
                                    data.append("geoserver_outline_layer", geoserver_outline_layer);
                                    data.append("kml_drainage_line_layer", drainage_line_kml_file);
                                    data.append("kml_catchment_layer", kml_catchment_layer);
                                    data.append("kml_gage_layer", kml_gage_layer);
                                    data.append("drainage_line_kml_file", drainage_line_kml_file);
                                    data.append("catchment_kml_file", catchment_kml_file);
                                    data.append("gage_kml_file", gage_kml_file);
                                    for (var i = 0; i < catchment_shp_files.length; i++) {
                                        data.append("catchment_shp_file", catchment_shp_files[i]);
                                    }
                                    xhr_catchment = ajax_update_database_multiple_files("submit", 
                                                                                        data,
                                                                                        "Catchment Upload Success!",
                                                                                        "message_catchment");
                                }
                                //upload gage when catchment and drainage line finishes if gage exists
                                jQuery.when(xhr_catchment).done(function (catchment_data) {
                                    if (catchment_data != null && typeof catchment_data != 'undefined') {
                                        if ('geoserver_catchment_layer' in catchment_data) {
                                            geoserver_catchment_layer = catchment_data['geoserver_catchment_layer'];
                                        }
                                        if ('kml_catchment_layer' in catchment_data) {
                                            kml_catchment_layer = catchment_data['kml_catchment_layer'];
                                        }
                                    }
                                    if (gage_kml_file != null || gage_shp_files.length >= 4) {
                                        appendInfoMessage("Uploading Gages ...", "message_gages");
                                        var data = new FormData();
                                        data.append("watershed_id", watershed_id)
                                        data.append("watershed_name", watershed_name);
                                        data.append("subbasin_name", subbasin_name);
                                        data.append("data_store_id", data_store_id);
                                        data.append("ecmwf_data_store_watershed_name",ecmwf_data_store_watershed_name);
                                        data.append("ecmwf_data_store_subbasin_name",ecmwf_data_store_subbasin_name);
                                        data.append("wrf_hydro_data_store_watershed_name",wrf_hydro_data_store_watershed_name);
                                        data.append("wrf_hydro_data_store_subbasin_name",wrf_hydro_data_store_subbasin_name);
                                        data.append("geoserver_id", geoserver_id);
                                        data.append("geoserver_drainage_line_layer", geoserver_drainage_line_layer);
                                        data.append("geoserver_catchment_layer", geoserver_catchment_layer);
                                        data.append("geoserver_gage_layer", geoserver_gage_layer);
                                        data.append("geoserver_ahps_station_layer", geoserver_ahps_station_layer);
                                        data.append("geoserver_outline_layer", geoserver_outline_layer);
                                        for (var i = 0; i < gage_shp_files.length; i++) {
                                            data.append("gage_shp_file", gage_shp_files[i]);
                                        }
                                        data.append("kml_drainage_line_layer", drainage_line_kml_file);
                                        data.append("kml_catchment_layer", kml_catchment_layer);
                                        data.append("kml_gage_layer", kml_gage_layer);
                                        data.append("drainage_line_kml_file", drainage_line_kml_file);
                                        data.append("catchment_kml_file", catchment_kml_file);
                                        data.append("gage_kml_file", gage_kml_file);
                                        xhr_gage = ajax_update_database_multiple_files("submit",
                                                                                        data,
                                                                                        "Gages Upload Success!",
                                                                                        "message_gages");
                                    }
                                    jQuery.when(xhr_gage).done(function(gage_data){
                                        if (gage_data != null && typeof gage_data != 'undefined') {
                                            if ('geoserver_gage_layer' in gage_data) {
                                                geoserver_gage_layer = gage_data['geoserver_gage_layer'];
                                            }
                                            if ('kml_gage_layer' in gage_data) {
                                                kml_gage_layer = gage_data['kml_gage_layer'];
                                            }
                                        }
                                        if (outline_shp_files.length >= 4) {
                                            appendInfoMessage("Uploading Outline ...", "message_outline");
                                            var data = new FormData();
                                            data.append("watershed_id", watershed_id)
                                            data.append("watershed_name", watershed_name);
                                            data.append("subbasin_name", subbasin_name);
                                            data.append("data_store_id", data_store_id);
                                            data.append("ecmwf_data_store_watershed_name",ecmwf_data_store_watershed_name);
                                            data.append("ecmwf_data_store_subbasin_name",ecmwf_data_store_subbasin_name);
                                            data.append("wrf_hydro_data_store_watershed_name",wrf_hydro_data_store_watershed_name);
                                            data.append("wrf_hydro_data_store_subbasin_name",wrf_hydro_data_store_subbasin_name);
                                            data.append("geoserver_id", geoserver_id);
                                            data.append("geoserver_drainage_line_layer", geoserver_drainage_line_layer);
                                            data.append("geoserver_catchment_layer", geoserver_catchment_layer);
                                            data.append("geoserver_gage_layer", geoserver_gage_layer);
                                            data.append("geoserver_ahps_station_layer", geoserver_ahps_station_layer);
                                            data.append("geoserver_outline_layer", geoserver_outline_layer);
                                            for (var i = 0; i < outline_shp_files.length; i++) {
                                                data.append("outline_shp_file", outline_shp_files[i]);
                                            }
                                            data.append("kml_drainage_line_layer", drainage_line_kml_file);
                                            data.append("kml_catchment_layer", kml_catchment_layer);
                                            data.append("kml_gage_layer", kml_gage_layer);
                                            data.append("drainage_line_kml_file", drainage_line_kml_file);
                                            data.append("catchment_kml_file", catchment_kml_file);
                                            data.append("gage_kml_file", gage_kml_file);
                                            xhr_outline = ajax_update_database_multiple_files("submit",
                                                                                                    data,
                                                                                                    "Outline Upload Success!",
                                                                                                    "message_outline");
                                        }
                                        jQuery.when(xhr_outline).done(function(){
                                            if (ahps_station_shp_files.length >= 4) {
                                                appendInfoMessage("Uploading AHPS Stations ...", "message_ahps_stations");
                                                var data = new FormData();
                                                data.append("watershed_id", watershed_id)
                                                data.append("watershed_name", watershed_name);
                                                data.append("subbasin_name", subbasin_name);
                                                data.append("data_store_id", data_store_id);
                                                data.append("ecmwf_data_store_watershed_name",ecmwf_data_store_watershed_name);
                                                data.append("ecmwf_data_store_subbasin_name",ecmwf_data_store_subbasin_name);
                                                data.append("wrf_hydro_data_store_watershed_name",wrf_hydro_data_store_watershed_name);
                                                data.append("wrf_hydro_data_store_subbasin_name",wrf_hydro_data_store_subbasin_name);
                                                data.append("geoserver_id", geoserver_id);
                                                data.append("geoserver_drainage_line_layer", geoserver_drainage_line_layer);
                                                data.append("geoserver_catchment_layer", geoserver_catchment_layer);
                                                data.append("geoserver_gage_layer", geoserver_gage_layer);
                                                data.append("geoserver_outline_layer", geoserver_ahps_station_layer);
                                                data.append("geoserver_ahps_station_layer", geoserver_ahps_station_layer);
                                                for (var i = 0; i < ahps_station_shp_files.length; i++) {
                                                    data.append("ahps_station_shp_file", ahps_station_shp_files[i]);
                                                }
                                                data.append("kml_drainage_line_layer", drainage_line_kml_file);
                                                data.append("kml_catchment_layer", kml_catchment_layer);
                                                data.append("kml_gage_layer", kml_gage_layer);
                                                data.append("drainage_line_kml_file", drainage_line_kml_file);
                                                data.append("catchment_kml_file", catchment_kml_file);
                                                data.append("gage_kml_file", gage_kml_file);
                                                xhr_ahps_station = ajax_update_database_multiple_files("submit",
                                                                                                        data,
                                                                                                        "AHPS Stations Upload Success!",
                                                                                                        "message_ahps_stations");
                                            }
                                            jQuery.when(xhr_ahps_station).done(function(){
                                                //upload RAPID file if exists
                                                xhr_ecmwf_rapid = upload_AJAX_ECMWF_RAPID_input(watershed_id,
                                                                                                data_store_id);
                                                //when everything is finished
                                                jQuery.when(xhr, xhr_catchment, xhr_gage,
                                                            xhr_ahps_station, xhr_outline, xhr_ecmwf_rapid)
                                                    .done(function(xhr_data, xhr_catchment_data, xhr_gage_data,
                                                                   xhr_ahps_station_data, xhr_outline_data, xhr_ecmwf_rapid_data){
                                                    //update the input boxes to reflect change
                                                    getModalHTML(watershed_id, true);
                                                })
                                                .always(function () {
                                                        submit_button.html(submit_button_html);
                                                        m_uploading_data = false;
                                                });
                                            });
                                        });
                                    });
                                });

                            });
                        } else {
                            appendErrorMessage("Need a drainage line to continue.", "error_form");
                        }
                    } else {
                        var data = {
                            watershed_id: watershed_id,
                            watershed_name: watershed_name,
                            subbasin_name: subbasin_name,
                            data_store_id: data_store_id,
                            ecmwf_data_store_watershed_name: ecmwf_data_store_watershed_name,
                            ecmwf_data_store_subbasin_name: ecmwf_data_store_subbasin_name,
                            wrf_hydro_data_store_watershed_name: wrf_hydro_data_store_watershed_name,
                            wrf_hydro_data_store_subbasin_name: wrf_hydro_data_store_subbasin_name,
                            geoserver_id: geoserver_id,
                            geoserver_drainage_line_layer: geoserver_drainage_line_layer,
                            geoserver_catchment_layer: geoserver_catchment_layer,
                            geoserver_gage_layer: geoserver_gage_layer,
                            geoserver_ahps_station_layer: geoserver_ahps_station_layer,
                            geoserver_outline_layer: geoserver_outline_layer,
                        };

                        var xhr_no_files = ajax_update_database("submit", data);

                        jQuery.when(xhr_no_files).done(function (data) {
                            if ('success' in data) {
                                //upload RAPID file if exists
                                xhr_ecmwf_rapid = upload_AJAX_ECMWF_RAPID_input(watershed_id,
                                    data_store_id);
    
                                jQuery.when(xhr, xhr_ecmwf_rapid).done(function () {
                                    //update the input boxes to reflect change
                                    getModalHTML(watershed_id, true);
                                });
                            } 
                        })
                        .always(function () {
                            submit_button.html(submit_button_html);
                            m_uploading_data = false;
                        });
                    }
                } //window confirm
            } else if (m_uploading_data) {
                appendWarningMessage("Submitting Data. Please Wait.", "please_wait");
            } else {
                appendErrorMessage(safe_to_submit.error, "error_form");
            }

        });
    };

    initializeTableFunctions = function() {
        m_results_per_page = 10;
        //handle the submit edit event
        $('.submit-edit-watershed').off().click(function () {
            getModalHTML($(this).parent().parent().parent().find('.watershed-name').data('watershed_id'));
        });


        //handle the submit update event
        $('.submit-delete-watershed').off().click(function () {
            var data = {
                watershed_id: $(this).parent().parent().parent().find('.watershed-name').data('watershed_id')
            };
            //update database
            var xhr = deleteRowData($(this), data, "main_message");
            if (xhr != null) {
                xhr.done(function (data) { 
                    if('success' in data) {
                        var num_watersheds_data = $('#manage_watershed_table').data('num_watersheds');
                        var page = parseInt($('#manage_watershed_table').data('page'));
                        $('#manage_watershed_table').data('num_watersheds', Math.max(0, parseInt(num_watersheds_data) - 1));
                        if (parseInt($('#manage_watershed_table').data('num_watersheds')) <= m_results_per_page * page) {
                            $('#manage_watershed_table').data('page', Math.max(0, page - 1));
                        }
                        getTablePage();
                    }
                });
            }
        });

        displayResultsText();

        if (m_results_per_page >= $('#manage_watershed_table').data('num_watersheds')) {
            $('[name="prev_button"]').addClass('hidden');
            $('[name="next_button"]').addClass('hidden');
        }

        //pageination next and previous button update
        $('[name="prev_button"]').click(function(){
            var page = parseInt($('#manage_watershed_table').data('page'));
            $('#manage_watershed_table').data('page', Math.max(0, page-1));
            getTablePage();
        });
        $('[name="next_button"]').click(function(){
            var page = parseInt($('#manage_watershed_table').data('page'));
            $('#manage_watershed_table').data('page', Math.min(page+1,
                                                Math.floor(parseInt($('#manage_watershed_table').data('num_watersheds')) / m_results_per_page - 0.1)));
            getTablePage();
        });
    };

    displayResultsText = function() {
        //dynamically show table results display info text on page
        var page = parseInt($('#manage_watershed_table').data('page'));
        var num_watersheds_data = $('#manage_watershed_table').data('num_watersheds');
        var display_min;
        if (num_watersheds_data == 0){
            display_min = 0
        }
        else{
            display_min = ((page + 1) * m_results_per_page) - (m_results_per_page - 1);
        }
        var display_max = Math.min(num_watersheds_data, ((page + 1) * m_results_per_page));
        $('[name="prev_button"]').removeClass('hidden');
        $('[name="next_button"]').removeClass('hidden');
        if (page == 0){
            $('[name="prev_button"]').addClass('hidden');
        } else if (page == Math.floor(num_watersheds_data / m_results_per_page - 0.1)) {
            $('[name="next_button"]').addClass('hidden');
        }
        if (num_watersheds_data != 0) {
            $('#display-info').append('Displaying watersheds ' + display_min + ' - '
                + display_max + ' of ' + num_watersheds_data);
        }else {
            $('#display-info').append('No watersheds to display' + '<br>To add one, ' +
                'click <a href="../add-watershed">here</a>.');
                }
    };

    getTablePage = function() {
        $.ajax({
            url: 'table',
            method: 'GET',
            data: {'page': $('#manage_watershed_table').data('page')},
            success: function(data) {
                $("#manage_watershed_table").html(data);
                initializeTableFunctions();
            }
        });
    };
    /************************************************************************
    *                  INITIALIZATION / CONSTRUCTOR
    *************************************************************************/
    
    $(function() {
        m_uploading_data = false;
        getTablePage();
        $('#edit_watershed_modal').on('hidden.bs.modal', function () {
            $("#edit_watershed_modal").find('.modal-body').html('<p class="lead">Loading ...</p>');
            getTablePage();
        });
    }); //document ready
}()); // End of package wrapper 

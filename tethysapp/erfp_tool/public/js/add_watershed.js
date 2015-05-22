/*****************************************************************************
 * FILE:    Add Watershed
 * DATE:    2/26/2015
 * AUTHOR:  Alan Snow
 * COPYRIGHT: (c) 2015 Brigham Young University
 * LICENSE: BSD 2-Clause
 *****************************************************************************/

/*****************************************************************************
 *                      LIBRARY WRAPPER
 *****************************************************************************/

var ERFP_ADD_WATERSHED = (function() {
    // Wrap the library in a package function
    "use strict"; // And enable strict mode for this library
    
    /************************************************************************
    *                      MODULE LEVEL / GLOBAL VARIABLES
    *************************************************************************/
    var m_uploading_data;

     /************************************************************************
    *                    PRIVATE FUNCTION DECLARATIONS
    *************************************************************************/
    var checkErrors, checkShapefile, checkKMLfile, finishReset, 
        upload_AJAX_ECMWF_RAPID_input;


    /************************************************************************
    *                    PRIVATE FUNCTION IMPLEMENTATIONS
    *************************************************************************/
    //FUNCTION: Check output from array of xhr
    checkErrors = function(output_array) {
        output_array.forEach(function(output){
            if(output != null && typeof output != 'undefined') {
                if ("error" in output) {
                    return {"error" : output["error"]};
                }
            }
        });
        return {"success" : "Watershed Upload Success!"};
    };

    //FUNCTION: RESET EVERYTHING WHEN DONE
    finishReset = function(result, watershed_id) {
        if ("success" in result) {
            addSuccessMessage("Watershed Upload Complete!");
            //reset inputs
            $('#watershed-name-input').val('');
            $('#subbasin-name-input').val('');
            $('#data-store-select').select2('val','1');
            $('#geoserver-select').select2('val','1');
            $('#drainage-line-kml-upload-input').val('');
            $('#catchment-kml-upload-input').val('');
            $('#gage-kml-upload-input').val('');
            $('#geoserver-drainage-line-input').val('');
            $('#geoserver-catchment-input').val('');
            $('#geoserver-gage-input').val('');
            $('#drainage-line-shp-upload-input').val('');
            $('#catchment-shp-upload-input').val('');
            $('#gage-shp-upload-input').val('');
            $('#ecmwf-rapid-files-upload-input').val('');
            $('.rapid-input').addClass('hidden');
            $('.kml').removeClass('hidden');
            $('.shapefile').addClass('hidden');
        } else {
            //delete watershed and show error
            var xhr = ajax_update_database("delete",{watershed_id: watershed_id});
            appendErrorMessage(result["error"]);
        }
     };

    //FUNCTION: Check shapefile inputs to make sure required files are attached
    checkShapefile = function(shapefile, safe_to_submit) {
        var required_extensions = ['shp', 'shx', 'prj','dbf'];
        var accepted_extensions = [];
        for (var i = 0; i < shapefile.length; ++i) {
            var file_extension = shapefile[i].name.split('.').pop();
            required_extensions.forEach(function(required_extension){
                if (file_extension == required_extension) {
                    accepted_extensions.push(required_extension);
                    required_extensions.splice(required_extensions.indexOf(required_extension),1);
                }
            });
        }
        if(accepted_extensions.length < 4) {
            safe_to_submit.val = false;
            appendErrorMessage("Problem with shapefile")
            return false;
        }
        return true;

    };

    //FUNCTION: Check KML file inputs to make sure required file is there
    checkKMLfile = function(kml_file, safe_to_submit) {
        if("kml" != kml_file.name.split('.').pop()) {
            safe_to_submit.val = false;
            appendErrorMessage("Problem with KML file")
            return false;
        }
        return true;
    };

    //FUNCTION: AJAX upload of ECMWF RAPID Input
    upload_AJAX_ECMWF_RAPID_input = function(watershed_id, data_store_id) {
        var xhr_ecmwf_rapid = null;
        var ecmwf_rapid_input_file = null;
        if(data_store_id>1) {
            ecmwf_rapid_input_file = $('#ecmwf-rapid-files-upload-input')[0].files[0]
            if(ecmwf_rapid_input_file != null) {
                appendInfoMessage("Uploading ECMWF RAPID Input Data ...", 
                                  "message_ecmwf_rapid_input");
                var data = new FormData();
                data.append("watershed_id", watershed_id)
                data.append("ecmwf_rapid_input_file",ecmwf_rapid_input_file);
                xhr_ecmwf_rapid = ajax_update_database_multiple_files("upload_ecmwf_rapid",
                                                                      data,
                                                                      "ECMWF RAPID Input Upload Success!",
                                                                      "message_ecmwf_rapid_input");
            }
        }
        return xhr_ecmwf_rapid
    };

    /************************************************************************
    *                  INITIALIZATION / CONSTRUCTOR
    *************************************************************************/
    
    $(function() {
        //initialize modlule variables
        m_uploading_data = false;

        //initialize help blockss
        var help_html = '<p class="help-block hidden">No watershed name specified.</p>';
        $('#watershed-name-input').parent().parent().append(help_html);
        help_html = '<p class="help-block hidden">No subbasin name specified.</p>';
        $('#subbasin-name-input').parent().parent().append(help_html);
        help_html = '<p class="help-block hidden">No Data Store selected.</p>';
        $('#data-store-select').parent().append(help_html);
        help_html = '<p class="help-block hidden">No Geoserver selected.</p>';
        $('#geoserver-select').parent().append(help_html);
        help_html = '<p class="help-block hidden">No Geoserver drainage line layer name specified.</p>';
        $('#geoserver-drainage-line-input').parent().parent().append(help_html);
    
        //add classes
        $('#geoserver-drainage-line-input').parent().parent().addClass('shapefile');
        $('#geoserver-catchment-input').parent().parent().addClass('shapefile');
        $('#geoserver-gage-input').parent().parent().addClass('shapefile');
        $('#shp-upload-toggle').parent().parent().parent().addClass('shapefile');
        $('.shapefile').addClass('hidden');
        
        //handle the submit event
        $('#submit-add-watershed').click(function(){
            //check data store input
            var safe_to_submit = {val: true};
            var watershed_name = checkInputWithError($('#watershed-name-input'),safe_to_submit);
            var subbasin_name = checkInputWithError($('#subbasin-name-input'),safe_to_submit);
            var data_store_id = checkInputWithError($('#data-store-select'),safe_to_submit, true);
            var geoserver_id = checkInputWithError($('#geoserver-select'),safe_to_submit, true);
    
            //initialize values
            var geoserver_drainage_line_layer = "";
            var geoserver_catchment_layer = "";
            var geoserver_gage_layer = "";
            var drainage_line_shp_files = [];
            var catchment_shp_files = [];
            var gage_shp_files = [];
            var drainage_line_kml_file = null;
            var catchment_kml_file = null;
            var gage_kml_file = null;
    
            if(geoserver_id==1){
                //kml upload
                drainage_line_kml_file = $('#drainage-line-kml-upload-input')[0].files[0];
                if(!checkKMLfile(drainage_line_kml_file)) {
                    $('#drainage-line-kml-upload-input').parent().addClass('has-error');
                }
                catchment_kml_file = $('#catchment-kml-upload-input')[0].files[0];
                if(typeof catchment_kml_file != 'undefined') {
                    if(!checkKMLfile(catchment_kml_file)) {
                        $('#catchment-kml-upload-input').parent().addClass('has-error');
                    }
                } else {
                    catchment_kml_file = null;;
                }
                gage_kml_file = $('#gage-kml-upload-input')[0].files[0];
                if(typeof gage_kml_file != 'undefined') {
                    if(!checkKMLfile(gage_kml_file)) {
                        $('#gage-kml-upload-input').parent().addClass('has-error');
                    }
                } else {
                    gage_kml_file = null;;
                }               
            } else if (!$('#shp-upload-toggle').bootstrapSwitch('state')) {
                //geoserver update
                geoserver_drainage_line_layer = checkInputWithError($('#geoserver-drainage-line-input'),safe_to_submit);
                geoserver_catchment_layer = $('#geoserver-catchment-input').val(); //optional
                geoserver_gage_layer = $('#geoserver-gage-input').val(); //optional
            } else {
                //geoserver upload
                drainage_line_shp_files = $('#drainage-line-shp-upload-input')[0].files;
                if(!checkShapefile(drainage_line_shp_files, safe_to_submit)) {
                    $('#drainage-line-shp-upload-input').parent().addClass('has-error');
                } else {
                    $('#drainage-line-shp-upload-input').parent().removeClass('has-error');
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
            }
            
            //submit if the form is ready
            if(safe_to_submit.val && !m_uploading_data) {
                var submit_button = $(this);
                var submit_button_html = submit_button.html();
                var xhr = null;
                var xhr_catchment = null;
                var xhr_gage = null;
                var xhr_ecmwf_rapid = null;
                var xhr_download_predicitons = null;
                //give user information
                addInfoMessage("Submiting data. Please be patient! " +
                               "This may take a few minutes due to downloading prediction datasets.");
                submit_button.text('Submitting ...');
                //update database
                if(geoserver_id==1 || $('#shp-upload-toggle').bootstrapSwitch('state')){
                    //upload files
                    var data = new FormData();
                    data.append("watershed_name",watershed_name);
                    data.append("subbasin_name",subbasin_name);
                    data.append("data_store_id",data_store_id);
                    data.append("geoserver_id",geoserver_id);
                    data.append("geoserver_drainage_line_layer",geoserver_drainage_line_layer);
                    data.append("geoserver_catchment_layer",geoserver_catchment_layer);
                    data.append("geoserver_gage_layer",geoserver_gage_layer);
                    data.append("drainage_line_kml_file",drainage_line_kml_file);
                    for(var i = 0; i < drainage_line_shp_files.length; i++) {
                        data.append("drainage_line_shp_file",drainage_line_shp_files[i]);
                    }
                    
                    if (drainage_line_kml_file != null || geoserver_drainage_line_layer != null) {
                        appendInfoMessage("Uploading Drainage Line ...", "message_drainage_line");
                    }
                    xhr = ajax_update_database_multiple_files("submit",data, 
                            "Drainage Line Upload Success!", "message_drainage_line");
                    
                    //upload catchment when drainage line finishes if catchment exists
                    xhr.done(function(return_data){
                        if ('success' in return_data) {
                            if('watershed_id' in return_data) {
                                var watershed_id  = return_data['watershed_id'];
                                //upload catchment when  drainage line finishes if exists
                                if(catchment_kml_file != null || catchment_shp_files.length >= 4) {
                                    appendInfoMessage("Uploading Catchment ...", "message_catchment");
                                    var data = new FormData();
                                    data.append("watershed_id", watershed_id)
                                    data.append("watershed_name",watershed_name);
                                    data.append("subbasin_name",subbasin_name);
                                    data.append("data_store_id",data_store_id);
                                    data.append("geoserver_id",geoserver_id);
                                    data.append("geoserver_drainage_line_layer",
                                                return_data['geoserver_drainage_line_layer']);
                                    data.append("catchment_kml_file",catchment_kml_file);
                                    for(var i = 0; i < catchment_shp_files.length; i++) {
                                        data.append("catchment_shp_file",catchment_shp_files[i]);
                                    }
                                    xhr_catchment = ajax_update_database_multiple_files("update",
                                                                                        data, 
                                                                                        "Catchment Upload Success!",
                                                                                        "message_catchment");
                                }
    
                                //upload gage when catchment and drainage line finishes if gage exists
                                jQuery.when(xhr_catchment).done(function(catchment_data){
                                    if(gage_kml_file != null || gage_shp_files.length >= 4) {
                                        appendInfoMessage("Uploading Gages ...", "message_gages");
                                        var data = new FormData();
                                        data.append("watershed_id", watershed_id)
                                        data.append("watershed_name",watershed_name);
                                        data.append("subbasin_name",subbasin_name);
                                        data.append("data_store_id",data_store_id);
                                        data.append("geoserver_id",geoserver_id);
                                        data.append("geoserver_drainage_line_layer",
                                                    return_data['geoserver_drainage_line_layer']);
    
                                        if(catchment_data != null && typeof catchment_data != 'undefined') {
                                            if('geoserver_catchment_layer' in catchment_data) {
                                                data.append("geoserver_catchment_layer",
                                                            catchment_data['geoserver_catchment_layer']);
                                            }
                                            if('kml_catchment_layer' in catchment_data) {
                                                data.append("kml_catchment_layer",
                                                            catchment_data['kml_catchment_layer']);
                                            }
                                        }
    
                                        data.append("gage_kml_file",gage_kml_file);
                                        for(var i = 0; i < gage_shp_files.length; i++) {
                                            data.append("gage_shp_file",gage_shp_files[i]);
                                        }
                                        xhr_gage = ajax_update_database_multiple_files("update",data,
                                                                                       "Gages Upload Success!",
                                                                                        "message_gages");
                                    }
                                    //upload gage when catchment and drainage line finishes if gage exists
                                    jQuery.when(xhr_gage).done(function(){
                                        //upload RAPID file if exists
                                        xhr_ecmwf_rapid = upload_AJAX_ECMWF_RAPID_input(watershed_id,
                                                                                        data_store_id);
                                        //download prediction files if exists
                                        appendInfoMessage("Downloading Predictions ...", "message_download_predictions");
                                        xhr_download_predicitons = ajax_update_database("download_predictions",
                                                                                        {watershed_id: watershed_id},
                                                                                        "message_download_predictions");
                                        //when everything is finished
                                        jQuery.when(xhr, xhr_catchment, xhr_gage, 
                                                    xhr_ecmwf_rapid, xhr_download_predicitons)
                                              .done(function(xhr_data, xhr_catchment_data, xhr_gage_data,
                                                            xhr_ecmwf_rapid_data, xhr_download_predictions_data){
                                                    //Reset The Output
                                                    finishReset(checkErrors([xhr_data, xhr_catchment_data, xhr_gage_data,
                                                                            xhr_ecmwf_rapid_data, xhr_download_predictions_data]),
                                                                 watershed_id);
                                        });
                                    });
                                });
                            }
                        } else {
                            appendErrorMessage(return_data['error']);
                        }
                    });
                } else {
                    var data = {
                            watershed_name: watershed_name,
                            subbasin_name: subbasin_name,
                            data_store_id: data_store_id,
                            geoserver_id: geoserver_id,
                            geoserver_drainage_line_layer: geoserver_drainage_line_layer,
                            geoserver_catchment_layer: geoserver_catchment_layer,
                            geoserver_gage_layer: geoserver_gage_layer,
                            };
            
                    var xhr = ajax_update_database("submit",data);

                    //when everything finishes uploading
                    xhr.done(function(return_data){
                        var watershed_id = return_data['watershed_id'];
                        xhr_ecmwf_rapid = upload_AJAX_ECMWF_RAPID_input(watershed_id,
                                                                        data_store_id);
                        xhr_download_predicitons = ajax_update_database("download_predictions",{watershed_id: watershed_id});
                        //when everything is finished
                        jQuery.when(xhr_ecmwf_rapid).done(function(){
                            finishReset(return_data);
                        })
                    })
                }
                m_uploading_data = true;

                jQuery.when(xhr, xhr_catchment, xhr_gage, xhr_ecmwf_rapid).always(function(){
                    submit_button.html(submit_button_html);
                    m_uploading_data = false;
                });

            } else if (m_uploading_data) {
                //give user information
                addWarningMessage("Submitting Data. Please Wait.");
            } else {
                appendErrorMessage("Not submitted. Please fix form errors to proceed.");
            }
        
        });
        
        //show/hide elements based on data store selection
        $('#data-store-select').change(function() {
            var select_val = $(this).val();
            if(select_val == 1) {
                //local upload
                $('.rapid-input').addClass('hidden');
            } else {
                //file located on geoserver
                $('.rapid-input').removeClass('hidden');
            }
        
        });

        //show/hide elements based on geoserver selection
        $('#geoserver-select').change(function() {
            var select_val = $(this).val();
            if(select_val == 1) {
                //local upload
                $('#geoserver-drainage-line-input').val('');
                $('#geoserver-catchment-input').val('');
                $('#drainage-line-shp-upload-input').val('');
                $('#catchment-shp-upload-input').val('');
                $('#gage-shp-upload-input').val('');
                $('.kml').removeClass('hidden');
                $('.shapefile').addClass('hidden');
            } else {
                //file located on geoserver
                $('.kml').addClass('hidden');
                $('.shapefile').removeClass('hidden');
                $('#drainage-line-kml-upload-input').val('');
                $('#catchment-kml-upload-input').val('');
                $('#gage-kml-upload-input').val('');
                $('#shp-upload-toggle').bootstrapSwitch('state',true);
                $('.upload').removeClass('hidden');
                $('#geoserver-drainage-line-input').parent().parent().addClass('hidden');
                $('#geoserver-catchment-input').parent().parent().addClass('hidden');
                $('#geoserver-gage-input').parent().parent().addClass('hidden');
            }
        
        });
    
        //show hide elements based on shape upload toggle selection
        $('#shp-upload-toggle').on('switchChange.bootstrapSwitch', function(event, state) {
            if(state) {
                //show file upload
                $('.upload').removeClass('hidden');
                $('#geoserver-drainage-line-input').parent().parent().addClass('hidden');
                $('#geoserver-catchment-input').parent().parent().addClass('hidden');
                $('#geoserver-gage-input').parent().parent().addClass('hidden');
            } else {
                $('.upload').addClass('hidden');
                $('#drainage-line-shp-upload-input').val('');
                $('#catchment-shp-upload-input').val('');
                $('#gage-shp-upload-input').val('');
                $('#geoserver-drainage-line-input').parent().parent().removeClass('hidden');
                $('#geoserver-catchment-input').parent().parent().removeClass('hidden');
                $('#geoserver-gage-input').parent().parent().removeClass('hidden');
            }
            
        });
    }); //page load
}()); // End of package wrapper 
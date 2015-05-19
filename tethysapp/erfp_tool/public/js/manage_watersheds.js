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
    var m_uploading_data; 

    /************************************************************************
    *                  INITIALIZATION / CONSTRUCTOR
    *************************************************************************/
    
    $(function() {
        //modlule variable
        m_uploading_data = false;
        //turn the select options into select2
        $(".data-store-select").each(function() {
            $(this).select2();
        }); 
        $(".geoserver-select").each(function() {
            $(this).select2();
        });
    
        //manage on change event for geoserver select
        $(".geoserver-select").change(function() {
            var geoserver_id = $(this).val();
            var row_container = $(this).parent().parent();
            if(geoserver_id == 1) {
                row_container.find('.bootstrap-switch-id-shp-upload-toggle').addClass('hidden');
                row_container.find('.shapefile').addClass('hidden');
                row_container.find('.kml').removeClass('hidden');
            } else {
                row_container.find('.bootstrap-switch-id-shp-upload-toggle').removeClass('hidden');
                if(row_container.find('#shp-upload-toggle').bootstrapSwitch('state')){
                    row_container.find('.shapefile').addClass('hidden');
                    row_container.find('.shapefile.upload').removeClass('hidden');
                } else {
                    row_container.find('.shapefile').removeClass('hidden');
                    row_container.find('.shapefile.upload').addClass('hidden');
                }
                row_container.find('.kml').addClass('hidden');
            }
        });
        //trigger change event to initialize page
        $(".geoserver-select").change();
    
        //show hide elements based on shape upload toggle selection
        $('.bootstrap-switch-id-shp-upload-toggle').on('switchChange.bootstrapSwitch', function(event, state) {
            var parent_row = $(this).parent().parent();
            if(state) {
                //show file upload
                parent_row.find('.shapefile').addClass('hidden');
                parent_row.find('.shapefile.upload').removeClass('hidden');
            } else {
                parent_row.find('.shapefile').removeClass('hidden');
                parent_row.find('.shapefile.upload').addClass('hidden');
            }
            
        });
    
        //handle the submit event
        $('.submit-update-watershed').click(function(){
            var safe_to_submit = {val: true};
            var parent_row = $(this).parent().parent().parent();
            //check data store input
            var watershed_id = parent_row.find('.watershed-id').text();
            var watershed_name = checkTableCellInputWithError(parent_row.find('.watershed-name'),safe_to_submit, "Error with watershed name.");
            var subbasin_name = checkTableCellInputWithError(parent_row.find('.subbasin-name'),safe_to_submit, "Error with subbasin name.");
            var data_store_id = checkInputWithError(parent_row.find('.data-store-select'),safe_to_submit, true, true);
            var geoserver_id = checkInputWithError(parent_row.find('.geoserver-select'),safe_to_submit, true, true);
            //initialize values
            var geoserver_drainage_line_layer = "";
            var geoserver_catchment_layer = "";
            var geoserver_gage_layer = "";
            var kml_drainage_line_layer = "";
            var kml_catchment_layer = "";
            var kml_gage_layer = "";
            var drainage_line_shp_files = [];
            var catchment_shp_files = [];
            var gage_shp_files = [];
            var drainage_line_kml_file = null;
            var catchment_kml_file = null;
            var gage_kml_file = null;
    
            if(geoserver_id==1){
                //kml upload
                drainage_line_kml_file = parent_row.find('.drainage-line-kml-upload-input')[0].files[0];
                catchment_kml_file = parent_row.find('.catchment-kml-upload-input')[0].files[0];
                gage_kml_file = parent_row.find('.gage-kml-upload-input')[0].files[0];
                
            } else if (!parent_row.find('#shp-upload-toggle').bootstrapSwitch('state')) {
                //geoserver update
                geoserver_drainage_line_layer = checkTableCellInputWithError(parent_row.find('.geoserver-drainage-line-input'),
                                                                             safe_to_submit,
                                                                             "Drainage line layer is required. Please add to continue.");
                geoserver_catchment_layer = parent_row.find('.geoserver-catchment-input').val(); //optional
                geoserver_gage_layer = parent_row.find('.geoserver-gage-input').val(); //optional
            } else {
                geoserver_drainage_line_layer = parent_row.find('.geoserver-drainage-line-input').val(); //optional if file uploaded
                geoserver_catchment_layer = parent_row.find('.geoserver-catchment-input').val(); //optional
                geoserver_gage_layer = parent_row.find('.geoserver-gage-input').val(); //optional
                //geoserver upload
                drainage_line_shp_files = parent_row.find('.drainage-line-shp-upload-input')[0].files;
                catchment_shp_files = parent_row.find('.catchment-shp-upload-input')[0].files;
                gage_shp_files = parent_row.find('.gage-shp-upload-input')[0].files;
            }
        
            //submit if the form is ok
            if(safe_to_submit.val && !m_uploading_data) {
                if (window.confirm("Are you sure? You will delete prediction files " +
                    "if the watershed or subbasin name are changed.")) {

                    var submit_button = $(this);
                    var submit_button_html = submit_button.html();
                    var xhr = null;
                    var xhr_catchment = null;
                    var xhr_gage = null;
                    //give user information
                    addInfoMessage("Submiting data. Please be patient! " +
                    "This may take a few minutes due to downloading prediction datasets.");
                    submit_button.text('Submitting ...');
                    //update database
                    if (geoserver_id == 1 || parent_row.find('#shp-upload-toggle').bootstrapSwitch('state')) {
                        //file upload
                        if (drainage_line_kml_file != null || drainage_line_shp_files.length >= 4 ||
                            geoserver_drainage_line_layer.length > 0) {
                            var data = new FormData();
                            data.append("watershed_id", watershed_id);
                            data.append("watershed_name", watershed_name);
                            data.append("subbasin_name", subbasin_name);
                            data.append("data_store_id", data_store_id);
                            data.append("geoserver_id", geoserver_id);
                            data.append("geoserver_drainage_line_layer", geoserver_drainage_line_layer);
                            data.append("geoserver_catchment_layer", geoserver_catchment_layer);
                            data.append("geoserver_gage_layer", geoserver_gage_layer);
                            data.append("drainage_line_kml_file", drainage_line_kml_file);
                            data.append("catchment_kml_file", catchment_kml_file);
                            data.append("gage_kml_file", gage_kml_file);
                            for (var i = 0; i < drainage_line_shp_files.length; i++) {
                                data.append("drainage_line_shp_file", drainage_line_shp_files[i]);
                            }
                            var drainage_success_message = "Drainage Line Upload Success!";
                            if (drainage_line_kml_file != null || drainage_line_shp_files.length>=4) {
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
                                //upload catchment when  drainage line finishes if exists
                                if (catchment_kml_file != null || catchment_shp_files.length >= 4) {
                                    appendInfoMessage("Uploading Catchment ...", "message_catchment");
                                    var data = new FormData();
                                    data.append("watershed_id", watershed_id);
                                    data.append("watershed_name", watershed_name);
                                    data.append("subbasin_name", subbasin_name);
                                    data.append("data_store_id", data_store_id);
                                    data.append("geoserver_id", geoserver_id);
                                    if (return_data != null && typeof return_data != 'undefined') {
                                        if ('geoserver_drainage_line_layer' in return_data) {
                                            geoserver_drainage_line_layer = return_data['geoserver_drainage_line_layer'];
                                        }
                                        if ('drainage_line_kml_file' in return_data) {
                                            drainage_line_kml_file = return_data['drainage_line_kml_file'];
                                        }
                                    }
                                    data.append("geoserver_drainage_line_layer", geoserver_drainage_line_layer);
                                    data.append("geoserver_catchment_layer", geoserver_catchment_layer);
                                    data.append("geoserver_gage_layer", geoserver_gage_layer);
                                    data.append("drainage_line_kml_file", drainage_line_kml_file);
                                    data.append("catchment_kml_file", catchment_kml_file);
                                    data.append("gage_kml_file", gage_kml_file);
                                    for (var i = 0; i < catchment_shp_files.length; i++) {
                                        data.append("catchment_shp_file", catchment_shp_files[i]);
                                    }
                                    xhr_catchment = ajax_update_database_multiple_files("submit", data,
                                        "Catchment Upload Success!",
                                        "message_catchment");
                                }
                                //upload gage when catchment and drainage line finishes if gage exists
                                jQuery.when(xhr_catchment).done(function (catchment_data) {
                                    if (gage_kml_file != null || gage_shp_files.length >= 4) {
                                        appendInfoMessage("Uploading Gages ...", "message_gages");
                                        var data = new FormData();
                                        data.append("watershed_id", watershed_id)
                                        data.append("watershed_name", watershed_name);
                                        data.append("subbasin_name", subbasin_name);
                                        data.append("data_store_id", data_store_id);
                                        data.append("geoserver_id", geoserver_id);
                                        if (catchment_data != null && typeof catchment_data != 'undefined') {
                                            if ('geoserver_catchment_layer' in catchment_data) {
                                                geoserver_catchment_layer = catchment_data['geoserver_catchment_layer'];
                                            }
                                            if ('catchment_kml_file' in catchment_data) {
                                                catchment_kml_file = catchment_data['catchment_kml_file'];
                                            }
                                        }
                                        data.append("geoserver_drainage_line_layer", geoserver_drainage_line_layer);
                                        data.append("geoserver_catchment_layer", geoserver_catchment_layer);
                                        data.append("geoserver_gage_layer", geoserver_gage_layer);
                                        data.append("drainage_line_kml_file", drainage_line_kml_file);
                                        data.append("catchment_kml_file", catchment_kml_file);
                                        data.append("gage_kml_file", gage_kml_file);
                                        for (var i = 0; i < gage_shp_files.length; i++) {
                                            data.append("gage_shp_file", gage_shp_files[i]);
                                        }
                                        xhr_gage = ajax_update_database_multiple_files("submit", data,
                                            "Gages Upload Success!",
                                            "message_gages");
                                    }
                                    //when everything is finished
                                    jQuery.when(xhr, xhr_catchment, xhr_gage).done(function (drainage_line_return,
                                                                                             catchment_return,
                                                                                             gage_return) {
                                        if (drainage_line_return != null && drainage_line_return != 'undefined') {
                                            parent_row.find('.geoserver-drainage-line-input').val(drainage_line_return[0]['geoserver_drainage_line_layer']);
                                        }
                                        if (catchment_return != null && catchment_return != 'undefined') {
                                            parent_row.find('.geoserver-catchment-input').val(catchment_return[0]['geoserver_catchment_layer']);
                                        }
                                        if (gage_return != null && gage_return != 'undefined') {
                                            parent_row.find('.geoserver-gage-input').val(gage_return[0]['geoserver_gage_layer']);
                                        }
                                        //finishReset(return_data);
                                        //1) Clean file inputs
                                        parent_row.find('.drainage-line-shp-upload-input').val("");
                                        parent_row.find('.catchment-shp-upload-input').val('');
                                        parent_row.find('.gage-shp-upload-input').val('');
                                        //2) Change toggle to No
                                        $('#shp-upload-toggle').bootstrapSwitch('state', false);
                                        //update the input boxes to reflect change
                                        addSuccessMessage("Watershed Upload Complete!");
                                    })
                                    .always(function () {
                                        submit_button.html(submit_button_html);
                                        m_uploading_data = false;
                                    });
                                });

                            });
                        } else {
                            addErrorMessage("Need a drainage line to continue.");
                        }
                    } else {
                        var data = {
                                watershed_id: watershed_id,
                                watershed_name: watershed_name,
                                subbasin_name: subbasin_name,
                                data_store_id: data_store_id,
                                geoserver_id: geoserver_id,
                                geoserver_drainage_line_layer: geoserver_drainage_line_layer,
                                geoserver_catchment_layer: geoserver_catchment_layer,
                                geoserver_gage_layer: geoserver_gage_layer,
                                };
                
                        var xhr = ajax_update_database("submit",data);
                    }
                    m_uploading_data = true;
                    jQuery.when(xhr).done(function(data) {
                            if(drainage_line_kml_file != null) {
                                parent_row.find('.drainage-line-layer').find('.help-block.upload').text('Current: ' + data['kml_drainage_line_layer']);
                            }if(catchment_kml_file != null) {
                                parent_row.find('.catchment-layer').find('.help-block.upload').text('Current: ' + data['kml_catchment_layer']);
                            }if(gage_kml_file != null) {
                                parent_row.find('.gage-layer').find('.help-block.upload').text('Current: ' + data['kml_gage_layer']);
                            }
                        })
                       .always(function(){
                            submit_button.html(submit_button_html);
                            m_uploading_data = false;
                    });
                } //window confirm
            }  else if (m_uploading_data) {
                addWarningMessage("Submitting Data. Please Wait.");
            } else {
                addErrorMessage(safe_to_submit.error);
            }
            
        });
        
        //handle the submit update event
        $('.submit-delete-watershed').click(function(){
            var data = {
                    watershed_id: $(this).parent().parent().parent()
                                    .find('.watershed-id').text(),
                    };
            //update database
            deleteRowData($(this),data);
        });       
    }); //document ready
}()); // End of package wrapper 

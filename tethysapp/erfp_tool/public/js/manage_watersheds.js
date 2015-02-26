$(function() {
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
        var watershed_name = checkTableCellInputWithError(parent_row.find('.watershed-name'),safe_to_submit);
        var subbasin_name = checkTableCellInputWithError(parent_row.find('.subbasin-name'),safe_to_submit);
        var data_store_id = checkInputWithError(parent_row.find('.data-store-select'),safe_to_submit, true, true);
        var geoserver_id = checkInputWithError(parent_row.find('.geoserver-select'),safe_to_submit, true, true);
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
            drainage_line_kml_file = parent_row.find('.drainage-line-kml-upload-input')[0].files[0];
            catchment_kml_file = parent_row.find('.catchment-kml-upload-input')[0].files[0];
            gage_kml_file = parent_row.find('.gage-kml-upload-input')[0].files[0];
            
        } else if (!parent_row.find('#shp-upload-toggle').bootstrapSwitch('state')) {
            console.log(parent_row.find('.geoserver-drainage-line-input').val());
            //geoserver update
            geoserver_drainage_line_layer = checkTableCellInputWithError(parent_row.find('.geoserver-drainage-line-input'),safe_to_submit);
            geoserver_catchment_layer = parent_row.find('.geoserver-catchment-input').val(); //optional
            geoserver_gage_layer = parent_row.find('.geoserver-gage-input').val(); //optional
            console.log(geoserver_drainage_line_layer);
        } else {
            //geoserver upload
            drainage_line_shp_files = parent_row.find('.drainage-line-shp-upload-input')[0].files;
            catchment_shp_files = parent_row.find('.catchment-shp-upload-input')[0].files;
            gage_shp_files = parent_row.find('.gage-shp-upload-input')[0].files;
        }
    
        //submit if it form is ok
        if(safe_to_submit.val) {
            var submit_button = $(this);
            submit_button_html = submit_button.html();
            //give user information
            addInfoMessage("Submitting Data. Please Wait.");
            submit_button.text('Submitting ...');
            //update database
            if(geoserver_id==1 && (geoserver_drainage_line_layer != old_drainage_line_kml || geoserver_catchment_layer != old_catchment_kml)){
                //local upload
                var data = new FormData();
                data.append("watershed_id",watershed_id);
                data.append("watershed_name",watershed_name);
                data.append("subbasin_name",subbasin_name);
                data.append("data_store_id",data_store_id);
                data.append("geoserver_id",geoserver_id);
                data.append("geoserver_drainage_line_layer",geoserver_drainage_line_layer);
                data.append("geoserver_catchment_layer",geoserver_catchment_layer);
                data.append("geoserver_gage_layer",geoserver_gage_layer);
                data.append("drainage_line_kml_file",drainage_line_kml_file);
                data.append("catchment_kml_file",catchment_kml_file);
                data.append("gage_kml_file",gage_kml_file);
                for(var i = 0; i < drainage_line_shp_files.length; i++) {
                    data.append("drainage_line_shp_file",drainage_line_shp_files[i]);
                }
                for(var i = 0; i < catchment_shp_files.length; i++) {
                    data.append("catchment_shp_file",catchment_shp_files[i]);
                }
                for(var i = 0; i < gage_shp_files.length; i++) {
                    data.append("gage_shp_file",gage_shp_files[i]);
                }
                var xhr = ajax_update_database_with_file("submit",data);
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
            xhr.always(function(){
                submit_button.html(submit_button_html);
            });
        } else {
            addErrorMessage("Not submitted. Please fix form errors to proceed.");
        }
    
    });
    
    //handle the submit update event
    $('.submit-delete-watershed').click(function(){
        data = {
                watershed_id: $(this).parent().parent().parent()
                                .find('.watershed-id').text(),
                };
        //update database
        deleteRowData($(this),data);
    });       
}); //document ready


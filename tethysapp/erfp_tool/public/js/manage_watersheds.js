$(document).ready(function() {
    //turn the select options into select2
    $(".data-store-select").each(function() {
        $(this).select2();
    }); 
    $(".geoserver-select").each(function() {
        $(this).select2();
    });
    //manage on change event
    $(".geoserver-select").change(function() {
        var geoserver_id = $(this).val();
        if(geoserver_id == 1) {
            $(this).parent().parent().find('.drainage-line-kml')
                    .removeAttr('contenteditable')
                    .html('<div class="form-group">' +
                            '<input class="drainage-line-kml-upload-input" name="drainage-line-kml-upload-input" type="file" accept="*.kml">' +
                            '<p class="help-block hidden">Must select file to submit!</p>' +
                         '</div>');
            $(this).parent().parent().find('.catchment-kml')
                    .removeAttr('contenteditable')
                    .html('<div class="form-group">' +
                            '<input class="catchment-kml-upload-input" name="catchment-kml-upload-input" type="file" accept="*.kml">' +
                            '<p class="help-block hidden">Must select file to submit!</p>' +
                         '</div>');
        } else {
            var drainage_line_element = $(this).parent().parent().find('.drainage-line-kml');
            drainage_line_element.attr('contenteditable','true')
                                .text(drainage_line_element.attr('geoserver-kml-file'));
            var catchment_element = $(this).parent().parent().find('.catchment-kml');
            catchment_element.attr('contenteditable','true')
                                .text(catchment_element.attr('geoserver-kml-file'));

        }
    });   
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
    //check if files are uploaded or not
    if(geoserver_id==1){
        //local upload
        //upload new kml files if selected or if old does not exist

        //drainage line
        var old_drainage_line_kml = parent_row.find('.drainage-line-kml').attr('local-kml-file');
        var new_drainage_line_kml = parent_row.find('.drainage-line-kml-upload-input');
        if(new_drainage_line_kml.val() || !old_drainage_line_kml) {
            var geoserver_drainage_line_layer = checkInputWithError(new_drainage_line_kml,safe_to_submit, true);
        } else {
            var geoserver_drainage_line_layer = old_drainage_line_kml;
        }

        //catchment
        var old_catchment_kml = parent_row.find('.catchment-kml').attr('local-kml-file');
        var new_catchment_kml = parent_row.find('.catchment-kml-upload-input');
        if(new_catchment_kml.val() || !old_catchment_kml) {
            var geoserver_catchment_layer = checkInputWithError(new_catchment_kml,safe_to_submit, true);
        } else {
            var geoserver_catchment_layer = old_catchment_kml;
        }
    } else {
        //file located on geoserver
        var geoserver_drainage_line_layer = checkTableCellInputWithError(parent_row.find('.drainage-line-kml'),safe_to_submit);
        var geoserver_catchment_layer = checkTableCellInputWithError(parent_row.find('.catchment-kml'),safe_to_submit);
    }

    //submit if it form is ok
    if(safe_to_submit.val) {
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
            //append the file if it exists
            if(geoserver_drainage_line_layer != old_drainage_line_kml) {
                data.append("drainage_line_kml_file",parent_row.find('.drainage-line-kml-upload-input')[0].files[0]);
            }
            if(geoserver_catchment_layer != old_catchment_kml) {
                data.append("catchment_kml_file",parent_row.find('.catchment-kml-upload-input')[0].files[0]);
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
                    };
    
            ajax_update_database("submit",data);
            if(geoserver_id!=1) {
                //clean up data
                parent_row.find('.drainage-line-kml').removeAttr('local-kml-file');
                parent_row.find('.catchment-kml').removeAttr('local-kml-file');
            }
        }
    } else {
        addErrorMessage("Not submitted. Please fix form errors to proceed.");
    }

});

//handle the submit update event
$('.submit-delete-watershed').click(function(){
    if (window.confirm("Are you sure?")) {
        var parent_row = $(this).parent().parent().parent();
        //update database
        data = {
                watershed_id: parent_row.find('.watershed-id').text(),
                };
    
        var xhr = ajax_update_database("delete",data);
        xhr.done(function(data) {
            if ('success' in data) {
                parent_row.remove();
            }
        });
    }
});
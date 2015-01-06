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
$('#geoserver-drainage-line-input').parent().parent().addClass('hidden');
help_html = '<p class="help-block hidden">No Geoserver catchment layer name specified.</p>';
$('#geoserver-catchment-input').parent().parent().append(help_html);
$('#geoserver-catchment-input').parent().parent().addClass('hidden');
//ajax file submit
//send data to database with error messages
function ajax_update_database_with_file(ajax_url, ajax_data) {
    //backslash at end of url is requred
    if (ajax_url.substr(-1) !== "/") {
        ajax_url = ajax_url.concat("/");
    }
    //update database
    jQuery.ajax({
        url: ajax_url,
        type: "POST",
        data: ajax_data,
        dataType: "json",
        processData: false, // Don't process the files
        contentType: false, // Set content type to false as jQuery will tell the server its a query string request
        success: function(data) {
            if("success" in data) {
                $('#message').html(
                  '<span class="glyphicon glyphicon-ok-circle" aria-hidden="true"></span>' +
                  '<span class="sr-only">Sucess:</span> ' + data['success']
                ).removeClass('hidden').removeClass('alert-danger').addClass('alert-success');
            } else {
                addErrorMessage(data['error']);
            }
        }, 
        error: function(xhr, status, error) {
            addErrorMessage(error);
            console.log(xhr.responseText);
        },
    });
}
//handle the submit event
$('#submit-add-watershed').click(function(){
    var safe_to_submit = {val: true};

    //check data store input
    var watershed_name = checkInputWithError($('#watershed-name-input'),safe_to_submit);
    var subbasin_name = checkInputWithError($('#subbasin-name-input'),safe_to_submit);
    var data_store_id = checkInputWithError($('#data-store-select'),safe_to_submit, true);
    console.log(data_store_id);
    var geoserver_id = checkInputWithError($('#geoserver-select'),safe_to_submit, true);
    if(geoserver_id==1){
        //local upload
        var geoserver_drainage_line_layer = checkInputWithError($('#drainage-line-kml-upload-input'),safe_to_submit, true);
        var geoserver_catchment_layer = checkInputWithError($('#catchment-kml-upload-input'),safe_to_submit, true);
    } else {
        //file located on geoserver
        var geoserver_drainage_line_layer = checkInputWithError($('#geoserver-drainage-line-input'),safe_to_submit);
        var geoserver_catchment_layer = checkInputWithError($('#geoserver-catchment-input'),safe_to_submit);
    }

    if(safe_to_submit.val) {
        //update database
        if(geoserver_id==1){
            //local upload
            var data = new FormData();
            data.append("watershed_name",watershed_name);
            data.append("subbasin_name",subbasin_name);
            data.append("data_store_id",data_store_id);
            data.append("geoserver_id",geoserver_id);
            data.append("geoserver_drainage_line_layer",geoserver_drainage_line_layer);
            data.append("geoserver_catchment_layer",geoserver_catchment_layer);
            data.append("drainage_line_kml_file",$('#drainage-line-kml-upload-input')[0].files[0]);
            data.append("catchment_kml_file",$('#catchment-kml-upload-input')[0].files[0]);
            ajax_update_database_with_file("submit",data);
        } else {
            var data = {
                    watershed_name: watershed_name,
                    subbasin_name: subbasin_name,
                    data_store_id: data_store_id,
                    geoserver_id: geoserver_id,
                    geoserver_drainage_line_layer: geoserver_drainage_line_layer,
                    geoserver_catchment_layer: geoserver_catchment_layer,
                    };
    
            ajax_update_database("submit",data);
        }
        //reset inputs
        $('#watershed-name-input').val('');
        $('#subbasin-name-input').val('');
        $('#data-store-select').select2('val','');
        $('#geoserver-select').select2('val','');
        $('#geoserver-layers-input').val('');
    }

});

//show/hide elements based on selection
$('#geoserver-select').change(function() {
    var select_val = $(this).val();
    if(select_val == 1) {
        //local upload
        $('#geoserver-drainage-line-input').val('');
        $('#geoserver-drainage-line-input').parent().parent().addClass('hidden');
        $('#geoserver-catchment-input').val('');
        $('#geoserver-catchment-input').parent().parent().addClass('hidden');
        $('#drainage-line-kml-upload-input').parent().removeClass('hidden');
        $('#catchment-kml-upload-input').parent().removeClass('hidden');
    } else {
        //file located on geoserver
        $('#geoserver-drainage-line-input').parent().parent().removeClass('hidden');
        $('#geoserver-catchment-input').parent().parent().removeClass('hidden');
        $('#drainage-line-kml-upload-input').parent().addClass('hidden');
        $('#drainage-line-kml-upload-input').val('');
        $('#catchment-kml-upload-input').parent().addClass('hidden');
        $('#catchment-kml-upload-input').val('');
    }

});
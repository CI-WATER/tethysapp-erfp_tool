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

//handle the submit event
$('#submit-add-watershed').click(function(){
    //check data store input
    var safe_to_submit = {val: true};
    var watershed_name = checkInputWithError($('#watershed-name-input'),safe_to_submit);
    var subbasin_name = checkInputWithError($('#subbasin-name-input'),safe_to_submit);
    var data_store_id = checkInputWithError($('#data-store-select'),safe_to_submit, true);
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
        var submit_button = $(this);
        //give user information
        addInfoMessage("Submitting Data. Please Wait.");
        submit_button.text('Submitting ...');
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
            var xhr = ajax_update_database_with_file("submit",data);
        } else {
            var data = {
                    watershed_name: watershed_name,
                    subbasin_name: subbasin_name,
                    data_store_id: data_store_id,
                    geoserver_id: geoserver_id,
                    geoserver_drainage_line_layer: geoserver_drainage_line_layer,
                    geoserver_catchment_layer: geoserver_catchment_layer,
                    };
    
            var xhr = ajax_update_database("submit",data);
        }
        xhr.done(function(data) {
            if ('success' in data) {
                //reset inputs
                $('#watershed-name-input').val('');
                $('#subbasin-name-input').val('');
                $('#data-store-select').select2('val','');
                $('#geoserver-select').select2('val','');
                $('#geoserver-layers-input').val('');
                $('#drainage-line-kml-upload-input').val('');
                $('#catchment-kml-upload-input').val('');
            }
        })
        .always(function() {
            submit_button.html('<span class="glyphicon glyphicon-plus"></span>Add Watershed');
        });
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
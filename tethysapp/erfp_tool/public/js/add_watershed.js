//initialize help blockss
var help_html = '<p class="help-block hidden">No watershed name specified.</p>';
$('#watershed-name-input').parent().parent().append(help_html);
help_html = '<p class="help-block hidden">No subbasin name specified.</p>';
$('#subbasin-name-input').parent().parent().append(help_html);
help_html = '<p class="help-block hidden">No Data Store selected.</p>';
$('#data-store-select').parent().append(help_html);
help_html = '<p class="help-block hidden">No Geoserver selected.</p>';
$('#geoserver-select').parent().append(help_html);
help_html = '<p class="help-block hidden">No Geoserver layer name specified.</p>';
$('#geoserver-layers-input').parent().parent().append(help_html);

//handle the submit event
$('#submit-add-watershed').click(function(){
    var safe_to_submit = {val: true};

    //check data store input
    var watershed_name = checkInputWithError($('#watershed-name-input'),safe_to_submit);
    var subbasin_name = checkInputWithError($('#subbasin-name-input'),safe_to_submit);
    var data_store_id = checkInputWithError($('#data-store-select'),safe_to_submit, true);
    var geoserver_id = checkInputWithError($('#geoserver-select'),safe_to_submit, true);
    var geoserver_layer = checkInputWithError($('#geoserver-layers-input'),safe_to_submit);

    if(safe_to_submit.val) {
        //update database
        data = {
                watershed_name: watershed_name,
                subbasin_name: subbasin_name,
                data_store_id: data_store_id,
                geoserver_id: geoserver_id,
                geoserver_layer: geoserver_layer,
                };

        ajax_update_database("submit",data);
        //reset inputs
        $('#watershed-name-input').val('');
        $('#subbasin-name-input').val('');
        $('#data-store-select').select2('val','');
        $('#geoserver-select').select2('val','');
        $('#geoserver-layers-input').val('');
    }

});
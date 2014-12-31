//initialize help blockss
var help_html = '<p class="help-block hidden">No data store name specified.</p>';
$('#data-store-name-input').parent().parent().append(help_html);
help_html = '<p class="help-block hidden">No data store type specified.</p>';
$('#data-store-type-select').parent().append(help_html);
help_html = '<p class="help-block hidden">No datastore API endpoint specified.</p>';
$('#data-store-endpoint-input').parent().parent().append(help_html);
help_html = '<p class="help-block hidden">No API key specified.</p>';
$('#data-store-api-key-input').parent().parent().append(help_html);

//handle the submit event
$('#submit-add-data-store').click(function(){
    var safe_to_submit = {val: true};

    //check data store input
    var data_store_name = checkInputWithError($('#data-store-name-input'),safe_to_submit);
    var data_store_type_id = checkInputWithError($('#data-store-type-select'),safe_to_submit, true);
    var data_store_endpoint = checkInputWithError($('#data-store-endpoint-input'),safe_to_submit);
    var data_store_api_key = checkInputWithError($('#data-store-api-key-input'),safe_to_submit);

    if(safe_to_submit.val) {
        //update database
        data = {
                data_store_name: data_store_name,
                data_store_type_id: data_store_type_id,
                data_store_endpoint: data_store_endpoint,
                data_store_api_key: data_store_api_key
                };

        ajax_update_database("submit",data);
        $('#data-store-name-input').val('');
        $('#data-store-type-select').select2('val','');
        $('#data-store-endpoint-input').val('');
        $('#data-store-api-key-input').val('');
    }

});
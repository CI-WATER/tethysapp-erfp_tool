//initialize help blockss
var help_html = '<p class="help-block hidden">No ECMWF-RAPID location specified.</p>';
$('#ecmwf-rapid-location-input').parent().parent().append(help_html);
var help_html = '<p class="help-block hidden">No API Key specified.</p>';
$('#api-key-input').parent().parent().append(help_html);

//handle the submit event
$('#submit-changes-settings').click(function(){
    var safe_to_submit = {val: true};

    var base_layer_id = $('#base-layer-input').val();

    //check API Key Input
    var api_key = checkInputWithError($('#api-key-input'),safe_to_submit);
    //check output rapid-ecmwf files location
    var ecmwf_rapid_location = checkInputWithError($('#ecmwf-rapid-location-input'),safe_to_submit);

    //submit if inputs are ok
    if(safe_to_submit.val) {
        //update attribute
        var base_layer_id = $('#base-layer-input').select2('data').id;
        var api_keys = JSON.parse($('#base-layer-api-keys').attr('base-layer-api-keys'));
        if(api_keys[base_layer_id]) {
            api_keys[base_layer_id] = api_key;
            $('#base-layer-api-keys').attr('base-layer-api-keys', JSON.stringify(api_keys));
        }

        //update database
        data = {
                base_layer_id: base_layer_id,
                api_key: api_key,
                ecmwf_rapid_location: ecmwf_rapid_location                    
                };

        ajax_update_database("update-settings",data)
    }

});

//change api key based on the input
$('#base-layer-input').change(function() {
    var base_layer_id = $(this).select2('data').id;
    var api_keys = JSON.parse($('#base-layer-api-keys').attr('base-layer-api-keys'));
    if(api_keys[base_layer_id]) {
        $('#api-key-input').val(api_keys[base_layer_id]);
    }



});
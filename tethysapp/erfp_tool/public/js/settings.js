//initialize help blockss
var help_html = '<p class="help-block hidden">No ECMWF-RAPID location specified.</p>';
$('#ecmwf-rapid-location-input').parent().parent().append(help_html);
var help_html = '<p class="help-block hidden">No API Key specified.</p>';
$('#api-key-input').parent().parent().append(help_html);

$('#api-key-input').parent().parent().addClass('hidden');

//handle the submit event
$('#submit-changes-settings').click(function(){
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
    var safe_to_submit = {val: true};

    var base_layer_id = checkInputWithError($('#base-layer-select'),safe_to_submit, true, true);

    //check API Key Input
    var api_key = checkInputWithError($('#api-key-input'),safe_to_submit);
    //check output rapid-ecmwf files location
    var ecmwf_rapid_location = checkInputWithError($('#ecmwf-rapid-location-input'),safe_to_submit);
    var wrf_hydro_rapid_location = checkInputWithError($('#wrf-hydro-rapid-location-input'),safe_to_submit);
    var era_interim_rapid_location = checkInputWithError($('#era-interim-rapid-location-input'),safe_to_submit);

    //submit if inputs are ok
    if(safe_to_submit.val) {
        //update attribute
        var api_keys = JSON.parse($('#base-layer-api-keys').attr('base-layer-api-keys'));
        if(api_keys[base_layer_id]) {
            api_keys[base_layer_id] = api_key;
            $('#base-layer-api-keys').attr('base-layer-api-keys', JSON.stringify(api_keys));
        }

        //update database
        data = {
                base_layer_id: base_layer_id,
                api_key: api_key,
                ecmwf_rapid_location: ecmwf_rapid_location,
                era_interim_rapid_location: era_interim_rapid_location,
                wrf_hydro_rapid_location: wrf_hydro_rapid_location,                    
                };

        ajax_update_database("update",data)
    }

});

//change api key based on the input
$('#base-layer-select').change(function() {
    var base_layer_id = $(this).select2('data').id;
    if(base_layer_id == 3) {    
        $('#api-key-input').parent().parent().removeClass('hidden');
        if ($('#api-key-input').attr('initial') = "none") {
            $('#api-key-input').removeAttr('initial')
        }
    }
    else {
        $('#api-key-input').parent().parent().addClass('hidden');
    }

});
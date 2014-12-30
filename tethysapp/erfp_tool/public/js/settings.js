//initialize help blockss
var help_html = '<p class="help-block hidden">No ECMWF-RAPID location specified.</p>';
$('#ecmwf-rapid-location-input').parent().parent().append(help_html);
var help_html = '<p class="help-block hidden">No API Key specified.</p>';
$('#api-key-input').parent().parent().append(help_html);

//handle the submit event
$('#submit-changes-settings').click(function(){
    var base_layer_id = $('#base-layer-input').val();
    var safe_to_submit = true;

    //check API Key Input
    var api_key = $('#api-key-input').val();
    if(api_key) {
        $('#api-key-input').parent().parent().removeClass('has-error');
        $('#api-key-input').parent().parent().find('.help-block').addClass('hidden');
    } else {
        safe_to_submit = false;
        $('#api-key-input').parent().parent().addClass('has-error');
        $('#api-key-input').parent().parent().find('.help-block').removeClass('hidden');

    }
    //check ecmwf inout
    var ecmwf_rapid_location = $('#ecmwf-rapid-location-input').val();
    if(ecmwf_rapid_location) {
        $('#ecmwf-rapid-location-input').parent().parent().removeClass('has-error');
        $('#ecmwf-rapid-location-input').parent().parent().find('.help-block').addClass('hidden');
    } else {
        safe_to_submit = false;
        $('#ecmwf-rapid-location-input').parent().parent().addClass('has-error');
        $('#ecmwf-rapid-location-input').parent().parent().find('.help-block').removeClass('hidden');
    }
    if(safe_to_submit) {
        //update attribute
        var base_layer_id = $('#base-layer-input').select2('data').id;
        var api_keys = JSON.parse($('#base-layer-api-keys').attr('base-layer-api-keys'));
        if(api_keys[base_layer_id]) {
            api_keys[base_layer_id] = api_key;
            $('#base-layer-api-keys').attr('base-layer-api-keys', JSON.stringify(api_keys));
        }

        //update database
        jQuery.ajax({
            type: "GET",
            url: "update-settings",
            dataType: "json",
            contentType: "text/plain",
            data: {
                base_layer_id: base_layer_id,
                api_key: api_key,
                ecmwf_rapid_location: ecmwf_rapid_location                    
            },
            success: function(data) {
                $('#message').html(
                  '<span class="glyphicon glyphicon-ok-circle" aria-hidden="true"></span>' +
                  '<span class="sr-only">Sucess:</span> ' + data['success']
                ).removeClass('hidden').removeClass('alert-danger').addClass('alert-success');
            }, 
            error: function(request, status, error) {
                $('#message').html(
                  '<span class="glyphicon glyphicon-exclamation-sign" aria-hidden="true"></span>' +
                  '<span class="sr-only">Error:</span> ' + error
                ).removeClass('hidden').removeClass('alert-success').addClass('alert-danger');
            },
        });
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
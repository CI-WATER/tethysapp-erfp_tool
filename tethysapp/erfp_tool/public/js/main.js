//form submission check function
function checkInputWithError(input, safe_to_submit, select) {
    select = typeof select !== 'undefined' ? select : false;
    var data_value = input.val();

    if(select){
        var parent = input.parent();
    } else {
        var parent = input.parent().parent();    
    }

    if(data_value) {
        parent.removeClass('has-error');
        parent.find('.help-block').addClass('hidden');
        return data_value;
    } else {
        safe_to_submit.val = false;
        parent.addClass('has-error');
        parent.find('.help-block').removeClass('hidden');
        return null;
    }
}
//add error message to #message div
function addErrorMessage(error) {
       $('#message').html(
          '<span class="glyphicon glyphicon-exclamation-sign" aria-hidden="true"></span>' +
          '<span class="sr-only">Error:</span> ' + error
        )
        .removeClass('hidden')
        .removeClass('alert-success')
        .addClass('alert-danger');
 
}

//send data to database with error messages
function ajax_update_database(ajax_url, ajax_data) {
    //update database
    jQuery.ajax({
        type: "GET",
        url: ajax_url,
        dataType: "json",
        data: ajax_data,
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
        error: function(request, status, error) {
            addErrorMessage(error);
        },
    });
}
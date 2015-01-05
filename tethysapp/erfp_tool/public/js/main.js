//get cookie
function getCookie(name) {
    var cookieValue = null;
    if (document.cookie && document.cookie != '') {
        var cookies = document.cookie.split(';');
        for (var i = 0; i < cookies.length; i++) {
            var cookie = jQuery.trim(cookies[i]);
            // Does this cookie string begin with the name we want?
            if (cookie.substring(0, name.length + 1) == (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}

//find if method is csrf safe
function csrfSafeMethod(method) {
    // these HTTP methods do not require CSRF protection
    return (/^(GET|HEAD|OPTIONS|TRACE)$/.test(method));
}
//add csrf token to approporiate ajax requests
$(document).ready(function() {
    $.ajaxSetup({
        beforeSend: function(xhr, settings) {
            if (!csrfSafeMethod(settings.type) && !this.crossDomain) {
                xhr.setRequestHeader("X-CSRFToken", getCookie("csrftoken"));
            }
        }
    });
});

//form submission check function
function checkInputWithError(input, safe_to_submit, one_parent) {
    one_parent = typeof one_parent !== 'undefined' ? one_parent : false;
    var data_value = input.val();

    if(one_parent){
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
//form submission check function
function checkTableCellInputWithError(input, safe_to_submit) {
    var data_value = input.text();
    var parent = input.parent();

    if(data_value) {
        parent.removeClass('danger');
        return data_value;
    } else {
        safe_to_submit.val = false;
        safe_to_submit.error = "Data missing in input";
        parent.addClass('danger');
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
    //backslash at end of url is requred
    if (ajax_url.substr(-1) !== "/") {
        ajax_url = ajax_url.concat("/");
    }
    //update database
    jQuery.ajax({
        type: "POST",
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
        error: function(xhr, status, error) {
            addErrorMessage(error);
            console.log(xhr.responseText);
        },
    });
}
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
$(function() {
    $.ajaxSetup({
        beforeSend: function(xhr, settings) {
            if (!csrfSafeMethod(settings.type) && !this.crossDomain) {
                xhr.setRequestHeader("X-CSRFToken", getCookie("csrftoken"));
            }
        }
    });
}); //document ready

//form submission check function
function checkInputWithError(input, safe_to_submit, one_parent, select_two) {
    one_parent = typeof one_parent !== 'undefined' ? one_parent : false;
    select_two = typeof select_two !== 'undefined' ? select_two : false;

    if(select_two) {
        var data_value = input.select2("val");
    } else {
        var data_value = input.val();
    }

    if(one_parent){
        var parent = input.parent();
    } else {
        var parent = input.parent().parent();    
    }

    if(data_value) {
        parent.removeClass('has-error');
        parent.find('.help-block').addClass('hidden');
        return data_value.trim();
    } else {
        safe_to_submit.val = false;
        parent.addClass('has-error');
        parent.find('.help-block').removeClass('hidden');
        return null;
    }
}
//form submission check function
function checkTableCellInputWithError(input, safe_to_submit, error_msg) {
    var data_value = input.text();
    if(data_value == "") {
        data_value = input.val();
    }
    var parent = input.parent();

    if(data_value) {
        if (safe_to_submit.val) {
            parent.removeClass('danger');
        }
        return data_value.trim();
    } else {
        safe_to_submit.val = false;
        safe_to_submit.error = "Data missing in input";
        if (typeof error_msg != 'undefined' && error_msg != null) {
            safe_to_submit.error = error_msg;
        }
        parent.addClass('danger');
        return null;
    }
}
//add error message to #message div
function appendErrorMessage(error, div_id) {
    var div_id_string = '#message';
    if (typeof div_id != 'undefined') {
        div_id_string = '#'+div_id;
    }
    $(div_id_string).html(
      '<span class="glyphicon glyphicon-exclamation-sign" aria-hidden="true"></span>' +
      '<span class="sr-only">Error:</span> ' + error
    )
    .removeClass('hidden')
    .removeClass('alert-success')
    .removeClass('alert-info')
    .removeClass('alert-warning')
    .addClass('alert-danger');
 
}
//add warning message to #message div
function addWarningMessage(error, div_id) {
    var div_id_string = '#message';
    if (typeof div_id != 'undefined') {
        div_id_string = '#'+div_id;
    }
    $(div_id_string).html(
      '<span class="glyphicon glyphicon-exclamation-sign" aria-hidden="true"></span>' +
      '<span class="sr-only">Warning:</span> ' + error
    )
    .removeClass('hidden')
    .removeClass('alert-success')
    .removeClass('alert-info')
    .removeClass('alert-danger')
    .addClass('alert-warning');
 
}
//add information message to #message div
function addInfoMessage(message, div_id) {
    var div_id_string = '#message';
    if (typeof div_id != 'undefined') {
        div_id_string = '#'+div_id;
    }
    $(div_id_string).html(
      '<span class="glyphicon glyphicon-info-sign" aria-hidden="true"></span>' +
      '<span class="sr-only">Info:</span> ' + message
    )
    .removeClass('hidden')
    .removeClass('alert-success')
    .removeClass('alert-danger')
    .removeClass('alert-warning')
    .addClass('alert-info');
 
}
//add success message to #message div
function addSuccessMessage(message, div_id) {
    var div_id_string = '#message';
    if (typeof div_id != 'undefined') {
        div_id_string = '#'+div_id;
    }
    $(div_id_string).html(
      '<span class="glyphicon glyphicon-ok-circle" aria-hidden="true"></span>' +
      '<span class="sr-only">Sucess:</span> ' + message
    ).removeClass('hidden')
    .removeClass('alert-danger')
    .removeClass('alert-info')
    .removeClass('alert-warning')
    .addClass('alert-success'); 
}

//add error message to #message div
function appendErrorMessage(message, div_id, message_div_id) {
    var div_id_string = '';
    if (typeof div_id != 'undefined') {
        div_id_string = 'id = "'+div_id+'"';
    }
    var message_div_id_string = '#message';
    if (typeof message_div_id != 'undefined') {
        message_div_id_string = '#'+message_div_id;
    }
    $('#'+div_id).remove();
    $(message_div_id_string).append(
      '<div '+ div_id_string +' class="alert alert-danger" role="alert">' +
      '<span class="glyphicon glyphicon-fire" aria-hidden="true"></span>' +
      '<span class="sr-only">Error:</span> ' + message + '</div>'
    )
    .removeClass('hidden');
}
//add error message to #message div
function appendWarningMessage(message, div_id, message_div_id) {
    var div_id_string = '';
    if (typeof div_id != 'undefined') {
        div_id_string = 'id = "'+div_id+'"';
    }
    var message_div_id_string = '#message';
    if (typeof message_div_id != 'undefined') {
        message_div_id_string = '#'+message_div_id;
    }
    $('#'+div_id).remove();
    $(message_div_id_string).append(
      '<div '+ div_id_string +' class="alert alert-warning" role="alert">' +
      '<span class="glyphicon glyphicon-exclamation-sign" aria-hidden="true"></span>' +
      '<span class="sr-only">Error:</span> ' + message + '</div>'
    )
    .removeClass('hidden');
}
//add info message to #message div
function appendInfoMessage(message, div_id) {
    var div_id_string = '';
    if (typeof div_id != 'undefined') {
        div_id_string = 'id = "'+div_id+'"';
    }
    $('#message').append(
      '<div '+ div_id_string +' class="alert alert-info" role="alert">' +
      '<span class="glyphicon glyphicon-info-sign" aria-hidden="true"></span>' +
      '<span class="sr-only">Info:</span> ' + message + '</div>'
    )
    .removeClass('hidden');
}
//add success message to #message div
function appendSuccessMessage(message, div_id) {
    var div_id_string = '';
    if (typeof div_id != 'undefined') {
        div_id_string = 'id = "'+div_id+'"';
    }
    $('#message').append(
      '<div '+ div_id_string +' class="alert alert-success" role="alert">' +
      '<br><span class="glyphicon glyphicon-ok-circle" aria-hidden="true"></span>' +
      '<span class="sr-only">Sucess:</span> ' + message + '</div>'
    )
    .removeClass('hidden');
}

//send data to database with error messages
function ajax_update_database(ajax_url, ajax_data, div_id) {
    //backslash at end of url is requred
    if (ajax_url.substr(-1) !== "/") {
        ajax_url = ajax_url.concat("/");
    }
    //update database
    var xhr = jQuery.ajax({
        type: "POST",
        url: ajax_url,
        dataType: "json",
        data: ajax_data,
        success: function(data) {
            if("success" in data) {
                addSuccessMessage(data['success'], div_id);
            } else {
                appendErrorMessage(data['error'], div_id);
            }
        }, 
        error: function(xhr, status, error) {
            appendErrorMessage(error, div_id);
            console.log(xhr.responseText);
        },
    });
    return xhr;
}

//ajax file submit
//send data to database with error messages
function ajax_update_database_with_file(ajax_url, ajax_data, div_id) {
    //backslash at end of url is requred
    if (ajax_url.substr(-1) !== "/") {
        ajax_url = ajax_url.concat("/");
    }
    //update database
    var xhr = jQuery.ajax({
        url: ajax_url,
        type: "POST",
        data: ajax_data,
        dataType: "json",
        processData: false, // Don't process the files
        contentType: false, // Set content type to false as jQuery will tell the server its a query string request
        success: function(data) {
            if("success" in data) {
                addSuccessMessage(data['success'], div_id);
            } else {
                appendErrorMessage(data['error'], div_id);
            }
        }, 
        error: function(xhr, status, error) {
            appendErrorMessage(error, div_id);
            console.log(xhr.responseText);
        },
    });
    return xhr;
}

//send data to database with error messages
function ajax_update_database_multiple_files(ajax_url, ajax_data, custom_message, div_id) {
    //backslash at end of url is required
    if (ajax_url.substr(-1) !== "/") {
        ajax_url = ajax_url.concat("/");
    }
    //update database
    var xhr = jQuery.ajax({
        url: ajax_url,
        type: "POST",
        data: ajax_data,
        dataType: "json",
        processData: false, // Don't process the files
        contentType: false, // Set content type to false as jQuery will tell the server it's a query string request
    });
    xhr.done(function(data){
        if("success" in data) {
            addSuccessMessage(custom_message, div_id);
        } else {
            appendErrorMessage(data['error'], div_id);
        }
    })
    .fail(function(xhr, status, error) {
        appendErrorMessage(error, div_id);
        console.log(xhr.responseText);
    });
    return xhr;
}
//submit row data
function submitRowData(submit_button, data, safe_to_submit) {
    if(safe_to_submit.val) {
        //give user information
        addInfoMessage("Submitting Data. Please Wait.");
        var submit_button_html = submit_button.html();
        submit_button.text('Submitting ...');
        var xhr = ajax_update_database("submit",data);
        xhr.always(function(){
            submit_button.html(submit_button_html);
        });
    } else {
        appendErrorMessage(safe_to_submit.error);
    }
}
//delete row data
function deleteRowData(submit_button, data) {
    if (window.confirm("Are you sure?")) {
        var parent_row = submit_button.parent().parent().parent();
        //give user information
        addInfoMessage("Deleting Data. Please Wait.");
        var submit_button_html = submit_button.html();
        submit_button.text('Deleting ...');
    
        var xhr = ajax_update_database("delete",data);
        xhr.done(function(data) {
            if ('success' in data) {
                parent_row.remove();
            }
        }).always(function(){
            submit_button.html(submit_button_html);
        });
    }
}
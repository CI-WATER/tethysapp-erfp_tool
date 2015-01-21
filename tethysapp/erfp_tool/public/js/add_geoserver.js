//initialize help blockss
var help_html = '<p class="help-block hidden">No geoserver name specified.</p>';
$('#geoserver-name-input').parent().parent().append(help_html);
help_html = '<p class="help-block hidden">No geoserver url specified.</p>';
$('#geoserver-url-input').parent().parent().append(help_html);

//handle the submit event
$('#submit-add-geoserver').click(function(){
    //check data store input
    var safe_to_submit = {val: true};
    var geoserver_name = checkInputWithError($('#geoserver-name-input'),safe_to_submit);
    var geoserver_url = checkInputWithError($('#geoserver-url-input'),safe_to_submit);

    if(safe_to_submit.val) {
        var submit_button = $(this);
        //give user information
        addInfoMessage("Submitting Data. Please Wait.");
        submit_button.text('Submitting ...');
        //update database
        data = {
                geoserver_name: geoserver_name,
                geoserver_url: geoserver_url,
                };

        var xhr = ajax_update_database("submit",data);
        xhr.done(function(data) {
            if ('success' in data) {
                //reset inputs
                $('#geoserver-name-input').val('');
                $('#geoserver-url-input').val('');
            }
        })
        .always(function() {
            submit_button.html('<span class="glyphicon glyphicon-plus"></span>Add Geoserver');
        });

    }

});
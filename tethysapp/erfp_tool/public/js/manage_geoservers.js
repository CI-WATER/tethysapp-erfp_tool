//handle the submit update event
$('.submit-update-geoserver').click(function(){
    var safe_to_submit = {val: true, error:""};
    var parent_row = $(this).parent().parent().parent();
    //check data store input
    var geoserver_id = parent_row.find('.geoserver-id').text();
    var geoserver_name = checkTableCellInputWithError(parent_row.find('.geoserver-name'),safe_to_submit);
    var geoserver_url = checkTableCellInputWithError(parent_row.find('.geoserver-url'),safe_to_submit);

    if(safe_to_submit.val) {
        //update database
        data = {
                geoserver_id: geoserver_id,
                geoserver_name: geoserver_name,
                geoserver_url: geoserver_url,
                };

        ajax_update_database("submit",data);
    } else {
        addErrorMessage(safe_to_submit.error);
    }
});

//handle the submit update event
$('.submit-delete-geoserver').click(function(){
    if (window.confirm("Are you sure?")) {
        var parent_row = $(this).parent().parent().parent();
        //update database
        data = {
                geoserver_id: parent_row.find('.geoserver-id').text(),
                };
    
        var xhr = ajax_update_database("delete",data);
        xhr.done(function(data) {
            if ('success' in data) {
                parent_row.remove();
            }
        });
    }
});
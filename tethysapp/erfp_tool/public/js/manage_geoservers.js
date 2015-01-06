//handle the submit update event
$('.submit-update-geoserver').click(function(){
    var safe_to_submit = {val: true, error:""};
    //check data store input
    var geoserver_id = $(this).parent().parent().parent().find('.geoserver-id').text();
    var geoserver_name = checkTableCellInputWithError($(this).parent().parent().parent().find('.geoserver-name'),safe_to_submit);
    var geoserver_url = checkTableCellInputWithError($(this).parent().parent().parent().find('.geoserver-url'),safe_to_submit);

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
        //update database
        data = {
                geoserver_id: $(this).parent().parent().parent().find('.geoserver-id').text(),
                };
    
        ajax_update_database("delete",data);
        $(this).parent().parent().parent().remove();
    }
});
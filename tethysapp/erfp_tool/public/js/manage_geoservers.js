jQuery(function() {
    //handle the submit update event
    $('.submit-update-geoserver').click(function(){
        var safe_to_submit = {val: true, error:""};
        var parent_row = $(this).parent().parent().parent();
        //check data store input
        var geoserver_id = parent_row.find('.geoserver-id').text();
        var geoserver_name = checkTableCellInputWithError(parent_row.find('.geoserver-name'),safe_to_submit);
        var geoserver_url = checkTableCellInputWithError(parent_row.find('.geoserver-url'),safe_to_submit);
        var geoserver_username = checkTableCellInputWithError(parent_row.find('.geoserver-username'),safe_to_submit);
        var geoserver_password = checkTableCellInputWithError(parent_row.find('.geoserver-password-input'),safe_to_submit);
    
        data = {
                geoserver_id: geoserver_id,
                geoserver_name: geoserver_name,
                geoserver_url: geoserver_url,
                geoserver_username: geoserver_username,
                geoserver_password: geoserver_password,
                };
    
        //update database
        submitRowData($(this), data, safe_to_submit); 
    });
    
    //handle the submit update event
    $('.submit-delete-geoserver').click(function(){
        data = {
                geoserver_id: $(this).parent().parent().parent()
                                .find('.geoserver-id').text(),
                };
        //update database
        deleteRowData($(this),data);
    });
}); //wait page load
//handle the submit update event
$('.submit-update-data-store').click(function(){
    var safe_to_submit = {val: true, error:""};
    //check data store input
    var data_store_id = $(this).parent().parent().parent().find('.data-store-id').text();
    var data_store_name = checkTableCellInputWithError($(this).parent().parent().parent().find('.data-store-name'),safe_to_submit);
    var data_store_api_endpoint = checkTableCellInputWithError($(this).parent().parent().parent().find('.data-store-api-endpoint'),safe_to_submit);
    var data_store_api_key = checkTableCellInputWithError($(this).parent().parent().parent().find('.data-store-api-key'),safe_to_submit);

    if(safe_to_submit.val) {
        //update database
        data = {
                data_store_id: data_store_id,
                data_store_name: data_store_name,
                data_store_api_endpoint: data_store_api_endpoint,
                data_store_api_key: data_store_api_key
                };

        ajax_update_database("submit",data);
    } else {
        addErrorMessage(safe_to_submit.error);
    }
});

//handle the submit update event
$('.submit-delete-data-store').click(function(){
    if (window.confirm("Are you sure?")) {
        var parent_row = $(this).parent().parent().parent();
        //update database
        data = {
                data_store_id: parent_row.find('.data-store-id').text(),
                };
    
        var xhr = ajax_update_database("delete",data);
        xhr.done(function(data) {
            if ('success' in data) {
                parent_row.remove();
            }
        });
    }
});
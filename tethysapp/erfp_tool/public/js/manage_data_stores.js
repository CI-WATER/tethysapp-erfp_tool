//handle the submit update event
$('.submit-update-data-store').click(function(){
    var parent_row = $(this).parent().parent().parent();
    //check data store input
    var safe_to_submit = {val: true, error:""};
    var data_store_id = parent_row.find('.data-store-id').text();
    var data_store_name = checkTableCellInputWithError(parent_row.find('.data-store-name'),safe_to_submit);
    var data_store_api_endpoint = checkTableCellInputWithError(parent_row.find('.data-store-api-endpoint'),safe_to_submit);
    var data_store_api_key = checkTableCellInputWithError(parent_row.find('.data-store-api-key'),safe_to_submit);

    data = {
            data_store_id: data_store_id,
            data_store_name: data_store_name,
            data_store_api_endpoint: data_store_api_endpoint,
            data_store_api_key: data_store_api_key
            };
    //update database
    submitRowData($(this), data, safe_to_submit); 
});

//handle the submit update event
$('.submit-delete-data-store').click(function(){
    data = {
            data_store_id: $(this).parent().parent().parent()
                            .find('.data-store-id').text(),
            };
    //update database
    deleteRowData($(this),data);
});
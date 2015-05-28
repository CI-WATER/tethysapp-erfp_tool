$(document).ready(function() {
    //turn the select options into select2
    $(".watershed-select").each(function() {
        $(this).select2({placeholder: "Add Watershed to Group", width: '100%'});
    });
});

//handle the submit update event
$('.submit-update-watershed-group').click(function(){
    var safe_to_submit = {val: true, error:""};
    var parent_row = $(this).parent().parent().parent();
    //check data store input
    var watershed_group_id = parent_row.find('.watershed-group-id').text();
    var watershed_group_name = checkTableCellInputWithError(parent_row.find('.watershed-group-name'),safe_to_submit);
    var watershed_group_watershed_ids = checkInputWithError(parent_row.find('.watershed-select'),safe_to_submit, true, true);
    
    data = {
            watershed_group_id: watershed_group_id,
            watershed_group_name: watershed_group_name,
            watershed_group_watershed_ids: watershed_group_watershed_ids,
            };
    //update database
    submitRowData($(this), data, safe_to_submit); 

});

//handle the submit update event
$('.submit-delete-watershed-group').click(function(){
    data = {
            watershed_group_id: $(this).parent().parent().parent()
                            .find('.watershed-group-id').text(),
            };
    //update database
    deleteRowData($(this),data);
});
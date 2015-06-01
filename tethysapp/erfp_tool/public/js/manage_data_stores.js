/*****************************************************************************
 * FILE:    Manage Data Stores
 * DATE:    2/26/2015
 * AUTHOR:  Alan Snow
 * COPYRIGHT: (c) 2015 Brigham Young University
 * LICENSE: BSD 2-Clause
 *****************************************************************************/

/*****************************************************************************
 *                      LIBRARY WRAPPER
 *****************************************************************************/

var ERFP_MANAGE_DATA_STORES = (function() {
    // Wrap the library in a package function
    "use strict"; // And enable strict mode for this library

    /************************************************************************
    *                      MODULE LEVEL / GLOBAL VARIABLES
    *************************************************************************/
    var m_uploading_data, m_results_per_page;

    /************************************************************************
     *                    PRIVATE FUNCTION DECLARATIONS
     *************************************************************************/
    var initializeTableFunctions, getTablePage, displayResultsText;


    /************************************************************************
     *                    PRIVATE FUNCTION IMPLEMENTATIONS
     *************************************************************************/

    m_results_per_page = 5;

    initializeTableFunctions = function() {
        
        //handle the submit update event
        $('.submit-update-data-store').off().click(function(){
            var parent_row = $(this).parent().parent().parent();
            //check data store input
            var safe_to_submit = {val: true, error:""};
            var data_store_id = parent_row.find('.data-store-id').text();
            var data_store_name = checkTableCellInputWithError(parent_row.find('.data-store-name'),safe_to_submit);
            var data_store_api_endpoint = checkTableCellInputWithError(parent_row.find('.data-store-api-endpoint'),safe_to_submit);
            var data_store_api_key = checkTableCellInputWithError(parent_row.find('.data-store-api-key'),safe_to_submit);
        
            var data = {
                    data_store_id: data_store_id,
                    data_store_name: data_store_name,
                    data_store_api_endpoint: data_store_api_endpoint,
                    data_store_api_key: data_store_api_key
                    };
            //update database
            submitRowData($(this), data, safe_to_submit); 
        });
        
        //handle the submit delete event
        $('.submit-delete-data-store').off().click(function(){
            var data = {
                    data_store_id: $(this).parent().parent().parent()
                                    .find('.data-store-id').text(),
                    };
            //update database
            var xhr = deleteRowData($(this), data);
            if (xhr != null) {
                xhr.done(function () {
                    var num_data_stores_data = $('#manage_data_stores_table').data('num_data_stores');
                    var page = parseInt($('#manage_data_stores_table').data('page'));
                    $('#manage_data_stores_table').data('num_data_stores', Math.max(0, parseInt(num_data_stores_data) - 1));
                    if (parseInt($('#manage_data_stores_table').data('num_data_stores')) <= m_results_per_page * page) {
                        $('#manage_data_stores_table').data('page', Math.max(0, page - 1));
                    }
                    getTablePage();
                });
            }
        });

        //handle the submit delete event
        $('.submit-delete-watershed-group').off().click(function(){
            var data = {
                watershed_group_id: $(this).parent().parent().parent().find('.watershed-group-id').text()
            };
            //update database
            var xhr = deleteRowData($(this), data);
            if (xhr != null) {
                xhr.done(function () {
                    var num_data_stores_data = $('#manage_data_stores_table').data('num_data_stores');
                    var page = parseInt($('#manage_data_stores_table').data('page'));
                    $('#manage_data_stores_table').data('num_data_stores', Math.max(0, parseInt(num_data_stores_data) - 1));
                    if (parseInt($('#manage_data_stores_table').data('num_data_stores')) <= m_results_per_page * page) {
                        $('#manage_data_stores_table').data('page', Math.max(0, page - 1));
                    }
                    getTablePage();
                });
            }
        });

        displayResultsText();
        if (m_results_per_page >= $('#manage_data_stores_table').data('num_data_stores')) {
            $('[name="prev_button"]').addClass('hidden');
            $('[name="next_button"]').addClass('hidden');
        }

        //pagination next and previous button update
        $('[name="prev_button"]').click(function(){
            var page = parseInt($('#manage_data_stores_table').data('page'));
            $('#manage_data_stores_table').data('page', Math.max(0, page-1));
            getTablePage();
        });
        $('[name="next_button"]').click(function(){
            var page = parseInt($('#manage_data_stores_table').data('page'));
            $('#manage_data_stores_table').data('page', Math.min(page+1,
                                                Math.floor(parseInt($('#manage_data_stores_table').data('num_data_stores')) / m_results_per_page - 0.1)));
            getTablePage();
        });
    };


    displayResultsText = function() {
        //dynamically show table results display info text on page
        var page = parseInt($('#manage_data_stores_table').data('page'));
        var num_data_stores_data = $('#manage_data_stores_table').data('num_data_stores');
        var display_min;
        if (num_data_stores_data == 0){
            display_min = 0
        }
        else{
            display_min = ((page + 1) * m_results_per_page) - (m_results_per_page - 1);
        }
        var display_max = Math.min(num_data_stores_data, ((page + 1) * m_results_per_page));
        $('[name="prev_button"]').removeClass('hidden');
        $('[name="next_button"]').removeClass('hidden');
        if (page == 0){
            $('[name="prev_button"]').addClass('hidden');
        } else if (page == Math.floor(num_data_stores_data / m_results_per_page - 0.1)) {
            $('[name="next_button"]').addClass('hidden');
        }
        console.log(num_data_stores_data);
        $('#display-info').append('<div style="text-align: center">Displaying Results '
                                    + display_min + ' - ' + display_max + ' of ' + num_data_stores_data + '</div>');
    };

    getTablePage = function() {
        $.ajax({
            url: 'table',
            method: 'GET',
            data: {'page': $('#manage_data_stores_table').data('page')},
            success: function(data) {
                $("#manage_data_stores_table").html(data);
                initializeTableFunctions();
            }
        });
    };


    /************************************************************************
    *                  INITIALIZATION / CONSTRUCTOR
    *************************************************************************/

    $(function() {
        m_uploading_data = false;
        getTablePage();
    }); //document ready
}()); // End of package wrapper
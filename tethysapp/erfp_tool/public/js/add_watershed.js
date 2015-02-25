jQuery(function() {
    //initialize help blockss
    var help_html = '<p class="help-block hidden">No watershed name specified.</p>';
    $('#watershed-name-input').parent().parent().append(help_html);
    help_html = '<p class="help-block hidden">No subbasin name specified.</p>';
    $('#subbasin-name-input').parent().parent().append(help_html);
    help_html = '<p class="help-block hidden">No Data Store selected.</p>';
    $('#data-store-select').parent().append(help_html);
    help_html = '<p class="help-block hidden">No Geoserver selected.</p>';
    $('#geoserver-select').parent().append(help_html);
    help_html = '<p class="help-block hidden">No Geoserver drainage line layer name specified.</p>';
    $('#geoserver-drainage-line-input').parent().parent().append(help_html);

    //add classes
    $('#geoserver-drainage-line-input').parent().parent().addClass('shapefile');
    $('#geoserver-catchment-input').parent().parent().addClass('shapefile');
    $('#geoserver-gauge-input').parent().parent().addClass('shapefile');
    $('#shp-upload-toggle').parent().parent().parent().addClass('shapefile');
    $('.shapefile').addClass('hidden');
    
    //handle the submit event
    $('#submit-add-watershed').click(function(){
        //check data store input
        var safe_to_submit = {val: true};
        var watershed_name = checkInputWithError($('#watershed-name-input'),safe_to_submit);
        var subbasin_name = checkInputWithError($('#subbasin-name-input'),safe_to_submit);
        var data_store_id = checkInputWithError($('#data-store-select'),safe_to_submit, true);
        var geoserver_id = checkInputWithError($('#geoserver-select'),safe_to_submit, true);

        //initialize values
        var geoserver_drainage_line_layer = "";
        var geoserver_catchment_layer = "";
        var geoserver_gauge_layer = "";
        var drainage_line_shp_file = null;
        var catchment_shp_file = null;
        var gauge_shp_file = null;
        var drainage_line_kml_file = null;
        var catchment_kml_file = null;
        var gauge_kml_file = null;

        if(geoserver_id==1){
            //kml upload
            drainage_line_kml_file = $('#drainage-line-kml-upload-input')[0].files[0];
            catchment_kml_file = $('#catchment-kml-upload-input')[0].files[0];
            gauge_kml_file = $('#gauge-kml-upload-input')[0].files[0];
            
        } else if (!$('#shp-upload-toggle').bootstrapSwitch('state')) {
            //geoserver update
            geoserver_drainage_line_layer = checkInputWithError($('#geoserver-drainage-line-input'),safe_to_submit);
            geoserver_catchment_layer = $('#geoserver-catchment-input').val(); //optional
            geoserver_gauge_layer = $('#geoserver-gauge-input').val(); //optional
        } else {
            //geoserver upload
            drainage_line_shp_file = $('#drainage-line-shp-upload-input')[0].files);
            catchment_shp_file = $('#catchment-shp-upload-input')[0].files);
            gauge_shp_file = $('#gauge-shp-upload-input')[0].files);
        }
        
        //submit if the form is ready
        if(safe_to_submit.val) {
            var submit_button = $(this);
            var submit_button_html = submit_button.html();
            //give user information
            addInfoMessage("Submitting Data. Please Wait.");
            submit_button.text('Submitting ...');
            //update database
            if(geoserver_id==1 || $('#shp-upload-toggle').bootstrapSwitch('state')){
                //upload files
                var data = new FormData();
                data.append("watershed_name",watershed_name);
                data.append("subbasin_name",subbasin_name);
                data.append("data_store_id",data_store_id);
                data.append("geoserver_id",geoserver_id);
                data.append("geoserver_drainage_line_layer",geoserver_drainage_line_layer);
                data.append("geoserver_catchment_layer",geoserver_catchment_layer);
                data.append("geoserver_gauge_layer",geoserver_gauge_layer);
                data.append("drainage_line_kml_file",drainage_line_kml_file);
                data.append("catchment_kml_file",catchment_kml_file);
                data.append("gauge_kml_file",gauge_kml_file);
                data.append("drainage_line_shp_file",drainage_line_shp_file);
                data.append("catchment_shp_file",catchment_shp_file);
                data.append("gauge_shp_file",gauge_shp_file);
                var xhr = ajax_update_database_with_file("submit",data);
            } else {
                var data = {
                        watershed_name: watershed_name,
                        subbasin_name: subbasin_name,
                        data_store_id: data_store_id,
                        geoserver_id: geoserver_id,
                        geoserver_drainage_line_layer: geoserver_drainage_line_layer,
                        geoserver_catchment_layer: geoserver_catchment_layer,
                        geoserver_gauge_layer: geoserver_gauge_layer,
                        };
        
                var xhr = ajax_update_database("submit",data);
            }
            xhr.done(function(data) {
                if ('success' in data) {
                    //reset inputs
                    $('#watershed-name-input').val('');
                    $('#subbasin-name-input').val('');
                    $('#data-store-select').select2('val','1');
                    $('#geoserver-select').select2('val','1');
                    $('#drainage-line-kml-upload-input').val('');
                    $('#catchment-kml-upload-input').val('');
                    $('#gauge-kml-upload-input').val('');
                    $('#geoserver-drainage-line-input').val('');
                    $('#geoserver-catchment-input').val('');
                    $('#geoserver-gauge-input').val('');
                    $('#drainage-line-shp-upload-input').val('');
                    $('#catchment-shp-upload-input').val('');
                    $('#gauge-shp-upload-input').val('');
                }
            })
            .always(function() {
                submit_button.html(submit_button_html);
            });
        }
    
    });
    
    //show/hide elements based on geoserver selection
    $('#geoserver-select').change(function() {
        var select_val = $(this).val();
        if(select_val == 1) {
            //local upload
            $('#geoserver-drainage-line-input').val('');
            $('#geoserver-catchment-input').val('');
            $('#drainage-line-shp-upload-input').val('');
            $('#catchment-shp-upload-input').val('');
            $('#gauge-shp-upload-input').val('');
            $('.kml').removeClass('hidden');
            $('.shapefile').addClass('hidden');
        } else {
            //file located on geoserver
            $('.kml').addClass('hidden');
            $('.shapefile').removeClass('hidden');
            $('#drainage-line-kml-upload-input').val('');
            $('#catchment-kml-upload-input').val('');
            $('#gauge-kml-upload-input').val('');
            $('#shp-upload-toggle').bootstrapSwitch('state',true);
            $('.upload').removeClass('hidden');
            $('#geoserver-drainage-line-input').parent().parent().addClass('hidden');
            $('#geoserver-catchment-input').parent().parent().addClass('hidden');
            $('#geoserver-gauge-input').parent().parent().addClass('hidden');
        }
    
    });

    //show hide elements based on shape upload toggle selection
    $('#shp-upload-toggle').on('switchChange.bootstrapSwitch', function(event, state) {
        if(state) {
            $('.upload').removeClass('hidden');
            $('#geoserver-drainage-line-input').parent().parent().addClass('hidden');
            $('#geoserver-catchment-input').parent().parent().addClass('hidden');
            $('#geoserver-gauge-input').parent().parent().addClass('hidden');
        } else {
            $('.upload').addClass('hidden');
            $('#drainage-line-shp-upload-input').val('');
            $('#catchment-shp-upload-input').val('');
            $('#gauge-shp-upload-input').val('');
            $('#geoserver-drainage-line-input').parent().parent().removeClass('hidden');
            $('#geoserver-catchment-input').parent().parent().removeClass('hidden');
            $('#geoserver-gauge-input').parent().parent().removeClass('hidden');
        }
        
    });
}); //page load
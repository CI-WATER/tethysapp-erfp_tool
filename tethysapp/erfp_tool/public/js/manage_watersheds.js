$(document).ready(function() {
    //turn the select options into select2
    $(".data-store-select").each(function() {
        $(this).select2();
    }); 
    $(".geoserver-select").each(function() {
        $(this).select2();
    });
    //manage on change event
    $(".geoserver-select").change(function() {
        var geoserver_id = $(this).val();
        if(geoserver_id == 1) {
            $(this).parent().parent().find('.drainage-line-kml')
                    .removeAttr('contenteditable')
                    .html('<div class="form-group">' +
                            '<input class="drainage-line-kml-upload-input" name="drainage-line-kml-upload-input" type="file" accept="*.kml">' +
                            '<p class="help-block hidden">Must select file to submit!</p>' +
                         '</div>');
            $(this).parent().parent().find('.catchment-kml')
                    .removeAttr('contenteditable')
                    .html('<div class="form-group">' +
                            '<input class="catchment-kml-upload-input" name="catchment-kml-upload-input" type="file" accept="*.kml">' +
                            '<p class="help-block hidden">Must select file to submit!</p>' +
                         '</div>');
        } else {
            var drainage_line_element = $(this).parent().parent().find('.drainage-line-kml');
            drainage_line_element.attr('contenteditable','true')
                                .text(drainage_line_element.attr('kml-file'));
            var catchment_element = $(this).parent().parent().find('.catchment-kml');
            catchment_element.attr('contenteditable','true')
                                .text(catchment_element.attr('kml-file'));

        }
    });   
});
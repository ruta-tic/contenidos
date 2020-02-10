/**
 * Custom library to add custom functionality to activities in this learning object.
 *
 */
(function(app) {

    $( document ).ready(function() {
        $('.withradio').on('click', function() {
            var $radio = $(this).find('input[type="radio"]');

            $radio.prop("checked", !$radio.prop("checked"));

        });

        $('.withradio input').on('click', function(e) {
            e.stopPropagation();
        });
    });

})(dhbgApp);

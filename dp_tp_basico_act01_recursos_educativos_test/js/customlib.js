/**
 * Custom library to add custom functionality to activities in this learning object.
 *
 * @author: Jesus Otero
 */
(function(app) {
    /**
     * To handle when an activity has been completed. It will fire the camea results calculation.
     * @param {event} event
     * @param {JQuery object} $el
     * @param {object} args
     */
    function onActivityCompleted(event, $el, args) {

        console.log(args);
    }
    //Register application event handlers
    $(app).on('jpit:activity:completed', onActivityCompleted);
})(dhbgApp);

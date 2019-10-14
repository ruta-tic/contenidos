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
        if (/1-camea/.test(args.id)) {
            calculateCameaResults($el, args);
            return;
        }
    }
    /**
     * To handle when an activity has been rendered. It will hide verify button on 1-camea form.
     * @param {event} event
     * @param {JQuery object} $el
     * @param {object} args
     */
    function onActivityRendered(event, $el, args) {
        if (/1-camea/.test(args.id)) {
            $el.find('button.general').hide();
        }
    }

    //Register application event handlers
    $(app).on('jpit:activity:rendered', onActivityRendered);
    $(app).on('jpit:activity:completed', onActivityCompleted);
})(dhbgApp);

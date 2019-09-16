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
     * To handle when an item has been dropped.
     * @param {event} event
     * @param {JQuery object} $el
     * @param {object} args
     */
    function onActivityDrop(event, $el, args) {
        if (/1-/.test(args.id)) {
            var parentslayer = args.dragEl.parents('.contenedor.layer');

            if (parentslayer.length > 0) {
                $(parentslayer[0]).addClass(args.dragEl.attr('data-value'));
            } else {
                $el.find('.' + args.dragEl.attr('data-value')).removeClass(args.dragEl.attr('data-value'));
            }
        }
    }

    /**
     * To handle when an activity has been restarted.
     * @param {event} event
     * @param {JQuery object} $el
     * @param {object} args
     */
    function onActivityRestart(event, $el, args) {
        if (/1-/.test(args.id)) {
            $el.find('.educacion').removeClass('educacion');
            $el.find('.ambiente').removeClass('ambiente');
            $el.find('.plataforma').removeClass('plataforma');
        }
    }

    //Register application event handlers
    $(app).on('jpit:activity:completed', onActivityCompleted);
    $(app).on('jpit:activity:drop', onActivityDrop);
    $(app).on('jpit:activity:restart', onActivityRestart);
})(dhbgApp);

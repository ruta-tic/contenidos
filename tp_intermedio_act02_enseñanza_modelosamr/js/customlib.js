/**
 * Custom library to add custom functionality to activities in this learning object.
 *
 * @author: Jesus Otero
 */
(function(app) {

    /**
     * To handle when an item has been dropped.
     * @param {event} event
     * @param {JQuery object} $el
     * @param {object} args
     */
    function onActivityDrop(event, $el, args) {
        if (/-caso/.test(args.id)) {
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
        if (/-caso/.test(args.id)) {
            $el.find('.aumentar').removeClass('aumentar');
            $el.find('.sustituir').removeClass('sustituir');
            $el.find('.redefinir').removeClass('redefinir');
            $el.find('.modificar').removeClass('modificar');
        }
    }

    //Register application event handlers
    $(app).on('jpit:activity:drop', onActivityDrop);
    $(app).on('jpit:activity:restart', onActivityRestart);
})(dhbgApp);

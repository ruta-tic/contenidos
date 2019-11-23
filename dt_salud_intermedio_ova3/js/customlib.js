/**
 * Custom library to add custom functionality to activities in this learning object.
 *
 * @author: David Herney
 */
(function(app) {

    /**
     * To handle when an activity has been completed.
     * @param {event} event
     * @param {JQuery object} $el
     * @param {object} args
     */
    function onActivityCompleted(event, $el, args) {
        if (/1[a-d]-cloze/.test(args.id)) {
            if (args.weight < 100) {
                var strike = Number($el.attr('strike'));
                strike++;
                $el.attr("strike", strike);
            }
        }
        else if (/2-select/.test(args.id)) {
            $('#retro-act2').show();

            $('#btn-solucion-act2').on('click', function() {
                $el.find('li.selected').removeClass('selected');
                $el.find('li[data-correct="true"]').addClass('selected');
                $el.find('.btn-check').trigger('click');
                $el.find('.box_end').hide();
            });
        }
        else if (/4a-select/.test(args.id)) {
            $el.addClass("solucion");
        }
    }

    /**
     * To handle when an activity has been restarted.
     * @param {event} event
     * @param {JQuery object} $el
     * @param {object} args
     */
    function onActivityAgain(event, $el, args) {
        if (/1[a-d]-cloze/.test(args.id)) {

            var strike = Number($el.attr('strike'));

            if (strike == 3) {
                $el.find('input').each(function() {
                    var $this = $(this);
                    $this.val($this.data('data-response'));
                });
            }
        }
        else if (/4a-select/.test(args.id)) {
            $el.removeClass("solucion");
        }
    }

    /**
     * To handle when an activity has been rendered.
     * @param {event} event
     * @param {JQuery object} $el
     * @param {object} args
     */
    function onActivityRendered(event, $el, args) {
        if (/1[a-d]-cloze/.test(args.id)) {
            $el.attr("strike", 0);
            var k = 0;
            $el.find('input').each(function() {
                var $this = $(this);

                $this.attr('data-pos', k);

                $this.on('keypress', function() {
                    var m = Number($this.attr('data-pos')) + 1;
                    var next = $this.parents('.col-2').find('input[data-pos="' + m + '"]');
                    if (next) {
                        next.focus();
                    }
                });
                $this.on('focusin', function() {
                    $this.select();
                });
                k++;
            });
        }
    }

    //Register application event handlers
    $(app).on('jpit:activity:rendered', onActivityRendered);
    $(app).on('jpit:activity:completed', onActivityCompleted);
    $(app).on('jpit:activity:again', onActivityAgain);
})(dhbgApp);

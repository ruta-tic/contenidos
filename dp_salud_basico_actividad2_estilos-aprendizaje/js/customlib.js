/**
 * Custom library to add custom functionality to activities in this learning object.
 *
 * @author: Jesus Otero
 */
(function(app) {
    /**
     * To calculate 1-camea results.
     * @param {jQuery object} $el Selection activity container for the Camea 40 questionaire.
     * @param {object} $result Activity results.
     */
    function calculateCameaResults($el, result) {
        var weights = { s: 5, cs: 4, mv: 3, av: 2, n: 1 };
            active = /^(2|7|12|15|16|19|22|25|34|39)$/,
            reflexive = /^(4|13|14|18|20|23|27|29|32|40)$/,
            theorist= /^(1|5|10|11|21|24|30|31|33|36)$/,
            pragmatic= /^(3|6|8|9|17|26|28|35|37|38)$/;
            
        var styles_results = {
            active: 0,
            reflexive: 0,
            theorist: 0,
            pragmatic: 0
        };
        $el.find('[data-group].selected').each(function(idx, el) {
            var answer = $(el).attr('data-group-value'),
                it = $(el).attr('data-group');

            if (active.test(it)) {
                styles_results.active += weights[answer];
            }
            else if (reflexive.test(it)){
                styles_results.reflexive += weights[answer];
            }
            else if (theorist.test(it)){
                styles_results.theorist += weights[answer];
            }
            else if (pragmatic.test(it)){
                styles_results.pragmatic += weights[answer];
            }
        });

        var qualitative_results = {
            active: getCameaQualitative(styles_results.active),
            reflexive: getCameaQualitative(styles_results.reflexive),
            theorist: getCameaQualitative(styles_results.theorist),
            pragmatic: getCameaQualitative(styles_results.pragmatic),
        }
        $el.find('.estilos-aprendizaje-grafica [data-learning-style]').each(function(idx, el){
            var style = el.getAttribute('data-learning-style');
            var score = Math.max(Math.min(styles_results[style], 50), 10);
            var percent = Math.round((score - 10) * 100 / 40);
            el.setAttribute('data-learning-style-score', score);
            el.setAttribute('data-learning-style-measure', qualitative_results[style]);
            $(el).find('.score_bar').css({width: percent + 'px'})
            .html(percent + '%').parent()
                .next().html(translate(qualitative_results[style]));

            $('[data-learning-style="' + style + '"]').find('h3').append(' (' + percent + '%)');

        }).sort(sortByScoreDesc).appendTo('.estilos-aprendizaje-grafica');

        $el.find('.estilos-aprendizaje-resultado [data-learning-style]').each(function(idx, el){
            var style = el.getAttribute('data-learning-style');
            el.setAttribute('data-learning-style-score', Math.max(Math.min(styles_results[style], 50), 10));
            el.setAttribute('data-learning-style-measure', qualitative_results[style]);
        }).sort(sortByScoreDesc).appendTo('.estilos-aprendizaje-resultado');
    }

    /**
     * To sort two html elements based on the data-learning-style-score value.
     * @param {element} a.
     * @param {element} b.
     */
    function sortByScoreDesc(a, b) {
        var scoreA = parseInt(a.getAttribute('data-learning-style-score'))
            , scoreB = parseInt(b.getAttribute('data-learning-style-score'));
        return scoreB - scoreA;
    }

    /**
     * To translate the Camea qualitative result(muybajo|bajo|moderado|alto|muyalto) to spanish.
     * @param {number} score.
     */
    function translate(text) {
        switch(text) {
            case 'muybajo':
                return 'Muy bajo';
            case 'bajo':
                return 'Bajo';
            case 'moderado':
                return 'Moderado';
            case 'alto':
                return 'Alto';
            case 'muyalto':
                return 'Muy alto';
        }
        return text;
    }

    /**
     * To calculate the Camea qualitative result(muybajo|bajo|moderado|alto|muyalto) based on the score.
     * @param {number} score.
     */
    function getCameaQualitative(score) {
        if (score < 19) {
            return 'muybajo';
        }
        if (score < 27) {
            return 'bajo';
        }
        if (score < 35) {
            return 'moderado';
        }
        if (score < 43) {
            return 'alto';
        }
        return 'muyalto';
    }
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

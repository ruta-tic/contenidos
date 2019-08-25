(function(app) {
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
            el.setAttribute('data-learning-style-score', score);
            el.setAttribute('data-learning-style-measure', qualitative_results[style]);
            $(el).find('.score_bar').css({width: (score * 2)+'px'})
                .html(score).parent()
                .next().html(translate(qualitative_results[style]));
        }).sort(sortByScoreDesc).appendTo('.estilos-aprendizaje-grafica');

        $el.find('.estilos-aprendizaje-resultado [data-learning-style]').each(function(idx, el){
            var style = el.getAttribute('data-learning-style');
            el.setAttribute('data-learning-style-score', Math.max(Math.min(styles_results[style], 50), 10));
            el.setAttribute('data-learning-style-measure', qualitative_results[style]);
        }).sort(sortByScoreDesc).appendTo('.estilos-aprendizaje-resultado');
    }

    function sortByScoreDesc(a, b) {
        var scoreA = parseInt(a.getAttribute('data-learning-style-score'))
            , scoreB = parseInt(b.getAttribute('data-learning-style-score'));
        return scoreB - scoreA;
    }

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

    function getCameaQualitative(value) {
        if (value < 19) {
            return 'muybajo';
        }
        if (value < 27) {
            return 'bajo';
        }
        if (value < 35) {
            return 'moderado';
        }
        if (value < 43) {
            return 'alto';
        }
        return 'muyalto';
    }

    function onActivityCompleted(event, $el, args) {
        if (/CAMEA 40/.test(args.id)) {
            calculateCameaResults($el, args);
        }
    }

    function onActivityRendered(event, $el, args) {
        if (/CAMEA 40/.test(args.id)) {
            $el.find('button.general').hide();
        }
    }

    $(app).on('jpit:activity:rendered', onActivityRendered);
    $(app).on('jpit:activity:completed', onActivityCompleted);
})(dhbgApp);

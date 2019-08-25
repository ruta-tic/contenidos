(function(app) {

    function calculateCameaResults($el, result) {
        var weights = { s: 5, cs: 4, mv: 3, av: 2, n: 1 };
            active = /^(2|7|12|15|16|19|22|25|34|39)$/,
            reflexive = /^(4|13|14|18|20|23|27|29|32|40)$/,
            theoric= /^(1|5|10|11|21|24|30|31|33|36)$/,
            pragmatic= /^(3|6|8|9|17|26|28|35|37|38)$/;
            
        var styles_results = {
            active: 0,
            reflexive: 0,
            theoric: 0,
            pragmatic: 0
        };
        //console.log($el.html());    
        $el.find('[data-group].selected').each(function(idx, el) {
            var answer = $(el).attr('data-group-value'),
                it = $(el).attr('data-group');

            if (active.test(it)) {
                styles_results.active += weights[answer];
            }
            else if (reflexive.test(it)){
                styles_results.reflexive += weights[answer];
            }
            else if (theoric.test(it)){
                styles_results.theoric += weights[answer];
            }
            else if (pragmatic.test(it)){
                styles_results.pragmatic += weights[answer];
            }
        });

        var qualitative_results = {
            active: getCameaQualitative(styles_results.active),
            reflexive: getCameaQualitative(styles_results.reflexive),
            theoric: getCameaQualitative(styles_results.theoric),
            pragmatic: getCameaQualitative(styles_results.pragmatic),
        }
        console.log(styles_results);
        console.log(qualitative_results);
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

    function onActivityCompleted(event, $el, result) {
        if (/CAMEA 40/.test(result.id)) {
            calculateCameaResults($el, result);
        }
    }

    $(app).on('jpit:activity:completed', onActivityCompleted);
})(dhbgApp);

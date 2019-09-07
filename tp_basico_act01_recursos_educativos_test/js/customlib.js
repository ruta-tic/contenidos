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
    //Create scorm hook getActivityWeight
    app.scorm.getActivityWeight = function (activity_id) {
        var number = parseInt(activity_id.match(/(\d+)/));
        return (number  < 1 && number > 14 ? 0 : number > 10 ? 15.78 : 5.26);
    }
})(dhbgApp);

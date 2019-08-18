
(function(jpit){
    var transformProp;
    /**
    * dragStartListener
    */
    function dragStartListener(event) {
        $(event.target).addClass('jpit_activities_jpitdroppable_dragstart');
    }

    /**
    * dragEndListener
    */
    function dragEndListener(event) {
        $(event.target).removeClass('jpit_activities_jpitdroppable_dragstart');
    }

    /**
    * dragMoveListener
    */
    function dragMoveListener(event) {
        var target = event.target;
        var x = (parseFloat(target.getAttribute('data-x')) || 0) + event.dx;
        var y = (parseFloat(target.getAttribute('data-y')) || 0) + event.dy;
        if (transformProp) {
            target.style[transformProp] = `translate(${x}px, ${y}px)`;
        }
        else {
            target.style.left = x;
            target.style.right = y;
        }
        target.setAttribute('data-x', x);
        target.setAttribute('data-y', y);
    }
    /**
    * resetPosition
    */
    function resetPosition($el, position) {
        $el.css({
            position: position._position,
            top: position._top,
            left: position._left
        })
        .css(transformProp, 'translate(0px, 0px)')
        .removeAttr('data-x')
        .removeAttr('data-y');
        return $el;
    }
    /**
    * resetPositions
    */
    function resetPositions(initialPositions){
        $.each(initialPositions, function(key, ip){
            resetPosition($("#"+ip._id).removeClass("jpit_activities_jpitdroppable_dropped"));
        });
    }
    /**
    * setDroppableEnabled
    */
    function setDroppableEnabled(droppable, state) {
        droppable.data('_interact').dropzone(state);
    }

    /**
    * setDraggableEnabled
    */
    function setDraggableEnabled(draggable, state){
        draggable.data('_interact').draggable(state);
    }

    /**
    * destroyDraggable
    */
    function destroyDraggable($element) {
        $element.data('_interact').unset();
        $element.removeData('_interact');
    }

    /**
    * destroyDroppable
    */
    function destroyDroppable($element) {
        $element.data('_interact').unset();
        $element.removeData('_interact');
    }

    /**
    * createDraggables
    */
    function createDraggables(elements) {
        //console.log(obj.properties.draggableContainer);
        ////zIndex: 3,
        $.each(elements, function(index, $el) {
            $el.data('_interact', interact($el[0]).draggable({
                origin: '',
                intertia: true,
                restrict: {
                    restriction: ".jpit_activities_jpitdroppable",
                    endOnly: false,
                    elementRect: { top: 0, left: 0, bottom: 1, right: 1 }
                },
                modifiers: [],
                autoScroll: true,
                onstart: dragStartListener,
                onmove: dragMoveListener,
                onend: dragEndListener,
            }));
        });
    }

    function createDropZones(droppable) {
        var autoResolve = droppable.properties.autoResolve,
            targets = droppable.targets,
            pairs = droppable.pairs,
            initialPositions = droppable.properties.initialPositions,
            multiTarget = droppable.properties.multiTarget,
            autoAlignNodes = droppable.properties.autoAlignNodes,
            onDrop = droppable.properties.onDrop
            ;

        $.each(targets, function(index, $target) {
            $target.data('droppedElements', new Array());
            $target.data('_interact', interact($target[0]).dropzone({
                ondrop: function(event) {
                    var $dropzone = $(event.target),
                        $dragEl = $(event.relatedTarget),
                        dropzoneId = $target.attr('id'),
                        dragId = event.relatedTarget.id;

                    if (autoResolve){
                        var matched = false;

                        $.each(pairs, function(idx, pair) {
                            return !(matched = (pair.target.attr('id') == dropzoneId && pair.origin.attr('id') == dragId)); //if a match is found stop the loop
                        });

                        if (!matched) {
                            $.each(initialPositions, function (idx, it) {
                                if (dragId != it._id) return true; //Continue
                                resetPosition($dragEl, it);
                                return false; //Stop the loop
                            });
                            return;
                        }
                    }

                    if(multiTarget == 0 || $dropzone.data('droppedElements').length < multiTarget){
                        if($.inArray(dragId ,$dropzone.data('droppedElements'))>-1) {
                            if(autoAlignNodes){
                                $dragEl.position({
                                    of: $dropzone
                                });
                            }
                            return;
                        }
                        // Some dropp in ? -> check pairs and update match value 
                        $.each(pairs, function (idx, pair) {
                            if (dragId == pair.origin.attr('id')) {
                                pair.match = ($target.attr('id') == pair.target.attr('id'));
                            }
                        });
                        if(autoAlignNodes){
                            $dragEl.position({
                                of: $dropzone
                            });
                        }
                        $dragEl.addClass("jpit_activities_jpitdroppable_dropped");
                        $dropzone.data('droppedElements').push(dragId);
                    }
                    else{
                        if($.inArray(dragId ,$dropzone.data('droppedElements'))>-1) {
                            if(autoAlignNodes){
                                $dragEl.position({
                                    of: $dropzone
                                });
                            }
                            return;
                        }
                        $.each(initialPositions,function(key, ip){
                            if(dragId != ip._id) return true; //Continue
                            resetPosition($dragEl, ip);
                            return false; //stop the loop
                        });
                    }
                    if (onDrop) {
                        onDrop.call($(event.target), $dragEl);
                    }
                },
                ondragleave: function(event) {
                    // Some dropp out? -> check pairs and update match value 
                    var $dragEl = $(event.relatedTarget),
                        dragId = $dragEl.attr('id');

                    if (!$dragEl.hasClass("jpit_activities_jpitdroppable_dropped")) return;

                    $.each(pairs, function (idx, pair) {
                        if (dragId == pair.origin.attr('id') && $target.attr('id') == pair.target.attr('id')) {
                            pair.match = false;
                            return false; //Stop the loop
                        }
                    });
                    $dragEl.removeClass("jpit_activities_jpitdroppable_dropped");
                    $target.data('droppedElements', $.grep($target.data('droppedElements'), function(val) {
                        return val != dragId;
                    }));

                    if (onDrop) {
                        onDrop.call($dropzone, $dragEl);
                    }
                }
            }));
        });
    }

    function Droppable(properties, origins, targets, pairs) {
        var obj = {
            "properties" : null,
            "origins" : null,
            "targets" : null,
            "pairs" : null,
            "getLocalId" : function () {
                return "jpit_activities_jpitdroppable_" + this.id;
            },
            "printBoard" : function (id_container) {
                var node = this.getNodeBoard();
            },
            "getNodeBoard" : function () {
                var parent = this;
                var continueResolve = false;
                var holdCorrects = false;
                var initialPositions = new Array();
                /*Properties*/
                continueResolve = obj.properties.continueResolve;
                holdCorrects = obj.properties.holdCorrects;
                /*Initialice Pair Matched*/
                $.each(obj.pairs, function (ind,val) {
                    pairs[ind].match = false;
                });
                /*Save Original Origins Position Coords*/
                var auxIndex = 0;
                $.each( obj.origins, function (ind,val) {
                    var $val = $(this);
                    initialPositions[auxIndex] = {
                        _id : $val.attr('id'),
                        _left : $val.css("left"),
                        _top : $val.css("top"),
                        _position:$val.css("position")
                    }
                    auxIndex++;
                });
                obj.properties.initialPositions = initialPositions;
                /* Origins Draggables*/
                createDraggables(obj.origins);
                /* Targets Droppables */
                createDropZones(obj);
                return this;
            },
            /*Getters & Counts Methods*/
            "countAnswered" : function () {
                var response = 0;
                $.each(this.targets, function (index, $val) {
                    if ($val.data('droppedElements').length > 0) {
                        response++;
                    }
                });
                return response;
            },
            "countRealTargets" : function () {
                var response = [];
                $.each(obj.pairs, function (index, pair) {
                    if($.inArray( pair.target.attr('id'), response) < 0) {
                        response.push(pair.target.attr('id'));
                    }
                });

                return response.length;
            },
            "countFullAnswered" : function () {
                var response = 0;
                $.each(this.targets, function (index, $val) {
                    response += $val.data('droppedElements').length;
                });
                return response;
            },
            "countObjects" : function(isCorrect){
                var response = 0;
                $.each( obj.pairs, function (ind,val) {
                    if( obj.pairs[ind].match == isCorrect) response++;
                });
                return response;
            },
            "countCorrect": function(){
                return obj.countObjects(true);
            },
            "getObjects" : function (isCorrect){
                var response = new Array();
                var index = 0;
                $.each( obj.pairs, function (ind,val) {
                    if( obj.pairs[ind].match == isCorrect) {
                        response[index] = {
                            o: obj.pairs[ind].origin,
                            t: obj.pairs[ind].target
                        };
                        index++;
                    }
                });
                return response; // return array with jSon Objects
            },
            "disable" : function (){
                $.each( obj.origins, function (ind, $val) {
                    setDraggableEnabled($val, false);
                    $val.addClass('disabled');
                });
            },
            "enable" : function (){
                $.each( obj.origins, function (ind, $val) {
                    setDraggableEnabled($val, true);
                    $val.removeClass('disabled');
                });
            },
            "getCorrects" : function (){
                return obj.getObjects(true);
            },
            "countMistakes" : function (){
                //return ( obj.pairs.length - obj.countObjects(true));
                if (obj.properties.multiTarget == 0) {
                    return obj.pairs.length - obj.countObjects(true);
                }
                else {
                    return ((obj.targets.length * obj.properties.multiTarget) - obj.countObjects(true));
                }
            },
            "getMistakes" : function (){
                return obj.getObjects(false);
            },
            "countTargets" : function (){
                return obj.targets.length;
            },
            /*Solve Stage*/
            "solveStage" : function(){
                this.countMistakes();
                /* Hold Corrects */
                if(properties.holdCorrects){
                    $.each(obj.pairs, function (ind, pair) {
                        if(obj.pairs[ind].match) {
                            setDraggableEnabled(obj.pairs[ind].origin, false); // hold correct matched
                        }
                    });
                }
                /* Continue Solving*/
                if(!properties.continueResolve){
                    $.each(obj.origins, function (ind, $val) {
                        setDraggableEnabled($val, false);
                    });
                    if (!properties.autoResolve) {
                        $.each(obj.targets, function (index, $val) {
                            setDroppableEnabled($val, false); // disable targets droppable property
                        });
                    }
                    else{
                        $.each(obj.pairs, function (index, val) {
                            setDroppableEnabled(val.target, false); // disable targets droppable property
                        });
                    }
                }
                return true;
            },
            /*Stage Methods*/
            "resetStage" : function() {
                //Reset Positions
                resetPositions(obj.properties.initialPositions);

                /*Destroy the dragable elements*/
                $.each(obj.origins, function (index, $val) {
                    destroyDraggable($val);
                    $val.removeClass('disabled');
                });

                /*Destroy the dropppable elements*/
                if (!properties.autoResolve) {
                    $.each(obj.targets, function (index, $val) {
                        destroyDroppable($val);
                    });
                }else{
                    $.each(obj.pairs, function (index, val) {
                        destroyDroppable(val.target);
                    });
                }
                obj.printBoard();
                return true;
            },
            "isComplete" : function () {
                if (this.countAnswered() < obj.targets.length) {
                    return false;
                }
                return true;
            },
            "isFullComplete" : function () {
                if (this.countFullAnswered() < obj.pairs.length) {
                    return false;
                }
                return true;
            },
            "getAnonymousFunction" : function(name) {
                switch (name) {
                    default:
                        break;
                }
            },
            "getSolvedDroppableDetails" : function(){
                var response = {
                    "final_html":escape($("#"+this.draggableContainer).html())
                    };
                return response;
            },
            "countRealOrigins" : function(){
                var origins = [];
                $.each(obj.pairs, function(index, val){
                    if($.inArray(val.origin.attr('id'), origins) < 0 ){
                        origins.push(val.origin.attr('id'));
                    }
                });
                return origins.length;
            },
            "getDroppableTargetNodes" : function(){
                var targets = [];
                $.each(obj.pairs,function(index, pair){
                    if($.inArray(pair.target.attr('id'), targets) < 0){
                        targets.push(pair.target.attr('id'));
                    }
                });
                return targets;
            },
            "existAllSolvedPairs" : function(){
                var response = true;
                $.each( obj.targets, function (index, $val) {
                    $.each($val.data('droppedElements'), function(ind, val){
                        var existMatch = false;
                        $.each(obj.pairs, function(i, v){
                            if( ( val == v.origin.attr('id') ) && ($val.attr('id') = v.target.attr('id'))){
                                existMatch = true;
                            }
                        });
                        if(!existMatch){
                            response = false;
                        }
                    });
                });
                return response;
            },
            "checkPairs" : function(check_all){
                var  response = false;
                if(check_all){ // All
                    var count = 0;
                    $.each(obj.pairs,function(index, pair){
                        if($.inArray(pair.origin.attr('id'), pair.target.data('droppedElements'))>=0){
                            count++;
                        }
                    });
                    if(count ==  this.countRealOrigins()){
                        response = true;
                    }
                }
                else{ // At least one
                    response = true;
                    var targets = this.getDroppableTargetNodes();
                    var atLeastOne = {};
                    $.each(targets,function(index, $val){
                        atLeastOne[$val.attr('id')] = false;
                        $.each($val.data('droppedElements'),function(ind,val){
                            var exist = false;
                            $.each(obj.pairs,function(i,v){
                                if(v.origin.attr('id') == val && v.target.attr('id') == $val.attr('id') ){
                                    exist = true;
                                }
                            });
                            if(exist){
                                atLeastOne[$val.attr('id')]  = true;
                            }
                        });
                    });
                    $.each(atLeastOne, function(key, lo) {
                        if(!lo) response = false;
                    });
                }
                return response;
            },
            "isCorrectAnswered":function(){
                if(!this.existAllSolvedPairs()) return false;
                var response = false;
                if(obj.properties.required_all_pairs){
                    if(this.checkPairs(true)) response = true;
                }else{
                    if(this.checkPairs(false)) response = true;
                }
                return response;
            }
        };
        properties = $.extend({
            autoResolve : false,
            continueResolve : false,
            holdCorrects : false,
            initialPositions: null,
            originDroppedClass: null,
            targetDroppedClass: null,
            autoAlignNodes: false,
            multiTarget: 1,
            requiredAll: true,
            required_all_pairs : false,
            draggableContainer: 'parent'
        }, properties);
        /* Placing into the 'Object' instance the board arguments */
        obj.properties = properties;
        obj.origins = origins;
        obj.targets = targets;
        obj.pairs = pairs;
        obj.parentNodes = null;
        obj.printBoard();

        jpit.activities.droppable.instances.push(obj);
        return obj;
    }

    /**
    * Namespace jpit.activities.droppable
    *
    */
    jpit.activities.droppable = jpit.activities.registerType('jpit.activities.droppable');
    $.extend(jpit.activities.droppable, {
        toString: function () {
            return 'jpit.activities.droppable';
        },
        board: Droppable
    });

    /**
     * Namespace jpit.activities.droppable.instances
     *
     * This array store all droppable instances
     */
    jpit.activities.droppable.instances = [];
    interact.maxInteractions(Infinity);
    $(document).ready(function () {
        transformProp =
            'transform' in document.body.style ? 'transform' :
            'webkitTransform' in document.body.style ? 'webkitTransform' :
            'mozTransform' in document.body.style ? 'mozTransform' :
            'oTransform' in document.body.style ? 'oTransform' :
            'msTransform' in document.body.style ? 'msTransform' : null;
    });
})(jpit, interact);



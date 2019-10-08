/**
 * Custom library to add custom functionality to activities in this learning object.
 *
 * @author: Jesus Otero, David Herney
 */
(function(app) {
    //var conn = new WebSocket('ws://rutatic.udea.edu.co:8080');
    var AUTH_URL = 'https://{URL_MOODLE}/local/tepuy/components/socket/index.php?uid={MANIFEST_ID}&courseid={COURSE_ID}';
    var CHATPAGESIZE = 10;
    var MINREQPLAYEDCARDS = 4;
    var ERROR = 'error';
    var INFO = 'info';
    var MODEDEBUG = false;
    var actions = {
        CHATMSG: 'chatmsg',
        CHATHISTORY: 'chathistory',
        GAMESTATE: 'gamestate',
        PLAYCARD: 'playcard',
        UNPLAYCARD: 'unplaycard',
        ENDCASE: 'endcase',
        PLAYERCONNECTED: 'playerconnected',
        PLAYERDISCONNECTED: 'playerdisconnected'
    };
    var socket;
    var connectD;
    var connected = false;
    var manifestId;
    var courseId;
    var sessionData;
    var socketUrl;
    var oldestChatId = '';
    var activeRole = '';
    var currentTeam = [];
    var cases = ['john', 'natalia', 'hermes', 'santiago', 'nairobi'];
    var currentCase;
    var playDeck;
    var deckViewer;
    var $assets;
    var $gameCnr;
    var $deckCnr;
    var $levelCnr;
    var $podioCnr;
    var $chatCnr;
    var $chatHist;
    var playedcards = [];
    var actionHandlers = {};
    var scorm_id_prefix;
    var serverTime;
    var currentServerPoints = null;
    var canOpenCase;
    var gameState = 'active';
    actionHandlers[actions.CHATMSG] = onChatMessage;
    actionHandlers[actions.CHATHISTORY] = onChatHistory;
    actionHandlers[actions.GAMESTATE] = onGameState;
    actionHandlers[actions.PLAYCARD] = onPlayCard;
    actionHandlers[actions.UNPLAYCARD] = onUnPlayCard;
    actionHandlers[actions.ENDCASE] = onEndCase;
    actionHandlers[actions.PLAYERCONNECTED] = onPlayerConnected;
    actionHandlers[actions.PLAYERDISCONNECTED] = onPlayerDisconnected;

    function getAuthUrl() {

        if (MODEDEBUG) {
            return getAuthUrlFake();
        }

        var manifestId = $('body').data().manifestId || ''; // 'MANIFEST-20190729000000000000000000010021';
        var courseId = parent && parent.window.scormplayerdata ? parent.window.scormplayerdata.courseid : '';
        return `https://rutatic.udea.edu.co/local/tepuy/components/socket/index.php?uid=${manifestId}&courseid=${courseId}`;
    }

    function getAuthUrlFake() {
        var vars = [], hash;
        var hashes = window.location.href.slice(window.location.href.indexOf('?') + 1).split('&');
        for(var i = 0; i < hashes.length; i++)
        {
            hash = hashes[i].split('=');
            vars.push(hash[0]);
            vars[hash[0]] = hash[1];
        }

        //return 'https://rutatic.udea.edu.co/local/tepuy/components/socket/index.php?uid=MANIFEST-20190729000000000000000000010021&courseid=6';
        return "content/json/fakeauth_"+(vars['id']||'3')+".json";
        //ToDo: implement prepare auth url string.
    }
    /**
     * Handler to when a websocket connection has been acquired.
     * @param {jQuery object} $el Selection activity container for the Camea 40 questionaire.
     * @param {object} e Activity results.
     */
    function getAuth() {
        var d = $.Deferred();
        $.getJSON(getAuthUrl())
            .done(function(data) {
                d.resolve(data);
            })
            .fail(function(error){
                d.reject(error);
            });
        return d.promise();
    }

    function connect() {
        connectD = $.Deferred();
        getAuth().then(function(data){
            sessionData = data;
            openSocket();
        }, function(err) {
            connectD.reject(err);
        });
        return connectD.promise();
    }

    function openSocket() {
        var socketUrl;
        if (MODEDEBUG) {
            socketUrl = 'ws://' + sessionData.serverurl + "?skey="+sessionData.skey;
        }
        else {
            socketUrl = 'wss://' + sessionData.serverurl + "?skey="+sessionData.skey;
        }

        socket = new WebSocket(socketUrl);
        socket.onopen = function() {
            connected = true;
            connectD.resolve(socket);
        }
        socket.onerror = function(error) {
            connectD.reject(error);
        }
    }

    function bindSocket(socket) {
        socket.onmessage = onSocketMessage;
        socket.onclose = onSocketClose;
        socket.onerror = onSocketError;
    }

    function reConnect() {
        connectD = $.Deferred();
        openSocket();
        connectD.then(function(socket){
            bindSocket(socket);
            $gameCnr.removeClass('loading');
        }, function (){
            setTimeout(reConnect, 1000);
        });
    }

    function updateClock() {
        serverTime += 1000;
    }

    function onSocketClose(e) {
        if (e.wasClean) return;
        connected = false;
        $gameCnr.addClass('loading');
        //Attempt to reconnect
        setTimeout(reConnect, 1000);
    }

    function onSocketError(e) {
        if (socket.readystate == 1) return; //1 = OPEN, 0 = CONNECTING, 2 = CLOSING, 3 = CLOSED
        setTimeout(reConnect, 1000);
    }

    function onSocketMessage(e) {
        try {
            var msg = JSON.parse(e.data);
            var method = actionHandlers[msg.action];
            method && method.apply(this, [msg]);
        }
        catch(err) {
            console.log(err);
        }
    }

    function onChatMessage(msg) {
        addChatLog(msg.data);
    }

    function onChatHistory(msg) {
        var msgs = msg.data;
        var lastid;
        $loader = $chatHist.find('.loader').remove();

        $.each(msgs, function(i, chatmsg) {
            chatmsg.prepend = true;
            addChatLog(chatmsg);
            lastid = chatmsg.id;
        });

        if (msg.data.length == CHATPAGESIZE) {
            $loader = $('<div class="loader">Ver mas</div>');
            $loader.on('click', function() {
                socketSendMsg({
                    action: actions.CHATHISTORY,
                    data: {
                        n: CHATPAGESIZE,
                        s: lastid
                    }});
            })
            $loader.prependTo($chatHist);
        }
    }

    function onGameState(msg) {
        var data = msg.data;
        serverTime = data.currenttime;
        currentServerPoints = data.points;

        setInterval(updateClock, 1000);
        //Set user info
        $.each(data.team, function (i, it) { //ToDo: process the team as required
            if (it.id == sessionData.userid) {
                sessionData.user = it;
            }
        });

        //Load cases
        currentCase = undefined;
        $.each(data.cases, function(i, it) {
            $levelCnr.find('.case-0'+(i+1))
                .removeClass(function (idx, className) { return (className.match (/(^|\s)case-(active|locked|failed|passed)+/g) || []).join(' ');})
                .addClass('case-'+it.state)
                .on('click', { "id": it.id, "state": it.state, "attempt": it.attempt }, onCaseFeedback);

            if (it.state == 'active') {
                currentCase = it;
                currentCase.ordinal = i + 1;
            }
        });

        //Prepare played cards
        playedcards = data.playedcards || [];
        currentTeam = data.team;

        var meRoles = [];
        $.each(currentTeam, function(k, item) {

            if (item.id == sessionData.userid) {
                $.each(item.roles, function (m, role) {
                    meRoles[meRoles.length] = roleName(role);
                });
            }
        });

        $('.chat-header .roles div').html(meRoles.join(', '));

        if (currentCase && !data.team.find(isMaster)) { //No master
            playedcards.push({ cardtype: 'master', cardcode: currentCase.id });
        }
        //Update the scorm value if required
        var lastCase = currentCase ? currentCase.ordinal - 1 : cases.length;
        if (app.scorm && lastCase > 0) {
            var prevCase = data.cases[lastCase - 1];
            var key = `${scorm_id_prefix}-${prevCase.id}`;
            var values = app.scorm.getActivityValue(key);
            if (values && values.length < prevCase.attempt) {
                app.scorm.activityAttempt(key, getCaseValue(prevCase, prevCase.state == 'passed'));
            }
        }

        if (currentCase == undefined || getTotalPoints() >= 300) {
            gameState = 'ended';
        }

        loadHome();
    }

    function isMaster(user) {
        return user.roles.indexOf('master') >= 0;
    }

    function onPlayCard(msg) {
        playedcards.push(msg.data);
        if ($deckCnr.is(':visible')) {
            dropCard(msg.data);
        }
    }

    function onUnPlayCard(msg) {
        playedcards.splice(playedcards.findIndex(function(it) { return it.cardtype == msg.data.cardtype && it.cardcode == msg.data.cardcode; }), 1);
        if ($deckCnr.is(':visible')) {
            unDropCard(msg.data);
        }
    }

    function onEndCase(msg) {
        //Disable all actions
        var correct = playedcards.length == MINREQPLAYEDCARDS &&
            playedcards.find(function(it) { return it.cardcode != currentCase.id }) == undefined;

        var weight = getCaseValue(currentCase, correct);
        var state = {
            team: $.map(currentTeam, function(it) { return { id: it.id, name: it.name, roles: it.roles }; }),
            playedcards: playedcards,
            case: currentCase
        };

        if (weight > 0) {
            $('[data-case="' + currentCase.id + '"][data-state="passed"]').dialog('open');
        }
        else {
            if (currentCase.attempt == 1) {
                $('#feedback-attempt1-failed').dialog('open');
            }
            else {
                $('[data-case="' + currentCase.id + '"][data-state="failed"]').dialog('open');
            }
        }

        // Report to scorm.
        if (app.scorm) {
            var scorm_id = `${scorm_id_prefix}-${currentCase.id}`;
            app.scorm.activityAttempt(scorm_id, weight, null, JSON.stringify(state));
        }

        socketSendMsg({ action: actions.GAMESTATE });
    }

    function onPlayerConnected(msg) {
    }

    function onPlayerDisconnected(msg) {

    }

    function onPlayDeckSlideChange() {
        var active = this.slides[this.activeIndex];
        $deck = $(deckViewer.el).find('.swiper-slide').removeClass('can-play');
        var $el = $(active);
        activeRole = '';
        var type = sessionData.user.roles.find(function(it){ return $el.hasClass(it) });
        if (type && !$el.hasClass('dropped')) {
            $deck.filter('.'+type).addClass('can-play');
            activeRole = type;
        }
    }

    function socketSendMsg(msg) {
        if (!connected) return;
        socket.send(JSON.stringify(msg));
    }

    function sendChatMsg() {
        if (!connected) return;
        var text = $('.chat-input').html();
        if (text == '') return;

        var msg = {
            action: actions.CHATMSG,
            data: text
        };

        socketSendMsg(msg);
        addChatLog({ user: sessionData.user, msg: msg.data });
        $('.chat-input').empty();
    }

    function addChatLog(message) {
        var $mess = $('<li class="message"></li>'),
            $text = $('<p></p>'),
            me = (message.user == undefined || message.user.id == sessionData.user.id);

        var txt = message.msg;
        var date = new Date(message.timestamp * 1000).toLocaleString();

        var usertxt = !me ? message.user.name : '';

        if (message.issystem === "1" || message.issystem === 1) {
            $mess.addClass('system');

            usertxt = '<span>(' + date + ')</span> ' + usertxt;
        }

        $text.html(txt);

        if (!me) {
            $text.prepend($('<label class="title"></label>').html(usertxt))
        }
        $mess.append($text);

        if (me) {
            $mess.addClass('sent');
        }

        if (message.prepend) {
            $mess.prependTo($chatHist);
        }
        else {
            $mess.appendTo($chatHist);
            $chatHist.stop().animate({ scrollTop: $chatHist[0].scrollHeight }, 400);
        }
    }

    function getCaseValue(ocase, passed) {
        if (passed) {
            return (ocase.attempt == 1 ? 100 : (ocase.attempt == 2 ? 60 : 0));
        }
        return 0;
    }

    function getPodio() {
        var progress = 0;
        if (currentServerPoints || currentServerPoints == 0) {
            progress = currentServerPoints / 3;
        }
        else if (app.scorm && app.scorm.lms) {
            progress = app.scorm.getProgress();
        }
        else {
            progress = Math.min(100, currentCase.ordinal * (100 / 3));
        }

        if (progress >= 100) {
            return "podio_3";
        }
        else if (progress >= 66) {
            return "podio_2";
        }
        else if (progress >= 33) {
            return "podio_1";
        }
        return "podio_0";

    }

    function setCaseNumber($el) {
        var text = '0'+currentCase.ordinal;
        $el.find('.case-number').html(text.substr(text.length - 2));
    }

    function makeSwippable(el, options) {
        return new Swiper(el, Object.assign({
            slidesPerView: 'auto',
            navigation: {
                nextEl: '.swiper-button-next',
                prevEl: '.swiper-button-prev',
            },
            scrollbar: {
                el: '.swiper-scrollbar',
            },
            mousewheel: false,
            observer: true,
            observeParents: true
        }, options || {}));
    }

    function loadInstructionsFor(instructionId, callback) {
        var $inst = $(instructionId).clone().appendTo($('.instructions-container').empty());

        if (callback) {
            callback($inst);
        }
    }

    function loadHome() {
        hideAll();

        $deckCnr.toggle(false);
        $levelCnr.toggle(true);
        $podioCnr.toggle(true);
        $podioCnr.addClass(getPodio()); //ToDo: add the proper class
        showClock();

        points = getTotalPoints();

        if (gameState == 'ended') {
            if (points >= 300) {
                loadInstructionsFor('#feedback-game-passed');
            } else {
                loadInstructionsFor('#feedback-game-failed');
            }
        } else {
            loadInstructionsFor('#instructions');
        }

        $('#ticpoints span').html(points);
        $gameCnr.removeClass('loading');
    }

    function showClock() {
        canOpenCase = false;
        if (!currentCase) return;

        var elapsedTime = 0;
        if (currentCase.lastattempt > 0) {
            elapsedTime = 30 * 60 - (serverTime - currentCase.lastattempt);
        }

        canOpenCase = elapsedTime <= 0;

        if (!canOpenCase) {
            var clock = new Countdown(onCountDownComplete);
            var $clock = $('.clock-box').show();
            clock.init($clock.find('.clock').get(0), new Date(elapsedTime * 1000));
        }
    }

    function onCountDownComplete() {
        $('.clock-box').hide();
        canOpenCase = true;
    }

    function updateCountDown() {

    }

    function loadChatHistory() {
        var msg = {
            action: actions.CHATHISTORY,
            data: {
                n: CHATPAGESIZE,
                s: oldestChatId
            }
        };
        socketSendMsg(msg);
    }

    function loadCase() {
        var name = currentCase.id;
        var roles = sessionData.user.roles;
        loadInstructionsFor('#case-'+name, setCaseNumber);

        //prepare play deck
        var swiperOptions = {
            spaceBetween: 40,
            effect: 'coverflow',
            grabCursor: true,
            centeredSlides: true,
            coverflowEffect: {
                rotate: 50,
                stretch: 0,
                depth: 100,
                modifier: 1,
                slideShadows : true,
            },
        };
        var $deck = $("#play-deck");

        if (!playDeck) {
            playDeck = makeSwippable($deck.get(0), swiperOptions);
            playDeck.on('slideChange', onPlayDeckSlideChange)
        }

        playDeck.removeAllSlides();
        var selector = ".dropzone[data-target-group='"+name+"']";
        $assets.find(selector).each(function(i, it) {
            playDeck.appendSlide(it.outerHTML);
        });
        playDeck.update();

        //prepare deck-viewer
        var $deck = $("#deck-viewer");

        if (!deckViewer) {
            deckViewer = makeSwippable($deck.get(0), swiperOptions);
        }

        deckViewer.removeAllSlides();

        var selectors = [];
        $.each(roles, function(i, role) {
            selectors.push(".card."+role);
            if (role == 'master') {
                selectors[i] += "[data-group='"+name+"']";
            }
        });

        $assets.find(selectors.join(',')).sort(sortByRol).each(function(i, it) {
            var idx = i; //Math.floor(Math.random() * 5);
            deckViewer.addSlide(idx, it.outerHTML);
            deckViewer.update();
        });

        onPlayDeckSlideChange.apply(playDeck);

        //$(deckViewer.el).find('.swiper-slide').removeClass('can-play');

        $.each(playedcards, function(i, it) {
            if (sessionData.user.roles.indexOf(it.cardtype) >= 0) {
                var $card = $deckCnr.find(`.card.${it.cardtype}[data-group='${it.cardcode}']`);
                $card.find('.card-header,.card-content').hide();
            }
            dropCard(it);
        });
    }

    function openCase() {
        if (!canOpenCase) return;
        $levelCnr.toggle(false);
        $podioCnr.toggle(false);
        $deckCnr.toggle(true);
        loadCase();
    }

    function btnSendOnClick(event) {
        sendChatMsg();
    }

    function btnPlayCardOnClick(event) {
        var $card = $(event.target).closest('.card');
        if (!$card.hasClass(activeRole)) return; //This should never happend, but just in case

        $card.find('.card-header,.card-content').hide();
        var group = $card.data().group;
        var card = { cardtype: activeRole, cardcode: group };
        dropCard(card);
        $(deckViewer.el).find('.swiper-slide').removeClass('can-play');
        playedcards.push(card);
        socketSendMsg({
            action: actions.PLAYCARD,
            data: card
        });
    }

    function dropCard(card) {
        var $targetZone = $deckCnr.find('.dropzone.'+card.cardtype);
        if ($targetZone.hasClass('dropped')) return;

        var $content = $assets.find(".card."+card.cardtype+"[data-group='"+card.cardcode+"'] .card-content");
        var $dzcontent = $targetZone.find('.dropzone-content');
        var $ncontent = $('<div class="card-content view-first"></div>').appendTo($targetZone).append($content.clone());
        $ncontent.data('card', card);

        if (card.cardtype != 'master') {
            var $mask = $('<div class="mask"></div>').appendTo($ncontent);
            $dzcontent.addClass('view-content').appendTo($mask);
            $targetZone.addClass('dropped');
            if (sessionData.user.roles.indexOf(card.cardtype) >= 0) {
                $('<button class="card-unplay" title="Remover"><i class="ion-close-circled"></i></button>').appendTo($targetZone.find('.card-header'));
            }
        }
        else {
            $dzcontent.hide();
        }
    }

    function btnUnplayCardOnClick(event) {
        var $fromZone = $(event.target).closest('.dropzone');
        if (!$fromZone.hasClass('dropped')) return; //Should it replace the card?
        var card = $fromZone.find('.card-content.view-first').data().card;
        unDropCard(card);
        $(deckViewer.el).find('.swiper-slide').addClass('can-play');
        activeRole = card.cardtype;
        playedcards.splice(playedcards.findIndex(function (it) { return it.cardtype == card.cardtype && it.cardcode == card.cardcode; }), 1);
        socketSendMsg({
            action: actions.UNPLAYCARD,
            data: card
        });
    }

    function btnGoToHomeOnClick(event) {
        loadHome();
    }

    function unDropCard(card) {
        var $fromZone = $deckCnr.find('.dropzone.'+card.cardtype);

        var $dzcontent = $fromZone.find('.dropzone-content').removeClass('view-content')
            .appendTo($fromZone);

        $fromZone.removeClass('dropped').find('.card-content.view-first,.card-unplay').remove();

        if (sessionData.user.roles.indexOf(card.cardtype) >= 0) {
            var $card = $deckCnr.find(".card."+card.cardtype+"[data-group='"+card.cardcode+"']");
            $card.find('.card-header,.card-content').show();
        }
    }

    function btnEndCaseOnClick(event) {
        if (playedcards.length < MINREQPLAYEDCARDS) {
            alert('No se han jugado todavía todas las cartas.')
            return;
        }

        if (!confirm("¿Está seguro que desean finalizar la partidad?")) return;
        socketSendMsg({ action: actions.ENDCASE });
    }

    function chatInputOnEnter(event) {
        if (event.keyCode === 13) {
            setTimeout(sendChatMsg, 0);
            return false;
        }
    }

    function onChatHistScroll(e) {
    }

    /**
     * To handle when an activity has been rendered. It will hide verify button on 1-camea form.
     * @param {event} event
     * @param {JQuery object} $el
     * @param {object} args
     */
    function initialize(socket) {
        bindSocket(socket);

        $assets = $('#game-assets');
        $deckCnr = $('.deck-container');
        $levelCnr = $('.case-progress');
        $podioCnr = $('.podio-container');
        $gameCnr = $('.game-container');
        $chatCnr = $(".chat-container");
        $chatHist = $(".chat-history");

        //bind event handlers
        $('.btn.send').on('click', btnSendOnClick);
        $('.chat-input').keydown(chatInputOnEnter);

        $gameCnr.on('click', '.case-active', openCase);
        $deckCnr.on('click', '.card-play', btnPlayCardOnClick);
        $deckCnr.on('click', '.card-unplay', btnUnplayCardOnClick);
        $deckCnr.on('click', '.end-case', btnEndCaseOnClick);
        $('#gotohome').on('click', btnGoToHomeOnClick);
        $chatHist.on('scroll', onChatHistScroll);

        //register for scorm
        scorm_id_prefix = $gameCnr.data().actId || 'game-angi';
        if (app.scorm) {
            $.each(cases, function(i, it) {
                var scorm_id = `${scorm_id_prefix}-${it}`;
                if (!app.scorm.activities[scorm_id]) { app.scorm.activities[scorm_id] = []; }
            });
        }

        if (sessionData.userpicture) {
            $(`<img src="${sessionData.userpicture}" alt="" />`).appendTo($chatCnr.find('.chat-header .avatar'));
        }
        //request game state
        socketSendMsg({ action: actions.GAMESTATE });
        loadChatHistory();
    }

    function sortByRol(a, b) {
        var roles = ["planner", "master", "media", "network", "tech"];
        var scoreA = -1,
            scoreB = -1,
            $a = $(a),
            $b = $(b);
        for(var i = 0; i < roles.length; i++) {
            if ($a.hasClass(roles[i])) scoreA = i;
            if ($b.hasClass(roles[i])) scoreB = i;
            if (scoreA >= 0 && scoreB >= 0) break;
        }

        return scoreA - scoreB;
    }

    function roleName(key) {
        var roles = [];
            roles["planner"] = 'Planner';
            roles["master"] = 'Master';
            roles["media"] = 'Media';
            roles["network"] = 'Red';
            roles["tech"] = 'Tech';

            return roles[key];
    }

    function showMsg(type, msg) {
        var title = type == ERROR ? "Error" : "Información";
        var $dlg = $(`<div title="${title}"></div>`).html(msg);
        $dlg.dialog({
            modal: true,
            autoOpen: true,
            //width: w_global_modal,
            //height: dhbgApp.documentHeight - 50,
            classes: {
                "ui-dialog": "game-message-dialog"
            },
            close: function() {
                $dlg.dialog('destroy').remove();
            }
        });
    }

    function hideAll() {
        $(".deck-container, .podio-container, .case-progress, .role-box, .clock-box").hide();
    }

    function getTotalPoints() {
        var progress = 0;

        if (currentServerPoints || currentServerPoints === 0) {
            progress = currentServerPoints;
        }
        else if (app.scorm && app.scorm.lms) {
            progress = app.scorm.getProgress() * 3;
        }
        else {
            progress = Math.min(300, currentCase.ordinal * 100);
        }

        return progress;
    }

    function onCaseFeedback(event) {
        if (event.data.state == 'passed' || event.data.state == 'failed') {
            $('[data-case="' + event.data.id + '"][data-state="' + event.data.state + '"]').dialog('open');
        }
    }

    /**
     * Create scorm hook getActivityWeight
     */
    app.scorm.getActivityWeight = function (activity_id) {
        return 100 / 3;
    }

    /**
     * Runs when all dom objects have been rendered.
     */
    $(document).ready(function() {
        hideAll();
        connect().then(function(socket) {
            console.log('connected');
            initialize(socket);
        }, function(err) {
            showMsg(ERROR, "Hubo un error en la conexión. Por favor salga y vuelva a abrir el juego.");
            console.log('failed to connect');
            console.log(err);
        })
    });

    function Clock () {
        this.digits = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine"];

        this.init = function () {
            var $digit = $('.digit');
            // Ugly....
            this.hour = [$($digit[0]), $($digit[1])];
            this.min  = [$($digit[2]), $($digit[3])];
            this.sec  = [$($digit[4]), $($digit[5])];
            this.drawInterval(this.drawSecond, function(time){
              return 1000 - time[3];
            });
            this.drawInterval(this.drawMinute, function(time){
              return 60000 - time[2] * 1000 - time[3];
            });
           this.drawInterval(this.drawHour, function(time){
              return (60 - time[1]) * 60000 - time[2] * 1000 - time[3];
            });
        };

        this.getTimeArray = function() {
            var dat = new Date();
            return [dat.getHours(), dat.getMinutes(), dat.getSeconds(), dat.getMilliseconds()];
        };

        this.drawInterval = function (func, timeCallback){
            var time = this.getTimeArray();
            func.call(this, time);
            var that = this;
            setTimeout(function(){
                that.drawInterval(func, timeCallback);
            }, timeCallback(time));
        };

        this.drawHour = function(time){
            this.drawDigits(this.hour, time[0]);
        }

        this.drawMinute = function(time){
            this.drawDigits(this.min,  time[1]);
        }

        this.drawSecond = function(time){
            this.drawDigits(this.sec,  time[2]);
        }

        this.drawDigits = function(digits, digit){
            var ten = Math.floor(digit / 10);
            var one = Math.floor(digit % 10);
            digits[0].attr('class', 'digit '+this.digits[ten]);
            digits[1].attr('class', 'digit '+this.digits[one]);
        };
    }
})(dhbgApp);


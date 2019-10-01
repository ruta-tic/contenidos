/**
 * Custom library to add custom functionality to activities in this learning object.
 *
 * @author: Jesus Otero
 */
(function(app) {
    //var conn = new WebSocket('ws://rutatic.udea.edu.co:8080');
    var AUTH_URL = 'http://{URL_MOODLE}/local/tepuy/components/socket/index.php?uid={MANIFEST_ID}&courseid={COURSE_ID}';
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
    var usr = new Date().getTime();
    //var cases = ['john', 'natalia', 'hermes', 'santiago', 'nairobi'];
    var currentCase;
    var playDeck;
    var deckViewer;
    var $assets;
    var $gameCnr;
    var $deckCnr;    
    var $levelCnr;
    var $podioCnr;
    var playedcards = [];
    var actionHandlers = {};
    actionHandlers[actions.CHATMSG] = onChatMessage;
    actionHandlers[actions.CHATHISTORY] = onChatHistory;
    actionHandlers[actions.GAMESTATE] = onGameState;
    actionHandlers[actions.PLAYCARD] = onPlayCard;
    actionHandlers[actions.UNPLAYCARD] = onUnPlayCard;
    actionHandlers[actions.ENDCASE] = onEndCase;
    actionHandlers[actions.PLAYERCONNECTED] = onPlayerConnected;
    actionHandlers[actions.PLAYERDISCONNECTED] = onPlayerDisconnected;

    function getAuthUrl() {
        var vars = [], hash;
        var hashes = window.location.href.slice(window.location.href.indexOf('?') + 1).split('&');
        for(var i = 0; i < hashes.length; i++)
        {
            hash = hashes[i].split('=');
            vars.push(hash[0]);
            vars[hash[0]] = hash[1];
        }

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
        socketUrl = sessionData.serverurl + "?skey="+sessionData.skey;
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
        }, function (){
            setTimeout(reConnect, 1000);
        });
    }

    function onSocketClose(e) {
        if (e.wasClean) return;
        connected = false;
        //$game.addClass('loading');
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
            console.log('socket message received');
            console.log(msg);
            var method = actionHandlers[msg.action];
            method && method.apply(this, [msg]);
        }
        catch(err) {
            console.log(err);
        }
    }

    function onChatMessage(msg) {
        addChatLog(msg);
    }

    function onChatHistory(msg) {
        
    }

    function onGameState(msg) {
        //
        var caseStarted = (msg.playedcards.length > 0);

        hideAll();

        $deckCnr.toggle(caseStarted);
        $levelCnr.toggle(!caseStarted);
        $podioCnr.toggle(!caseStarted);
        $podioCnr.addClass('podio_1'); //ToDo: add the proper class

        $.each(msg.team, function (i, it) { //ToDo: process the team as required
            if (it.id == sessionData.userid) {
                sessionData.user = it;
            }
        });

        $.each(msg.cases, function(i, it) {
            $levelCnr.find('.case-0'+(i+1))
                .removeClass(function (idx, className) { return (className.match (/(^|\s)case-(active|locked|failed|passed)+/g) || []).join(' ');})
                .addClass('case-'+it.state);

            if (it.state == 'active') {
                currentCase = it;
                currentCase.ordinal = i + 1;
            }
        });

        if (!caseStarted) {
            loadInstructionsFor('#instructions');
        }
        else {
            loadCase();
        }
        $gameCnr.removeClass('loading');
    }

    function onPlayCard(msg) {

        if ($deckCnr.is(':visible')) {
            dropCard(msg.data);
        }
        else {
            playedcards.push(msg.data);
        }
    }

    function onUnPlayCard(msg) {
        if ($deckCnr.is(':visible')) {
            unDropCard(msg.data);
        }
        else {
            playedcards.splice(playedcards.indexOf(msg.data), 1);
        }
    }

    function onEndCase(msg) {

    }

    function onPlayerConnected(msg) {

    }

    function onPlayerDisconnected(msg) {

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
        addChatLog(msg);
        $('.chat-input').empty();
    }

    function addChatLog(message) {
        var $mess = $('<li class="message"></li>'),
            $text = $('<p></p>').html(message.data),
            $avatar = $('<div class="avatar"></div>');
        $mess.append($avatar).append($text)
            .appendTo($('.chat-history'));

        if (message.user == undefined || message.user.id == sessionData.userid) {
            $mess.addClass('sent');
        }
        $mess.get(0).scrollIntoView();
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

    function openCase() {
        $levelCnr.toggle(false);
        $podioCnr.toggle(false);
        $deckCnr.toggle(true);
        loadCase();
    }

    function loadCase() {
        var name = currentCase.id;
        var role = sessionData.user.role;
        loadInstructionsFor('#case-'+name, setCaseNumber);

        //prepare play deck
        var $deck = $("#play-deck");

        if (!playDeck) {
            playDeck = makeSwippable($deck.get(0), { 
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
            });
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
            deckViewer = makeSwippable($deck.get(0), { 
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
            });
            window.DV = deckViewer;
        }

        deckViewer.removeAllSlides();

        selector = ".card."+role;
        if (role == 'master') {
            selector += "[data-group='"+name+"']";
        }

        $assets.find(selector).each(function(i, it) {
            var idx = Math.floor(Math.random() * 5);
            deckViewer.addSlide(idx, it.outerHTML);
            deckViewer.update();
        });

        $.each(playedcards, function(i, it) {
            dropCard(it);
        });
        playedcards = [];
    }

    function btnSendOnClick(event) {
        sendChatMsg();        
    }

    function btnPlayCardOnClick(event) {
        var $card = $(event.target).closest('.card');
        var role = sessionData.user.role;

        if (!$card.hasClass(role)) return; //This should never happend, but just in case

        $card.find('.card-header,.card-play,.card-content').hide();
        var group = $card.data().group;
        var card = { cardtype: role, cardcode: group };
        dropCard(card);
        socketSendMsg({
            action: actions.PLAYCARD,
            data: card
        });
    }

    function dropCard(card) {
        var $targetZone = $deckCnr.find('.dropzone.'+card.cardtype);
        if ($targetZone.hasClass('dropped')) return; //Should it replace the card?

        var $content = $assets.find(".card."+card.cardtype+"[data-group='"+card.cardcode+"'] .card-content");
        var $dzcontent = $targetZone.find('.dropzone-content');
        var $ncontent = $('<div class="card-content view-first"></div>').appendTo($targetZone).append($content.clone());
        $ncontent.data('card', card);
        //$card.find('.card-content').appendTo($ncontent);
        var $mask = $('<div class="mask"></div>').appendTo($ncontent);
        $dzcontent.addClass('view-content').appendTo($mask);
        $targetZone.addClass('dropped');
        if (card.cardtype == sessionData.user.role) {
            $('<button class="card-unplay"><i class="ion-eject"></i></button>').appendTo($targetZone);
        }
    }

    function btnUnplayCardOnClick(event) {
        var $fromZone = $(event.target).closest('.dropzone');
        if (!$fromZone.hasClass('dropped')) return; //Should it replace the card?
        var card = $fromZone.find('.card-content.view-first').data().card;
        unDropCard(card);
        socketSendMsg({
            action: actions.UNPLAYCARD,
            data: card
        });
    }

    function unDropCard(card) {
        var $fromZone = $deckCnr.find('.dropzone.'+card.cardtype);

        var $dzcontent = $fromZone.find('.dropzone-content').removeClass('view-content')
            .appendTo($fromZone);

        $fromZone.removeClass('dropped').find('.card-content.view-first,.card-unplay').remove();

        if (card.cardtype == sessionData.user.role) {
            var $card = $deckCnr.find(".card."+card.cardtype+"[data-group='"+card.cardcode+"']");
            $card.find('.card-header,.card-play,.card-content').show();
        }
    }

    function chatInputOnEnter(event) {
        if (event.keyCode === 13) {
            setTimeout(sendChatMsg, 0);
            return false;
        }
    }

    function shuffle(arr) {
        var i = arr.length, k1, k2;
        //Shuffled positions
        while(i--) {
            k1 = Math.floor(Math.random() * i);
            k2 = arr[k1];
            arr[k1] = arr[i];
            arr[i] = k2;
        }
    }

    function gameAreaOnResize() {

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

        //bind event handlers
        $('.btn.send').on('click', btnSendOnClick);
        $('.chat-input').keydown(chatInputOnEnter);

        $gameCnr.on('click', '.case-active', openCase);
        $deckCnr.on('click', '.card-play', btnPlayCardOnClick);
        $deckCnr.on('click', '.card-unplay', btnUnplayCardOnClick);

        //request game state
        socketSendMsg({
            action: actions.GAMESTATE
        });
        //If, it is first time, shuffle cases, perhaps this should change to choose a case randomly when the current case is completed
        //shuffle(cases);
        //load current state
        //loadInstructionsFor('#instructions');
        //Load a case
        //loadCase();
    }
    
    function hideAll() {
        $(".deck-container, .podio-container, .case-progress, .role-box, .clock-box").hide();
    }

    $(document).ready(function() {
        hideAll();
        connect().then(function(socket) {
            console.log('connected');
            initialize(socket);
        }, function(err) {
            console.log('failed to connect');
            console.log(err);
        })
    })

})(dhbgApp);

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
    var MODEDEBUG = true;
    var actions = {
        CHATMSG: 'chatmsg',
        CHATHISTORY: 'chathistory',
        GAMESTART: 'sc_gamestart',
        GAMESTATE: 'gamestate',
        CHANGETIMEFRAME: 'sc_changetimeframe',
        PLAYACTION: 'sc_playaction',
        STOPACTION: 'sc_stopaction',
        ACTIONCOMPLETED: 'sc_actioncompleted',
        PLAYTECHNOLOGY: 'sc_playtechnology',
        STOPTECHNOLOGY: 'sc_stoptechnology',
        TECHNOLOGYCOMPLETED: 'sc_technologycompleted',
        HEALTHUPDATE: 'sc_healthupdate',
        LAPSECHANGED: 'sc_lapsechanged',
        GAMEOVER: 'sc_gameover',
        AUTOGAMEOVER: 'sc_autogameover',
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
    var activeGame;
    var playDeck;
    var deckViewer;
    var $assets;
    var $gameCnr;
    var $gameHome;
    var $gameHistory;
    var $gameBoard;
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
    var gameState;
    var setup = { actions: [], techs: [], files: [] };
    var $assetViewer;
    var zones = ['Salud', 'Educación', 'Urbanismo', 'Medio Ambiente', 'Gobierno', 'Seguridad'];
    var assetTypeLabels = { action: 'Politica', 'tech': 'Tecnología', 'file': 'Archivo' };
    actionHandlers[actions.CHATMSG] = onChatMessage;
    actionHandlers[actions.CHATHISTORY] = onChatHistory;
    actionHandlers[actions.GAMESTART] = onGameStart;
    actionHandlers[actions.GAMESTATE] = onGameState;
    actionHandlers[actions.CHANGETIMEFRAME] = onChangeTimeFrame;
    actionHandlers[actions.PLAYACTION] = onPlayAction;
    actionHandlers[actions.STOPACTION] = onStopAction;
    actionHandlers[actions.ACTIONCOMPLETED] = onActionCompleted;
    actionHandlers[actions.PLAYTECHNOLOGY] = onPlayTechnology;
    actionHandlers[actions.STOPTECHNOLOGY] = onStopTechnology;
    actionHandlers[actions.TECHNOLOGYCOMPLETED] = onTechnologyCompleted;
    actionHandlers[actions.HEALTHUPDATE] = onHealthUpdate;
    actionHandlers[actions.LAPSECHANGED] = onLapseChanged;
    actionHandlers[actions.GAMEOVER] = onGameOver;
    actionHandlers[actions.AUTOGAMEOVER] = onAutoGameOver;
    //actionHandlers[actions.PLAYCARD] = onPlayCard;
    //actionHandlers[actions.UNPLAYCARD] = onUnPlayCard;
    //actionHandlers[actions.ENDCASE] = onEndCase;
    actionHandlers[actions.PLAYERCONNECTED] = onPlayerConnected;
    actionHandlers[actions.PLAYERDISCONNECTED] = onPlayerDisconnected;


    function padNumber(number) {
        var str = '0'+number;
        return str.substring(str.length-2);
    }

    function toDateTime(timestamp) {
        var date = new Date(timestamp * 1000),
            year = date.getFullYear(),
            month = padNumber(date.getMonth()+1),
            day = padNumber(date.getDate()),
            hours = padNumber(date.getHours()),
            minutes = padNumber(date.getMinutes()),
            seconds = padNumber(date.getSeconds());

        return [year, '-', month, '-', day, ' ', hours, ':', minutes, ':', seconds].join('');
    }

    function toDate(timestamp) {
        return toDateTime(timestamp).substring(0, 10);
    }

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

        //return `https://rutatic.udea.edu.co/local/tepuy/components/socket/index.php?uid=MANIFEST-20190729000000000000000000030221&courseid=${courseId}`;
        //return 'https://rutatic.udea.edu.co/local/tepuy/components/socket/index.php?uid=MANIFEST-20190729000000000000000000010021&courseid=6';
        return "content/json/fakeauth_"+(vars['id']||'2')+".json";
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

    function loadSetup() {
        var ptechs = $.getJSON('content/technologies.json');
        var pactions = $.getJSON('content/actions.json');
        var pfiles = $.getJSON('content/files.json');
        $.when(ptechs, pactions, pfiles).done(function(rtechs, ractions, rfiles) {
            console.log(rtechs);
            setup.techs = rtechs[0] || [];
            setup.actions = ractions[0] || [];
            setup.files = rfiles[0] || [];
        }).fail(function(err1, err2, err3) {
            console.log('err');
            console.log(err1);
            console.log(err2);
            console.log(err3);
        });
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
            if (handleSocketError(msg)) return;
            console.log(msg);
            var method = actionHandlers[msg.action];
            method && method.apply(this, [msg]);
        }
        catch(err) {
            console.log(err);
        }
    }

    function socketSendMsg(msg) {
        if (!connected) return;
        socket.send(JSON.stringify(msg));
    }

    function handleSocketError(msg) {
        return false;
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

    function onGameStart(msg) {
        //call the game state    
        $(".game-entry .btn").off('click');
        socketSendMsg({ action: actions.GAMESTATE });
    }

    function onGameState(msg) {
        var data = msg.data;
        console.log(data);
        gameState = data;
        serverTime = data.currenttime;
        currentServerPoints = data.points;

        setInterval(updateClock, 1000);
        //Set user info
        $.each(data.team, function (i, it) { //ToDo: process the team as required
            if (it.id == sessionData.userid) {
                sessionData.user = it;
            }
        });

        //Load game history
        activeGame = null;
        loadGameHistory(data.games);
        if (activeGame && activeGame.state == 'active') {
            loadGameBoard();
            showClock();
        }
        else {
            loadHome();
        }
        //Load cases
        /*
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
        */
        //$('.chat-header .roles div').html(meRoles.join(', '));
        //Update the scorm value if required
        /*
        var lastCase = currentCase ? currentCase.ordinal - 1 : cases.length;
        console.log(lastCase);
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
        */
        $gameCnr.removeClass('loading');
    }

    function onChangeTimeFrame(msg) {
        console.log('onChangeTimeFrame');
        console.log(msg);
    }

    function onPlayAction(msg) {
        var data = msg.data;
        updateResourceBoxes(data.resources);
        //Add it to the execution box
        var $container = $gameBoard.find('.execution-box.actions .box-content.available');
        var $item = $container.find('.asset.icon.'+data.id);
        if ($item) $item.hide();
        $container = $gameBoard.find('.execution-box.actions .box-content.running');
        appendCollectionItem($container, data.id, 'action', setup.actions, 'running', data.starttime);
        var action = gameState.actions.running.find(findById(data.id));
        if (!action) {
            gameState.actions.running.push({id: data.id, starttime: data.starttime});
        }
    }

    function onStopAction(msg) {
        onActionCompleted(msg);
    }

    function onActionCompleted(msg) {
        var data = msg.data;
        updateResourceBoxes(data.resources);
        var $container = $gameBoard.find('.execution-box.actions .box-content.running');
        var $item = $container.find('.asset.icon.'+data.id);
        if ($item) $item.remove();
        $container = $gameBoard.find('.execution-box.actions .box-content.available');
        $item = $container.find('.asset.icon.'+data.id);
        if ($item) $item.show();
        var index = gameState.actions.running.findIndex(findById(data.id));
        if (index >= 0) {
            gameState.actions.running.splice(index, 1);
        }
    }

    function onPlayTechnology(msg) {
        var data = msg.data;
        updateResourceBoxes(data.resources);
        //Add it to the execution box
        var $container = $gameBoard.find('.execution-box.applications .box-content.available');
        var $item = $container.find('.asset.icon.'+data.id);
        if ($item) $item.hide();
        $container = $gameBoard.find('.execution-box.applications .box-content.running');
        appendCollectionItem($container, data.id, 'tech', setup.techs, 'running', data.starttime);
        var tech = gameState.technologies.running.find(findById(data.id));
        if (!tech) {
            gameState.technologies.running.push({id: data.id, starttime: data.starttime});
        }
    }

    function onStopTechnology(msg) {
        onTechnologyCompleted(msg);
    }

    function onTechnologyCompleted(msg) {
        var data = msg.data;
        updateResourceBoxes(data.resources);
        var $container = $gameBoard.find('.execution-box.applications .box-content.running');
        var $item = $container.find('.asset.icon.'+data.id);
        if ($item) $item.remove();
        $container = $gameBoard.find('.execution-box.applications .box-content.available');
        $item = $container.find('.asset.icon.'+data.id);
        if ($item) $item.show();
        var index = gameState.technologies.running.findIndex(findById(data.id));
        if (index >= 0) {
            gameState.technologies.running.splice(index, 1);
        }
        if (data.files) {
            gameState.files = data.files;
            var $files = $gameBoard.find('.content-box.files .content');
            //load files
            loadCollection($files, gameState.files, setup.files, 'file', 'file');
        }
    }

    function onHealthUpdate(msg) {
        updateHealth(msg.data);
    }

    function onLapseChanged(msg) {
        gameState.currentlapse = msg.data.lapse;
        gameState.updatelapses = gameState.currentlapse - gameState.lastmeasured;
        updateHealthNotice();
    }

    function onAutoGameOver(msg) {
        onGameOver(msg);
    }

    function onGameOver(msg) {
        //ddd
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

    function loadGameHistory(games) {
        var entryTpl = $('#game-entry').html();
        $gameHistory.empty();
        activeGame = null;
        $.each(games, function(i, it) {
            var $entry = $(entryTpl);
            $entry.find('.title').html('Partida ' + (i + 1));
            $entry.addClass(it.state);
            $gameHistory.append($entry);
            if (it.state == 'active') {
                activeGame = it;
            }
            if (it.state == 'locked' && !activeGame) {
                $entry.find('.btn.locked').on('click', startGame);
                activeGame = it;
            }
        });
    }

    function updateClock() {
        serverTime += 1000;
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

    function loadTemplate(templateId, callback) {
        var $inst = $('.instructions-container').empty().html($(templateId).html());

        if (callback) {
            callback($inst);
        }
    }

    function loadInstructionsFor(instructionId, callback) {
        var $inst = $(instructionId).clone().appendTo($('.instructions-container').empty());

        if (callback) {
            callback($inst);
        }
    }

    function loadHome() {
        hideAll();

        $gameHome.toggle(true);
        points = getTotalPoints();
        loadTemplate('#instructions', function($cnr) {
            app.floatingWindow($cnr.find('.wf-content'));
        });


        $gameCnr.removeClass('loading');
    }

    function loadGameBoard() {
        hideAll();
        //load zones
        var $zones = $gameBoard.find('.game-zones').empty();
        $.each(zones, function(i, it) {
            $zones.append($([
                '<div class="zone zone_'+i+'"><div class="icon eje', i+1, '"',
                ' title="', it, '">',
                '<span class="progress">', 50, ' %</span>',
                '</div></div>'
                ].join('')
            ));
        });
        updateHealth(gameState.health);
        var $files = $gameBoard.find('.content-box.files .content');
        //load files
        loadCollection($files, gameState.files, setup.files, 'file', 'file');
        //load techs
        var $availableApps = $gameBoard.find('.execution-box.applications .box-content.available');
        loadCollection($availableApps, gameState.technologies.available, setup.techs, 'tech', 'available');
        var $runningApps = $gameBoard.find('.execution-box.applications .box-content.running');
        loadCollection($runningApps, gameState.technologies.running, setup.techs, 'tech', 'running');
        //load actions
        var $availableActions = $gameBoard.find('.execution-box.actions .box-content.available');
        loadCollection($availableActions, gameState.actions.available, setup.actions, 'action', 'available');
        var $runningActions = $gameBoard.find('.execution-box.actions .box-content.running');
        loadCollection($runningActions, gameState.actions.running, setup.actions, 'action', 'running');
        //action resources
        updateResourceBoxes(gameState.technologies.resources);
        updateResourceBoxes(gameState.actions.resources);

        $gameBoard.toggle(true);
    }

    function updateHealth(health) {
        if ('details' in health) {
            $.each(health.details, function(i, it) {
                var $zone = $gameBoard.find('.zone_'+i+' .icon');
                var percentage = ((100-it.value)/100)+'';
                $zone.css('filter', 'grayscale('+percentage.substring(0,4)+')');
                $zone.find('.progress').html(it.value + ' %');
            });
        }
        
        if ('general' in health) {
            $gameBoard.find('.healthy-box .display').html(health.general+'%');
        }
        if ('lastmeasured' in health) {
            gameState.lastmeasured = health.lastmeasured;
            gameState.updatelapses = gameState.currentlapse - health.lastmeasured;
            updateHealthNotice();
        }
    }

    function updateHealthNotice() {
        //lastmeasured: timestamp
        var week = (gameState.updatelapses == 0) ? 'justo ahora' : 
            (gameState.updatelapses == 1) ? ' hace una semana' : 'hace ' + gameState.updatelapses + ' semanas';
        var $notice = $('.health-update-notice').html('Actualizado por última vez ' + week).removeClass('warning');

        if (gameState.updatelapses > 2) {
            $notice.addClass('warning');
        }

        var weeks = gameState.lapses - gameState.currentlapse;
        var text = weeks == 1 ? ' una semana ' : weeks + ' semanas';
        $(".clock-display").html() 
    }

    function updateResourceBoxes(resources) {
        $.each(resources, function(i, it) {
            var selector = ['.'+it.type, '-resources-box .display'].join('');
            var $display = $gameBoard.find(selector);
            $display.html(it.value+'%').data('value', it.value);
        });
    }

    function loadCollection($container, collection, store, type, className) {
        $container.empty();
        $.each(collection, function (i, it) {
            var creationtime = type == 'file' ? it.creationtime : it.starttime;
            var id = typeof(it) == 'object' ? it.id : it;
            appendCollectionItem($container, id, type, store, className, creationtime);
        });
    }

    function appendCollectionItem($container, id, type, store, className, creationtime) {
        var item = store.find(findById(id));
        if (!item) return true;
        item = $.extend({}, item);
        var html = ['<i class="asset icon ', item.id, ' ',
            className || '',
            '" title="', item.name,
            '" data-item-type="', type,
            '" data-item-id="', item.id,
            creationtime ? '" data-creationtime="' + creationtime + '"' : '',
            '">',
            '</i>'
        ].join('');
        var $item = $(html).appendTo($container);
        if ($item.is('.running')) {
            var $avail = $item.closest('.execution-box').find('.available .asset.icon.'+item.id);
            if ($avail.length) $avail.hide();
        }
    }

    function startEngine() {
        var asset = $assetViewer.data('asset');
        if (asset.itemType == 'action') {
            startAction(asset);
        }
        else if (asset.itemType == 'tech') {
            startTech(asset);
        }
    }

    function startAction(action) {
        var missingRequirements = [];
        //Check technologies
        if (action.technologies.length) {
            var missingTechs = [];
            $.each(action.technologies, function(i, it) {
                if (!gameState.technologies.running.find(findById(it))) {
                    var tech = setup.techs.find(findById(it));
                    missingTechs.push(tech.name);
                }
            });
            if (missingTechs.length) {
                var suffix = missingTechs.length == 1 ? 'la siguiente tecnología: ' : 'las siguientes tecnologías: ';
                missingRequirements.push('Para ejecutar está política debe estar ejecutando ' + suffix + missingTechs.join(', '));
            }
        }
        //Check files
        if (action.files.length) {
            var missingFiles = [];
            $.each(action.files, function(i, it) {
                if (!gameState.files.find(findById(it))) {
                    var file = setup.files.find(findById(it));
                    missingFiles.push(file.name);
                }
            });
            if (missingFiles.length) {
                var suffix = missingFiles.length == 1 ? 'el siguiente archivo es requerido: ' : 'los siguientes archivos son requeridos: ';
                missingRequirements.push('Para ejecutar está política ' + suffix + missingFiles.join(', '));
            }
        }
        //Check resources
        var oftype = { human: 'de personal', physical: 'de infraestructura', energy: 'energéticos' };
        $.each(action.resources, function(i, it) {
            var data = $(['.',it.type, '-resources-box .display'].join('')).data();
            if (data && data.value < it.value) {
                missingRequirements.push(['No cuenta con los recursos ', oftype[it.type], ' necesarios para ejecutar está política.'].join(''));
            }
        });

        if (missingRequirements.length) {
            showMsg(INFO, '<p>' + missingRequirements.join('</p><p>') + '</p>');
            return;
        }

        var msg = {
            action: actions.PLAYACTION,
            data: { id: action.id }
        };
        socketSendMsg(msg);
        $assetViewer.dialog('close');
    }

    function startTech(tech) {
        var missingRequirements = [];
        //Check files
        if (tech.files.in && tech.files.in.length) {
            var missingFiles = [];
            $.each(tech.files.in, function(i, it) {
                if (!gameState.files.find(findById(it))) {
                    var file = setup.files.find(findById(it));
                    missingFiles.push(file.name);
                }
            });
            if (missingFiles.length) {
                var suffix = missingFiles.length == 1 ? 'el siguiente archivo es requerido: ' : 'los siguientes archivos son requeridos: ';
                missingRequirements.push('Para ejecutar está tecnología ' + suffix + missingFiles.join(', '));
            }
        }
        //Check resources
        var oftype = { capacity: 'capacidad de ejecución' };
        $.each(tech.resources, function(i, it) {
            var data = $(['.',it.type, '-resources-box .display'].join('')).data();
            if (data && data.value < it.value) {
                missingRequirements.push(['No cuenta con la ', oftype[it.type], ' necesaria para ejecutar está tecnología.'].join(''));
            }
        });

        if (missingRequirements.length) {
            showMsg(INFO, '<p>' + missingRequirements.join('</p><p>') + '</p>');
            return;
        }

        var msg = {
            action: actions.PLAYTECHNOLOGY,
            data: { id: tech.id }
        };
        console.log('running tech');
        socketSendMsg(msg);
        $assetViewer.dialog('close');
    }

    function stopEngine() {
        var asset = $assetViewer.data('asset');
        var stopFn;
        var confirmation;
        if (asset.itemType == 'action') {
            stopFn = stopAction;
            confirmation = 'Esta seguro?'
        }
        else if (asset.itemType == 'tech') {
            stopFn = stopTech;
            confirmation = 'Esta seguro?'
        }
        
        confirmDlg(confirmation).then(function() {
            stopFn.apply(null, [asset]);
        });
    }

    function stopAction(action) {
        var msg = {
            action: actions.STOPACTION,
            data: { id: action.id }
        };
        //Show message?
        socketSendMsg(msg);
        $assetViewer.dialog('close');
    }

    function stopTech(tech) {
        var canStop = true;
        var dependenciesRunning = [];
        $.each(gameState.technologies.running, function(i, it) {
            if (it.technologies.findIndex(function(it1) { return it1 == tech.id; }) >= 0) {
                var tech = setup.techs.find(findById(tech.id));
                dependenciesRunning.push(tech.name);
            }
        });

        if (dependenciesRunning.length) {
            var suffix = missingTechs.length == 1 ? 'la siguiente política: ' : 'las siguientes políticas: ';
            var msg = 'Para poder detener está tecnología es necesario detener ' + suffix + dependenciesRunning.join(', ');
            showMsg(INFO, msg);
            return;
        }

        //Confirm????

        var msg = {
            action: actions.STOPTECHNOLOGY,
            data: { id: tech.id }
        };
        socketSendMsg(msg);
        //Show message?
        $assetViewer.dialog('close'); //Close???
    }

    function openAssetViewer($event) {
        var $asset = $($event.target)
        var assetView = $asset.data();
        var source = setup[assetView.itemType+'s'];
        if (!source) return;
        var asset = source.find(findById(assetView.itemId));
        if (!asset) return;
        asset = $.extend({}, asset, assetView);

        var isFile = assetView.itemType == 'file';
        var isRunning = $asset.is('.running');
        var isMine = false;
        var $icon = $assetViewer.find('.header .icon');
        $icon.removeClass().addClass('icon ' + asset.id);

        if (isRunning) {
            isMine = $asset.closest('.execution-box').find('.available .asset.icon.'+assetView.itemId).length > 0;
        }

        $assetViewer.find('.header .title').html(asset.name);
        $assetViewer.find('.description').html(asset.description);
        //$assetViewer.find('.btn').hide();
        $assetViewer.find('.header .btn').hide();
        if (!isFile) {
            $assetViewer.find('.header .btn.execute').toggle(!isRunning);
            $assetViewer.find('.header .btn.stop').toggle(isRunning && isMine);
        }

        var $techdetails = $assetViewer.find('.technical-details .details').empty();
        var infoFunctions = {
            tech: techAssetInfo,
            action: actionAssetInfo,
            file: fileAssetInfo
        };
        var assetInfoFn = infoFunctions[assetView.itemType];
        var details = assetInfoFn && assetInfoFn.apply(null, [asset]);
        $techdetails.append(details);

        var width = $gameBoard.width() * 0.9;
        var height = $gameBoard.parent().height() * 0.9;
        $assetViewer.dialog('option', {
            width: width,
            height: height,
            title: assetTypeLabels[assetView.itemType],
            position: { my: 'center', at: 'center', of: '.gamezone-container' }
        })
        $assetViewer.data('asset', asset);
        $assetViewer.dialog('open');
    }

    function parseFileParams(params) {
        var files = $.map(params, function (it, i) {
            var file = setup.files.find(findById(it));
            return file ? file.name : '';
        });
        return files.join(', ');
    }

    function techAssetInfo(asset) {
        var infoTpl = $('#tech-card').html();
        $.each(asset.resources, function(i, it) {
            infoTpl = infoTpl.replace('{'+it.type+'}', it.value + ' %');
        });

        infoTpl = infoTpl.replace('{endmode}', asset.endmode == 'manual' ? 'Manual' : 'Automática');
        infoTpl = infoTpl.replace('{duration}', [asset.endtime || 0, ' Semana', asset.endtime == 1 ? '' : 's'].join(''));

        var infiles = $.map(asset.files.in || [], function(it, i) {
            var file = setup.files.find(findById(it));
            return file.name;
        }).join(', ');

        var outfiles = $.map(asset.files.out || [], function(it, i) {
            var file = setup.files.find(findById(it));
            return file.name;
        }).join(', ');

        infoTpl = infoTpl.replace('{infiles}', infiles);
        infoTpl = infoTpl.replace('{outfiles}', outfiles);
        return infoTpl;
    }

    function fileAssetInfo(asset) {
        var infoTpl = $('#file-card').html();
        infoTpl = infoTpl.replace('{creationtime}', toDateTime(asset.creationtime));
        infoTpl = infoTpl.replace('{type}', asset.type);
        return infoTpl;
    }

    function actionAssetInfo(asset) {
        var infoTpl = $('#action-card').html();
        $.each(asset.resources, function(i, it) {
            infoTpl = infoTpl.replace('{'+it.type+'}', it.value + ' %');
        });

        infoTpl = infoTpl.replace('{endmode}', asset.endmode == 'manual' ? 'Manual' : 'Automática');
        infoTpl = infoTpl.replace('{duration}', [asset.endtime || 0, ' Semana', asset.endtime == 1 ? '' : 's'].join(''));
        $.each(asset.zones, function(i, it) {
            infoTpl = infoTpl.replace('{zone_'+i+'}', it + ' %');
        });

        var techs = $.map(asset.technologies, function(it, i) {
            var tech = setup.techs.find(findById(it));
            return ['<i class="icon ', it, '" title="', tech.name, '"></i>'].join('');
        });

        var files = $.map(asset.files, function(it, i) {
            var file = setup.files.find(findById(it));
            return ['<i class="icon ', file.id, '" title="', file.name, '"></i>'].join('');
        });

        infoTpl = infoTpl.replace('{techs}', techs);
        infoTpl = infoTpl.replace('{files}', files);
        return infoTpl;
    }

    function findById(id) {
        return function(it) { return it.id == id; };
    }

    function startGame() {
        var msg = {
            action: actions.GAMESTART,
            data: { level: 0 }
        };
        socketSendMsg(msg);
    }

    function showClock() {
        var elapsedTime = new Date(1970, 0, 1, 0, 2, 0).getTime() / 1000;
        var clock = new Countdown(onCountDownComplete);
        var $clock = $('.clock-box').show();
        clock.init($clock.find('.clock').get(0), new Date(elapsedTime * 1000));
        clock.init($clock.find('.clock').get(1), new Date(elapsedTime * 1000));
    }

    function onCountDownComplete() {
        //$('.clock-box').hide();
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

    function btnGoToHomeOnClick(event) {
        loadHome();
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
        $gameHome = $('.game-home');
        $gameHistory = $('.game-history');
        $gameBoard = $('.game-board');
        $gameCnr = $('.game-container');
        $chatCnr = $(".chat-container");
        $chatHist = $(".chat-history");

        //bind event handlers
        $('.btn.send').on('click', btnSendOnClick);
        $('.chat-input').keydown(chatInputOnEnter);
        /*
        $('#gotohome').on('click', btnGoToHomeOnClick);*/
        $gameBoard.on('click', '.asset', openAssetViewer);
        $gameCnr.on('click', '.btn.execute', startEngine);
        $gameCnr.on('click', '.btn.stop', stopEngine);
        $chatHist.on('scroll', onChatHistScroll);

        //register for scorm
        /*
        scorm_id_prefix = $gameCnr.data().actId || 'game-pandemia';
        if (app.scorm) {
            $.each(cases, function(i, it) {
                var scorm_id = `${scorm_id_prefix}-${it}`;
                if (!app.scorm.activities[scorm_id]) { app.scorm.activities[scorm_id] = []; }
            });
        }
        */
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
            roles["master"] = 'Máster';
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
            classes: {
                "ui-dialog": "game-message-dialog"
            },
            close: function() {
                $dlg.dialog('destroy').remove();
            },
            position: { my: 'center', at: 'center', of: '.gamezone-container' }
        });
    }

    function confirmDlg(msg) {
        var title = "Confirmación";
        var $dlg = $(`<div title="${title}"></div>`).html(msg);
        var deferred = $.Deferred();
        $dlg.dialog({
            modal: true,
            autoOpen: true,
            classes: {
                "ui-dialog": "game-message-dialog"
            },
            buttons: {
                "Aceptar": function() {
                    deferred.resolve();
                    $dlg.dialog('close');
                },
                "Cancelar": function() {
                    deferred.reject();
                    $dlg.dialog('close');
                }
            },
            close: function() {
                $dlg.dialog('destroy').remove();
            },
            position: { my: 'center', at: 'center', of: '.gamezone-container' }
        });
        return deferred.promise();
    }

    function hideAll() {
        $(".game-board, .game-home").hide();
    }

    function getTotalPoints() {
        var progress = 0;
        /*
        if (currentServerPoints || currentServerPoints === 0) {
            progress = currentServerPoints;
        }
        else if (app.scorm && app.scorm.lms) {
            progress = app.scorm.getProgress() * 3;
        }
        else {
            progress = Math.min(300, currentCase.ordinal * 100);
        }
        */
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
        });
        loadSetup();

        $assetViewer = $('.asset-viewer').dialog({
            modal: true,
            autoOpen: false,
            title: '',
            appendTo: '.gamezone-container',
            dialogClass: 'asset-viewer-dialog'
        });
    });

})(dhbgApp);


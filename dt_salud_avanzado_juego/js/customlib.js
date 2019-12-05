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
        GAMESTATE: 'gamestate',
        PLAYERCONNECTED: 'playerconnected',
        PLAYERDISCONNECTED: 'playerdisconnected',
        ACTIONCOMPLETED: 'cron_actioncompleted',
        TECHNOLOGYCOMPLETED: 'cron_technologycompleted',
        HEALTHUPDATE: 'cron_healthupdate',
        LAPSECHANGED: 'cron_lapsechanged',
        AUTOGAMEOVER: 'cron_autogameover',
        GAMEOVER: 'p_gameover',
        GAMESTART: 'p_gamestart',
        CHANGETIMEFRAME: 'p_changetimeframe',
        PLAYACTION: 'p_playaction',
        STOPACTION: 'p_stopaction',
        PLAYTECHNOLOGY: 'p_playtechnology',
        STOPTECHNOLOGY: 'p_stoptechnology'
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
    var $levelSelector;
    var playedcards = [];
    var actionHandlers = {};
    var scorm_id_prefix;
    var serverTime;
    var currentServerPoints = null;
    var canOpenCase;
    var gameState;
    var setup = { actions: [], techs: [], files: [] };
    var $assetViewer;
    var zones = ['África', 'América del Norte', 'Asia', 'Europa', 'Oceanía', 'América del Sur'];
    var assetTypeLabels = { action: 'Acción', 'tech': 'Tecnología', 'file': 'Archivo' };
    var gameOverReason = '';
    var gameOverLapse;
    var clock;
    var countdown;
    var countdownInterval;
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

    function toDateTime(timestamp, options) {
        options = options || {};
        var date = new Date(timestamp * 1000),
            year = date.getFullYear(),
            month = padNumber(date.getMonth()+1),
            day = padNumber(date.getDate()),
            hours = padNumber(date.getHours()),
            minutes = padNumber(date.getMinutes()),
            seconds = padNumber(date.getSeconds());
        var segments = [year, '-', month, '-', day, ' ', hours, ':', minutes];

        if (!(options.seconds === false)) {
            segments.push(':', seconds);
        }

        return segments.join('');
    }

    function toDate(timestamp, options) {
        return toDateTime(timestamp, options).substring(0, 10);
    }

    function getAuthUrl() {

        if (MODEDEBUG) {
            return getAuthUrlFake();
        }

        var manifestId = $('body').data().manifestId || '';
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

        return "content/json/fakeauth_"+(vars['id']||'2')+".json";
        //ToDo: implement prepare auth url string.
    }

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
            setup.techs = rtechs[0] || [];
            setup.actions = ractions[0] || [];
            setup.files = rfiles[0] || [];
        }).fail(function(err1, err2, err3) {
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
            if (dhbgApp.socketLog) {
                console.log(msg);
            }
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
        gameOverReason = '';
        gameOverLapse = undefined;
        $(".game-entry .btn").off('click');

        closeDialog($levelSelector);
        socketSendMsg({ action: actions.GAMESTATE });
    }

    function onGameState(msg) {
        var data = msg.data;
        gameState = data;
        serverTime = data.currenttime;

        //setInterval(updateClock, 1000);
        //Set user info
        $.each(data.team, function (i, it) { //ToDo: process the team as required
            if (it.id == sessionData.userid) {
                sessionData.user = it;
            }
        });

        //Load game history
        activeGame = null;
        loadGameHistory(data.games);

        if (gameOverReason != '') {
            closeDialog($assetViewer);
            closeDialog($levelSelector);
            onGameFinished();
            gameOverReason = '';
            return;
        }

        if (activeGame && activeGame.state == 'active') {
            loadGameBoard();
            updateLifetime(data.health.lifetime);
            //showClock();
        }
        else {
            loadHome();
        }
        $gameCnr.removeClass('loading');
    }

    function closeDialog($dialog) {
        if ($dialog.dialog('isOpen')) {
            $dialog.dialog('close');
        }
    }

    function onChangeTimeFrame(msg) {
        gameState.timeframe = msg.data.timeframe;
        updateBtnTimeframeLabel();
        updateDuedate(msg.data.duedate);
        gameState.health.lifetime = msg.data.lifetime;
        //initializeCountdown();
        updateLifetime(msg.data.lifetime);
        //clock.refresh();
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

        $gameBoard.find('.healthy-box .display').html(msg.data.score + '%');
        updateCurrentLapse(gameState.currentlapse);
        gameState.updatelapses = gameState.currentlapse - gameState.lastmeasured;
        updateHealthNotice();
        updateLifetime(msg.data.lifetime);
    }

    function onAutoGameOver(msg) {
        onGameOver(msg);
    }

    function onGameOver(msg) {
        gameOverReason = msg.data.reason;
        gameOverLapse = msg.data.endlapse;
        loading = true;
        socketSendMsg({ action: actions.GAMESTATE });
    }

    function onPlayerConnected(msg) {
    }

    function onPlayerDisconnected(msg) {
    }

    function onGameFinished() {
        var weight = (gameOverReason == 'passed') ? 100 : 70;
        var state = {
            level: gameState.level,
            starttime: gameState.starttime,
            score: gameState.health.general,
            duedate: gameState.duedate,
            endlapse: gameOverLapse || gameState.currentlapse,
            timeelapsed: gameState.timeelapsed
        };

        loading = false;
        var feedback = $('#feedback-game' + gameOverReason).html();
        feedback = feedback.replace('{timelapse}', state.endlapse);

        // Report to scorm.
        if (app.scorm) {
            app.scorm.activityAttempt(scorm_id_prefix, weight, null, JSON.stringify(state));
        }

        showMsg(INFO, feedback, 600).then(function() {
            hideAll();
            loadHome();
        });
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
            if (it.state == 'locked') {
                if (!activeGame) {
                    $('.btn.level').off('click').on('click', startGame);
                    activeGame = it;
                }
                else {
                    $entry.find('.btn.locked').css('visibility', 'hidden');
                }
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
                '<div class="zone zone_'+i+'">',
                '<span class="progress">', 0, '%</span>',
                '</div></div>'
                ].join('')
            ));
        });
        updateHealth(gameState.health);
        updateCurrentLapse(gameState.currentlapse);
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
        //Update duedate
        updateDuedate(gameState.duedate);
        updateBtnTimeframeLabel();
        $gameBoard.toggle(true);
    }

    function updateDuedate(duedate) {
        $gameBoard.find('.toolbar .duedate').html(toDateTime(duedate, { seconds: false }));
    }

    function updateCurrentLapse(lapse) {
        $gameBoard.find('.current-week span').html(lapse);
    }

    function updateLifetime(lifetime) {
        var period = gameState.timelapse / Math.pow(2, gameState.timeframe - 1);
        var weeks = Math.floor(lifetime / period, 0);
        var label = ' día' + (weeks == 1 ? '' : 's');
        $gameBoard.find('.lifetime-week span').html(weeks + label);
    }

    function updateBtnTimeframeLabel() {
        $gameBoard.find('.toolbar .btn.timeframe label').html(gameState.timeframe == 1 ? 'Acelerar' : 'Desacelerar');
    }

    function updateHealth(health) {
        if ('details' in health) {
            $.each(health.details, function(i, it) {
                var $zone = $gameBoard.find('.zone_' + i);
                var percentage = ((100 - it.value) / 100) + '';
                $zone.css('filter', 'sepia(' + percentage.substring(0,4) + ')');
                $zone.find('.progress').html(it.value + '%');
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

        if ('lifetime' in health) {
            updateLifetime(health.lifetime);
        }

    }

    function updateHealthNotice() {
        //lastmeasured: timestamp
        var week = (gameState.updatelapses == 0) ? 'justo ahora' :
            (gameState.updatelapses == 1) ? ' hace un día' : 'hace ' + gameState.updatelapses + ' días';
        var $notice = $('.health-update-notice span').html('Actualizado por última vez ' + week).removeClass('warning');

        if (gameState.updatelapses > 2) {
            $notice.addClass('warning');
        }

        var weeks = gameState.lapses - gameState.currentlapse;
        var text = weeks == 1 ? ' un día ' : weeks + ' días';

        //$(".clock-display").html()
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
        if (type == 'file') {
            collection.splice(0, 0, { id: "help", creationtime: "" });
        }
        $.each(collection, function (i, it) {
            var creationtime = type == 'file' ? it.creationtime : it.starttime;
            var id = typeof(it) == 'object' ? it.id : it;
            appendCollectionItem($container, id, type, store, className, creationtime);
        });
    }

    function appendCollectionItem($container, id, type, store, className, creationtime) {
        var isHelp = type == 'file' && id == 'help';
        var item = isHelp ? { id: 'help', name: 'Ayuda' } : store.find(findById(id));

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

        if (isHelp) {
            $item.addClass('f19 wf-content-controler').attr('data-content', '#full-instructions');
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
            var hasOneTech = false;
            $.each(action.technologies, function(i, it) {
                if (!gameState.technologies.running.find(findById(it))) {
                    var tech = setup.techs.find(findById(it));
                    missingTechs.push(tech.name);
                } else {
                    hasOneTech = true;
                }
            });

            if (!hasOneTech) {
                var suffix = missingTechs.length == 1 ? 'la siguiente tecnología: ' : 'una de las siguientes tecnologías: ';
                missingRequirements.push('Para ejecutar esta acción debe estar ejecutando ' + suffix + missingTechs.join(', ') + '.');
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
                missingRequirements.push('Para ejecutar esta acción ' + suffix + missingFiles.join(', '));
            }
        }
        //Check resources
        var oftype = { human: 'de personal', physical: 'de infraestructura', energy: 'energéticos' };
        $.each(action.resources, function(i, it) {
            var data = $(['.',it.type, '-resources-box .display'].join('')).data();
            if (data && data.value < it.value) {
                missingRequirements.push(['No cuenta con los recursos ', oftype[it.type], ' necesarios para ejecutar esta acción.'].join(''));
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
        socketSendMsg(msg);
        $assetViewer.dialog('close');
    }

    function stopEngine() {
        var asset = $assetViewer.data('asset');
        var stopFn;
        var confirmation;
        if (asset.itemType == 'action') {
            stopFn = stopAction;
            confirmation = 'Al detener una acción se dejarán de generar los recursos correspondientes, pero se liberará el personal, infraestructura y energía requerida para su ejecución. ¿Desea continuar?'
        }
        else if (asset.itemType == 'tech') {
            stopFn = stopTech;
            confirmation = 'Al detener la tecnología se liberarán los recursos de ejecución de la misma, pero las acciones que dependen de ella no se pueden ejecutar. ¿Desea continuar?'
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
            var suffix = missingTechs.length == 1 ? 'la siguiente acción: ' : 'las siguientes acciones: ';
            var msg = 'Para poder detener está tecnología es necesario detener ' + suffix + dependenciesRunning.join(', ');
            showMsg(INFO, msg);
            return;
        }

        var msg = {
            action: actions.STOPTECHNOLOGY,
            data: { id: tech.id }
        };
        socketSendMsg(msg);
        //Show message?
        $assetViewer.dialog('close'); //Close???
    }

    function changeTimeframe () {
        var confirmation = '¿Está seguro que desea cambiar la velocidad del juego?';
        confirmDlg(confirmation).then(function() {
            changeTimeframeFn();
        });
    }

    function changeTimeframeFn() {
        var msg = {
            action: actions.CHANGETIMEFRAME,
            data: { timeframe: gameState.timeframe == 1 ? 5 : 1 }
        };
        socketSendMsg(msg);
        $('.toolbar .button-group .btn').attr('disabled', true);
        setTimeout(function() {
            $('.toolbar .button-group .btn').removeAttr('disabled');
        }, 5000);
    }

    function endGame() {
        var confirmation = 'Ya que ha decidido finalizar la partida, se hará una proyección con base en el estado actual del juego para determinar el resultado del mismo. ¿Desea continuar con la finalización?';
        confirmDlg(confirmation).then(function() {
            stopGame();
        });
    }

    function stopGame() {
        var msg = { action: actions.GAMEOVER };
        socketSendMsg(msg);
    }

    function openAssetViewer($event) {
        var $asset = $($event.target)
        var assetView = $asset.data();

        if (assetView.itemId == 'help' && assetView.type == 'file') {
            return;
        }

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

            if ('creationtime' in assetView) {
                var week = Math.floor(assetView.creationtime / gameState.timelapse, 0);
                $assetViewer.find('.header .btn.stop').find('span').html(week);
            }
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
            infoTpl = infoTpl.replace('{'+it.type+'}', it.value + '%');
        });

        infoTpl = infoTpl.replace('{endmode}', asset.endmode == 'manual' ? 'Manual' : 'Automática');

        if (!asset.endtime || asset.endtime == "0") {
            infoTpl = infoTpl.replace('{duration}', 'Mientras se ejecuta');
        }
        else {
            infoTpl = infoTpl.replace('{duration}', [asset.endtime || 0, ' día', asset.endtime == 1 ? '' : 's'].join(''));
        }

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

        if (!asset.endtime || asset.endtime == "0") {
            infoTpl = infoTpl.replace('{duration}', 'Siguiente día');
        }
        else {
            infoTpl = infoTpl.replace('{duration}', [asset.endtime || 0, ' día', asset.endtime == 1 ? '' : 's'].join(''));
        }

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

    function startGame(event) {
        var level = $(event.target).data().level;

        var msg = {
            action: actions.GAMESTART,
            data: { level: level }
        };
        $levelSelector.dialog('close');
        socketSendMsg(msg);
    }

    function initializeCountdown() {

        var period = gameState.timelapse / Math.pow(2, gameState.timeframe - 1);
        var weeks = Math.floor(gameState.health.lifetime / period, 0);
        var days = Math.floor((gameState.health.lifetime % period) * 7 / period);
        if (days < 6) {
            days++;
        }
        else {
            days = 0;
            weeks++;
        }
        countdown = {
            hours: 0,
            minutes: weeks,
            seconds: days //Math.floor(days * 7 / period)
        };
    }

    function showClock() {
        initializeCountdown();
        clock = new Countdown({
            onComplete: onCountDownComplete,
            separator: '&nbsp;',
            showLabels: true,
            labels: {
                minutes: 'Días',
                seconds: 'Horas'
            },
            timer: createCountdownTimer
        });
        var $clock = $('.clock-box').show();
        clock.init($clock.find('.clock').get(0), new Date());
    }

    function onCountDownComplete() {
    }

    function createCountdownTimer(updateDisplay) {
        if (countdownInterval) {
            clearInterval(countdownInterval);
        }
        updateDisplay(countdown);
        var period = gameState.timelapse / Math.pow(2, gameState.timeframe - 1);
        updateCountdown(updateDisplay);
        countdownInterval = setInterval(function() {
            updateCountdown(updateDisplay);
        }, 1000 * period / 7);
    }

    function updateCountdown(updateDisplay) {
        var minute = countdown.minutes;
        var seconds = countdown.seconds;
        if (seconds == 0) {
            seconds = 6;
            minute--;
        }
        else {
            seconds--;
        }
        countdown.minutes = minute;
        countdown.seconds = seconds;
        updateDisplay(countdown);
        if (minute == 0) {
            clearInterval(countdownInterval);
        }
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
        $levelSelector = $('#game-level-selector');

        //bind event handlers
        $('.btn.send').on('click', btnSendOnClick);
        $('.chat-input').keydown(chatInputOnEnter);
        /*
        $('#gotohome').on('click', btnGoToHomeOnClick);*/
        $gameBoard.on('click', '.asset', openAssetViewer);
        $gameCnr.on('click', '.btn.execute', startEngine);
        $gameCnr.on('click', '.btn.stop', stopEngine);
        $gameCnr.on('click', '.btn.timeframe', changeTimeframe);
        $gameCnr.on('click', '.btn.endgame', endGame);
        $chatHist.on('scroll', onChatHistScroll);

        //register for scorm
        scorm_id_prefix = $gameCnr.data().actId || 'game-pandemia';

        if (app.scorm) {
            if (!app.scorm.activities[scorm_id_prefix]) { app.scorm.activities[scorm_id_prefix] = []; }
        }

        if (sessionData.userpicture) {
            $(`<img src="${sessionData.userpicture}" alt="" />`).appendTo($chatCnr.find('.chat-header .avatar'));
        }
        //request game state
        socketSendMsg({ action: actions.GAMESTATE });
        loadChatHistory();
    }

    function showMsg(type, msg) {
        var title = type == ERROR ? "Error" : "Información";
        var $dlg = $(`<div title="${title}"></div>`).html(msg);
        var deferred = $.Deferred();
        $dlg.dialog({
            modal: true,
            autoOpen: true,
            classes: {
                "ui-dialog": "game-message-dialog"
            },
            close: function() {
                deferred.resolve();
                $dlg.dialog('destroy').remove();
            },
            position: { my: 'center', at: 'center', of: '.gamezone-container' }
        });
        return deferred.promise();
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

    /**
     * Create scorm hook getActivityWeight
     */
    /*app.scorm.getActivityWeight = function (activity_id) {
        return 100 / 3;
    }*/

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

    dhbgApp.socketSendMsg = socketSendMsg;

})(dhbgApp);

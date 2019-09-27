/**
 * Custom library to add custom functionality to activities in this learning object.
 *
 * @author: Jesus Otero
 */
(function(app) {
    var conn = new WebSocket('ws://localhost:8080');
    var connected = false;
    var usr = new Date().getTime();


    /**
     * Handler to when a websocket connection has been acquired.
     * @param {jQuery object} $el Selection activity container for the Camea 40 questionaire.
     * @param {object} e Activity results.
     */
    conn.onopen = function(e) {
        console.log("Connection established!");
        console.log(e);
        connected = true;
    };

    /**
     * To calculate 1-camea results.
     * @param {jQuery object} $el Selection activity container for the Camea 40 questionaire.
     * @param {object} $result Activity results.
     */
    function calculateCameaResults($el, result) {
    }



    conn.onmessage = function(e) {
        console.log(e.data);
        var msg = JSON.parse(e.data);
        addMsgLog(msg);
    };

    function sendMsg() {
        if (!connected) return;
        var text = $('.chat-input').html();        
        if (text == '') return;

        var msg = {
            action: 'chat',
            from: usr,
            data: text
        };

        conn.send(JSON.stringify(msg));
        addMsgLog(msg, 'me');
        $('.chat-input').empty();
    }

    function addMsgLog(message) {
        var $mess = $('<li class="message"></li>'),
            $text = $('<p></p>').html(message.data),
            $avatar = $('<div class="avatar"></div>');
        $mess.append($avatar).append($text)
            .appendTo($('.chat-history'));

        if (message.from == usr) {
            $mess.addClass('sent');
        }

        $mess.get(0).scrollIntoView();
    }

    function btnSendOnClick(event) {
        sendMsg();        
    }

    function chatInputOnEnter(event) {
        if (event.keyCode === 13) {
            setTimeout(sendMsg, 0);
            return false;
        }
    }
    /**
     * To handle when an activity has been rendered. It will hide verify button on 1-camea form.
     * @param {event} event
     * @param {JQuery object} $el
     * @param {object} args
     */
    function initialize() {

        $('.btn.send').on('click', btnSendOnClick);

        $('.chat-input').keydown(chatInputOnEnter);
    }
    
    $(document).ready(function() {
        initialize();
    })

})(dhbgApp);

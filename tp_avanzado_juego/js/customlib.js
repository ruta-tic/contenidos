/**
 * Custom library to add custom functionality to activities in this learning object.
 *
 * @author: Jesus Otero
 */
(function(app) {
    //var conn = new WebSocket('ws://rutatic.udea.edu.co:8080');
    var conn = new WebSocket('ws://localhost:8080');
    var connected = false;
    var usr = new Date().getTime();
    var cases = ['john', 'natalia', 'hermes', 'santiago', 'nairobi'];
    var role = 'media';
    var currentCase = 0;
    var playDeck;
    var deckViewer;


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

    function setCaseNumber($el) {
        var text = '0'+currentCase;
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

    function loadCase() {
        var name = cases[currentCase++];
        loadInstructionsFor('#case-'+name, setCaseNumber);

        //prepare play deck
        var $deck = $("#play-deck");

        if (!playDeck) {
            playDeck = makeSwippable($deck.get(0));
        }

        playDeck.removeAllSlides();
        var selector = ".dropzone[data-target-group='case-"+name+"']";
        $(selector).each(function(i, it) {
            //console.log($it.html());
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
        }

        deckViewer.removeAllSlides();

        selector = ".card."+role;
        if (role == 'master') {
            selector += "[data-group='case-"+name+"']";
        }

        $(selector).each(function(i, it) {
            deckViewer.appendSlide(it.outerHTML);
            deckViewer.update();
        });
        /*if (currentCase < 5)
            setTimeout(loadCase, 5000);*/
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

    /**
     * To handle when an activity has been rendered. It will hide verify button on 1-camea form.
     * @param {event} event
     * @param {JQuery object} $el
     * @param {object} args
     */
    function initialize() {

        //bind event handlers
        $('.btn.send').on('click', btnSendOnClick);
        $('.chat-input').keydown(chatInputOnEnter);

        //If, it is first time, shuffle cases, perhaps this should change to choose a case randomly when the current case is completed
        shuffle(cases);


        //load current state
        loadInstructionsFor('#instructions');

        //Load a case
        loadCase();
    }
    
    $(document).ready(function() {
        initialize();
    })

})(dhbgApp);

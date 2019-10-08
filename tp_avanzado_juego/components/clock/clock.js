(function(app){
    function Countdown(onComplete, showHours) {
        var _element;
        var _updater;
        var _timeLeft;
        var _showHours = showHours === true;
        var _onComplete = onComplete;

        function createDigit(extraClass) {
            var digit = document.createElement('div');
            for(var i = 0; i < 7; i++) {
                var led = document.createElement('div');
                led.classList.add('led', 'led_'+i);
                digit.append(led);
            }
            digit.classList.add(...['digit', extraClass]);
            return digit;
        }

        function createDisplay() {
            var display = document.createElement('div');
            display.classList.add("display");
            if (_showHours) {
                //Hours
                var el = document.createElement('div');
                el.classList.add("number", "hours");
                el.append(createDigit('digit_0'));
                el.append(createDigit('digit_1'));
                display.append(el);
                //Colon
                el = document.createElement('span');
                el.classList.add("colon", "colon-minutes");
                el.innerHTML = ":";
                display.append(el);
            }
            //Minutes
            el = document.createElement('div');
            el.classList.add("number", "minutes");
            el.append(createDigit('digit_0'));
            el.append(createDigit('digit_1'));
            display.append(el);
            //Seconds
            el = document.createElement('span');
            el.classList.add("colon", "colon-seconds");
            el.innerHTML = ":";
            display.append(el);
            el = document.createElement('div');
            el.classList.add("number", "seconds");
            el.append(createDigit('digit_0'));
            el.append(createDigit('digit_1'));
            display.append(el);
            return display;
        }

        function showNumber(parent, pos, number) {
            var digit = _element.querySelector(parent + " .digit_"+pos);
            var className = 'num_'+number;
            if (digit.classList.contains(className)) return;
            digit.className = '';
            digit.classList.add("digit", "digit_"+pos, className);
        }
        
        function timer() {
            _timeLeft.setSeconds(_timeLeft.getSeconds() - 1);
            if (_timeLeft < 0) {
                _timeLeft = 0;
            }
            var now = new Date(_timeLeft);
            var hours = now.getHours(),
                minutes = now.getMinutes(),
                seconds = now.getSeconds();

            var hoursDigits = ("0" + hours).slice(-2).split(''),
                minutesDigits = ("0" + minutes).slice(-2).split(''),
                secondsDigits = ("0" + seconds).slice(-2).split('');

            for(var i = 0; i < 2; i++) {
                if (_showHours) {
                    showNumber('.hours', i, hoursDigits[i]);
                }
                showNumber('.minutes', i, minutesDigits[i]);
                showNumber('.seconds', i, secondsDigits[i]);
            }

            if (_timeLeft == 0) {
                clearInterval(_updater);
                onComplete && onComplete();
            }
        }

        this.init = function (el, timeLeft) {
            if (el == null || el == undefined || !(el instanceof Node)) return;
            el.innerHTML = ""; //clear the contents
            _element = el;
            var display = createDisplay();
            el.append(display);
            _timeLeft = timeLeft
            _timeLeft.setSeconds(_timeLeft.getSeconds() + 1);
            timer();
            _updater = setInterval(timer, 1000);
        }
    }
    window.Countdown = Countdown;
})(window);
(function(app){
    function Countdown(options) {
        options = options || {};
        var _element;
        var _updater;
        var _timeLeft;
        var _showHours = options.showHours === true;
        var _showMinutes = !(options.showMinutes === false);
        var _onComplete = options.onComplete;
        var _sep = options.separator || ':';
        var _showLabels = options.showLabels === true;
        var _labels = {
            hours: 'Hor',
            minutes: 'Min',
            seconds: 'Seg'
        }

        if (options.labels) _labels = options.labels;

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

        function createDigits(extraClass) {
            var el = document.createElement('div');
            el.append(createDigit('digit_0'));
            el.append(createDigit('digit_1'));
            el.classList.add(...['number', extraClass]);
            return el;
        }

        function createLabel(segment) {
            if (!_showLabels) {
                return;
            }
            var label = document.createElement('label');
            var text = _labels[segment];
            label.append(text);
            return label;
        }

        function createDisplay() {
            var el;
            var display = document.createElement('div');
            display.classList.add("display");
            if (_showHours) {
                //Hours
                el = document.createElement('div');
                el.classList.add("segment");
                if (_showLabels) el.append(createLabel('hours'));
                el.append(createDigits("number", "hours"));
                display.append(el);
                //Colon
                el = document.createElement('span');
                el.classList.add("colon", "colon-minutes");
                el.innerHTML = _sep;
                display.append(el);
            }
            //Minutes
            if (_showMinutes) {
                el = document.createElement('div');
                el.classList.add("segment");
                if (_showLabels) el.append(createLabel('minutes'));
                el.append(createDigits("minutes"));
                display.append(el);
                el = document.createElement('span');
                el.classList.add("colon", "colon-seconds");
                el.innerHTML = _sep;
                display.append(el);
            }
            //Seconds
            el = document.createElement('div');
            el.classList.add("segment");
            if (_showLabels) el.append(createLabel('seconds'));
            el.append(createDigits("seconds"));
            //el.append(createDigit('digit_0'));
            //el.append(createDigit('digit_1'));
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
            var now = new Date(currentTime);
            var countdown = {
                hours: now.getHours(),
                minutes: now.getMinutes(),
                seconds: now.getSeconds()
            };

            updateDisplay(countdown);

            if (_timeLeft == 0) {
                clearInterval(_updater);
                _onComplete && _onComplete();
            }
        }

        function updateDisplay(countdown) {

            var hoursDigits = ("0" + countdown.hours).slice(-2).split(''),
                minutesDigits = ("0" + countdown.minutes).slice(-2).split(''),
                secondsDigits = ("0" + countdown.seconds).slice(-2).split('');

            for(var i = 0; i < 2; i++) {
                if (_showHours) {
                    showNumber('.hours', i, hoursDigits[i]);
                }
                if (_showMinutes) {
                    showNumber('.minutes', i, minutesDigits[i]);
                }
                showNumber('.seconds', i, secondsDigits[i]);
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

            if (options.timer) {
                options.timer(updateDisplay);
            }
            else {
                timer();
                _updater = setInterval(timer, 1000);
            }
        }

        this.refresh = function() {
            if (options.timer) {
                options.timer(updateDisplay);
            }
            else {
                if (_updater) {
                    clearInterval(_updater);
                }
                timer();
                _updater = setInterval(timer, 1000);
            }
        }
    }
    window.Countdown = Countdown;
})(window);
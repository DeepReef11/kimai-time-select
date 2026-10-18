/*
 * Kimai time-select: every time input (input[data-timepicker="on"]) becomes an
 * hour select (00-23) + a minute select (00/15/30/45). The original text input
 * stays in the form, visually hidden, and is what gets submitted: the selects only
 * write to it, in the format Kimai expects (data-format: "HH:mm" or "h:mm A").
 */
(function () {
    'use strict';

    var QUARTERS = [0, 15, 30, 45];

    function pad(n) {
        return (n < 10 ? '0' : '') + n;
    }

    // "14:30", "2:30 PM", "14 h 30" -> {h: 14, m: 30}; anything else -> null
    function parse(value) {
        var match = /^\s*(\d{1,2})\s*[:h]?\s*(\d{2})\s*([ap])?\.?\s*m?\.?\s*$/i.exec(value || '');
        if (match === null) {
            return null;
        }
        var h = parseInt(match[1], 10);
        var m = parseInt(match[2], 10);
        if (match[3]) {
            var pm = match[3].toLowerCase() === 'p';
            h = (h % 12) + (pm ? 12 : 0);
        }
        if (h > 23 || m > 59) {
            return null;
        }
        return {h: h, m: m};
    }

    function format(h, m, twelveHour) {
        if (!twelveHour) {
            return pad(h) + ':' + pad(m);
        }
        return ((h % 12) || 12) + ':' + pad(m) + ' ' + (h < 12 ? 'AM' : 'PM');
    }

    function option(value, label) {
        var o = document.createElement('option');
        o.value = String(value);
        o.textContent = label;
        return o;
    }

    function enhance(input) {
        input.dataset.timeSelect = 'done';
        var twelveHour = /a/i.test(input.dataset.format || '');

        var hour = document.createElement('select');
        hour.className = 'form-select';
        hour.setAttribute('aria-label', 'Hour');
        hour.appendChild(option('', '--'));
        for (var h = 0; h < 24; h++) {
            hour.appendChild(option(h, pad(h)));
        }

        var minute = document.createElement('select');
        minute.className = 'form-select';
        minute.setAttribute('aria-label', 'Minute');
        QUARTERS.forEach(function (m) {
            minute.appendChild(option(m, pad(m)));
        });

        var colon = document.createElement('span');
        colon.className = 'input-group-text px-1';
        colon.textContent = ':';

        hour.required = input.required;
        hour.disabled = minute.disabled = input.disabled || input.readOnly;

        // Selects -> input. Same events as Kimai's own "now" button, so the
        // duration/end-time calculation reacts exactly as it does for typing.
        function write() {
            input.value = hour.value === '' ? '' : format(parseInt(hour.value, 10), parseInt(minute.value, 10), twelveHour);
            input.dispatchEvent(new Event('change', {bubbles: true}));
            input.dispatchEvent(new Event('keyup', {bubbles: true}));
        }

        // Input -> selects (initial value, Kimai's "now" button, form resets).
        // A minute off the quarter grid (e.g. a stopped timer at 14:07) is shown
        // as an extra option instead of being silently rounded.
        function read() {
            var t = parse(input.value);
            [].slice.call(minute.querySelectorAll('[data-extra]')).forEach(function (o) {
                o.remove();
            });
            if (t === null) {
                hour.value = '';
                minute.value = '0';
                return;
            }
            if (QUARTERS.indexOf(t.m) === -1) {
                var extra = option(t.m, pad(t.m));
                extra.dataset.extra = '1';
                var before = [].slice.call(minute.options).filter(function (o) {
                    return parseInt(o.value, 10) > t.m;
                })[0] || null;
                minute.insertBefore(extra, before);
            }
            hour.value = String(t.h);
            minute.value = String(t.m);
        }

        hour.addEventListener('change', function () {
            write();
        });
        minute.addEventListener('change', function () {
            if (hour.value !== '') {
                write();
            }
        });
        input.addEventListener('change', read);

        // Tab goes hour -> minutes -> next field, never into the hidden input.
        input.classList.add('visually-hidden');
        input.tabIndex = -1;
        input.parentNode.insertBefore(hour, input);
        input.parentNode.insertBefore(colon, input);
        input.parentNode.insertBefore(minute, input);

        // The long preset list is what this replaces.
        var group = input.closest('.input-group');
        if (group !== null) {
            [].slice.call(group.querySelectorAll('.btn-duration-preset, .btn-duration-preset + .dropdown-menu')).forEach(function (el) {
                el.style.display = 'none';
            });
        }

        read();
    }

    function scan(root) {
        [].slice.call(root.querySelectorAll('input[data-timepicker="on"]:not([data-time-select])')).forEach(enhance);
    }

    function start() {
        scan(document);
        // Edit forms open in an AJAX-loaded modal.
        var pending = false;
        new MutationObserver(function () {
            if (pending) {
                return;
            }
            pending = true;
            window.requestAnimationFrame(function () {
                pending = false;
                scan(document);
            });
        }).observe(document.body, {childList: true, subtree: true});
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', start);
    } else {
        start();
    }
})();

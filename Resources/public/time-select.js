/*
 * Kimai time-select: every time input (input[data-timepicker="on"]) becomes a
 * type-to-filter box over the day's quarter hours. "9" lists 09:xx first, "930"
 * or "9:30" finds 09:30, "1445" 14:45, "2p" 14:00, and an exact time off the
 * quarter grid ("1407") is offered as-is. The original text input stays in the
 * form, visually hidden, and is what gets submitted: the box only writes to it,
 * in the format Kimai expects (data-format: "HH:mm" or "h:mm A").
 */
(function () {
    'use strict';

    var SLOTS = [];
    for (var s = 0; s < 24 * 4; s++) {
        SLOTS.push({h: Math.floor(s / 4), m: (s % 4) * 15});
    }

    function pad(n) {
        return (n < 10 ? '0' : '') + n;
    }

    function label(t) {
        return pad(t.h) + ':' + pad(t.m);
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

    function format(t, twelveHour) {
        if (!twelveHour) {
            return label(t);
        }
        return ((t.h % 12) || 12) + ':' + pad(t.m) + ' ' + (t.h < 12 ? 'AM' : 'PM');
    }

    function isSubsequence(needle, haystack) {
        var i = 0;
        for (var j = 0; j < haystack.length && i < needle.length; j++) {
            if (haystack[j] === needle[i]) {
                i++;
            }
        }
        return i === needle.length;
    }

    // Typed text -> ordered candidate list. Lower score = better; ties stay chronological.
    function search(query) {
        var q = query.toLowerCase();
        var digits = q.replace(/\D/g, '');
        var meridiem = /p/.test(q) ? 'p' : (/a/.test(q) ? 'a' : null);
        if (digits === '' && meridiem === null) {
            return SLOTS.slice();
        }

        var results = [];
        var seen = {};

        function add(t, score) {
            var key = label(t);
            if (seen[key] === undefined || seen[key].score > score) {
                seen[key] = {t: t, score: score};
            }
        }

        // An exact time, even off the quarter grid: "1407", "9:07", "907p"
        var exact = null;
        if (digits.length >= 3) {
            var h = parseInt(digits.slice(0, digits.length - 2), 10);
            var m = parseInt(digits.slice(-2), 10);
            if (meridiem !== null && h >= 1 && h <= 12) {
                h = (h % 12) + (meridiem === 'p' ? 12 : 0);
            }
            if (h <= 23 && m <= 59) {
                exact = {h: h, m: m};
                add(exact, 0);
            }
        }

        SLOTS.forEach(function (t) {
            if (meridiem === 'p' && t.h < 12) {
                return;
            }
            if (meridiem === 'a' && t.h >= 12) {
                return;
            }
            // With am/pm the user thinks in 12-hour clock, so match against that.
            var hour = meridiem === null ? t.h : ((t.h % 12) || 12);
            var full = pad(hour) + pad(t.m);   // "0930"
            var short = String(hour) + pad(t.m); // "930"
            if (digits === '') {
                add(t, 3);
            } else if (digits.length <= 2 && parseInt(digits, 10) === hour) {
                // "14" -> 14:xx before 01:45 (whose "145" also starts with "14")
                add(t, 1);
            } else if (full.indexOf(digits) === 0 || short.indexOf(digits) === 0) {
                add(t, 2);
            } else if (isSubsequence(digits, full)) {
                add(t, 4);
            }
        });

        Object.keys(seen).forEach(function (key) {
            results.push(seen[key]);
        });
        results.sort(function (a, b) {
            return (a.score - b.score) || ((a.t.h * 60 + a.t.m) - (b.t.h * 60 + b.t.m));
        });
        return results.map(function (r) {
            return r.t;
        });
    }

    function enhance(input) {
        input.dataset.timeSelect = 'done';
        var twelveHour = /a/i.test(input.dataset.format || '');
        var group = input.closest('.input-group') || input.parentNode;

        var box = document.createElement('input');
        box.type = 'text';
        box.className = 'form-control';
        box.placeholder = 'hh:mm';
        box.autocomplete = 'off';
        box.inputMode = 'numeric';
        box.setAttribute('role', 'combobox');
        box.setAttribute('aria-autocomplete', 'list');
        box.setAttribute('aria-expanded', 'false');
        box.required = input.required;
        box.disabled = input.disabled;
        box.readOnly = input.readOnly;

        var list = document.createElement('div');
        list.className = 'dropdown-menu';
        list.setAttribute('role', 'listbox');
        list.style.cssText = 'position:absolute;top:100%;max-height:16rem;overflow-y:auto;min-width:7rem;z-index:1070';

        var matches = [];
        var active = -1;
        var typed = false; // the box text differs from the committed value

        function current() {
            return parse(input.value);
        }

        // input -> box (initial value, Kimai's "now" button, form resets)
        function read() {
            var t = current();
            box.value = t === null ? '' : label(t);
            typed = false;
        }

        // box -> input. Same events as Kimai's own "now" button, so the
        // duration/end-time calculation reacts exactly as it does for typing.
        function commit(t) {
            input.value = t === null ? '' : format(t, twelveHour);
            input.dispatchEvent(new Event('change', {bubbles: true}));
            input.dispatchEvent(new Event('keyup', {bubbles: true}));
            read();
            close();
        }

        function highlight(index) {
            var items = list.children;
            if (active >= 0 && items[active]) {
                items[active].classList.remove('active');
            }
            active = index;
            if (active >= 0 && items[active]) {
                items[active].classList.add('active');
                items[active].scrollIntoView({block: 'nearest'});
            }
        }

        function render(query) {
            matches = search(query);
            list.innerHTML = '';
            matches.forEach(function (t, i) {
                var item = document.createElement('a');
                item.className = 'dropdown-item';
                item.href = '#';
                item.setAttribute('role', 'option');
                item.textContent = label(t);
                // mousedown, not click: keep focus in the box so blur doesn't close the list first
                item.addEventListener('mousedown', function (e) {
                    e.preventDefault();
                    commit(t);
                });
                list.appendChild(item);
            });
            list.style.left = box.offsetLeft + 'px';
            list.classList.toggle('show', matches.length > 0);
            box.setAttribute('aria-expanded', matches.length > 0 ? 'true' : 'false');

            var index = 0;
            if (query === '') {
                // Whole day: start at the current value, or the nearest quarter at or after it
                var t = current();
                if (t !== null) {
                    index = Math.min(Math.ceil((t.h * 60 + t.m) / 15), matches.length - 1);
                }
            }
            active = -1;
            highlight(matches.length > 0 ? index : -1);
        }

        function close() {
            list.classList.remove('show');
            box.setAttribute('aria-expanded', 'false');
            active = -1;
        }

        // Typed but not picked: take the highlighted match; an emptied box clears the time.
        function settle() {
            if (!typed) {
                close();
                return;
            }
            if (box.value.trim() === '') {
                commit(null);
            } else if (active >= 0) {
                commit(matches[active]);
            } else {
                read();
                close();
            }
        }

        box.addEventListener('focus', function () {
            if (box.readOnly || box.disabled) {
                return;
            }
            box.select();
            render('');
        });
        box.addEventListener('input', function () {
            typed = true;
            render(box.value.trim());
        });
        box.addEventListener('keydown', function (e) {
            var open = list.classList.contains('show');
            if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                e.preventDefault();
                if (!open) {
                    render('');
                    return;
                }
                var step = e.key === 'ArrowDown' ? 1 : -1;
                highlight(Math.max(0, Math.min(matches.length - 1, active + step)));
                typed = true;
            } else if (e.key === 'Enter') {
                if (open || typed) {
                    e.preventDefault(); // pick a time, don't submit the form
                    settle();
                }
            } else if (e.key === 'Escape') {
                if (open) {
                    e.preventDefault();
                    e.stopPropagation(); // don't close the modal
                    read();
                    close();
                }
            } else if (e.key === 'Tab') {
                settle(); // and let focus move on
            }
        });
        box.addEventListener('blur', settle);
        input.addEventListener('change', read);

        // Tab goes into the box, then to the next field, never into the hidden input.
        input.classList.add('visually-hidden');
        input.tabIndex = -1;
        input.parentNode.insertBefore(box, input);
        group.style.position = 'relative';
        group.appendChild(list);

        // The long preset list is what this replaces.
        [].slice.call(group.querySelectorAll('.btn-duration-preset, .btn-duration-preset + .dropdown-menu')).forEach(function (el) {
            el.style.display = 'none';
        });

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

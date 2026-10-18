# Kimai Time Select

A [Kimai 2](https://www.kimai.org) plugin that replaces the time inputs (the
start/end times of a timesheet, and every other `data-timepicker` field) with a
type-to-filter box over the day's quarter hours, instead of Kimai's long preset
list where one hour and its AM/PM twin sit a few rows apart.

```
[ clock ] [ 8          ]
          | 08:00  <   |
          | 08:15      |
          | 08:30      |
          | 08:45      |
          | 18:00      |
```

## Typing

| You type        | First match                    |
|-----------------|--------------------------------|
| `9`             | 09:00, 09:15, 09:30, 09:45, then 19:xx |
| `14`            | 14:00 … 14:45 (before 01:45)   |
| `930` or `9:30` | 09:30                          |
| `1445`          | 14:45                          |
| `2p` / `230p`   | 14:00 / 14:30                  |
| `1407`          | 14:07 (exact times off the quarter grid are offered as-is) |
| nothing         | the whole day, starting at the current value |

- **Keys:** ↑/↓ move, **Enter** picks (and does not submit the form),
  **Tab** picks and moves to the next field, **Esc** cancels. Clicking an
  entry works too. Emptying the box clears the time.
- The box shows times as `HH:mm` (24 h) whatever your locale.
- On phones it opens the numeric keypad.

## Behaviour

- Kimai's original text input stays in the form, hidden, and is what gets
  submitted. The box writes to it in the format Kimai expects for your locale
  (`HH:mm`, or `h:mm A` for 12-hour locales), so nothing changes server-side.
- Picking a time fires the same events as Kimai's own "now" button, so
  duration and end time are recalculated as usual.
- The clock ("now") button still works; the box follows it.
- Focusing the box and leaving without typing keeps the existing value, even
  one off the quarter grid (e.g. a timer stopped at 14:07).
- Works in edit forms opened in a modal (watches the page for new inputs).

## Install

```bash
cd /opt/kimai/var/plugins          # your Kimai's var/plugins
git clone https://github.com/DeepReef11/kimai-time-select.git TimeSelectBundle
cd /opt/kimai && bin/console kimai:reload --env=prod
```

The directory **must** be named `TimeSelectBundle`. Check it is loaded with
`bin/console kimai:plugins --env=prod`.

With the official Docker image, `var/plugins` lives in the `var` volume, so the
plugin survives container upgrades; run `kimai:reload` inside the container
(`docker exec -u www-data kimai bin/console kimai:reload --env=prod`).

To uninstall, delete the directory and run `kimai:reload` again.

## Compatibility

Tested on Kimai 2.65.0. It relies on Kimai's time-widget markup
(`input[data-timepicker="on"]`, `.btn-duration-preset`), so check it after a
major Kimai upgrade. If that markup changes, the worst case is that the plugin
finds no inputs and Kimai's own picker stays as it is.

## How it works

`EventSubscriber/ThemeSubscriber.php` inlines
`Resources/public/time-select.js` through Kimai's `ThemeEvent::JAVASCRIPT`
hook. No templates or core files are touched.

## License

MIT

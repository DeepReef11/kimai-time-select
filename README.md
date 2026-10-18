# Kimai Time Select

A [Kimai 2](https://www.kimai.org) plugin that replaces the time inputs (the
start/end times of a timesheet, and every other `data-timepicker` field) with
two dropdowns:

```
[ clock ] [ 09 v ] : [ 00 v ]
```

- **Hour:** `00`–`23`, always, whatever your locale.
- **Minute:** `00` / `15` / `30` / `45`.

It replaces Kimai's long preset list, where one hour and its AM/PM twin sit a
few rows apart and are easy to mix up.

## Behaviour

- Kimai's original text input stays in the form, hidden, and is what gets
  submitted. The dropdowns write to it in the format Kimai expects for your
  locale (`HH:mm`, or `h:mm A` for 12-hour locales), so nothing changes
  server-side.
- Changing a dropdown fires the same events as Kimai's own "now" button, so
  duration and end time are recalculated as usual.
- The clock ("now") button still works; the dropdowns follow it.
- A time that is not on a quarter hour (e.g. a timer stopped at 14:07) shows
  its minute as an extra option instead of being silently rounded.
- Tab goes hour → minute → next field.
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

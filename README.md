# Campsite Watch

Small NAS-friendly campsite availability monitor. It checks configured campground search pages for Friday-to-Sunday stays in a rolling booking window, stores state in SQLite, and sends notifications when availability appears.

## Web Dashboard

The static dashboard lives in `docs/` so it can run directly on GitHub Pages:

```text
https://someguylike.github.io/campsite-watch/
```

It currently uses the latest sample availability pulled through Chrome for parks near `98040`. The next step is wiring it to the Python monitor output so the page updates from scheduled checks.

## Important Limits

`washington.goingtocamp.com` currently returns an Azure WAF captcha to plain command-line HTTP requests. This project does not bypass captcha, rate limits, or payment/checkout controls. Use the browser backend with a persistent profile, solve any manual challenge yourself, and let the service notify you when a page appears to show availability.

Automatic reservation completion is intentionally not implemented. The safer workflow is: monitor, notify, then you open the reservation URL and book manually.

## Quick Start

```bash
cd /Users/nampham/campsite-watch
cp config.example.toml config.toml
python3 -m venv .venv
. .venv/bin/activate
python -m pip install -e '.[browser]'
python -m playwright install chromium
```

Edit `config.toml`:

1. Add an `ntfy_urls`, webhook, or SMTP destination under `[notify]`.
2. Open `https://washington.goingtocamp.com/` in your browser, configure the park/site filters you care about, and paste the resulting URL into `url` or `url_template`.
3. Use `url_template` with `{arrival}` and `{departure}` if the reservation page exposes dates in the URL.
4. Tighten `include_any` and `exclude_any` after looking at the exact text on the page.

Initialize the browser profile if using `backend = "browser"`:

```bash
campsite-watch --config config.toml --init-browser
```

Run one check:

```bash
campsite-watch --config config.toml --once --alert-all-changes
```

Run continuously:

```bash
campsite-watch --config config.toml
```

## Docker / NAS

On a NAS with Docker:

```bash
cd /path/to/campsite-watch
cp config.example.toml config.toml
docker compose up -d --build
```

The compose file stores persistent data in:

- `./data/state.sqlite3` for alert state
- `./browser-profile` for the browser session

For first browser setup in Docker, it is often easier to run the service once on your laptop with the same mounted `browser-profile`, complete the manual login/challenge, then copy that profile directory to the NAS.

## Configuration Notes

The date window is configured per watch:

```toml
date_window = { earliest_months_ahead = 3, latest_months_ahead = 6, stay_nights = 2, arrival_weekdays = [4] }
```

Python weekday numbers are used: Monday is `0`, Friday is `4`, Saturday is `5`.

Notification behavior:

- `available` changes always alert.
- `blocked` and `error` changes alert only when `--alert-all-changes` is set.
- Repeated identical results do not alert again.

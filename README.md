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

## Linux Mint NAS Worker

The GitHub Pages website can point at a NAS worker for fresh checks. On Linux Mint:

Automatic install from a repo checkout:

```bash
cd /path/to/campsite-watch
./scripts/install_linux_mint.sh
```

Or install manually:

```bash
sudo apt update
sudo apt install -y python3 python3-venv
cd /path/to/campsite-watch
python3 -m venv .venv
. .venv/bin/activate
python -m pip install -e '.[browser]'
python -m playwright install --with-deps chromium
```

Start the local API. Keep it bound to localhost; Tailscale Serve will provide tailnet HTTPS. Set a shared NAS password so the public GitHub Pages frontend can query only when a trusted user enters it:

```bash
export CAMPSITE_WATCH_API_PASSWORD="choose-a-private-password"
campsite-watch \
  --serve-api \
  --api-host 127.0.0.1 \
  --api-port 8787 \
  --allowed-origin https://someguylike.github.io
```

Expose it to your tailnet with Tailscale Serve, not Funnel:

```bash
sudo tailscale serve --bg --https=443 http://127.0.0.1:8787
tailscale serve status
```

The website defaults to your private Tailscale NAS URL:

```text
https://<nas-device>.<tailnet-name>.ts.net
```

Do not use `tailscale funnel` for this API unless you intentionally want public internet exposure. Prefer Tailscale ACLs that allow only your trusted users/devices to reach the NAS service.

When a user searches, the website asks for the NAS password and sends it only with that browser request. Do not put the password in the public frontend source.

The API contract is:

```text
GET /api/search?zip=98040&people=4&distance=80&distanceMode=miles&month=2026-08
POST /api/refresh?zip=98040&people=4&distance=240&distanceMode=hours&month=2026-11
GET /api/refresh-status
```

Response:

```json
{
  "source": "live",
  "lastChecked": "2026-06-09T17:55:00Z",
  "checkedMonths": ["2026-07", "2026-08"],
  "requestedMonths": ["2026-08"],
  "coverageStatus": "checked",
  "results": []
}
```

If live checks are blocked, return `source: "fallback"` with the latest saved results and a `lastChecked` timestamp. The API also reports which months the saved file covers, so the website can distinguish "not checked yet" from "checked and no campsites found."

The refresh endpoint is frontend-triggerable, but it still obeys the reservation site's bot protection. If the NAS receives an Azure WAF/captcha response, refresh status becomes `blocked` and the saved results are left unchanged.

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

from __future__ import annotations

import argparse
from datetime import date
import logging
import os
from pathlib import Path
import time

from .checker import check_browser, check_http, render_url
from .config import load_config
from .dates import weekend_stays
from .notify import notify
from .state import StateStore
from .api import serve_api


def run_once(config_path: Path, alert_all_changes: bool) -> int:
    config = load_config(config_path)
    state = StateStore(config.state_db)
    available_count = 0

    for watch in config.watches:
        for stay in weekend_stays(date.today(), watch.date_window):
            url = render_url(watch, stay.arrival.isoformat(), stay.departure.isoformat())
            if watch.backend == "browser":
                result = check_browser(watch, url, config.browser)
            elif watch.backend == "http":
                result = check_http(watch, url)
            else:
                raise ValueError(f"unknown backend {watch.backend!r} for watch {watch.name!r}")

            key = f"{watch.name}|{stay.arrival.isoformat()}|{stay.departure.isoformat()}"
            changed = state.changed(key, result.status, result.detail)
            logging.info("%s %s-%s: %s (%s)", watch.name, stay.arrival, stay.departure, result.status, result.detail)

            should_alert = result.status == "available" and changed
            should_alert = should_alert or (alert_all_changes and changed and result.status in {"blocked", "error"})
            if should_alert:
                subject = f"Campsite watch: {watch.name} {result.status}"
                body = (
                    f"{watch.name}\n"
                    f"Arrival: {stay.arrival}\n"
                    f"Departure: {stay.departure}\n"
                    f"Status: {result.status}\n"
                    f"Detail: {result.detail}\n"
                    f"URL: {result.url}"
                )
                notify(config.notify, subject, body)

            if result.status == "available":
                available_count += 1

    return available_count


def init_browser(config_path: Path) -> None:
    config = load_config(config_path)
    browser_watches = [watch for watch in config.watches if watch.backend == "browser"]
    if not browser_watches:
        raise ValueError("no browser watches configured")

    try:
        from playwright.sync_api import sync_playwright
    except ImportError as error:
        raise RuntimeError("playwright is not installed; run: python -m pip install -e '.[browser]'") from error

    first_watch = browser_watches[0]
    first_stay = weekend_stays(date.today(), first_watch.date_window)[0]
    url = render_url(first_watch, first_stay.arrival.isoformat(), first_stay.departure.isoformat())

    with sync_playwright() as playwright:
        context = playwright.chromium.launch_persistent_context(config.browser.user_data_dir, headless=False)
        page = context.new_page()
        page.goto(url)
        print("A browser window is open. Sign in or complete any manual challenge, then press Enter here.")
        input()
        context.close()


def main() -> None:
    parser = argparse.ArgumentParser(description="Monitor campsite availability and send notifications.")
    parser.add_argument("--config", default="config.toml", type=Path)
    parser.add_argument("--once", action="store_true", help="run one check cycle and exit")
    parser.add_argument("--alert-all-changes", action="store_true", help="also notify on blocked/error transitions")
    parser.add_argument("--init-browser", action="store_true", help="open a persistent browser profile for manual login")
    parser.add_argument("--serve-api", action="store_true", help="serve latest results for the website")
    parser.add_argument("--api-host", default="127.0.0.1")
    parser.add_argument("--api-port", default=8787, type=int)
    parser.add_argument("--results-json", default="./data/latest-results.json", type=Path)
    parser.add_argument("--allowed-origin", default="*")
    parser.add_argument("--api-token", default=os.environ.get("CAMPSITE_WATCH_API_TOKEN", ""))
    parser.add_argument("--log-level", default="INFO")
    args = parser.parse_args()

    logging.basicConfig(level=args.log_level.upper(), format="%(asctime)s %(levelname)s %(message)s")

    if args.init_browser:
        init_browser(args.config)
        return

    if args.serve_api:
        serve_api(args.api_host, args.api_port, args.results_json, args.allowed_origin, args.api_token)
        return

    if args.once:
        count = run_once(args.config, args.alert_all_changes)
        print(f"available matches: {count}")
        return

    config = load_config(args.config)
    while True:
        run_once(args.config, args.alert_all_changes)
        time.sleep(config.interval_minutes * 60)


if __name__ == "__main__":
    main()

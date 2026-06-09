from __future__ import annotations

from dataclasses import dataclass
import re
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from .config import BrowserConfig, Watch


@dataclass(frozen=True)
class CheckResult:
    status: str
    detail: str
    url: str


def render_url(watch: Watch, arrival: str, departure: str) -> str:
    if watch.url_template:
        return watch.url_template.format(arrival=arrival, departure=departure)
    if watch.url:
        return watch.url
    raise ValueError(f"watch {watch.name!r} has no url")


def evaluate_page(watch: Watch, text: str, url: str) -> CheckResult:
    normalized = re.sub(r"\s+", " ", text).strip().lower()
    if _looks_like_waf(normalized):
        return CheckResult("blocked", "Reservation site returned a WAF/captcha challenge", url)

    excluded = [pattern for pattern in watch.exclude_any if pattern.lower() in normalized]
    if excluded:
        return CheckResult("unavailable", f"matched negative text: {', '.join(excluded[:3])}", url)

    included = [pattern for pattern in watch.include_any if pattern.lower() in normalized]
    if included:
        return CheckResult("available", f"matched availability text: {', '.join(included[:3])}", url)

    if watch.include_any:
        return CheckResult("unknown", "no configured availability text matched", url)

    return CheckResult("unknown", "no include_any rules configured", url)


def check_http(watch: Watch, url: str) -> CheckResult:
    request = Request(
        url,
        headers={
            "User-Agent": (
                "Mozilla/5.0 (compatible; CampsiteWatch/0.1; "
                "+https://parks.wa.gov/passes-permits/reservations)"
            )
        },
    )
    try:
        with urlopen(request, timeout=45) as response:
            body = response.read(2_000_000).decode("utf-8", errors="replace")
    except HTTPError as error:
        if error.code in {401, 403, 429}:
            return CheckResult("blocked", f"HTTP {error.code}; likely bot protection or rate limit", url)
        return CheckResult("error", f"HTTP {error.code}", url)
    except URLError as error:
        return CheckResult("error", str(error.reason), url)
    except TimeoutError:
        return CheckResult("error", "request timed out", url)

    return evaluate_page(watch, body, url)


def check_browser(watch: Watch, url: str, browser_config: BrowserConfig) -> CheckResult:
    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        return CheckResult("error", "playwright is not installed; install campsite-watch[browser]", url)

    try:
        with sync_playwright() as playwright:
            context = playwright.chromium.launch_persistent_context(
                browser_config.user_data_dir,
                headless=browser_config.headless,
            )
            page = context.new_page()
            page.goto(url, wait_until="networkidle", timeout=browser_config.timeout_seconds * 1000)
            body = page.inner_text("body", timeout=browser_config.timeout_seconds * 1000)
            context.close()
    except Exception as error:  # Playwright raises several transport/page errors.
        return CheckResult("error", f"browser check failed: {error}", url)

    return evaluate_page(watch, body, url)


def _looks_like_waf(text: str) -> bool:
    return (
        "azure waf" in text
        or "azwaf" in text
        or "challenge-type" in text
        or "please enable javascript to run this application" in text
        or "captcha" in text and "challenge" in text
    )


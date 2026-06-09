from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path
import tomllib


@dataclass(frozen=True)
class DateWindow:
    earliest_months_ahead: int = 3
    latest_months_ahead: int = 6
    stay_nights: int = 2
    arrival_weekdays: tuple[int, ...] = (4,)


@dataclass(frozen=True)
class BrowserConfig:
    user_data_dir: str = "./browser-profile"
    headless: bool = True
    timeout_seconds: int = 45


@dataclass(frozen=True)
class NotifyConfig:
    webhook_urls: tuple[str, ...] = ()
    ntfy_urls: tuple[str, ...] = ()
    smtp_host: str | None = None
    smtp_port: int = 587
    smtp_username: str | None = None
    smtp_password: str | None = None
    smtp_from: str | None = None
    smtp_to: tuple[str, ...] = ()


@dataclass(frozen=True)
class Watch:
    name: str
    url: str | None = None
    url_template: str | None = None
    backend: str = "http"
    include_any: tuple[str, ...] = ()
    exclude_any: tuple[str, ...] = ()
    date_window: DateWindow = field(default_factory=DateWindow)


@dataclass(frozen=True)
class Config:
    interval_minutes: int
    state_db: str
    notify: NotifyConfig
    browser: BrowserConfig
    watches: tuple[Watch, ...]


def _tuple_str(value: object) -> tuple[str, ...]:
    if value is None:
        return ()
    if isinstance(value, str):
        return (value,)
    if isinstance(value, list):
        return tuple(str(item) for item in value)
    raise TypeError(f"expected string or list of strings, got {type(value).__name__}")


def _date_window(raw: dict[str, object] | None) -> DateWindow:
    raw = raw or {}
    return DateWindow(
        earliest_months_ahead=int(raw.get("earliest_months_ahead", 3)),
        latest_months_ahead=int(raw.get("latest_months_ahead", 6)),
        stay_nights=int(raw.get("stay_nights", 2)),
        arrival_weekdays=tuple(int(day) for day in raw.get("arrival_weekdays", [4])),
    )


def load_config(path: Path) -> Config:
    with path.open("rb") as config_file:
        raw = tomllib.load(config_file)

    notify_raw = raw.get("notify", {})
    browser_raw = raw.get("browser", {})
    watches_raw = raw.get("watch", [])
    if not isinstance(watches_raw, list) or not watches_raw:
        raise ValueError("config must contain at least one [[watch]] section")

    watches: list[Watch] = []
    for watch_raw in watches_raw:
        watch = Watch(
            name=str(watch_raw["name"]),
            url=watch_raw.get("url"),
            url_template=watch_raw.get("url_template"),
            backend=str(watch_raw.get("backend", "http")),
            include_any=_tuple_str(watch_raw.get("include_any")),
            exclude_any=_tuple_str(watch_raw.get("exclude_any")),
            date_window=_date_window(watch_raw.get("date_window")),
        )
        if not watch.url and not watch.url_template:
            raise ValueError(f"watch {watch.name!r} must set url or url_template")
        watches.append(watch)

    return Config(
        interval_minutes=int(raw.get("interval_minutes", 15)),
        state_db=str(raw.get("state_db", "./data/state.sqlite3")),
        notify=NotifyConfig(
            webhook_urls=_tuple_str(notify_raw.get("webhook_urls")),
            ntfy_urls=_tuple_str(notify_raw.get("ntfy_urls")),
            smtp_host=notify_raw.get("smtp_host"),
            smtp_port=int(notify_raw.get("smtp_port", 587)),
            smtp_username=notify_raw.get("smtp_username"),
            smtp_password=notify_raw.get("smtp_password"),
            smtp_from=notify_raw.get("smtp_from"),
            smtp_to=_tuple_str(notify_raw.get("smtp_to")),
        ),
        browser=BrowserConfig(
            user_data_dir=str(browser_raw.get("user_data_dir", "./browser-profile")),
            headless=bool(browser_raw.get("headless", True)),
            timeout_seconds=int(browser_raw.get("timeout_seconds", 45)),
        ),
        watches=tuple(watches),
    )


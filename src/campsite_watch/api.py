from __future__ import annotations

import argparse
from datetime import date, datetime, timedelta, timezone
from html import unescape
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import json
import math
import mimetypes
import os
from pathlib import Path
import re
from secrets import compare_digest
import subprocess
import threading
import time
from typing import Callable
from urllib.parse import parse_qs, urlencode, urljoin, urlparse
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen


GOING_TO_CAMP_BASE = "https://washington.goingtocamp.com"
CAMPSITE_EQUIPMENT_ID = -32768
PEOPLE_CAPACITY_CATEGORY_ID = -32767
AVAILABLE_STATUS = 0
MAX_REFRESH_CHECKS = 450
MAX_REFRESH_WINDOW_DAYS = 190
MAX_EXACT_STAY_NIGHTS = 14
ALLOWED_MILE_DISTANCES = {20, 30, 50, 80}
ALLOWED_DRIVE_MINUTES = {60, 120, 180, 240, 300}
DEFAULT_ORIGIN = (47.5707, -122.2221)
AUTH_FAILURE_WINDOW_SECONDS = 600
AUTH_FAILURE_LIMIT = 6
AUTH_RETRY_AFTER_SECONDS = 60
ZIP_COORDINATES = {
    "98040": DEFAULT_ORIGIN,
}

PARKS = [
    {
        "park": "Blake Island State Park",
        "city": "Manchester",
        "zip": "98353",
        "lat": 47.54247,
        "lon": -122.4834,
        "distanceMiles": 12,
        "resourceLocationId": -2147483640,
        "transactionLocationId": -2147483641,
        "mapId": -2147483404,
        "accessNote": "Water access only",
    },
    {
        "park": "Saltwater State Park",
        "city": "Des Moines",
        "zip": "98198",
        "lat": 47.37473,
        "lon": -122.321,
        "distanceMiles": 14,
        "resourceLocationId": -2147483561,
        "transactionLocationId": -2147483585,
        "mapId": -2147483419,
    },
    {
        "park": "Manchester State Park",
        "city": "Port Orchard",
        "zip": "98366",
        "lat": 47.57732,
        "lon": -122.5563,
        "distanceMiles": 16,
        "resourceLocationId": -2147483589,
        "transactionLocationId": -2147483603,
        "mapId": -2147483371,
    },
    {
        "park": "Illahee State Park",
        "city": "Bremerton",
        "zip": "98310",
        "lat": 47.59558,
        "lon": -122.5974,
        "distanceMiles": 18,
        "resourceLocationId": -2147483607,
        "transactionLocationId": -2147483616,
        "mapId": -2147483380,
    },
    {
        "park": "Dash Point State Park",
        "city": "Federal Way",
        "zip": "98023",
        "lat": 47.31779,
        "lon": -122.4071,
        "distanceMiles": 19,
        "resourceLocationId": -2147483625,
        "transactionLocationId": -2147483631,
        "mapId": -2147483389,
    },
    {
        "park": "Kanaskat-Palmer State Park",
        "city": "Ravensdale",
        "zip": "98051",
        "lat": 47.31198,
        "lon": -121.8987,
        "distanceMiles": 23,
        "resourceLocationId": -2147483601,
        "transactionLocationId": -2147483614,
        "mapId": -2147483379,
    },
    {
        "park": "Kitsap Memorial State Park",
        "city": "Poulsbo",
        "zip": "98370",
        "lat": 47.81642,
        "lon": -122.6444,
        "distanceMiles": 26,
        "resourceLocationId": -2147483600,
        "transactionLocationId": -2147483613,
        "mapId": -2147483378,
    },
    {
        "park": "Scenic Beach State Park",
        "city": "Seabeck",
        "zip": "98380",
        "lat": 47.64626,
        "lon": -122.8469,
        "distanceMiles": 30,
        "resourceLocationId": -2147483560,
        "transactionLocationId": -2147483584,
        "mapId": -2147483359,
    },
    {
        "park": "Belfair State Park",
        "city": "Belfair",
        "zip": "98528",
        "lat": 47.43167,
        "lon": -122.877,
        "distanceMiles": 32,
        "resourceLocationId": -2147483643,
        "transactionLocationId": -2147483643,
        "mapId": -2147483319,
    },
    {
        "park": "Wallace Falls State Park",
        "city": "Gold Bar",
        "zip": "98251",
        "lat": 47.86565,
        "lon": -121.68,
        "distanceMiles": 32,
        "resourceLocationId": -2147483545,
        "transactionLocationId": -2147483572,
        "mapId": -2147483351,
    },
]


class ApiHandler(BaseHTTPRequestHandler):
    results_path = Path("./data/latest-results.json")
    docs_dir = Path("./docs")
    browser_profile_dir = Path("./browser-profile")
    allowed_origin = "https://someguylike.github.io"
    api_token = ""
    publish_snapshot_command = ""
    refresh_lock = threading.Lock()
    auth_failures: dict[str, list[float]] = {}

    def do_OPTIONS(self) -> None:
        if not self._origin_allowed():
            self._send_json(403, {"error": "origin_not_allowed"})
            return
        self._send_headers(204)

    def do_GET(self) -> None:
        parsed_url = urlparse(self.path)
        path = parsed_url.path
        if path in {"/", "/index.html"} or (not path.startswith("/api/") and path != "/healthz"):
            self._send_static(path)
            return

        if not self._origin_allowed():
            self._send_json(403, {"error": "origin_not_allowed"})
            return

        if path == "/healthz":
            self._send_json(200, {"ok": True})
            return

        if path == "/api/refresh-status":
            self._send_json(200, self._refresh_status())
            return

        if path != "/api/search":
            self._send_json(404, {"error": "not_found"})
            return

        if not self.results_path.exists():
            self._send_json(503, {"error": "no_results", "detail": "No saved results are available yet."})
            return

        try:
            payload = json.loads(self.results_path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError):
            self._send_json(503, {"error": "bad_results", "detail": "Saved results could not be read."})
            return

        if not isinstance(payload, dict) or not isinstance(payload.get("results"), list):
            self._send_json(503, {"error": "bad_results", "detail": "expected object with results array"})
            return

        payload = self._filtered_payload(payload, parse_qs(parsed_url.query))
        payload.setdefault("source", "fallback")
        self._send_json(200, payload)

    def do_POST(self) -> None:
        if not self._origin_allowed():
            self._send_json(403, {"error": "origin_not_allowed"})
            return

        parsed_url = urlparse(self.path)
        if parsed_url.path != "/api/refresh":
            self._send_json(404, {"error": "not_found"})
            return

        query = parse_qs(parsed_url.query)
        validation_error = _validate_refresh_query(query)
        if validation_error:
            self._send_json(400, {"error": "bad_request", "detail": validation_error})
            return

        if not self.refresh_lock.acquire(blocking=False):
            self._send_json(202, self._refresh_status() | {"accepted": False})
            return

        _write_refresh_status(
            _refresh_status_path(self.results_path),
            "queued",
            "Refresh accepted. Waiting for the NAS worker to start.",
            _requested_months(query),
        )
        thread = threading.Thread(target=self._run_refresh, args=(query,), daemon=True)
        thread.start()
        self._send_json(202, self._refresh_status() | {"accepted": True})

    def log_message(self, format: str, *args: object) -> None:
        return

    def _send_json(self, status: int, payload: dict[str, object]) -> None:
        body = json.dumps(payload, separators=(",", ":")).encode("utf-8")
        self._send_headers(status, content_length=len(body), content_type="application/json")
        if status != 204:
            self.wfile.write(body)

    def _send_bytes(self, status: int, body: bytes, content_type: str) -> None:
        self._send_headers(status, content_length=len(body), content_type=content_type)
        self.wfile.write(body)

    def _send_headers(
        self,
        status: int,
        *,
        content_length: int = 0,
        content_type: str = "text/plain",
    ) -> None:
        cors_origin = self._cors_origin()
        self.send_response(status)
        if cors_origin:
            self.send_header("Access-Control-Allow-Origin", cors_origin)
            self.send_header("Vary", "Origin")
        if self.headers.get("Access-Control-Request-Private-Network", "").lower() == "true":
            self.send_header("Access-Control-Allow-Private-Network", "true")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header(
            "Access-Control-Allow-Headers",
            "Content-Type, Accept, Authorization",
        )
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(content_length))
        self.end_headers()

    def _authorized(self) -> bool:
        if not self.api_token:
            return True

        auth = self.headers.get("Authorization", "")
        prefix = "Bearer "
        bearer = auth[len(prefix) :] if auth.startswith(prefix) else ""
        return compare_digest(bearer, self.api_token)

    def _auth_client_key(self) -> str:
        forwarded = self.headers.get("X-Forwarded-For", "")
        if forwarded:
            return forwarded.split(",", 1)[0].strip()
        return self.client_address[0] if self.client_address else "unknown"

    def _auth_rate_limited(self) -> bool:
        key = self._auth_client_key()
        now = time.monotonic()
        failures = [t for t in self.auth_failures.get(key, []) if now - t < AUTH_FAILURE_WINDOW_SECONDS]
        self.auth_failures[key] = failures
        return len(failures) >= AUTH_FAILURE_LIMIT

    def _record_auth_failure(self) -> None:
        key = self._auth_client_key()
        failures = self.auth_failures.setdefault(key, [])
        failures.append(time.monotonic())
        print(f"Failed refresh auth from {key}", flush=True)

    def _record_auth_success(self) -> None:
        self.auth_failures.pop(self._auth_client_key(), None)

    def _origin_allowed(self) -> bool:
        origin = self.headers.get("Origin")
        return not origin or self.allowed_origin == "*" or origin == self.allowed_origin

    def _cors_origin(self) -> str:
        origin = self.headers.get("Origin")
        if self.allowed_origin == "*":
            return origin if self.api_token and origin else "*"
        return origin if origin == self.allowed_origin else ""

    def _send_static(self, path: str) -> None:
        relative = "index.html" if path in {"", "/"} else path.lstrip("/")
        if "/" in relative:
            self._send_json(404, {"error": "not_found"})
            return

        file_path = (self.docs_dir / relative).resolve()
        docs_dir = self.docs_dir.resolve()
        if docs_dir not in file_path.parents or not file_path.is_file():
            self._send_json(404, {"error": "not_found"})
            return

        content_type = mimetypes.guess_type(file_path.name)[0] or "application/octet-stream"
        try:
            self._send_bytes(200, file_path.read_bytes(), content_type)
        except OSError:
            self._send_json(503, {"error": "static_unavailable"})

    def _filtered_payload(self, payload: dict[str, object], query: dict[str, list[str]]) -> dict[str, object]:
        results = [item for item in payload.get("results", []) if isinstance(item, dict)]
        payload_checked_months = payload.get("checkedMonths")
        checked_months = (
            sorted(str(month) for month in payload_checked_months if isinstance(month, str))
            if isinstance(payload_checked_months, list)
            else _months_in_results(results)
        )
        requested_months = _requested_months(query)
        filtered = [item for item in results if _matches_query(item, query)]
        response = dict(payload)
        response["results"] = filtered
        response["checkedMonths"] = checked_months
        response["requestedMonths"] = requested_months
        response["totalSavedResults"] = len(results)
        response["coverageStatus"] = (
            "not_checked"
            if requested_months and not set(requested_months).issubset(set(checked_months))
            else "checked"
        )
        return response

    def _refresh_status(self) -> dict[str, object]:
        status_path = _refresh_status_path(self.results_path)
        if not status_path.exists():
            return {"status": "idle", "message": "No refresh has been triggered yet."}
        try:
            payload = json.loads(status_path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError):
            return {"status": "error", "message": "Could not read refresh status."}
        return payload if isinstance(payload, dict) else {"status": "error", "message": "Bad refresh status file."}

    def _run_refresh(self, query: dict[str, list[str]]) -> None:
        status_path = _refresh_status_path(self.results_path)
        requested_months = _requested_months(query)
        _write_refresh_status(
            status_path,
            "running",
            "Refresh started. Crawling Washington campsite availability from the NAS.",
            requested_months,
        )
        try:
            profile_problem = self._browser_profile_problem()
            if profile_problem:
                _write_refresh_status(status_path, "profile_missing", profile_problem, requested_months)
                return

            def progress(
                done: int,
                total: int,
                park_name: str,
                start: date | None,
                end: date | None,
                found_count: int,
                message: str | None = None,
                phase: str = "running",
                partial_results: list[dict[str, object]] | None = None,
            ) -> None:
                if message is None and start is not None and end is not None:
                    message = (
                        f"Refresh running. Checked {done} of {total} park/weekend combinations. "
                        f"Latest: {park_name} {start:%b} {start.day}-{end.day}. Found {found_count} matches so far."
                    )
                elif message is None:
                    message = f"Refresh running. Checked {done} of {total} park/weekend combinations. Found {found_count} matches so far."
                details: dict[str, object] = {
                    "checked": done,
                    "total": total,
                    "found": found_count,
                    "phase": phase,
                }
                if park_name:
                    details["currentPark"] = park_name
                if start is not None:
                    details["currentStart"] = start.isoformat()
                if end is not None:
                    details["currentEnd"] = end.isoformat()
                if partial_results:
                    details["partialResults"] = partial_results
                _write_refresh_status(
                    status_path,
                    "running",
                    message,
                    requested_months,
                    details,
                )

            crawler = GoingToCampCrawler(progress_callback=progress)
            results = crawler.search(query)
            payload = self._merged_refresh_payload(results, query, requested_months)
            months = payload["checkedMonths"] if isinstance(payload.get("checkedMonths"), list) else requested_months
            saved_results = payload["results"] if isinstance(payload.get("results"), list) else results
            new_result_count = len(results)
            payload = {
                **payload,
                "lastChecked": datetime.now(timezone.utc).isoformat(),
            }
            self.results_path.parent.mkdir(parents=True, exist_ok=True)
            temp_path = self.results_path.with_suffix(f"{self.results_path.suffix}.tmp")
            temp_path.write_text(json.dumps(payload, indent=2, sort_keys=True), encoding="utf-8")
            temp_path.replace(self.results_path)
            _write_refresh_status(
                status_path,
                "complete",
                (
                    f"Refresh complete. Found {new_result_count} available park/date matches for this refresh. "
                    f"Saved cache now has {len(saved_results)} matches across {len(months)} checked month(s)."
                ),
                requested_months,
            )
            self._publish_snapshot(status_path, requested_months)
        except HTTPError as error:
            if error.code in {401, 403}:
                _write_refresh_status(
                    status_path,
                    "profile_expired",
                    (
                        f"Reservation site blocked the NAS refresh with HTTP {error.code}. "
                        "The NAS browser profile may be expired; rerun scripts/setup_browser_profile_from_mac.sh from your Mac."
                    ),
                    requested_months,
                )
            elif error.code == 429:
                _write_refresh_status(
                    status_path,
                    "blocked",
                    f"Reservation site blocked the NAS refresh with HTTP {error.code}.",
                    requested_months,
                )
            else:
                _write_refresh_status(status_path, "error", "Reservation site returned an error.", requested_months)
            return
        except (TimeoutError, URLError, OSError, ValueError):
            _write_refresh_status(status_path, "error", "Refresh failed before new results could be saved.", requested_months)
            return
        except Exception:
            _write_refresh_status(status_path, "error", "Unexpected refresh failure.", requested_months)
            return
        finally:
            self.refresh_lock.release()

    def _browser_profile_problem(self) -> str:
        profile_dir = self.browser_profile_dir
        if not profile_dir.exists():
            return (
                f"NAS browser profile is missing at {profile_dir}. "
                "Run scripts/setup_browser_profile_from_mac.sh from your Mac, then retry refresh."
            )
        try:
            has_profile_files = any(profile_dir.iterdir())
        except OSError:
            return (
                f"NAS browser profile at {profile_dir} could not be read. "
                "Check permissions or rerun scripts/setup_browser_profile_from_mac.sh from your Mac."
            )
        if not has_profile_files:
            return (
                f"NAS browser profile is empty at {profile_dir}. "
                "Run scripts/setup_browser_profile_from_mac.sh from your Mac, then retry refresh."
            )
        return ""

    def _merged_refresh_payload(
        self,
        new_results: list[dict[str, object]],
        query: dict[str, list[str]],
        requested_months: list[str],
    ) -> dict[str, object]:
        existing_payload = self._read_existing_results_payload()
        existing_results = [
            item
            for item in existing_payload.get("results", [])
            if isinstance(item, dict) and not _result_in_refresh_scope(item, query, requested_months)
        ]
        checked_months = sorted(
            set(_payload_checked_months(existing_payload))
            | set(requested_months)
            | set(_months_in_results(new_results))
        )
        merged_results = sorted(
            existing_results + new_results,
            key=lambda item: (str(item.get("date", "")), _as_float(item.get("distanceMiles"), 0), str(item.get("park", ""))),
        )
        return {
            "source": "live",
            "checkedMonths": checked_months,
            "results": merged_results,
        }

    def _read_existing_results_payload(self) -> dict[str, object]:
        try:
            payload = json.loads(self.results_path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError):
            return {}
        return payload if isinstance(payload, dict) else {}

    def _publish_snapshot(self, status_path: Path, requested_months: list[str]) -> None:
        if not self.publish_snapshot_command:
            return

        _write_refresh_status(
            status_path,
            "publishing",
            "Refresh complete. Publishing public GitHub Pages snapshot.",
            requested_months,
        )
        try:
            completed = subprocess.run(
                self.publish_snapshot_command,
                shell=True,
                check=False,
                cwd=str(self.results_path.parent.parent),
                capture_output=True,
                text=True,
                timeout=120,
            )
        except (OSError, subprocess.TimeoutExpired):
            _write_refresh_status(
                status_path,
                "publish_failed",
                "Refresh complete, but publishing the public snapshot failed before git push finished.",
                requested_months,
            )
            return

        if completed.returncode == 0:
            detail = (completed.stdout or "").strip().splitlines()
            message = detail[-1] if detail else "Public snapshot published."
            _write_refresh_status(status_path, "published", f"Refresh complete. {message}", requested_months)
        else:
            detail = (completed.stderr or completed.stdout or "").strip().splitlines()
            message = detail[-1] if detail else "Publish command failed."
            _write_refresh_status(
                status_path,
                "publish_failed",
                f"Refresh complete, but publishing the public snapshot failed: {message}",
                requested_months,
            )


class GoingToCampCrawler:
    def __init__(
        self,
        progress_callback: Callable[
            [int, int, str, date | None, date | None, int, str | None, str, list[dict[str, object]] | None],
            None,
        ]
        | None = None,
    ) -> None:
        self.resource_cache: dict[int, dict[str, dict[str, object]]] = {}
        self.map_label_cache: dict[int, dict[int, str]] = {}
        self.resource_locations: list[dict[str, object]] | None = None
        self.origin_cache: dict[str, tuple[float, float]] = {}
        self.park_image_cache: dict[str, list[str]] = {}
        self.progress_callback = progress_callback

    def search(self, query: dict[str, list[str]]) -> list[dict[str, object]]:
        ranges = _requested_date_ranges(query)
        people = max(1, int(_as_float(_first(query, "people", "2"), 2)))
        results: list[dict[str, object]] = []
        parks = self._parks_for_query(query)
        check_count = len(parks) * len(ranges)
        self._progress(
            0,
            check_count,
            "park list",
            None,
            None,
            0,
            f"Refresh running. Prepared {len(parks)} parks and {len(ranges)} weekend range(s) to check.",
            "prepared",
            results,
        )
        if check_count > MAX_REFRESH_CHECKS:
            raise ValueError(
                f"Refresh would check {check_count} park/weekend combinations. "
                "Choose an exact date or a single month for large-distance searches."
            )

        checked = 0
        for park in parks:
            try:
                park_name = str(park.get("park", "Unknown park"))
                self._progress(
                    checked,
                    check_count,
                    park_name,
                    None,
                    None,
                    len(results),
                    f"Refresh running. Loading campsite resource data for {park_name}.",
                    "resources",
                    results,
                )
                resources = self._resources_for_park(int(park["resourceLocationId"]))
                map_labels = self._map_labels_for_park(int(park["resourceLocationId"]))
                for start, end in ranges:
                    self._progress(
                        checked,
                        check_count,
                        park_name,
                        start,
                        end,
                        len(results),
                        f"Refresh running. Checking {park_name} {start:%b} {start.day}-{end.day}. Checked {checked} of {check_count}; found {len(results)} matches so far.",
                        "availability",
                        results,
                    )
                    checked += 1
                    available_sites = self._available_sites(park, resources, map_labels, start, end, people)
                    if available_sites:
                        park = self._with_park_media(park)
                        results.append(
                            {
                                **park,
                                "date": start.isoformat(),
                                "end": end.isoformat(),
                                "availableTentSites": len(available_sites),
                                "sampleSites": available_sites[:8],
                            }
                        )
                    self._progress(checked, check_count, park_name, start, end, len(results), partial_results=results)
            except HTTPError:
                raise
            except (TimeoutError, URLError, OSError, ValueError, json.JSONDecodeError):
                continue

        return sorted(results, key=lambda item: (str(item["date"]), _as_float(item.get("distanceMiles"), 0), str(item["park"])))

    def _progress(
        self,
        done: int,
        total: int,
        park_name: str,
        start: date | None,
        end: date | None,
        found_count: int,
        message: str | None = None,
        phase: str = "running",
        partial_results: list[dict[str, object]] | None = None,
    ) -> None:
        if self.progress_callback:
            self.progress_callback(done, total, park_name, start, end, found_count, message, phase, partial_results)

    def _parks_for_query(self, query: dict[str, list[str]]) -> list[dict[str, object]]:
        distance_mode = _first(query, "distanceMode", "miles")
        distance = _as_float(_first(query, "distance"), 0)
        miles = _drive_minutes_to_miles(distance) if distance_mode == "hours" and distance > 0 else distance
        if miles <= 0:
            return [self._with_park_url(dict(park)) for park in PARKS]

        origin = self._origin_for_query(query)
        self._progress(
            0,
            0,
            "park metadata",
            None,
            None,
            0,
            "Refresh running. Loading Washington park metadata from the reservation site.",
            "metadata",
            None,
        )
        parks_by_id = {}
        for static_park in PARKS:
            park = self._with_park_url(dict(static_park))
            park["distanceMiles"] = round(
                _haversine_miles(origin[0], origin[1], _as_float(park.get("lat"), 0), _as_float(park.get("lon"), 0))
            )
            parks_by_id[int(park["resourceLocationId"])] = park
        for park in self._metadata_parks_within(miles, origin):
            parks_by_id.setdefault(int(park["resourceLocationId"]), park)
        return sorted(
            (park for park in parks_by_id.values() if _as_float(park.get("distanceMiles"), 0) <= miles),
            key=lambda park: (_as_float(park.get("distanceMiles"), 0), str(park.get("park", ""))),
        )

    def _origin_for_query(self, query: dict[str, list[str]]) -> tuple[float, float]:
        zip_value = _first(query, "zip", "98040").strip()
        if zip_value in ZIP_COORDINATES:
            return ZIP_COORDINATES[zip_value]
        if zip_value in self.origin_cache:
            return self.origin_cache[zip_value]
        if "," in zip_value:
            try:
                lat_text, lon_text = zip_value.split(",", 1)
                origin = (float(lat_text.strip()), float(lon_text.strip()))
                self.origin_cache[zip_value] = origin
                return origin
            except ValueError:
                return DEFAULT_ORIGIN
        if len(zip_value) == 5 and zip_value.isdigit():
            try:
                payload = self._get_external_json(f"https://api.zippopotam.us/us/{zip_value}")
                places = payload.get("places") if isinstance(payload, dict) else None
                place = places[0] if isinstance(places, list) and places and isinstance(places[0], dict) else None
                if place:
                    origin = (float(place["latitude"]), float(place["longitude"]))
                    self.origin_cache[zip_value] = origin
                    return origin
            except (KeyError, TypeError, ValueError, HTTPError, URLError, TimeoutError, json.JSONDecodeError):
                return DEFAULT_ORIGIN
        return DEFAULT_ORIGIN

    def _metadata_parks_within(self, miles: float, origin: tuple[float, float]) -> list[dict[str, object]]:
        if self.resource_locations is None:
            payload = self._get_json(
                "/api/resourceLocation",
                {},
                referer=f"{GOING_TO_CAMP_BASE}/",
            )
            self.resource_locations = payload if isinstance(payload, list) else []

        parks: list[dict[str, object]] = []
        for item in self.resource_locations:
            if not isinstance(item, dict) or item.get("rootMapId") is None:
                continue
            localized = _first_localized_value(item)
            name = str(localized.get("fullName") or localized.get("shortName") or "")
            gps = _parse_gps_coordinates(item.get("gpsCoordinates"))
            if not name or "State Park" not in name or gps is None:
                continue
            lat, lon = gps
            distance_miles = _haversine_miles(origin[0], origin[1], lat, lon)
            if distance_miles > miles:
                continue
            park = {
                "park": name,
                "city": str(localized.get("city") or ""),
                "zip": "",
                "lat": lat,
                "lon": lon,
                "distanceMiles": round(distance_miles),
                "resourceLocationId": item["resourceLocationId"],
                "transactionLocationId": item.get("transactionLocationId") or item["resourceLocationId"],
                "mapId": item["rootMapId"],
                "parkUrl": _official_park_url(name, str(localized.get("website") or "")),
            }
            access_note = _access_note_for_park(name, str(localized.get("description") or ""))
            if access_note:
                park["accessNote"] = access_note
            parks.append(park)
        return parks

    def _with_park_url(self, park: dict[str, object]) -> dict[str, object]:
        park.setdefault("parkUrl", _official_park_url(str(park.get("park", "")), str(park.get("parkUrl") or "")))
        return park

    def _with_park_media(self, park: dict[str, object]) -> dict[str, object]:
        park = self._with_park_url(dict(park))
        park_url = str(park.get("parkUrl") or "")
        image_urls = self._park_image_urls(park_url)
        if image_urls:
            park["imageUrl"] = image_urls[0]
            park["imageUrls"] = image_urls
            park["imageCredit"] = "Washington State Parks"
        return park

    def _park_image_urls(self, park_url: str) -> list[str]:
        if not park_url:
            return []
        if park_url in self.park_image_cache:
            return self.park_image_cache[park_url]
        try:
            body = self._get_external_text(park_url)
            image_urls = _extract_official_park_image_urls(body, park_url)
        except (HTTPError, URLError, TimeoutError, OSError):
            image_urls = []
        self.park_image_cache[park_url] = image_urls
        return image_urls

    def _resources_for_park(self, resource_location_id: int) -> dict[str, dict[str, object]]:
        if resource_location_id not in self.resource_cache:
            payload = self._get_json(
                "/api/resourcelocation/resources",
                {"resourceLocationId": str(resource_location_id)},
                referer=f"{GOING_TO_CAMP_BASE}/create-booking/results?resourceLocationId={resource_location_id}",
            )
            if not isinstance(payload, dict):
                raise ValueError(f"Unexpected resources payload for resourceLocationId={resource_location_id}")
            self.resource_cache[resource_location_id] = {
                str(resource_id): resource
                for resource_id, resource in payload.items()
                if isinstance(resource, dict)
            }
        return self.resource_cache[resource_location_id]

    def _map_labels_for_park(self, resource_location_id: int) -> dict[int, str]:
        if resource_location_id not in self.map_label_cache:
            payload = self._get_json(
                "/api/maps",
                {"resourceLocationId": str(resource_location_id)},
                referer=f"{GOING_TO_CAMP_BASE}/create-booking/results?resourceLocationId={resource_location_id}",
            )
            labels: dict[int, str] = {}
            if isinstance(payload, list):
                for item in payload:
                    if not isinstance(item, dict) or not isinstance(item.get("mapId"), int):
                        continue
                    title = _localized_title(item)
                    if title:
                        labels[int(item["mapId"])] = title
                    for link in item.get("mapLinks") or []:
                        if not isinstance(link, dict) or not isinstance(link.get("childMapId"), int):
                            continue
                        link_title = _localized_title(link)
                        if link_title:
                            labels[int(link["childMapId"])] = link_title
            self.map_label_cache[resource_location_id] = labels
        return self.map_label_cache[resource_location_id]

    def _available_sites(
        self,
        park: dict[str, object],
        resources: dict[str, dict[str, object]],
        map_labels: dict[int, str],
        start: date,
        end: date,
        people: int,
    ) -> list[list[str]]:
        payload = self._get_json(
            "/api/availability/resourceLocation",
            {
                "bookingCategoryId": "0",
                "resourceLocationId": str(park["resourceLocationId"]),
                "equipmentCategoryId": str(CAMPSITE_EQUIPMENT_ID),
                "subEquipmentCategoryId": str(CAMPSITE_EQUIPMENT_ID),
                "cartUid": "",
                "cartTransactionUid": "",
                "bookingUid": "",
                "groupHoldUid": "",
                "startDate": start.isoformat(),
                "endDate": end.isoformat(),
                "getDailyAvailability": "true",
                "isReserving": "true",
                "filterData": "[]",
                "boatLength": "0",
                "boatDraft": "0",
                "boatWidth": "0",
                "peopleCapacityCategoryCounts": json.dumps(
                    [
                        {
                            "capacityCategoryId": PEOPLE_CAPACITY_CATEGORY_ID,
                            "subCapacityCategoryId": None,
                            "count": people,
                            "isAdult": None,
                        }
                    ],
                    separators=(",", ":"),
                ),
                "numEquipment": "0",
                "seed": datetime.now(timezone.utc).isoformat(),
            },
            referer=self._reservation_referer(park, start, end, people),
        )
        if not isinstance(payload, list):
            raise ValueError(f"Unexpected availability payload for {park['park']} {start}")

        seen: set[str] = set()
        sites: list[list[str]] = []
        for group in payload:
            if not isinstance(group, dict):
                continue
            for resource_id, days in (group.get("resourceAvailabilities") or {}).items():
                resource = resources.get(str(resource_id))
                if not resource or not _resource_is_bookable_campsite(resource, people):
                    continue
                if not _all_days_available(days):
                    continue
                if _resource_is_ada_only(resource):
                    continue
                site_name = _resource_name(resource)
                if not site_name or site_name in seen:
                    continue
                seen.add(site_name)
                sites.append([_resource_loop_name(resource, map_labels), site_name])
        return sites

    def _get_json(self, path: str, params: dict[str, object], *, referer: str) -> object:
        body = self._get(path, params, referer=referer)
        text = body.decode("utf-8", errors="replace")
        if _looks_blocked(text.lower()):
            raise HTTPError(f"{GOING_TO_CAMP_BASE}{path}", 403, "blocked by bot protection", {}, None)
        return json.loads(text)

    def _get_external_json(self, url: str) -> object:
        request = Request(url, headers={"Accept": "application/json", "User-Agent": "campsite-watch/0.1"})
        with urlopen(request, timeout=10) as response:
            return json.loads(response.read(1_000_000).decode("utf-8", errors="replace"))

    def _get_external_text(self, url: str) -> str:
        request = Request(
            url,
            headers={
                "Accept": "text/html,application/xhtml+xml",
                "User-Agent": "campsite-watch/0.1",
            },
        )
        with urlopen(request, timeout=10) as response:
            return response.read(3_000_000).decode("utf-8", errors="replace")

    def _get(self, path: str, params: dict[str, object], *, referer: str) -> bytes:
        url = f"{GOING_TO_CAMP_BASE}{path}?{urlencode(params)}"
        try:
            request = Request(
                url,
                headers={
                    "Accept": "application/json, text/plain, */*",
                    "Referer": referer,
                    "User-Agent": (
                        "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
                        "(KHTML, like Gecko) Chrome/125.0 Safari/537.36"
                    ),
                },
            )
            with urlopen(request, timeout=45) as response:
                return response.read(20_000_000)
        except HTTPError:
            raise

    def _reservation_referer(self, park: dict[str, object], start: date, end: date, people: int) -> str:
        params = {
            "transactionLocationId": str(park["transactionLocationId"]),
            "resourceLocationId": str(park["resourceLocationId"]),
            "mapId": str(park["mapId"]),
            "searchTabGroupId": "0",
            "bookingCategoryId": "0",
            "startDate": start.isoformat(),
            "endDate": end.isoformat(),
            "nights": str(max(1, (end - start).days)),
            "isReserving": "true",
            "equipmentId": str(CAMPSITE_EQUIPMENT_ID),
            "subEquipmentId": str(CAMPSITE_EQUIPMENT_ID),
            "peopleCapacityCategoryCounts": f"[[-32767,null,{people},null]]",
        }
        return f"{GOING_TO_CAMP_BASE}/create-booking/results?{urlencode(params)}"


def _first(query: dict[str, list[str]], key: str, default: str = "") -> str:
    values = query.get(key)
    return values[0] if values else default


def _first_localized_value(item: dict[str, object]) -> dict[str, object]:
    values = item.get("localizedValues")
    if isinstance(values, list):
        for value in values:
            if isinstance(value, dict) and value.get("cultureName") == "en-US":
                return value
        for value in values:
            if isinstance(value, dict):
                return value
    return {}


def _parse_gps_coordinates(value: object) -> tuple[float, float] | None:
    if not isinstance(value, str) or "," not in value:
        return None
    try:
        lat_text, lon_text = value.split(",", 1)
        return float(lat_text.strip()), float(lon_text.strip())
    except ValueError:
        return None


def _haversine_miles(origin_lat: float, origin_lon: float, lat: float, lon: float) -> float:
    radians = math.pi / 180
    dlat = (lat - origin_lat) * radians
    dlon = (lon - origin_lon) * radians
    origin_lat_rad = origin_lat * radians
    lat_rad = lat * radians
    a = math.sin(dlat / 2) ** 2 + math.cos(origin_lat_rad) * math.cos(lat_rad) * math.sin(dlon / 2) ** 2
    return 3958.8 * 2 * math.asin(math.sqrt(a))


def _access_note_for_park(name: str, description: str) -> str:
    text = f"{name} {description}".lower()
    if "blake island" in text or "only reachable by private boat" in text:
        return "Water access only"
    if "ferry" in text:
        return "Ferry access"
    return ""


def _official_park_url(name: str, url: str = "") -> str:
    parsed = urlparse(url)
    if parsed.scheme == "https" and parsed.netloc == "parks.wa.gov":
        return url
    if name:
        return f"https://parks.wa.gov/find-parks/state-parks/{_park_slug(name)}"
    return ""


def _park_slug(name: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", name.lower().replace("&", "and")).strip("-")
    return slug


def _extract_official_park_image_url(html: str, page_url: str) -> str:
    urls = _extract_official_park_image_urls(html, page_url)
    return urls[0] if urls else ""


def _extract_official_park_image_urls(html: str, page_url: str, limit: int = 6) -> list[str]:
    urls: list[str] = []
    seen_images: set[str] = set()

    def append_url(value: str) -> None:
        url = _safe_official_image_url(value, page_url)
        image_key = _official_image_identity(url)
        if url and image_key not in seen_images:
            urls.append(url)
            seen_images.add(image_key)

    for pattern in (
        r'<meta[^>]+(?:property|name)=["\'](?:og:image|twitter:image)["\'][^>]+content=["\']([^"\']+)["\']',
        r'<meta[^>]+content=["\']([^"\']+)["\'][^>]+(?:property|name)=["\'](?:og:image|twitter:image)["\']',
    ):
        match = re.search(pattern, html, flags=re.IGNORECASE)
        if match:
            append_url(match.group(1))

    candidates = re.findall(
        r'(?:src|href)=["\']([^"\']*/sites/default/files/[^"\']+\.(?:jpg|jpeg|png|webp)(?:\?[^"\']*)?)["\']',
        html,
        flags=re.IGNORECASE,
    )
    for style in ("/styles/square_600/", "/styles/square_300/", "/styles/small_thumbnail"):
        count_before_style = len(urls)
        for candidate in candidates:
            lower = candidate.lower()
            if "logo" in lower or "favicon" in lower or "blog" in lower:
                continue
            if style not in lower:
                continue
            append_url(candidate)
            if len(urls) >= limit:
                return urls[:limit]
        if len(urls) > count_before_style:
            return urls[:limit]
    return urls[:limit]


def _official_image_identity(url: str) -> str:
    if not url:
        return ""
    path = urlparse(url).path.lower()
    public_marker = "/public/"
    if public_marker in path:
        return path.split(public_marker, 1)[1]
    return re.sub(r"/styles/[^/]+/", "/", path)


def _safe_official_image_url(value: str, page_url: str) -> str:
    url = urljoin(page_url, unescape(value))
    parsed = urlparse(url)
    if parsed.scheme != "https" or parsed.netloc != "parks.wa.gov":
        return ""
    if "/sites/default/files/" not in parsed.path:
        return ""
    return url


def _requested_date_ranges(query: dict[str, list[str]]) -> list[tuple[date, date]]:
    start_date = _parse_iso_date(_first(query, "startDate"))
    end_date = _parse_iso_date(_first(query, "endDate"))
    if start_date or end_date:
        start = start_date or end_date
        end = end_date or start_date
        if start is None or end is None:
            return []
        if end <= start:
            end = start + timedelta(days=1)
        return [(start, end)]

    month = _first(query, "month")
    if month and month != "any":
        return _weekend_ranges_for_month(month)

    window_start = _parse_iso_date(_first(query, "windowStart"))
    window_end = _parse_iso_date(_first(query, "windowEnd"))
    if not window_start or not window_end:
        today = datetime.now(timezone.utc).date()
        window_start = today
        window_end = today + timedelta(days=183)
    return _weekend_ranges_between(window_start, window_end)


def _validate_refresh_query(query: dict[str, list[str]]) -> str:
    people = int(_as_float(_first(query, "people", "4"), 4))
    if people < 2 or people > 8:
        return "Group size must be between 2 and 8 people."

    distance_mode = _first(query, "distanceMode", "hours")
    distance = int(_as_float(_first(query, "distance", "180"), 180))
    if distance_mode == "hours":
        if distance not in ALLOWED_DRIVE_MINUTES:
            return "Drive time must be one of 1, 2, 3, 4, or 5 hours."
    elif distance_mode == "miles":
        if distance not in ALLOWED_MILE_DISTANCES:
            return "Distance must be one of 20, 30, 50, or 80 miles."
    else:
        return "Distance mode must be hours or miles."

    start_date = _parse_iso_date(_first(query, "startDate"))
    end_date = _parse_iso_date(_first(query, "endDate"))
    if start_date or end_date:
        start = start_date or end_date
        end = end_date or start_date
        if start is None or end is None:
            return "Invalid exact date range."
        nights = max(1, (end - start).days)
        if nights > MAX_EXACT_STAY_NIGHTS:
            return f"Exact stay refresh is limited to {MAX_EXACT_STAY_NIGHTS} nights."
        return ""

    month = _first(query, "month")
    if month and month != "any":
        if not _weekend_ranges_for_month(month):
            return "Month must be in YYYY-MM format."
        return ""

    window_start = _parse_iso_date(_first(query, "windowStart"))
    window_end = _parse_iso_date(_first(query, "windowEnd"))
    if window_start and window_end and (window_end - window_start).days > MAX_REFRESH_WINDOW_DAYS:
        return f"Refresh window is limited to {MAX_REFRESH_WINDOW_DAYS} days."
    return ""


def _weekend_ranges_for_month(month: str) -> list[tuple[date, date]]:
    try:
        year, number = (int(part) for part in month.split("-", 1))
        start = date(year, number, 1)
    except ValueError:
        return []
    end = date(year + 1, 1, 1) if number == 12 else date(year, number + 1, 1)
    return _weekend_ranges_between(start, end - timedelta(days=1))


def _weekend_ranges_between(start: date, end: date) -> list[tuple[date, date]]:
    if end < start:
        return []
    current = start
    while current.weekday() != 4:
        current += timedelta(days=1)
    ranges = []
    while current <= end:
        checkout = current + timedelta(days=2)
        if checkout <= end + timedelta(days=1):
            ranges.append((current, checkout))
        current += timedelta(days=7)
    return ranges


def _parse_iso_date(value: str) -> date | None:
    if not value:
        return None
    try:
        return date.fromisoformat(value[:10])
    except ValueError:
        return None


def _all_days_available(days: object) -> bool:
    if not isinstance(days, list) or not days:
        return False
    return all(isinstance(day, dict) and day.get("availability") == AVAILABLE_STATUS for day in days)


def _resource_is_bookable_campsite(resource: dict[str, object], people: int) -> bool:
    if _as_float(resource.get("maxCapacity"), 0) < people:
        return False
    allowed_equipment = resource.get("allowedEquipment")
    if isinstance(allowed_equipment, list) and allowed_equipment:
        allows_campsite = any(
            isinstance(item, dict)
            and item.get("equipmentCategoryId") == CAMPSITE_EQUIPMENT_ID
            and item.get("subEquipmentCategoryId") == CAMPSITE_EQUIPMENT_ID
            for item in allowed_equipment
        )
        if not allows_campsite:
            return False
    return True


def _resource_is_ada_only(resource: dict[str, object]) -> bool:
    text = " ".join(
        str(value.get("description", ""))
        for value in resource.get("localizedValues", [])
        if isinstance(value, dict)
    ).lower()
    return "ada only" in text or "accessible only" in text


def _resource_name(resource: dict[str, object]) -> str:
    localized_values = resource.get("localizedValues")
    if isinstance(localized_values, list):
        for value in localized_values:
            if isinstance(value, dict) and value.get("name"):
                return str(value["name"])
    return str(resource.get("resourceId", ""))


def _resource_loop_name(resource: dict[str, object], map_labels: dict[int, str]) -> str:
    map_ids = resource.get("mapIds")
    if isinstance(map_ids, list) and map_ids:
        map_id = int(map_ids[0])
        return map_labels.get(map_id, "Site")
    return "Site"


def _localized_title(item: dict[str, object]) -> str:
    for key in ("localizedValues", "localizations"):
        values = item.get(key)
        if not isinstance(values, list):
            continue
        for value in values:
            if isinstance(value, dict) and value.get("title"):
                return str(value["title"])
    return str(item.get("title") or "")


def _matches_query(item: dict[str, object], query: dict[str, list[str]]) -> bool:
    item_start = str(item.get("date", ""))
    item_end = str(item.get("end", item_start))
    if not item_start:
        return False

    month = _first(query, "month")
    start_date = _first(query, "startDate")
    end_date = _first(query, "endDate")
    window_start = _first(query, "windowStart")
    window_end = _first(query, "windowEnd")
    distance_mode = _first(query, "distanceMode", "miles")
    distance = _as_float(_first(query, "distance"), 0)

    if start_date or end_date:
        selected_start = start_date or end_date
        selected_end = end_date or start_date
        if selected_start and selected_end and selected_end <= selected_start:
            parsed_start = _parse_iso_date(selected_start)
            if parsed_start:
                selected_end = (parsed_start + timedelta(days=1)).isoformat()
        if not (item_start <= selected_start and item_end >= selected_end):
            return False
    elif month and month != "any":
        if not (item_start.startswith(month) or item_end.startswith(month)):
            return False
    elif window_start and window_end and not _ranges_overlap(item_start, item_end, window_start, window_end):
        return False

    if distance > 0:
        if distance_mode == "hours":
            minutes = _as_float(item.get("driveDurationMinutes"), 0)
            if minutes and minutes > distance:
                return False
            if not minutes and _as_float(item.get("distanceMiles"), 0) > _drive_minutes_to_miles(distance):
                return False
        elif _as_float(item.get("distanceMiles"), 0) > distance:
            return False

    return True


def _result_in_refresh_scope(
    item: dict[str, object],
    query: dict[str, list[str]],
    requested_months: list[str],
) -> bool:
    if _first(query, "startDate") or _first(query, "endDate"):
        ranges = _requested_date_ranges(query)
        if not ranges:
            return False
        start, end = ranges[0]
        return str(item.get("date", "")) == start.isoformat() and str(item.get("end", "")) == end.isoformat()
    if requested_months:
        item_months = {
            str(item.get("date", ""))[:7],
            str(item.get("end", ""))[:7],
        }
        return bool(item_months & set(requested_months))
    return _matches_query(item, query)


def _ranges_overlap(start_a: str, end_a: str, start_b: str, end_b: str) -> bool:
    return start_a < end_b and end_a > start_b


def _payload_checked_months(payload: dict[str, object]) -> list[str]:
    checked_months = payload.get("checkedMonths")
    if isinstance(checked_months, list):
        return sorted(str(month) for month in checked_months if isinstance(month, str))
    results = payload.get("results")
    return _months_in_results([item for item in results if isinstance(item, dict)]) if isinstance(results, list) else []


def _months_in_results(results: list[dict[str, object]]) -> list[str]:
    months: set[str] = set()
    for item in results:
        for key in ("date", "end"):
            value = str(item.get(key, ""))
            if len(value) >= 7 and value[4:5] == "-":
                months.add(value[:7])
    return sorted(months)


def _requested_months(query: dict[str, list[str]]) -> list[str]:
    month = _first(query, "month")
    if month and month != "any":
        return [month]

    start = _first(query, "startDate") or _first(query, "windowStart")
    end = _first(query, "endDate") or _first(query, "windowEnd")
    if not start or not end:
        return []
    return _months_between(start[:7], end[:7])


def _months_between(start_month: str, end_month: str) -> list[str]:
    try:
        start_year, start_number = (int(part) for part in start_month.split("-", 1))
        end_year, end_number = (int(part) for part in end_month.split("-", 1))
    except ValueError:
        return []

    months = []
    year = start_year
    month = start_number
    while (year, month) <= (end_year, end_number):
        months.append(f"{year:04d}-{month:02d}")
        month += 1
        if month == 13:
            year += 1
            month = 1
    return months


def _as_float(value: object, default: float) -> float:
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


def _drive_minutes_to_miles(minutes: float) -> float:
    if minutes <= 60:
        return 35
    if minutes <= 120:
        return 70
    if minutes <= 180:
        return 110
    if minutes <= 240:
        return 150
    return 190


def _refresh_status_path(results_path: Path) -> Path:
    return results_path.with_name("refresh-status.json")


def _write_refresh_status(
    path: Path,
    status: str,
    message: str,
    requested_months: list[str],
    extra: dict[str, object] | None = None,
) -> None:
    payload = {
        "status": status,
        "message": message,
        "requestedMonths": requested_months,
        "updatedAt": datetime.now(timezone.utc).isoformat(),
    }
    if extra:
        payload.update(extra)
    path.parent.mkdir(parents=True, exist_ok=True)
    temp_path = path.with_suffix(f"{path.suffix}.tmp")
    temp_path.write_text(json.dumps(payload, indent=2, sort_keys=True), encoding="utf-8")
    temp_path.replace(path)


def _looks_blocked(text: str) -> bool:
    return (
        "azure" in text
        and "waf" in text
        or "captcha" in text
        or "challenge" in text
        or "access denied" in text
    )


def serve_api(
    host: str,
    port: int,
    results_path: Path,
    allowed_origin: str,
    api_token: str = "",
    docs_dir: Path = Path("./docs"),
    publish_snapshot_command: str = "",
    browser_profile_dir: Path = Path("./browser-profile"),
) -> None:
    handler = type(
        "ConfiguredApiHandler",
        (ApiHandler,),
        {
            "results_path": results_path,
            "docs_dir": docs_dir,
            "browser_profile_dir": browser_profile_dir,
            "allowed_origin": allowed_origin,
            "api_token": api_token,
            "publish_snapshot_command": publish_snapshot_command,
        },
    )
    server = ThreadingHTTPServer((host, port), handler)
    print(f"Serving campsite API and website on http://{host}:{port} using {results_path}")
    server.serve_forever()


def main() -> None:
    parser = argparse.ArgumentParser(description="Serve Campsite Watch API results.")
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", default=8787, type=int)
    parser.add_argument("--results", default="./data/latest-results.json", type=Path)
    parser.add_argument("--docs-dir", default="./docs", type=Path)
    parser.add_argument("--browser-profile-dir", default="./browser-profile", type=Path)
    parser.add_argument("--allowed-origin", default="https://someguylike.github.io")
    parser.add_argument("--publish-snapshot-command", default=os.environ.get("CAMPSITE_WATCH_PUBLISH_SNAPSHOT_COMMAND", ""))
    parser.add_argument(
        "--api-password",
        default="",
        help=argparse.SUPPRESS,
    )
    parser.add_argument("--api-token", default="")
    args = parser.parse_args()
    serve_api(
        args.host,
        args.port,
        args.results,
        args.allowed_origin,
        "",
        args.docs_dir,
        args.publish_snapshot_command,
        args.browser_profile_dir,
    )


if __name__ == "__main__":
    main()

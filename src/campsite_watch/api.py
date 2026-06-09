from __future__ import annotations

import argparse
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import json
import os
from pathlib import Path
from secrets import compare_digest
from urllib.parse import parse_qs, urlparse


class ApiHandler(BaseHTTPRequestHandler):
    results_path = Path("./data/latest-results.json")
    allowed_origin = "*"
    api_token = ""

    def do_OPTIONS(self) -> None:
        if not self._origin_allowed():
            self._send_json(403, {"error": "origin_not_allowed"})
            return
        self._send_headers(204)

    def do_GET(self) -> None:
        if not self._origin_allowed():
            self._send_json(403, {"error": "origin_not_allowed"})
            return

        parsed_url = urlparse(self.path)
        path = parsed_url.path
        if path == "/healthz":
            self._send_json(200, {"ok": True})
            return

        if path != "/api/search":
            self._send_json(404, {"error": "not_found"})
            return

        if not self._authorized():
            self._send_json(401, {"error": "unauthorized"})
            return

        if not self.results_path.exists():
            self._send_json(503, {"error": "no_results", "detail": "latest results file does not exist"})
            return

        try:
            payload = json.loads(self.results_path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError) as error:
            self._send_json(503, {"error": "bad_results", "detail": str(error)})
            return

        if not isinstance(payload, dict) or not isinstance(payload.get("results"), list):
            self._send_json(503, {"error": "bad_results", "detail": "expected object with results array"})
            return

        payload = self._filtered_payload(payload, parse_qs(parsed_url.query))
        payload.setdefault("source", "fallback")
        self._send_json(200, payload)

    def log_message(self, format: str, *args: object) -> None:
        return

    def _send_json(self, status: int, payload: dict[str, object]) -> None:
        body = json.dumps(payload, separators=(",", ":")).encode("utf-8")
        self._send_headers(status, content_length=len(body), content_type="application/json")
        if status != 204:
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
        self.send_header("Access-Control-Allow-Methods", "GET, OPTIONS")
        self.send_header(
            "Access-Control-Allow-Headers",
            "Content-Type, Accept, Authorization, X-Campsite-Watch-Password, X-Campsite-Watch-Token",
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
        header_token = self.headers.get("X-Campsite-Watch-Token", "")
        header_password = self.headers.get("X-Campsite-Watch-Password", "")
        return (
            compare_digest(bearer, self.api_token)
            or compare_digest(header_password, self.api_token)
            or compare_digest(header_token, self.api_token)
        )

    def _origin_allowed(self) -> bool:
        origin = self.headers.get("Origin")
        return not origin or self.allowed_origin == "*" or origin == self.allowed_origin

    def _cors_origin(self) -> str:
        origin = self.headers.get("Origin")
        if self.allowed_origin == "*":
            return origin if self.api_token and origin else "*"
        return origin if origin == self.allowed_origin else ""

    def _filtered_payload(self, payload: dict[str, object], query: dict[str, list[str]]) -> dict[str, object]:
        results = [item for item in payload.get("results", []) if isinstance(item, dict)]
        checked_months = _months_in_results(results)
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


def _first(query: dict[str, list[str]], key: str, default: str = "") -> str:
    values = query.get(key)
    return values[0] if values else default


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


def _ranges_overlap(start_a: str, end_a: str, start_b: str, end_b: str) -> bool:
    return start_a <= end_b and end_a >= start_b


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
    return 150


def serve_api(host: str, port: int, results_path: Path, allowed_origin: str, api_token: str = "") -> None:
    handler = type(
        "ConfiguredApiHandler",
        (ApiHandler,),
        {"results_path": results_path, "allowed_origin": allowed_origin, "api_token": api_token},
    )
    server = ThreadingHTTPServer((host, port), handler)
    print(f"Serving campsite API on http://{host}:{port} using {results_path}")
    server.serve_forever()


def main() -> None:
    parser = argparse.ArgumentParser(description="Serve Campsite Watch API results.")
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", default=8787, type=int)
    parser.add_argument("--results", default="./data/latest-results.json", type=Path)
    parser.add_argument("--allowed-origin", default="*")
    parser.add_argument(
        "--api-password",
        default=os.environ.get("CAMPSITE_WATCH_API_PASSWORD", os.environ.get("CAMPSITE_WATCH_API_TOKEN", "")),
    )
    parser.add_argument("--api-token", default="")
    args = parser.parse_args()
    serve_api(args.host, args.port, args.results, args.allowed_origin, args.api_password or args.api_token)


if __name__ == "__main__":
    main()

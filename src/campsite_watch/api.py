from __future__ import annotations

import argparse
from datetime import date, datetime, timedelta, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import json
import os
from pathlib import Path
from secrets import compare_digest
import threading
from urllib.parse import parse_qs, urlencode, urlparse
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen


GOING_TO_CAMP_BASE = "https://washington.goingtocamp.com"
CAMPSITE_EQUIPMENT_ID = -32768
PEOPLE_CAPACITY_CATEGORY_ID = -32767
AVAILABLE_STATUS = 0

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
    allowed_origin = "*"
    api_token = ""
    refresh_lock = threading.Lock()

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

        if path == "/api/refresh-status":
            if not self._authorized():
                self._send_json(401, {"error": "unauthorized"})
                return
            self._send_json(200, self._refresh_status())
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

    def do_POST(self) -> None:
        if not self._origin_allowed():
            self._send_json(403, {"error": "origin_not_allowed"})
            return

        parsed_url = urlparse(self.path)
        if parsed_url.path != "/api/refresh":
            self._send_json(404, {"error": "not_found"})
            return

        if not self._authorized():
            self._send_json(401, {"error": "unauthorized"})
            return

        if not self.refresh_lock.acquire(blocking=False):
            self._send_json(202, self._refresh_status() | {"accepted": False})
            return

        query = parse_qs(parsed_url.query)
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
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
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

    def _refresh_status(self) -> dict[str, object]:
        status_path = _refresh_status_path(self.results_path)
        if not status_path.exists():
            return {"status": "idle", "message": "No refresh has been triggered yet."}
        try:
            payload = json.loads(status_path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError) as error:
            return {"status": "error", "message": f"Could not read refresh status: {error}"}
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
            crawler = GoingToCampCrawler()
            results = crawler.search(query)
        except HTTPError as error:
            if error.code in {401, 403, 429}:
                _write_refresh_status(
                    status_path,
                    "blocked",
                    f"Reservation site blocked the NAS refresh with HTTP {error.code}.",
                    requested_months,
                )
            else:
                _write_refresh_status(status_path, "error", f"Reservation site returned HTTP {error.code}.", requested_months)
            self.refresh_lock.release()
            return
        except (TimeoutError, URLError, OSError, ValueError) as error:
            _write_refresh_status(status_path, "error", f"Refresh failed: {error}", requested_months)
            self.refresh_lock.release()
            return

        payload = {
            "source": "live",
            "lastChecked": datetime.now(timezone.utc).isoformat(),
            "results": results,
        }
        self.results_path.parent.mkdir(parents=True, exist_ok=True)
        temp_path = self.results_path.with_suffix(f"{self.results_path.suffix}.tmp")
        temp_path.write_text(json.dumps(payload, indent=2, sort_keys=True), encoding="utf-8")
        temp_path.replace(self.results_path)
        months = _months_in_results(results)
        _write_refresh_status(
            status_path,
            "complete",
            f"Refresh complete. Found {len(results)} available park/date matches across {len(months)} month(s).",
            requested_months,
        )
        self.refresh_lock.release()


class GoingToCampCrawler:
    def __init__(self) -> None:
        self.resource_cache: dict[int, dict[str, dict[str, object]]] = {}
        self.map_label_cache: dict[int, dict[int, str]] = {}

    def search(self, query: dict[str, list[str]]) -> list[dict[str, object]]:
        ranges = _requested_date_ranges(query)
        people = max(1, int(_as_float(_first(query, "people", "2"), 2)))
        results: list[dict[str, object]] = []

        for park in _parks_for_query(query):
            resources = self._resources_for_park(int(park["resourceLocationId"]))
            map_labels = self._map_labels_for_park(int(park["resourceLocationId"]))
            for start, end in ranges:
                available_sites = self._available_sites(park, resources, map_labels, start, end, people)
                if not available_sites:
                    continue
                results.append(
                    {
                        **park,
                        "date": start.isoformat(),
                        "end": end.isoformat(),
                        "availableTentSites": len(available_sites),
                        "sampleSites": available_sites[:8],
                    }
                )

        return sorted(results, key=lambda item: (str(item["date"]), _as_float(item.get("distanceMiles"), 0), str(item["park"])))

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


def _parks_for_query(query: dict[str, list[str]]) -> list[dict[str, object]]:
    distance_mode = _first(query, "distanceMode", "miles")
    distance = _as_float(_first(query, "distance"), 0)
    parks = [dict(park) for park in PARKS]
    if distance <= 0:
        return parks
    if distance_mode == "hours":
        miles = _drive_minutes_to_miles(distance)
        return [park for park in parks if _as_float(park.get("distanceMiles"), 0) <= miles]
    return [park for park in parks if _as_float(park.get("distanceMiles"), 0) <= distance]


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


def _refresh_status_path(results_path: Path) -> Path:
    return results_path.with_name("refresh-status.json")


def _write_refresh_status(path: Path, status: str, message: str, requested_months: list[str]) -> None:
    payload = {
        "status": status,
        "message": message,
        "requestedMonths": requested_months,
        "updatedAt": datetime.now(timezone.utc).isoformat(),
    }
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

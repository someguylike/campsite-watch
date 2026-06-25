#!/usr/bin/env bash
set -euo pipefail

API_URL="${CAMPSITE_WATCH_API_URL:-http://127.0.0.1:8787}"
ZIP_CODE="${CAMPSITE_WATCH_ZIP:-98040}"
PEOPLE="${CAMPSITE_WATCH_PEOPLE:-4}"
DISTANCE_MODE="${CAMPSITE_WATCH_DISTANCE_MODE:-hours}"
DISTANCE="${CAMPSITE_WATCH_DISTANCE:-300}"
MONTH_COUNT="${CAMPSITE_WATCH_MONTH_COUNT:-6}"
START_OFFSET_MONTHS="${CAMPSITE_WATCH_START_OFFSET_MONTHS:-1}"
POLL_SECONDS="${CAMPSITE_WATCH_POLL_SECONDS:-15}"
MAX_WAIT_SECONDS="${CAMPSITE_WATCH_MAX_WAIT_SECONDS:-1800}"

month_at_offset() {
  python3 - "$1" <<'PY'
from datetime import date
import sys

offset = int(sys.argv[1])
today = date.today()
month_index = today.month - 1 + offset
year = today.year + month_index // 12
month = month_index % 12 + 1
print(f"{year:04d}-{month:02d}")
PY
}

json_value() {
  python3 - "$1" "$2" <<'PY'
import json
import sys

try:
    data = json.loads(sys.argv[1])
except json.JSONDecodeError:
    print("")
else:
    value = data.get(sys.argv[2], "")
    print(value if isinstance(value, str) else "")
PY
}

wait_for_refresh() {
  local month="$1"
  local waited=0
  local status_json status message

  while [ "${waited}" -lt "${MAX_WAIT_SECONDS}" ]; do
    status_json="$(curl --fail --silent --show-error "${API_URL}/api/refresh-status")"
    status="$(json_value "${status_json}" status)"
    message="$(json_value "${status_json}" message)"

    case "${status}" in
      complete|published)
        echo "${month}: ${message}"
        return 0
        ;;
      blocked|error|publish_failed|profile_expired|profile_missing)
        echo "${month}: refresh ${status}: ${message}" >&2
        return 1
        ;;
      queued|running|publishing|"")
        sleep "${POLL_SECONDS}"
        waited=$((waited + POLL_SECONDS))
        ;;
      *)
        echo "${month}: unexpected refresh status '${status}': ${status_json}" >&2
        return 1
        ;;
    esac
  done

  echo "${month}: timed out waiting for refresh after ${MAX_WAIT_SECONDS}s" >&2
  return 1
}

for offset in $(seq "${START_OFFSET_MONTHS}" "$((START_OFFSET_MONTHS + MONTH_COUNT - 1))"); do
  month="$(month_at_offset "${offset}")"
  echo "Refreshing ${month}..."
  refresh_url="${API_URL}/api/refresh?zip=${ZIP_CODE}&people=${PEOPLE}&distanceMode=${DISTANCE_MODE}&distance=${DISTANCE}&month=${month}"
  curl --fail --silent --show-error \
    -X POST \
    "${refresh_url}" >/dev/null
  wait_for_refresh "${month}"
done

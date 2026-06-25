#!/usr/bin/env bash
set -euo pipefail

API_HOST="${API_HOST:-192.168.1.123}"
API_PORT="${API_PORT:-8787}"
APP_DIR="${APP_DIR:-/opt/campsite-watch}"
SERVICE_NAME="${SERVICE_NAME:-campsite-watch-api}"
REFRESH_SERVICE_NAME="${REFRESH_SERVICE_NAME:-campsite-watch-refresh}"
API_URL="${CAMPSITE_WATCH_API_URL:-http://${API_HOST}:${API_PORT}}"

section() {
  printf '\n== %s ==\n' "$1"
}

json_pretty() {
  python3 -m json.tool 2>/dev/null || cat
}

section "API service"
sudo systemctl --no-pager --lines=20 status "${SERVICE_NAME}" || true

section "Periodic refresh timer"
sudo systemctl --no-pager --lines=20 status "${REFRESH_SERVICE_NAME}.timer" || true
sudo systemctl list-timers "${REFRESH_SERVICE_NAME}.timer" || true

section "Current or latest refresh status"
if curl --fail --silent --show-error "${API_URL}/api/refresh-status" | json_pretty; then
  true
else
  echo "Could not read ${API_URL}/api/refresh-status" >&2
fi

section "API health"
if curl --fail --silent --show-error "${API_URL}/healthz" | json_pretty; then
  true
else
  echo "Could not read ${API_URL}/healthz" >&2
fi

section "Recent API logs"
sudo journalctl -u "${SERVICE_NAME}" -n 80 --no-pager || true

section "Recent periodic refresh logs"
sudo journalctl -u "${REFRESH_SERVICE_NAME}.service" -n 120 --no-pager || true

section "Old cron entries"
{
  echo "-- user crontab --"
  crontab -l 2>/dev/null || true
  echo "-- root crontab --"
  sudo crontab -l 2>/dev/null || true
  echo "-- /etc cron files --"
  sudo grep -R -n "campsite-watch\\|refresh_next_six_months" /etc/cron* 2>/dev/null || true
} | sed '/^$/d'

section "Snapshot files"
for path in \
  "${APP_DIR}/data/latest-results.json" \
  "${APP_DIR}/data/refresh-status.json" \
  "${APP_DIR}/docs/latest-results.json"
do
  if [ -e "${path}" ]; then
    stat --printf='%n | size=%s | modified=%y\n' "${path}" 2>/dev/null || stat -f '%N | size=%z | modified=%Sm' "${path}"
  else
    echo "${path} | missing"
  fi
done

section "Deployed git version"
if [ -d "${APP_DIR}/.git" ]; then
  git -C "${APP_DIR}" --no-pager log --oneline -3 || true
else
  echo "${APP_DIR} is not a git checkout; installer likely rsynced from ~/campsite-watch."
fi

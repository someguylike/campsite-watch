#!/usr/bin/env bash
set -euo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
API_HOST="${API_HOST:-192.168.1.123}"
API_PORT="${API_PORT:-8787}"
APP_DIR="${APP_DIR:-/opt/campsite-watch}"
SERVICE_NAME="${SERVICE_NAME:-campsite-watch-api}"
REFRESH_SERVICE_NAME="${REFRESH_SERVICE_NAME:-campsite-watch-refresh}"
LOG_LINES="${LOG_LINES:-120}"

cd "${REPO_DIR}"

if [ ! -d .git ]; then
  echo "Run this from a git checkout, for example ~/campsite-watch." >&2
  exit 1
fi

echo "Pulling latest code and applying NAS update..."
API_HOST="${API_HOST}" \
API_PORT="${API_PORT}" \
APP_DIR="${APP_DIR}" \
SERVICE_NAME="${SERVICE_NAME}" \
REFRESH_SERVICE_NAME="${REFRESH_SERVICE_NAME}" \
  ./scripts/nas_apply_update.sh

echo
echo "Starting one periodic refresh run..."
sudo systemctl start "${REFRESH_SERVICE_NAME}.service"

echo
echo "Recent refresh logs:"
sudo journalctl -u "${REFRESH_SERVICE_NAME}.service" -n "${LOG_LINES}" --no-pager

echo
echo "Done. Worker status: http://${API_HOST}:${API_PORT}/worker.html"

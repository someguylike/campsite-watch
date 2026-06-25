#!/usr/bin/env bash
set -euo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
API_HOST="${API_HOST:-192.168.1.123}"
API_PORT="${API_PORT:-8787}"
APP_DIR="${APP_DIR:-/opt/campsite-watch}"
SERVICE_NAME="${SERVICE_NAME:-campsite-watch-api}"
REFRESH_SERVICE_NAME="${REFRESH_SERVICE_NAME:-campsite-watch-refresh}"

cd "${REPO_DIR}"

if [ ! -d .git ]; then
  echo "Run this from a git checkout, for example ~/campsite-watch." >&2
  exit 1
fi

echo "Updating checkout at ${REPO_DIR}..."
git pull --ff-only

echo "Installing and restarting ${SERVICE_NAME}..."
API_HOST="${API_HOST}" API_PORT="${API_PORT}" APP_DIR="${APP_DIR}" SERVICE_NAME="${SERVICE_NAME}" REFRESH_SERVICE_NAME="${REFRESH_SERVICE_NAME}" ./scripts/install_linux_mint.sh

echo
echo "Verifying deployed website copy..."
if grep -R -n "requires the password\\|Refresh asks the NAS\\|Search reads the latest saved NAS results" "${APP_DIR}/docs" 2>/dev/null; then
  echo "Found stale password wording in ${APP_DIR}/docs." >&2
  exit 1
fi

API_HOST="${API_HOST}" API_PORT="${API_PORT}" APP_DIR="${APP_DIR}" SERVICE_NAME="${SERVICE_NAME}" REFRESH_SERVICE_NAME="${REFRESH_SERVICE_NAME}" ./scripts/nas_worker_status.sh

echo
echo "Done. Open http://${API_HOST}:${API_PORT}/ and hard refresh the browser if stale text remains."

#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/campsite-watch}"
APP_USER="${APP_USER:-${SUDO_USER:-$USER}}"
REPO_URL="${REPO_URL:-https://github.com/someguylike/campsite-watch.git}"
API_HOST="${API_HOST:-192.168.1.123}"
API_PORT="${API_PORT:-8787}"
ALLOWED_ORIGIN="${ALLOWED_ORIGIN:-http://${API_HOST}:${API_PORT}}"
ENV_FILE="${ENV_FILE:-/etc/campsite-watch.env}"
SERVICE_NAME="${SERVICE_NAME:-campsite-watch-api}"

if ! command -v sudo >/dev/null 2>&1; then
  echo "sudo is required." >&2
  exit 1
fi

echo "Installing system packages..."
sudo apt-get update
sudo apt-get install -y git curl openssl python3 python3-venv python3-pip

echo "Preparing application directory at ${APP_DIR}..."
if [ -f "pyproject.toml" ] && [ -d "src/campsite_watch" ]; then
  sudo mkdir -p "${APP_DIR}"
  sudo rsync -a --delete \
    --exclude .git \
    --exclude .venv \
    --exclude browser-profile \
    --exclude data/state.sqlite3 \
    ./ "${APP_DIR}/"
elif [ -d "${APP_DIR}/.git" ]; then
  sudo git -C "${APP_DIR}" pull --ff-only
else
  sudo git clone "${REPO_URL}" "${APP_DIR}"
fi

sudo chown -R "${APP_USER}:${APP_USER}" "${APP_DIR}"
mkdir -p "${APP_DIR}/data" "${APP_DIR}/browser-profile"

echo "Creating Python virtualenv..."
python3 -m venv "${APP_DIR}/.venv"
"${APP_DIR}/.venv/bin/python" -m pip install --upgrade pip
"${APP_DIR}/.venv/bin/python" -m pip install -e "${APP_DIR}[browser]"

echo "Installing Playwright Chromium dependencies..."
if ! "${APP_DIR}/.venv/bin/python" -m playwright install --with-deps chromium; then
  echo "Playwright dependency install failed. Retrying with current Ubuntu/Mint package names..."
  sudo apt-get update
  sudo apt-get install -y \
    fonts-liberation \
    libasound2t64 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libcairo2 \
    libcups2 \
    libdrm2 \
    libgbm1 \
    libglib2.0-0 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libpango-1.0-0 \
    libx11-6 \
    libxcb1 \
    libxcomposite1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxkbcommon0 \
    libxrandr2 \
    xdg-utils
  "${APP_DIR}/.venv/bin/python" -m playwright install chromium
fi

if [ ! -f "${APP_DIR}/config.toml" ]; then
  cp "${APP_DIR}/config.example.toml" "${APP_DIR}/config.toml"
fi

if [ ! -f "${APP_DIR}/data/latest-results.json" ]; then
  cp "${APP_DIR}/examples/latest-results.example.json" "${APP_DIR}/data/latest-results.json"
fi

if [ ! -f "${ENV_FILE}" ]; then
  sudo touch "${ENV_FILE}"
  sudo chmod 600 "${ENV_FILE}"
fi

if ! sudo grep -q '^CAMPSITE_WATCH_PUBLISH_SNAPSHOT_COMMAND=' "${ENV_FILE}"; then
  printf 'CAMPSITE_WATCH_PUBLISH_SNAPSHOT_COMMAND=%s/scripts/publish_public_snapshot.sh\n' "${APP_DIR}" | sudo tee -a "${ENV_FILE}" >/dev/null
fi

echo "Writing systemd service..."
sudo tee "/etc/systemd/system/${SERVICE_NAME}.service" >/dev/null <<EOF
[Unit]
Description=Campsite Watch API
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=${APP_USER}
WorkingDirectory=${APP_DIR}
EnvironmentFile=${ENV_FILE}
ExecStart=${APP_DIR}/.venv/bin/campsite-watch --serve-api --api-host ${API_HOST} --api-port ${API_PORT} --results-json ${APP_DIR}/data/latest-results.json --docs-dir ${APP_DIR}/docs --browser-profile-dir ${APP_DIR}/browser-profile --allowed-origin ${ALLOWED_ORIGIN}
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable "${SERVICE_NAME}"
sudo systemctl restart "${SERVICE_NAME}"

echo "Checking API health..."
curl --fail --silent "http://${API_HOST}:${API_PORT}/healthz" >/dev/null

cat <<EOF

Install complete.

Open the LAN-only website while connected to the same network as the NAS:
  URL:      http://${API_HOST}:${API_PORT}/

Refresh runs from the LAN-only site.

After refresh completes, the service automatically runs:
  ${APP_DIR}/scripts/publish_public_snapshot.sh

Configure GitHub deploy-key push access for ${APP_USER} so public snapshot publishing can succeed.

Service commands:
  sudo systemctl status ${SERVICE_NAME}
  sudo journalctl -u ${SERVICE_NAME} -f

Next step:
  Edit ${APP_DIR}/config.toml for real campsite watches, then initialize the browser profile:
  cd ${APP_DIR}
  ${APP_DIR}/.venv/bin/campsite-watch --config ${APP_DIR}/config.toml --init-browser
EOF

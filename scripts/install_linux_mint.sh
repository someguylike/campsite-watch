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
"${APP_DIR}/.venv/bin/python" -m playwright install --with-deps chromium

if [ ! -f "${APP_DIR}/config.toml" ]; then
  cp "${APP_DIR}/config.example.toml" "${APP_DIR}/config.toml"
fi

if [ ! -f "${APP_DIR}/data/latest-results.json" ]; then
  cp "${APP_DIR}/examples/latest-results.example.json" "${APP_DIR}/data/latest-results.json"
fi

if [ -f "${ENV_FILE}" ] && sudo grep -q '^CAMPSITE_WATCH_API_PASSWORD=' "${ENV_FILE}"; then
  PASSWORD="$(sudo sed -n 's/^CAMPSITE_WATCH_API_PASSWORD=//p' "${ENV_FILE}" | head -1)"
elif [ -f "${ENV_FILE}" ] && sudo grep -q '^CAMPSITE_WATCH_API_TOKEN=' "${ENV_FILE}"; then
  PASSWORD="$(sudo sed -n 's/^CAMPSITE_WATCH_API_TOKEN=//p' "${ENV_FILE}" | head -1)"
else
  PASSWORD="$(openssl rand -base64 24)"
  printf 'CAMPSITE_WATCH_API_PASSWORD=%s\n' "${PASSWORD}" | sudo tee "${ENV_FILE}" >/dev/null
  sudo chmod 600 "${ENV_FILE}"
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
ExecStart=${APP_DIR}/.venv/bin/campsite-watch --serve-api --api-host ${API_HOST} --api-port ${API_PORT} --results-json ${APP_DIR}/data/latest-results.json --docs-dir ${APP_DIR}/docs --allowed-origin ${ALLOWED_ORIGIN}
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable --now "${SERVICE_NAME}"

echo "Checking API health..."
curl --fail --silent "http://${API_HOST}:${API_PORT}/healthz" >/dev/null

cat <<EOF

Install complete.

NAS password:
${PASSWORD}

Open the LAN-only website while connected to the same network as the NAS:
  URL:      http://${API_HOST}:${API_PORT}/
  Password: ${PASSWORD}

Service commands:
  sudo systemctl status ${SERVICE_NAME}
  sudo journalctl -u ${SERVICE_NAME} -f

Next step:
  Edit ${APP_DIR}/config.toml for real campsite watches, then initialize the browser profile:
  cd ${APP_DIR}
  ${APP_DIR}/.venv/bin/campsite-watch --config ${APP_DIR}/config.toml --init-browser
EOF

#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/campsite-watch}"
APP_USER="${APP_USER:-${SUDO_USER:-$USER}}"
REPO_URL="${REPO_URL:-https://github.com/someguylike/campsite-watch.git}"
API_PORT="${API_PORT:-8787}"
ALLOWED_ORIGIN="${ALLOWED_ORIGIN:-https://someguylike.github.io}"
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

if [ -f "${ENV_FILE}" ] && sudo grep -q '^CAMPSITE_WATCH_API_TOKEN=' "${ENV_FILE}"; then
  TOKEN="$(sudo sed -n 's/^CAMPSITE_WATCH_API_TOKEN=//p' "${ENV_FILE}" | head -1)"
else
  TOKEN="$(openssl rand -base64 32)"
  printf 'CAMPSITE_WATCH_API_TOKEN=%s\n' "${TOKEN}" | sudo tee "${ENV_FILE}" >/dev/null
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
ExecStart=${APP_DIR}/.venv/bin/campsite-watch --serve-api --api-host 127.0.0.1 --api-port ${API_PORT} --results-json ${APP_DIR}/data/latest-results.json --allowed-origin ${ALLOWED_ORIGIN}
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable --now "${SERVICE_NAME}"

echo "Checking API health..."
curl --fail --silent "http://127.0.0.1:${API_PORT}/healthz" >/dev/null

if command -v tailscale >/dev/null 2>&1; then
  echo "Configuring Tailscale Serve for tailnet-only HTTPS..."
  if sudo tailscale status >/dev/null 2>&1; then
    sudo tailscale serve --bg --https=443 "http://127.0.0.1:${API_PORT}" || true
    sudo tailscale serve status || true
  else
    echo "Tailscale is installed but not connected. Run: sudo tailscale up"
  fi
else
  echo "Tailscale command not found. Install/connect Tailscale, then run:"
  echo "  sudo tailscale serve --bg --https=443 http://127.0.0.1:${API_PORT}"
fi

cat <<EOF

Install complete.

API token:
${TOKEN}

Use this in the website refresh/NAS setup prompt:
  URL:   https://<nas-device>.<tailnet-name>.ts.net
  Token: ${TOKEN}

Service commands:
  sudo systemctl status ${SERVICE_NAME}
  sudo journalctl -u ${SERVICE_NAME} -f

Next step:
  Edit ${APP_DIR}/config.toml for real campsite watches, then initialize the browser profile:
  cd ${APP_DIR}
  ${APP_DIR}/.venv/bin/campsite-watch --config ${APP_DIR}/config.toml --init-browser
EOF

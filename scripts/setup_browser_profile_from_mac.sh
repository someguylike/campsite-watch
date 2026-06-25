#!/usr/bin/env bash
set -euo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
NAS_HOST="${NAS_HOST:-nampham-server}"
NAS_USER="${NAS_USER:-$USER}"
NAS_APP_DIR="${NAS_APP_DIR:-/opt/campsite-watch}"
NAS_PROFILE_DIR="${NAS_PROFILE_DIR:-${NAS_APP_DIR}/browser-profile}"
NAS_SERVICE="${NAS_SERVICE:-campsite-watch-api}"
LOCAL_PROFILE_DIR="${LOCAL_PROFILE_DIR:-${REPO_DIR}/browser-profile}"
SOURCE_CONFIG="${SOURCE_CONFIG:-${REPO_DIR}/config.toml}"
TEMP_CONFIG="${REPO_DIR}/.config.mac-browser-profile.toml"

if [ ! -f "${SOURCE_CONFIG}" ]; then
  SOURCE_CONFIG="${REPO_DIR}/config.example.toml"
fi

cd "${REPO_DIR}"

echo "Preparing local Python environment..."
python3 -m venv .venv
.venv/bin/python -m pip install --upgrade pip
.venv/bin/python -m pip install -e ".[browser]"
.venv/bin/python -m playwright install chromium

mkdir -p "${LOCAL_PROFILE_DIR}"

echo "Writing temporary config for local browser profile..."
.venv/bin/python - "${SOURCE_CONFIG}" "${TEMP_CONFIG}" "${LOCAL_PROFILE_DIR}" <<'PY'
from pathlib import Path
import sys

source = Path(sys.argv[1])
target = Path(sys.argv[2])
profile = Path(sys.argv[3]).resolve()
lines = source.read_text(encoding="utf-8").splitlines()
in_browser = False
updated = False
out: list[str] = []

for line in lines:
    stripped = line.strip()
    if stripped.startswith("[") and stripped.endswith("]"):
        in_browser = stripped == "[browser]"
    if in_browser and stripped.startswith("user_data_dir"):
        out.append(f'user_data_dir = "{profile}"')
        updated = True
    else:
        out.append(line)

if not updated:
    out.extend(["", "[browser]", f'user_data_dir = "{profile}"'])

target.write_text("\n".join(out) + "\n", encoding="utf-8")
PY

echo
echo "A Chromium window will open. Complete the campsite site challenge/login, then return here and press Enter."
.venv/bin/campsite-watch --config "${TEMP_CONFIG}" --init-browser

echo "Copying browser profile to ${NAS_USER}@${NAS_HOST}:${NAS_PROFILE_DIR}..."
ssh "${NAS_USER}@${NAS_HOST}" "sudo systemctl stop '${NAS_SERVICE}' || true && sudo mkdir -p '${NAS_PROFILE_DIR}' && sudo chown -R '${NAS_USER}:${NAS_USER}' '${NAS_PROFILE_DIR}'"
rsync -az --delete "${LOCAL_PROFILE_DIR}/" "${NAS_USER}@${NAS_HOST}:${NAS_PROFILE_DIR}/"
ssh "${NAS_USER}@${NAS_HOST}" "sudo chown -R '${NAS_USER}:${NAS_USER}' '${NAS_PROFILE_DIR}' && sudo systemctl start '${NAS_SERVICE}'"

rm -f "${TEMP_CONFIG}"

echo
echo "Done. NAS browser profile was replaced and ${NAS_SERVICE} was restarted."

#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/campsite-watch}"
REPO_DIR="${REPO_DIR:-${HOME}/campsite-watch}"
RESULTS_JSON="${RESULTS_JSON:-${APP_DIR}/data/latest-results.json}"
PUBLIC_JSON="${PUBLIC_JSON:-${REPO_DIR}/docs/latest-results.json}"
COMMIT_MESSAGE="${COMMIT_MESSAGE:-Update public campsite snapshot}"

if [ ! -f "${RESULTS_JSON}" ]; then
  echo "Missing NAS results file: ${RESULTS_JSON}" >&2
  exit 1
fi

if ! python3 -m json.tool "${RESULTS_JSON}" >/dev/null; then
  echo "NAS results file is not valid JSON: ${RESULTS_JSON}" >&2
  exit 1
fi

if [ ! -d "${REPO_DIR}/.git" ]; then
  echo "Missing Git checkout: ${REPO_DIR}" >&2
  exit 1
fi

mkdir -p "$(dirname "${PUBLIC_JSON}")"
cp "${RESULTS_JSON}" "${PUBLIC_JSON}"

cd "${REPO_DIR}"
git add "${PUBLIC_JSON#${REPO_DIR}/}"

if git diff --cached --quiet; then
  echo "Public snapshot is already up to date."
  exit 0
fi

git commit -m "${COMMIT_MESSAGE}"
git push

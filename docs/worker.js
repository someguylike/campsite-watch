const summaryEl = document.querySelector("#worker-summary");
const refreshButton = document.querySelector("#worker-refresh-button");
const apiServiceDetails = document.querySelector("#api-service-details");
const refreshTimerDetails = document.querySelector("#refresh-timer-details");
const currentRefreshDetails = document.querySelector("#current-refresh-details");
const snapshotDetails = document.querySelector("#snapshot-details");
const timerOutput = document.querySelector("#timer-output");
const refreshLogOutput = document.querySelector("#refresh-log-output");
const apiLogOutput = document.querySelector("#api-log-output");

refreshButton.addEventListener("click", loadWorkerStatus);
loadWorkerStatus();
window.setInterval(loadWorkerStatus, 15000);

async function loadWorkerStatus() {
  refreshButton.disabled = true;
  try {
    const response = await fetch(`./api/worker-status?v=${Date.now()}`, { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    renderWorkerStatus(await response.json());
  } catch (error) {
    summaryEl.textContent = `Could not load worker status: ${error.message || error}`;
  } finally {
    refreshButton.disabled = false;
  }
}

function renderWorkerStatus(payload) {
  const service = payload.service || {};
  const timer = payload.refreshTimer || {};
  const refresh = payload.refreshStatus || {};
  const generated = payload.generatedAt ? `Updated ${formatDateTime(payload.generatedAt)}` : "Updated just now";
  summaryEl.textContent = `${generated}. API ${service.ActiveState || "unknown"}; timer ${timer.ActiveState || "unknown"}; refresh ${refresh.status || "unknown"}.`;

  renderDetails(apiServiceDetails, [
    ["State", statusText(service.ActiveState, service.SubState)],
    ["Loaded", service.LoadState || "unknown"],
    ["Enabled", service.UnitFileState || "unknown"],
    ["Result", service.Result || "n/a"],
    ["Started", formatDateTime(service.ActiveEnterTimestamp)],
  ]);

  renderDetails(refreshTimerDetails, [
    ["State", statusText(timer.ActiveState, timer.SubState)],
    ["Enabled", timer.UnitFileState || "unknown"],
    ["Next run", formatDateTime(timer.NextElapseUSecRealtime)],
    ["Last trigger", formatDateTime(timer.LastTriggerUSec)],
    ["Result", timer.Result || "n/a"],
  ]);

  renderDetails(currentRefreshDetails, [
    ["Status", refresh.status || "unknown"],
    ["Message", refresh.message || ""],
    ["Current", currentRefreshText(refresh) || "n/a"],
    ["Progress", progressText(refresh)],
    ["Updated", formatDateTime(refresh.updatedAt)],
  ]);

  snapshotDetails.innerHTML = (payload.snapshots || [])
    .map((item) => `
      <div class="worker-list-row">
        <span>${escapeHtml(shortPath(item.path))}</span>
        <strong>${item.exists ? `${formatBytes(item.size)} · ${escapeHtml(formatDateTime(item.modifiedAt))}` : "missing"}</strong>
      </div>
    `)
    .join("");

  timerOutput.textContent = commandText(payload.timers);
  refreshLogOutput.textContent = commandText(payload.refreshLogs);
  apiLogOutput.textContent = commandText(payload.apiLogs);
}

function renderDetails(node, rows) {
  node.innerHTML = rows
    .map(([label, value]) => `<dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value || "n/a")}</dd>`)
    .join("");
}

function currentRefreshText(refresh) {
  if (!refresh.currentPark && !refresh.phase) return "";
  const parts = [
    phaseLabel(refresh.phase),
    refresh.currentPark,
    refresh.currentStart || refresh.currentEnd
      ? `${formatDate(refresh.currentStart || refresh.currentEnd)}-${formatDate(refresh.currentEnd || refresh.currentStart)}`
      : "",
  ].filter(Boolean);
  return parts.join(" · ");
}

function progressText(refresh) {
  const checked = Number(refresh.checked || 0);
  const total = Number(refresh.total || 0);
  const found = Number(refresh.found || 0);
  return total ? `${checked}/${total}; ${found} found` : `${found} found`;
}

function commandText(result) {
  if (!result) return "";
  const output = [result.stdout, result.stderr].filter(Boolean).join("\n");
  return output || `No output. Exit code ${result.returnCode ?? "unknown"}.`;
}

function statusText(active, substate) {
  return [active, substate].filter(Boolean).join(" / ") || "unknown";
}

function phaseLabel(phase) {
  return {
    metadata: "Loading park metadata",
    prepared: "Prepared checks",
    resources: "Loading campsite resources",
    availability: "Checking availability",
    running: "Working",
  }[phase] || "";
}

function shortPath(path) {
  return String(path || "").replace(/^\/opt\/campsite-watch\//, "");
}

function formatBytes(value) {
  const size = Number(value || 0);
  if (size > 1024 * 1024) return `${(size / 1024 / 1024).toFixed(1)} MB`;
  if (size > 1024) return `${Math.round(size / 1024)} KB`;
  return `${size} B`;
}

function formatDateTime(value) {
  if (!value || value === "n/a") return "";
  const normalized = String(value).replace(/ UTC$/, "Z");
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
  }).format(date);
}

function formatDate(value) {
  if (!value) return "";
  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(date);
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  })[char]);
}

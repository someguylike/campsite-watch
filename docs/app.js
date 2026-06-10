const ORIGIN = "98040";
const ORIGIN_COORDS = [47.5707, -122.2221];
const DEFAULT_API_BASE_URL = "https://nampham-server.tail74e1b3.ts.net";
const API_BASE_STORAGE_KEY = "campsite-watch.apiBaseUrl";
const routeCache = new Map();

const parks = {
  "Blake Island State Park": {
    city: "Manchester",
    zip: "98353",
    lat: 47.54247,
    lon: -122.4834,
    distanceMiles: 12,
    resourceLocationId: -2147483640,
    transactionLocationId: -2147483641,
    mapId: -2147483404,
    accessNote: "Water access only",
  },
  "Saltwater State Park": {
    city: "Des Moines",
    zip: "98198",
    lat: 47.37473,
    lon: -122.321,
    distanceMiles: 14,
    resourceLocationId: -2147483561,
    transactionLocationId: -2147483585,
    mapId: -2147483419,
  },
  "Manchester State Park": {
    city: "Port Orchard",
    zip: "98366",
    lat: 47.57732,
    lon: -122.5563,
    distanceMiles: 16,
    resourceLocationId: -2147483589,
    transactionLocationId: -2147483603,
    mapId: -2147483371,
  },
  "Illahee State Park": {
    city: "Bremerton",
    zip: "98310",
    lat: 47.59558,
    lon: -122.5974,
    distanceMiles: 18,
    resourceLocationId: -2147483607,
    transactionLocationId: -2147483616,
    mapId: -2147483380,
  },
  "Dash Point State Park": {
    city: "Federal Way",
    zip: "98023",
    lat: 47.31779,
    lon: -122.4071,
    distanceMiles: 19,
    resourceLocationId: -2147483625,
    transactionLocationId: -2147483631,
    mapId: -2147483389,
  },
  "Kanaskat-Palmer State Park": {
    city: "Ravensdale",
    zip: "98051",
    lat: 47.31198,
    lon: -121.8987,
    distanceMiles: 23,
    resourceLocationId: -2147483601,
    transactionLocationId: -2147483614,
    mapId: -2147483379,
  },
  "Kitsap Memorial State Park": {
    city: "Poulsbo",
    zip: "98370",
    lat: 47.81642,
    lon: -122.6444,
    distanceMiles: 26,
    resourceLocationId: -2147483600,
    transactionLocationId: -2147483613,
    mapId: -2147483378,
  },
  "Scenic Beach State Park": {
    city: "Seabeck",
    zip: "98380",
    lat: 47.64626,
    lon: -122.8469,
    distanceMiles: 30,
    resourceLocationId: -2147483560,
    transactionLocationId: -2147483584,
    mapId: -2147483359,
  },
  "Belfair State Park": {
    city: "Belfair",
    zip: "98528",
    lat: 47.43167,
    lon: -122.877,
    distanceMiles: 32,
    resourceLocationId: -2147483643,
    transactionLocationId: -2147483643,
    mapId: -2147483319,
  },
  "Wallace Falls State Park": {
    city: "Gold Bar",
    zip: "98251",
    lat: 47.86565,
    lon: -121.68,
    distanceMiles: 32,
    resourceLocationId: -2147483545,
    transactionLocationId: -2147483572,
    mapId: -2147483351,
  },
};

const availability = [
  result("2026-07-10", "2026-07-12", "Blake Island State Park", 12, 1, [["Main Loop", "21"]]),
  result("2026-07-17", "2026-07-19", "Dash Point State Park", 19, 7, [
    ["A", "102"],
    ["A", "135"],
    ["A", "91"],
    ["A", "110"],
    ["A", "60"],
    ["B", "26"],
    ["B", "19"],
  ]),
  result("2026-07-24", "2026-07-26", "Manchester State Park", 16, 1, [["Upper Loop", "19"]]),
  result("2026-07-24", "2026-07-26", "Illahee State Park", 18, 1, [["Sites 1-25", "2"]]),
  result("2026-07-24", "2026-07-26", "Dash Point State Park", 19, 1, [["B", "26"]]),
  result("2026-07-24", "2026-07-26", "Belfair State Park", 32, 20, [
    ["Tree Loop", "344"],
    ["Tree Loop", "316"],
    ["Tree Loop", "303"],
    ["Tree Loop", "322"],
    ["Tree Loop", "333"],
    ["Tree Loop", "308"],
    ["Tree Loop", "307"],
    ["Tree Loop", "312"],
  ]),
  result("2026-07-31", "2026-08-02", "Blake Island State Park", 12, 6, [
    ["Main Loop", "5"],
    ["Main Loop", "6"],
    ["Main Loop", "10"],
    ["Main Loop", "11"],
    ["Main Loop", "19"],
    ["Main Loop", "21"],
  ]),
  result("2026-07-31", "2026-08-02", "Dash Point State Park", 19, 47, [
    ["A", "69"],
    ["A", "102"],
    ["A", "55"],
    ["A", "108"],
    ["A", "81"],
    ["A", "56"],
    ["A", "68"],
    ["A", "131"],
  ]),
  result("2026-07-31", "2026-08-02", "Belfair State Park", 32, 15, [
    ["Tree Loop", "306"],
    ["Tree Loop", "316"],
    ["Tree Loop", "327"],
    ["Tree Loop", "301"],
    ["Tree Loop", "338"],
    ["Tree Loop", "342"],
  ]),
  result("2026-08-07", "2026-08-09", "Blake Island State Park", 12, 4, [
    ["Main Loop", "9"],
    ["Main Loop", "10"],
    ["Main Loop", "19"],
    ["Main Loop", "21"],
  ]),
  result("2026-08-07", "2026-08-09", "Dash Point State Park", 19, 23, [
    ["A", "108"],
    ["A", "65"],
    ["A", "101"],
    ["A", "86"],
    ["A", "98"],
    ["A", "52"],
  ]),
  result("2026-08-14", "2026-08-16", "Blake Island State Park", 12, 3, [
    ["Main Loop", "9"],
    ["West Loop", "41"],
    ["West Loop", "45"],
  ]),
  result("2026-08-14", "2026-08-16", "Illahee State Park", 18, 4, [
    ["Sites 1-25", "2"],
    ["Sites 1-25", "23"],
    ["Sites 1-25", "14"],
    ["Sites 1-25", "15"],
  ]),
  result("2026-08-14", "2026-08-16", "Dash Point State Park", 19, 59, [
    ["A", "69"],
    ["A", "102"],
    ["A", "55"],
    ["A", "108"],
    ["A", "81"],
    ["A", "56"],
  ]),
  result("2026-08-14", "2026-08-16", "Kanaskat-Palmer State Park", 23, 1, [["Main", "36"]]),
  result("2026-08-14", "2026-08-16", "Belfair State Park", 32, 3, [
    ["Tree Loop", "333"],
    ["Tree Loop", "327"],
    ["Main Loop", "238"],
  ]),
  result("2026-08-21", "2026-08-23", "Blake Island State Park", 12, 7, [
    ["Main Loop", "5"],
    ["Main Loop", "6"],
    ["Main Loop", "9"],
    ["Main Loop", "19"],
    ["Main Loop", "22"],
  ]),
  result("2026-08-21", "2026-08-23", "Manchester State Park", 16, 1, [["Upper Loop", "19"]]),
  result("2026-08-21", "2026-08-23", "Illahee State Park", 18, 5, [
    ["Sites 1-25", "2"],
    ["Sites 1-25", "14"],
    ["Sites 1-25", "3"],
    ["Sites 1-25", "15"],
  ]),
  result("2026-08-21", "2026-08-23", "Dash Point State Park", 19, 47, [
    ["A", "102"],
    ["A", "108"],
    ["A", "81"],
    ["A", "131"],
    ["A", "128"],
  ]),
  result("2026-08-21", "2026-08-23", "Kanaskat-Palmer State Park", 23, 2, [
    ["Main", "21"],
    ["Main", "36"],
  ]),
  result("2026-08-21", "2026-08-23", "Belfair State Park", 32, 30, [
    ["Tree Loop", "311"],
    ["Tree Loop", "314"],
    ["Tree Loop", "344"],
    ["Tree Loop", "316"],
    ["Tree Loop", "303"],
  ]),
  result("2026-08-28", "2026-08-30", "Blake Island State Park", 12, 6, [
    ["Main Loop", "5"],
    ["Main Loop", "6"],
    ["Main Loop", "21"],
    ["Main Loop", "22"],
    ["Main Loop", "29"],
    ["West Loop", "41"],
  ]),
  result("2026-08-28", "2026-08-30", "Manchester State Park", 16, 12, [
    ["Lower Loop", "44"],
    ["Lower Loop", "26"],
    ["Lower Loop", "49"],
    ["Lower Loop", "27"],
    ["Lower Loop", "25"],
  ]),
  result("2026-08-28", "2026-08-30", "Illahee State Park", 18, 15, [
    ["Sites 1-25", "16"],
    ["Sites 1-25", "21"],
    ["Sites 1-25", "2"],
    ["Sites 1-25", "22"],
    ["Sites 1-25", "4"],
  ]),
  result("2026-08-28", "2026-08-30", "Dash Point State Park", 19, 83, [
    ["A", "69"],
    ["A", "102"],
    ["A", "55"],
    ["A", "108"],
    ["A", "81"],
  ]),
  result("2026-08-28", "2026-08-30", "Kitsap Memorial State Park", 26, 4, [
    ["Main", "38"],
    ["Main", "37"],
    ["Main", "28"],
    ["Main", "31"],
  ]),
  result("2026-08-28", "2026-08-30", "Belfair State Park", 32, 57, [
    ["Beach Loop", "143"],
    ["Beach Loop", "142"],
    ["Beach Loop", "103"],
    ["Beach Loop", "102"],
    ["Beach Loop", "128"],
  ]),
  result("2026-09-11", "2026-09-13", "Manchester State Park", 16, 35, [
    ["Upper Loop", "1"],
    ["Upper Loop", "5"],
    ["Upper Loop", "3"],
    ["Upper Loop", "6"],
  ]),
  result("2026-09-11", "2026-09-13", "Illahee State Park", 18, 21, [
    ["Sites 1-25", "16"],
    ["Sites 1-25", "9"],
    ["Sites 1-25", "21"],
    ["Sites 1-25", "2"],
  ]),
  result("2026-09-11", "2026-09-13", "Dash Point State Park", 19, 102, [
    ["A", "69"],
    ["A", "102"],
    ["A", "55"],
    ["A", "108"],
  ]),
  result("2026-09-11", "2026-09-13", "Kitsap Memorial State Park", 26, 23, [
    ["Main", "35"],
    ["Main", "26"],
    ["Main", "2"],
    ["Main", "23"],
  ]),
  result("2026-09-11", "2026-09-13", "Scenic Beach State Park", 30, 28, [
    ["Sites 1-50, HB1-HB2", "25"],
    ["Sites 1-50, HB1-HB2", "29"],
    ["Sites 1-50, HB1-HB2", "20"],
  ]),
  result("2026-09-11", "2026-09-13", "Belfair State Park", 32, 91, [
    ["Beach Loop", "143"],
    ["Beach Loop", "132"],
    ["Beach Loop", "123"],
  ]),
];

function result(date, end, park, distanceMiles, availableTentSites, sampleSites) {
  return {
    date,
    end,
    park,
    distanceMiles,
    availableTentSites,
    sampleSites,
    ...parks[park],
  };
}

const zipCoordinates = {
  "98040": { lat: 47.5707, lon: -122.2221, label: "98040" },
};

const siteMapIds = {
  [siteKey("Blake Island State Park", "Main Loop", "21")]: -2147483261,
};

const adaOnlySiteKeys = new Set([
  siteKey("Dash Point State Park", "B", "26"),
]);

const state = {
  origin: zipCoordinates[ORIGIN],
  originQuery: ORIGIN,
  maxDistance: 110,
  maxDriveMinutes: 180,
  partySize: 4,
  startDate: "",
  endDate: "",
  month: "any",
  dataMonths: [],
  coverageStatus: "unknown",
  directionFilter: "all",
  results: [],
};

const resultsEl = document.querySelector("#results");
const searchForm = document.querySelector("#search-form");
const zipInput = document.querySelector("#zip-input");
const distanceMode = document.querySelector("#distance-mode");
const distanceFilter = document.querySelector("#distance-filter");
const partySizeInput = document.querySelector("#party-size");
const startDateInput = document.querySelector("#start-date-input");
const endDateInput = document.querySelector("#end-date-input");
const monthFilter = document.querySelector("#month-filter");
const searchNote = document.querySelector("#search-note");
const searchButton = document.querySelector("#search-button");
const refreshButton = document.querySelector("#refresh-button");
const refreshAuth = document.querySelector("#refresh-auth");
const nasPasswordInput = document.querySelector("#nas-password-input");
const timingModeInputs = [...document.querySelectorAll("input[name='timingMode']")];
const timingCards = [...document.querySelectorAll("[data-mode-card]")];

populateDateFilters();
populateDistanceOptions();
updateTimingMode();

searchForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  await runSearch();
});

refreshButton.addEventListener("click", async () => {
  await triggerRefresh();
});

nasPasswordInput.addEventListener("keydown", async (event) => {
  if (event.key !== "Enter") return;
  event.preventDefault();
  await triggerRefresh();
});

distanceMode.addEventListener("change", populateDistanceOptions);

timingModeInputs.forEach((input) => input.addEventListener("change", updateTimingMode));

startDateInput.addEventListener("change", () => {
  setTimingMode("exact");
  syncDateRange();
});

endDateInput.addEventListener("change", () => {
  setTimingMode("exact");
  syncDateRange();
});

function syncDateRange() {
  if (startDateInput.value || endDateInput.value) {
    monthFilter.value = "any";
  }
  if (startDateInput.value) {
    endDateInput.min = addDaysIso(startDateInput.value, 1);
    if (endDateInput.value && endDateInput.value <= startDateInput.value) {
      endDateInput.value = endDateInput.min;
    }
  }
}

monthFilter.addEventListener("change", () => {
  setTimingMode("flexible");
  if (monthFilter.value !== "any") {
    startDateInput.value = "";
    endDateInput.value = "";
  }
});

document.querySelector("#location-button").addEventListener("click", () => {
  if (!navigator.geolocation) {
    toast("Browser location is not available.");
    return;
  }

  navigator.geolocation.getCurrentPosition(
    async (position) => {
      state.origin = {
        lat: position.coords.latitude,
        lon: position.coords.longitude,
        label: "Current location",
      };
      state.originQuery = `${position.coords.latitude},${position.coords.longitude}`;
      searchNote.textContent = "Using your browser location for distance estimates.";
      const zip = await resolveZipFromCoords(position.coords.latitude, position.coords.longitude);
      if (zip) {
        zipInput.value = zip;
        state.origin.label = zip;
        state.originQuery = zip;
        searchNote.textContent = "ZIP code was filled from your browser location.";
      }
      runSearch();
    },
    () => {
      toast("Location permission was not granted.");
    },
    { enableHighAccuracy: true, timeout: 8000 },
  );
});

document.querySelector("#sync-button")?.addEventListener("click", () => {
  const current = apiBase();
  const next = window.prompt("Private Tailscale NAS URL", current || DEFAULT_API_BASE_URL);
  if (next === null) return;

  const trimmed = next.trim().replace(/\/+$/, "");
  if (trimmed) {
    window.localStorage.setItem(API_BASE_STORAGE_KEY, trimmed);
    toast("NAS worker URL saved. Password is only needed for refresh.");
  } else {
    window.localStorage.removeItem(API_BASE_STORAGE_KEY);
    toast("NAS worker disconnected.");
  }
  runSearch();
});

async function runSearch({ queryNas = true } = {}) {
  setSearchBusy(true);
  try {
    await syncStateFromInputs();
    state.directionFilter = "all";
    const apiBaseUrl = apiBase();
    if (queryNas && apiBaseUrl) {
      searchNote.textContent = "Loading saved NAS results...";
    }
    const nasResult = queryNas && apiBaseUrl ? await fetchNasResults(apiBaseUrl) : null;
    if (nasResult?.error === "password_required") {
      state.results = [];
      state.coverageStatus = "unknown";
      searchNote.textContent = "Refresh requires the NAS password. Search can still read saved results without it.";
    } else if (nasResult?.error === "unauthorized") {
      state.results = [];
      state.coverageStatus = "unknown";
      searchNote.textContent = "Saved NAS results are not readable from this browser.";
    } else if (nasResult) {
      if (nasResult.error) {
        state.coverageStatus = "fallback";
        state.results = await prepareResults(availability);
        searchNote.textContent = `${nasErrorMessage(nasResult)} Showing the latest saved website snapshot.`;
      } else {
        state.coverageStatus = nasResult.coverageStatus || "checked";
        state.results = await prepareResults(nasResult.results, nasResult.checkedMonths);
        searchNote.textContent = nasResult.note;
      }
    } else {
      state.coverageStatus = "fallback";
      state.results = await prepareResults(availability);
      searchNote.textContent = !queryNas
        ? "Showing the saved website snapshot. Click Search campsites to query the NAS worker."
        : apiBaseUrl
        ? "NAS worker is unavailable or blocked. Showing the latest saved website snapshot."
        : "Showing the saved website snapshot.";
    }

    renderResults(state.results);
  } finally {
    setSearchBusy(false);
  }
}

async function syncStateFromInputs() {
  const zip = zipInput.value.trim();
  state.maxDistance = selectedDistanceMiles();
  state.maxDriveMinutes = selectedDriveMinutes();
  state.partySize = Number(partySizeInput.value);
  const selectedRange = normalizedSelectedDateRange();
  state.startDate = selectedRange.start;
  state.endDate = selectedRange.end;
  state.month = timingMode() === "flexible" ? monthFilter.value : "any";

  if (zip) {
    state.origin = await resolveOrigin(zip);
    state.originQuery = zip;
  }
}

async function triggerRefresh() {
  await syncStateFromInputs();
  const apiBaseUrl = apiBase();
  if (!apiBaseUrl) {
    searchNote.textContent = "NAS worker URL is not configured.";
    return;
  }

  refreshButton.disabled = true;
  refreshButton.textContent = "Refreshing...";
  searchNote.textContent = "Asking the NAS to refresh campsite data.";

  const result = await postNasRefresh(apiBaseUrl);
  if (result?.error === "password_required") {
    showRefreshAuth();
    searchNote.textContent = "Enter the NAS password to refresh availability.";
  } else if (result?.error === "unauthorized") {
    showRefreshAuth();
    nasPasswordInput.value = "";
    searchNote.textContent = "That refresh password did not work. Enter it again and retry.";
  } else if (result) {
    if (result.error) {
      searchNote.textContent = nasErrorMessage(result);
    } else {
      hideRefreshAuth();
      searchNote.textContent = refreshMessage(result);
      await pollRefreshStatus(apiBaseUrl);
      await runSearch();
    }
  } else {
    searchNote.textContent = "NAS refresh could not be started.";
  }

  refreshButton.disabled = false;
  refreshButton.textContent = "Refresh availability";
}

async function prepareResults(items, checkedMonths = null) {
  state.dataMonths = Array.isArray(checkedMonths) && checkedMonths.length ? checkedMonths : dataMonths(items);
  const routeCandidates = items
    .map(withFilteredSites)
    .filter((item) => item.availableTentSites > 0)
    .map((item) => ({
      ...item,
      airDistanceMiles: distanceMiles(state.origin, item),
      bearingDegrees: bearingDegrees(state.origin, item),
    }))
    .map(withDirection)
    .filter(matchesSearchBeforeRoute);

  const enriched = await mapLimit(routeCandidates, 6, withRouteEstimate);

  return enriched
    .filter(matchesSearch)
    .sort((a, b) => sortDistance(a) - sortDistance(b) || a.date.localeCompare(b.date));
}

async function mapLimit(items, limit, mapper) {
  const results = new Array(items.length);
  let nextIndex = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (nextIndex < items.length) {
      const index = nextIndex;
      nextIndex += 1;
      results[index] = await mapper(items[index]);
    }
  });
  await Promise.all(workers);
  return results;
}

function withFilteredSites(item) {
  const sampleSites = Array.isArray(item.sampleSites) ? item.sampleSites : [];
  const filteredSites = sampleSites.filter((site) => !isAdaOnlySite(item.park, site));
  const removedCount = sampleSites.length - filteredSites.length;
  const availableTentSites = Math.max(0, Number(item.availableTentSites || 0) - removedCount);

  return {
    ...item,
    availableTentSites,
    sampleSites: filteredSites,
  };
}

function isAdaOnlySite(park, site) {
  return Array.isArray(site) && adaOnlySiteKeys.has(siteKey(park, site[0], site[1]));
}

async function fetchNasResults(apiBaseUrl) {
  const url = nasUrl(apiBaseUrl, "/api/search");
  const payload = await fetchNasJson(url);
  if (payload?.error) return payload;
  if (!payload || !Array.isArray(payload.results)) return { error: "bad_response" };

  const source = payload.source === "live" ? "Live NAS result" : "Saved NAS fallback";
  const checked = payload.lastChecked ? ` · last checked ${formatDateTime(payload.lastChecked)}` : "";
  const checkedMonths = Array.isArray(payload.checkedMonths) ? payload.checkedMonths : dataMonths(payload.results);
  const requestedMonths = Array.isArray(payload.requestedMonths) ? payload.requestedMonths : [];
  const missingMonths = requestedMonths.filter((month) => !checkedMonths.includes(month));
  const coverageNote = missingMonths.length
    ? ` This saved data has not checked ${missingMonths.map(formatMonth).join(", ")} yet.`
    : "";
  return {
    results: payload.results,
    checkedMonths,
    coverageStatus: payload.coverageStatus || "checked",
    note: `${source}${checked}.${coverageNote}`,
  };
}

async function postNasRefresh(apiBaseUrl) {
  const url = nasUrl(apiBaseUrl, "/api/refresh");
  return fetchNasJson(url, { method: "POST" }, { requireAuth: true });
}

async function fetchRefreshStatus(apiBaseUrl) {
  return fetchNasJson(nasUrl(apiBaseUrl, "/api/refresh-status"));
}

async function fetchNasJson(url, options = {}, { requireAuth = false } = {}) {
  let timeout = 0;
  try {
    const controller = new AbortController();
    timeout = window.setTimeout(() => controller.abort(), 12000);
    const headers = { Accept: "application/json", ...(options.headers || {}) };
    if (requireAuth) {
      const password = apiPassword();
      if (!password) return { error: "password_required" };
      headers.Authorization = `Bearer ${password}`;
    }
    const response = await fetch(url.toString(), { ...options, headers, signal: controller.signal });
    window.clearTimeout(timeout);
    if (response.status === 401) return { error: "unauthorized" };
    if (!response.ok) return { error: "http", status: response.status };
    return response.json();
  } catch (error) {
    if (timeout) window.clearTimeout(timeout);
    return {
      error: error?.name === "AbortError" ? "timeout" : "network",
      message: error?.message || "",
    };
  }
}

function nasUrl(apiBaseUrl, path) {
  const url = new URL(path, apiBaseUrl);
  const windowRange = searchWindow();
  url.searchParams.set("zip", zipInput.value.trim() || ORIGIN);
  url.searchParams.set("people", String(state.partySize));
  url.searchParams.set("distanceMode", distanceMode.value);
  url.searchParams.set("distance", distanceMode.value === "hours" ? String(state.maxDriveMinutes) : String(state.maxDistance));
  url.searchParams.set("windowStart", windowRange.start);
  url.searchParams.set("windowEnd", windowRange.end);
  if (state.startDate || state.endDate) {
    url.searchParams.set("startDate", state.startDate || state.endDate);
    url.searchParams.set("endDate", state.endDate || state.startDate);
  } else if (state.month !== "any") {
    url.searchParams.set("month", state.month);
  }
  return url;
}

async function pollRefreshStatus(apiBaseUrl) {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    await sleep(3000);
    const status = await fetchRefreshStatus(apiBaseUrl);
    if (!status || status.error) return;
    searchNote.textContent = refreshMessage(status);
    if (status.status && !["queued", "running"].includes(status.status)) return;
  }
  searchNote.textContent = "NAS refresh is still running. Search again in a moment to load the latest snapshot.";
}

function refreshMessage(status) {
  const months = Array.isArray(status.requestedMonths) && status.requestedMonths.length
    ? ` (${status.requestedMonths.map(formatMonth).join(", ")})`
    : "";
  return `${status.message || "Refresh status updated."}${months}`;
}

function nasErrorMessage(result) {
  if (result.error === "timeout") {
    return "NAS request timed out. Make sure this browser is connected to Tailscale and try again.";
  }
  if (result.error === "network") {
    return "Could not reach the private NAS URL. Connect this browser/device to Tailscale, then try again.";
  }
  if (result.error === "http") {
    return `NAS request failed with HTTP ${result.status}.`;
  }
  if (result.error === "bad_response") {
    return "NAS returned an unexpected response.";
  }
  return "NAS refresh could not be started.";
}

function sleep(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

async function resolveOrigin(zip) {
  if (zipCoordinates[zip]) {
    return zipCoordinates[zip];
  }

  try {
    const response = await fetch(`https://api.zippopotam.us/us/${encodeURIComponent(zip)}`);
    if (!response.ok) {
      throw new Error("ZIP lookup failed");
    }
    const data = await response.json();
    const place = data.places[0];
    return {
      lat: Number(place.latitude),
      lon: Number(place.longitude),
      label: zip,
    };
  } catch {
    toast("Could not look up that ZIP. Using 98040.");
    zipInput.value = ORIGIN;
    return zipCoordinates[ORIGIN];
  }
}

async function resolveZipFromCoords(lat, lon) {
  try {
    const url = new URL("https://nominatim.openstreetmap.org/reverse");
    url.searchParams.set("format", "jsonv2");
    url.searchParams.set("lat", String(lat));
    url.searchParams.set("lon", String(lon));
    url.searchParams.set("zoom", "18");
    url.searchParams.set("addressdetails", "1");
    const response = await fetch(url.toString(), {
      headers: { Accept: "application/json" },
    });
    if (!response.ok) return "";
    const data = await response.json();
    return data.address?.postcode?.match(/\d{5}/)?.[0] ?? "";
  } catch {
    return "";
  }
}

function matchesSearch(item) {
  const monthMatches =
    state.month === "any" || item.date.startsWith(state.month) || item.end.startsWith(state.month);
  const windowRange = searchWindow();
  const distanceMatches =
    distanceMode.value === "hours"
      ? item.driveDurationMinutes && !accessNote(item)
        ? item.driveDurationMinutes <= state.maxDriveMinutes
        : item.airDistanceMiles <= state.maxDistance
      : distanceValueMiles(item) <= state.maxDistance;

  return (
    dateRangesOverlap(item.date, item.end, windowRange.start, windowRange.end) &&
    distanceMatches &&
    (!hasSelectedDateRange() || containsSelectedDateRange(item)) &&
    (hasSelectedDateRange() || monthMatches)
  );
}

function matchesSearchBeforeRoute(item) {
  const monthMatches =
    state.month === "any" || item.date.startsWith(state.month) || item.end.startsWith(state.month);
  const windowRange = searchWindow();
  const distanceMatches =
    distanceMode.value === "hours"
      ? item.airDistanceMiles <= state.maxDistance
      : item.airDistanceMiles <= state.maxDistance;

  return (
    dateRangesOverlap(item.date, item.end, windowRange.start, windowRange.end) &&
    distanceMatches &&
    (!hasSelectedDateRange() || containsSelectedDateRange(item)) &&
    (hasSelectedDateRange() || monthMatches)
  );
}

function populateDateFilters() {
  const windowRange = searchWindow();
  startDateInput.min = windowRange.start;
  startDateInput.max = windowRange.end;
  endDateInput.min = addDaysIso(windowRange.start, 1);
  endDateInput.max = windowRange.end;

  const months = monthsInRange(windowRange.start, windowRange.end);
  monthFilter.insertAdjacentHTML(
    "beforeend",
    months
      .map((month) => `<option value="${month}">${formatMonth(month)}</option>`)
      .join(""),
  );
}

function searchWindow() {
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  return {
    start: formatIsoDate(today),
    end: formatIsoDate(addMonths(today, 6)),
  };
}

function addMonths(date, months) {
  const result = new Date(date);
  const day = result.getDate();
  result.setMonth(result.getMonth() + months);
  if (result.getDate() !== day) {
    result.setDate(0);
  }
  return result;
}

function addDaysIso(value, days) {
  const date = new Date(`${value}T12:00:00`);
  date.setDate(date.getDate() + days);
  return formatIsoDate(date);
}

function formatIsoDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function monthsInRange(start, end) {
  const current = new Date(`${start.slice(0, 7)}-01T12:00:00`);
  const last = new Date(`${end.slice(0, 7)}-01T12:00:00`);
  const months = [];

  while (current <= last) {
    months.push(`${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, "0")}`);
    current.setMonth(current.getMonth() + 1);
  }

  return months;
}

function dateRangesOverlap(startA, endA, startB, endB) {
  return startA < endB && endA > startB;
}

function populateDistanceOptions() {
  const defaultValue = distanceMode.value === "miles" ? "80" : "180";
  const selectedValue = distanceFilter.value || defaultValue;
  const options =
    distanceMode.value === "miles"
      ? [
          ["20", "20 miles"],
          ["30", "30 miles"],
          ["50", "50 miles"],
          ["80", "80 miles"],
        ]
      : [
          ["60", "Up to 1 hour"],
          ["120", "Up to 2 hours"],
          ["180", "Up to 3 hours"],
          ["240", "Up to 4 hours"],
          ["300", "Up to 5 hours"],
        ];

  const validValue = options.some(([value]) => value === selectedValue) ? selectedValue : defaultValue;
  distanceFilter.innerHTML = options
    .map(
      ([value, label]) =>
        `<option value="${value}"${value === validValue ? " selected" : ""}>${label}</option>`,
    )
    .join("");
}

function selectedDistanceMiles() {
  if (distanceMode.value === "hours") {
    return (
      {
        60: 35,
        120: 70,
        180: 110,
        240: 150,
        300: 190,
      }[Number(distanceFilter.value)] ?? 70
    );
  }
  return Number(distanceFilter.value);
}

function selectedDriveMinutes() {
  return distanceMode.value === "hours" ? Number(distanceFilter.value) : Infinity;
}

function distanceLabel() {
  const selected = distanceFilter.options[distanceFilter.selectedIndex];
  return selected ? selected.textContent : `${state.maxDistance} miles`;
}

function driveTimeLabel(value) {
  return (
    {
      20: "about 1 hour",
      30: "about 1-2 hours",
      50: "about 2 hours",
      60: "up to 1 hour",
      80: "about 3-4 hours",
      120: "up to 2 hours",
      180: "up to 3 hours",
      240: "up to 4 hours",
      300: "up to 5 hours",
    }[Number(value)] ?? `${value} miles`
  );
}

function apiBase() {
  return window.CAMPSITE_WATCH_API_BASE_URL || window.localStorage.getItem(API_BASE_STORAGE_KEY) || DEFAULT_API_BASE_URL;
}

function apiPassword() {
  return nasPasswordInput.value.trim();
}

function setSearchBusy(isBusy) {
  searchButton.disabled = isBusy;
  searchButton.textContent = isBusy ? "Searching..." : "Search campsites";
}

function showRefreshAuth() {
  refreshAuth.hidden = false;
  nasPasswordInput.focus();
}

function hideRefreshAuth() {
  refreshAuth.hidden = true;
  nasPasswordInput.value = "";
}

function timingMode() {
  return timingModeInputs.find((input) => input.checked)?.value || "flexible";
}

function setTimingMode(mode) {
  const input = timingModeInputs.find((item) => item.value === mode);
  if (input && !input.checked) {
    input.checked = true;
  }
  updateTimingMode();
}

function updateTimingMode() {
  const mode = timingMode();
  timingCards.forEach((card) => {
    const active = card.dataset.modeCard === mode;
    card.classList.toggle("is-active", active);
    card.querySelectorAll("input, select").forEach((control) => {
      control.disabled = !active;
    });
  });
}

function formatDateTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function hasSelectedDateRange() {
  return Boolean(state.startDate || state.endDate);
}

function selectedDateRange() {
  if (state.startDate && state.endDate) {
    return { start: state.startDate, end: state.endDate };
  }
  if (state.startDate) {
    return { start: state.startDate, end: addDaysIso(state.startDate, 1) };
  }
  if (state.endDate) {
    return { start: addDaysIso(state.endDate, -1), end: state.endDate };
  }
  return { start: "", end: "" };
}

function normalizedSelectedDateRange() {
  if (timingMode() !== "exact") {
    return { start: "", end: "" };
  }
  const start = startDateInput.value || (endDateInput.value ? addDaysIso(endDateInput.value, -1) : "");
  const end = endDateInput.value || (start ? addDaysIso(start, 1) : "");

  if (start && end && end <= start) {
    return { start, end: addDaysIso(start, 1) };
  }

  return { start, end };
}

function containsSelectedDateRange(item) {
  const range = selectedDateRange();
  return Boolean(range.start && range.end && item.date <= range.start && item.end >= range.end);
}

function bookingRange(item) {
  if (hasSelectedDateRange()) {
    return selectedDateRange();
  }
  return { start: item.date, end: item.end };
}

function stayLabel(item) {
  const range = bookingRange(item);
  const nights = nightsBetween(range.start, range.end);
  return `${nights} night${nights === 1 ? "" : "s"} · ${formatDate(range.start)}-${formatDate(range.end)} checkout`;
}

function renderResults(items) {
  if (!items.length) {
    resultsEl.innerHTML = `<article class="result-card"><h2>No available campsites found</h2><p class="meta">${escapeHtml(noResultsMessage())}</p></article>`;
    return;
  }

  const visibleItems = state.directionFilter === "all"
    ? items
    : items.filter((item) => item.direction === state.directionFilter);
  const body = visibleItems.length
    ? groupResultsByPark(visibleItems)
    .map((group) => {
      const firstItem = group.items[0];
      const weekends = group.items.length;
      return `
        <article id="${parkDomId(group.park)}" class="result-card" data-park="${escapeHtml(group.park)}">
          ${parkImageMarkup(firstItem)}
          <div class="result-header">
            <div>
              <div class="park-title-row">
                <h2 class="park-name">
                  <a href="${escapeHtml(safeExternalUrl(parkInfoUrl(firstItem), "https://parks.wa.gov/"))}" target="_blank" rel="noreferrer">${escapeHtml(group.park)}</a>
                </h2>
                <a class="park-title-link" href="${escapeHtml(googleMapsPlaceUrl(firstItem))}" target="_blank" rel="noreferrer">Google Maps</a>
                <span class="direction-chip" title="${escapeHtml(directionTitle(firstItem))}">
                  <span class="direction-arrow" style="transform: rotate(${Math.round(firstItem.bearingDegrees || 0)}deg)">↑</span>
                  ${escapeHtml(firstItem.direction || "")}
                </span>
                ${accessNote(firstItem) ? `<span class="access-badge">${escapeHtml(accessNote(firstItem))}</span>` : ""}
              </div>
              <div class="meta">${escapeHtml(locationText(firstItem))} · ${escapeHtml(distanceText(firstItem))} from ${escapeHtml(state.origin.label)}</div>
            </div>
            <div class="badge">${weekends} weekend${weekends === 1 ? "" : "s"}</div>
          </div>
          <div class="weekend-list">
            ${group.items.map(renderWeekendRow).join("")}
          </div>
          <a class="directions-link park-directions-link" href="${escapeHtml(directionsUrl(firstItem))}" target="_blank" rel="noreferrer">Directions</a>
        </article>
      `;
    })
    .join("")
    : `<article class="result-card"><h2>No ${escapeHtml(directionName(state.directionFilter))} results</h2><p class="meta">Choose another direction or clear the direction filter.</p></article>`;

  resultsEl.innerHTML = `${renderProximitySummary(items)}${body}`;
  bindProximityControls();
}

function groupResultsByPark(items) {
  const groups = new Map();
  for (const item of items) {
    if (!groups.has(item.park)) {
      groups.set(item.park, { park: item.park, items: [] });
    }
    groups.get(item.park).items.push(item);
  }
  return [...groups.values()];
}

function parkImageMarkup(item) {
  const imageUrls = parkImageUrls(item).slice(0, 5);
  if (!imageUrls.length) return "";
  const credit = item.imageCredit ? `<span>Photo: ${escapeHtml(item.imageCredit)}</span>` : "";
  const photos = imageUrls
    .map(
      (url, index) =>
        `<img class="park-photo" src="${escapeHtml(url)}" alt="${escapeHtml(item.park)} photo ${index + 1}" loading="lazy" />`,
    )
    .join("");
  return `
    <a class="park-photo-link" href="${escapeHtml(safeExternalUrl(parkInfoUrl(item), "https://parks.wa.gov/"))}" target="_blank" rel="noreferrer">
      <span class="park-photo-grid photo-count-${imageUrls.length}">${photos}</span>
      ${credit ? `<span class="photo-credit">${credit}</span>` : ""}
    </a>
  `;
}

function parkImageUrls(item) {
  const urls = Array.isArray(item.imageUrls) && item.imageUrls.length ? item.imageUrls : [item.imageUrl];
  return urls.map((url) => safeExternalUrl(url, "")).filter(Boolean);
}

function renderProximitySummary(items) {
  const counts = directionCounts(items);
  const chips = ["all", "N", "NE", "E", "SE", "S", "SW", "W", "NW"]
    .filter((direction) => direction === "all" || counts.get(direction))
    .map((direction) => {
      const active = state.directionFilter === direction;
      const count = direction === "all" ? new Set(items.map((item) => item.park)).size : counts.get(direction);
      return `<button class="direction-filter${active ? " is-active" : ""}" type="button" data-direction="${direction}">${escapeHtml(directionName(direction))} <span>${count}</span></button>`;
    })
    .join("");

  return `
    <section class="proximity-panel" aria-label="Direction from origin">
      <div>
        <h2>Direction from ${escapeHtml(state.origin.label)}</h2>
        <p class="meta">Use this as a quick mental map of where the available parks sit relative to your starting point.</p>
      </div>
      ${renderCompassPlot(items)}
      <div class="direction-filters">${chips}</div>
    </section>
  `;
}

function renderCompassPlot(items) {
  const parksByName = groupResultsByPark(items).map((group) => group.items[0]);
  const maxDistance = Math.max(1, ...parksByName.map((item) => distanceValueMiles(item) || item.airDistanceMiles || 0));
  const points = parksByName
    .map((item) => {
      const radians = ((item.bearingDegrees || 0) - 90) * Math.PI / 180;
      const distance = Math.min(1, (distanceValueMiles(item) || item.airDistanceMiles || 0) / maxDistance);
      const radius = 18 + distance * 58;
      const x = 90 + Math.cos(radians) * radius;
      const y = 90 + Math.sin(radians) * radius;
      const size = Math.min(9, 4 + Math.sqrt(Math.max(1, Number(item.availableTentSites || 1))) / 2);
      return `<a href="#${parkDomId(item.park)}" aria-label="${escapeHtml(item.park)} ${escapeHtml(item.direction || "")}"><circle class="compass-point" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${size.toFixed(1)}"><title>${escapeHtml(item.park)} · ${escapeHtml(item.direction || "")} · ${escapeHtml(distanceText(item))}</title></circle></a>`;
    })
    .join("");

  return `
    <svg class="compass-plot" viewBox="0 0 180 180" role="img" aria-label="Available parks by direction and distance">
      <circle class="compass-ring" cx="90" cy="90" r="72"></circle>
      <circle class="compass-ring" cx="90" cy="90" r="45"></circle>
      <line class="compass-axis" x1="90" y1="12" x2="90" y2="168"></line>
      <line class="compass-axis" x1="12" y1="90" x2="168" y2="90"></line>
      <text x="90" y="18" text-anchor="middle">N</text>
      <text x="90" y="172" text-anchor="middle">S</text>
      <text x="166" y="86" text-anchor="middle">E</text>
      <text x="14" y="86" text-anchor="middle">W</text>
      <circle class="origin-point" cx="90" cy="90" r="5"></circle>
      ${points}
    </svg>
  `;
}

function bindProximityControls() {
  resultsEl.querySelectorAll("[data-direction]").forEach((button) => {
    button.addEventListener("click", () => {
      state.directionFilter = button.dataset.direction || "all";
      renderResults(state.results);
    });
  });
}

function directionCounts(items) {
  const parksByDirection = new Map();
  for (const group of groupResultsByPark(items)) {
    const direction = group.items[0].direction || "N";
    if (!parksByDirection.has(direction)) parksByDirection.set(direction, new Set());
    parksByDirection.get(direction).add(group.park);
  }
  return new Map([...parksByDirection.entries()].map(([direction, parks]) => [direction, parks.size]));
}

function renderWeekendRow(item) {
  const firstSite = item.sampleSites[0];
  return `
    <section class="weekend-row" aria-label="${escapeHtml(item.park)} ${formatDate(item.date)} to ${formatDate(item.end)}">
      <div class="weekend-row-header">
        <div>
          <h3>${formatDate(item.date)}-${formatDate(item.end)}</h3>
          <p>${stayLabel(item)}</p>
          <p>${sampleSiteText(item)}</p>
        </div>
        <span class="weekend-site-count">${item.availableTentSites} sites</span>
      </div>
      <ul class="site-list">${renderSiteLinks(item)}</ul>
      <div class="card-actions">
        <div class="link-group">
          <a class="directions-link reserve-link" href="${escapeHtml(reservationUrl(item, firstSite))}" target="_blank" rel="noreferrer">${reservationLabel(item, firstSite)}</a>
        </div>
        <span class="status-line">1 tent · ${state.partySize} people</span>
      </div>
    </section>
  `;
}

function renderSiteLinks(item) {
  return item.sampleSites
    .map((site) => {
      const directSite = hasDistinctSiteReservationUrl(item, site);
      const title = directSite ? "Open booking with this campsite selected" : "Open this park and weekend";
      return `<li><a class="site-chip${directSite ? " direct-site" : ""}" href="${escapeHtml(reservationUrl(item, site))}" target="_blank" rel="noreferrer" title="${escapeHtml(title)}">${escapeHtml(site[0])} ${escapeHtml(site[1])}</a></li>`;
    })
    .join("");
}

function dataMonths(items) {
  return [...new Set(
    items.flatMap((item) => [String(item.date || "").slice(0, 7), String(item.end || "").slice(0, 7)]),
  )]
    .filter((month) => /^\d{4}-\d{2}$/.test(month))
    .sort();
}

function noResultsMessage() {
  const range = selectedDateRange();
  const selectedMonth = range.start ? range.start.slice(0, 7) : state.month;
  if (selectedMonth && selectedMonth !== "any" && !state.dataMonths.includes(selectedMonth)) {
    const checked = state.dataMonths.length ? state.dataMonths.map(formatMonth).join(", ") : "no saved months";
    return `No checked campsite data for ${formatMonth(selectedMonth)} yet. Current saved results cover ${checked}.`;
  }
  if (state.coverageStatus === "not_checked") {
    const checked = state.dataMonths.length ? state.dataMonths.map(formatMonth).join(", ") : "no saved months";
    return `The NAS fallback has not checked the full selected window yet. Current saved results cover ${checked}.`;
  }
  return "Try a larger distance, a different weekend, or fewer people.";
}

function directionsUrl(item) {
  const origin = encodeURIComponent(state.originQuery);
  const destination = encodeURIComponent(destinationText(item));
  return `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}`;
}

function googleMapsPlaceUrl(item) {
  const query = encodeURIComponent(destinationText(item));
  return `https://www.google.com/maps/search/?api=1&query=${query}`;
}

function destinationText(item) {
  if (Number.isFinite(Number(item.lat)) && Number.isFinite(Number(item.lon))) {
    return `${item.lat},${item.lon}`;
  }
  return [item.park, item.city, item.zip ? `WA ${item.zip}` : "WA"].filter(Boolean).join(", ");
}

function locationText(item) {
  const parts = [item.city, item.zip].filter(Boolean);
  return parts.length ? parts.join(", ") : "Washington";
}

function parkInfoUrl(item) {
  if (item.parkUrl) return safeExternalUrl(item.parkUrl, "https://parks.wa.gov/");
  return `https://parks.wa.gov/find-parks/state-parks/${parkSlug(item.park)}`;
}

function accessNote(item) {
  if (item.accessNote) return String(item.accessNote);
  return item.park === "Blake Island State Park" ? "Water access only" : "";
}

function safeExternalUrl(value, fallback) {
  try {
    const url = new URL(String(value));
    if (url.protocol !== "https:") return fallback;
    const allowedHosts = new Set(["parks.wa.gov", "www.google.com", "washington.goingtocamp.com"]);
    return allowedHosts.has(url.hostname) ? url.toString() : fallback;
  } catch {
    return fallback;
  }
}

function parkSlug(name) {
  return String(name)
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

async function withRouteEstimate(item) {
  const key = `${state.origin.lat.toFixed(4)},${state.origin.lon.toFixed(4)}|${item.lat},${item.lon}`;
  if (routeCache.has(key)) {
    return { ...item, ...routeCache.get(key) };
  }

  try {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 3500);
    const url = new URL(
      `https://router.project-osrm.org/route/v1/driving/${state.origin.lon},${state.origin.lat};${item.lon},${item.lat}`,
    );
    url.searchParams.set("overview", "false");
    url.searchParams.set("alternatives", "false");
    url.searchParams.set("steps", "false");
    const response = await fetch(url.toString(), { signal: controller.signal });
    window.clearTimeout(timeout);
    if (!response.ok) throw new Error("route failed");
    const data = await response.json();
    const route = data.routes?.[0];
    if (!route) throw new Error("route missing");
    const estimate = {
      driveDistanceMiles: route.distance / 1609.34,
      driveDurationMinutes: route.duration / 60,
    };
    routeCache.set(key, estimate);
    return { ...item, ...estimate };
  } catch {
    routeCache.set(key, {});
    return item;
  }
}

function distanceMiles(origin, item) {
  const radians = Math.PI / 180;
  const dlat = (item.lat - origin.lat) * radians;
  const dlon = (item.lon - origin.lon) * radians;
  const a =
    Math.sin(dlat / 2) ** 2 +
    Math.cos(origin.lat * radians) * Math.cos(item.lat * radians) * Math.sin(dlon / 2) ** 2;
  return 3958.8 * 2 * Math.asin(Math.sqrt(a));
}

function bearingDegrees(origin, item) {
  const originLat = origin.lat * Math.PI / 180;
  const itemLat = item.lat * Math.PI / 180;
  const deltaLon = (item.lon - origin.lon) * Math.PI / 180;
  const y = Math.sin(deltaLon) * Math.cos(itemLat);
  const x = Math.cos(originLat) * Math.sin(itemLat) - Math.sin(originLat) * Math.cos(itemLat) * Math.cos(deltaLon);
  return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
}

function withDirection(item) {
  const direction = cardinalDirection(item.bearingDegrees);
  return { ...item, direction };
}

function cardinalDirection(bearing) {
  const directions = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  return directions[Math.round(((bearing || 0) % 360) / 45) % 8];
}

function directionName(direction) {
  return (
    {
      all: "All directions",
      N: "North",
      NE: "Northeast",
      E: "East",
      SE: "Southeast",
      S: "South",
      SW: "Southwest",
      W: "West",
      NW: "Northwest",
    }[direction] || direction
  );
}

function directionTitle(item) {
  return `${directionName(item.direction)} of ${state.origin.label}`;
}

function parkDomId(name) {
  return `park-${String(name).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`;
}

function distanceValueMiles(item) {
  return item.driveDistanceMiles ?? item.airDistanceMiles;
}

function sortDistance(item) {
  return distanceMode.value === "hours" ? item.driveDurationMinutes ?? item.airDistanceMiles * 2 : distanceValueMiles(item);
}

function distanceText(item) {
  if (accessNote(item)) {
    const prefix = item.driveDistanceMiles && item.driveDurationMinutes
      ? `${Math.round(item.driveDistanceMiles)} drive mi · ${formatDuration(item.driveDurationMinutes)}`
      : `${Math.round(item.airDistanceMiles)} mi straight-line`;
    return `${prefix} · ${accessNote(item)}`;
  }
  if (item.driveDistanceMiles && item.driveDurationMinutes) {
    return `${Math.round(item.driveDistanceMiles)} drive mi · ${formatDuration(item.driveDurationMinutes)}`;
  }
  return `${Math.round(item.airDistanceMiles)} mi straight-line`;
}

function formatDuration(minutes) {
  if (minutes < 60) return `${Math.round(minutes)} min`;
  const hours = Math.floor(minutes / 60);
  const remaining = Math.round(minutes % 60);
  return remaining ? `${hours} hr ${remaining} min` : `${hours} hr`;
}

function reservationUrl(item, site = null) {
  const searchTime = new Date().toISOString().slice(0, 19);
  const selectedMapId = siteMapId(item, site) ?? item.mapId;
  const range = bookingRange(item);
  const params = new URLSearchParams({
    transactionLocationId: String(item.transactionLocationId),
    resourceLocationId: String(item.resourceLocationId),
    mapId: String(selectedMapId),
    searchTabGroupId: "0",
    bookingCategoryId: "0",
    startDate: range.start,
    endDate: range.end,
    nights: String(nightsBetween(range.start, range.end)),
    isReserving: "true",
    equipmentId: "-32768",
    subEquipmentId: "-32768",
    peopleCapacityCategoryCounts: `[[-32767,null,${state.partySize},null]]`,
    searchTime,
    flexibleSearch: `[false,false,"${range.start.slice(0, 8)}01",1]`,
  });
  return `https://washington.goingtocamp.com/create-booking/results?${params.toString()}`;
}

function nightsBetween(start, end) {
  const startTime = new Date(`${start}T12:00:00`).getTime();
  const endTime = new Date(`${end}T12:00:00`).getTime();
  const days = Math.round((endTime - startTime) / 86400000);
  return Math.max(0, days);
}

function reservationLabel(item, site) {
  return hasDistinctSiteReservationUrl(item, site) ? "Open selected site" : "Open booking for this weekend";
}

function sampleSiteText(item) {
  const shown = Array.isArray(item.sampleSites) ? item.sampleSites.length : 0;
  const total = Number(item.availableTentSites || 0);
  if (!shown || shown >= total) return "Available sites";
  return `Showing ${shown} example sites of ${total} available`;
}

function siteMapId(item, site) {
  if (!site) return null;
  return siteMapIds[siteKey(item.park, site[0], site[1])] ?? null;
}

function hasDistinctSiteReservationUrl(item, site) {
  const mapId = siteMapId(item, site);
  return mapId !== null && String(mapId) !== String(item.mapId);
}

function siteKey(park, loop, site) {
  return `${park}::${loop}::${site}`.toLowerCase();
}

function formatDate(value) {
  const date = new Date(`${value}T12:00:00`);
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(date);
}

function formatMonth(value) {
  const date = new Date(`${value}-01T12:00:00`);
  return new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(date);
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => {
    return {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;",
    }[char];
  });
}

function toast(message) {
  const previous = document.querySelector(".toast");
  previous?.remove();
  const node = document.createElement("div");
  node.className = "toast";
  node.textContent = message;
  Object.assign(node.style, {
    position: "fixed",
    right: "18px",
    bottom: "18px",
    zIndex: 1000,
    border: "1px solid var(--line)",
    borderRadius: "8px",
    background: "white",
    boxShadow: "var(--shadow)",
    padding: "12px 14px",
    fontWeight: "760",
  });
  document.body.append(node);
  window.setTimeout(() => node.remove(), 2400);
}

renderInitialState();

function renderInitialState() {
  resultsEl.innerHTML = `<article class="result-card"><h2>Ready to search</h2><p class="meta">Choose your trip details, then search saved NAS availability.</p></article>`;
}

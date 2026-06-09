const ORIGIN = "98040";
const ORIGIN_COORDS = [47.5707, -122.2221];
const DEFAULT_API_BASE_URL = "https://nampham-server.tail74e1b3.ts.net";
const API_BASE_STORAGE_KEY = "campsite-watch.apiBaseUrl";
const API_PASSWORD_STORAGE_KEY = "campsite-watch.apiPassword";
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

const state = {
  origin: zipCoordinates[ORIGIN],
  originQuery: ORIGIN,
  maxDistance: 30,
  maxDriveMinutes: 120,
  partySize: 2,
  tripDate: "",
  month: "any",
  results: [],
};

const map = L.map("map", {
  attributionControl: false,
  boxZoom: true,
  doubleClickZoom: true,
  dragging: true,
  keyboard: false,
  scrollWheelZoom: false,
  tap: true,
  touchZoom: true,
  zoomControl: true,
}).setView([47.49, -122.45], 9);

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 18,
}).addTo(map);

const markers = new Map();
let connectionLines = [];
let originMarker = null;
let distanceCircle = null;
const resultsEl = document.querySelector("#results");
const visibleCountEl = document.querySelector("#visible-count");
const searchForm = document.querySelector("#search-form");
const zipInput = document.querySelector("#zip-input");
const distanceMode = document.querySelector("#distance-mode");
const distanceFilter = document.querySelector("#distance-filter");
const partySizeInput = document.querySelector("#party-size");
const dateInput = document.querySelector("#date-input");
const monthFilter = document.querySelector("#month-filter");
const searchNote = document.querySelector("#search-note");
const mapListEl = document.querySelector("#map-list");
const savedWatchSummary = document.querySelector("#saved-watch-summary");
const notifyToggle = document.querySelector("#notify-toggle");
const runSavedWatchButton = document.querySelector("#run-saved-watch");
const clearSavedWatchButton = document.querySelector("#clear-saved-watch");

populateDateFilters();
populateDistanceOptions();
renderSavedWatch();

searchForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  await runSearch();
});

distanceMode.addEventListener("change", populateDistanceOptions);

dateInput.addEventListener("change", () => {
  if (dateInput.value) {
    monthFilter.value = "any";
  }
});

monthFilter.addEventListener("change", () => {
  if (monthFilter.value !== "any") {
    dateInput.value = "";
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

document.querySelector("#account-button").addEventListener("click", () => {
  document.querySelector("#account-dialog").showModal();
});

document.querySelector("#watch-button").addEventListener("click", () => {
  saveCurrentWatch();
});

runSavedWatchButton.addEventListener("click", async () => {
  const watch = loadSavedWatch();
  if (!watch) {
    toast("No saved watch yet.");
    return;
  }
  applyWatch(watch);
  await runSearch();
});

clearSavedWatchButton.addEventListener("click", () => {
  window.localStorage.removeItem("campsite-watch.saved");
  renderSavedWatch();
  toast("Saved watch cleared.");
});

document.querySelector("#sync-button").addEventListener("click", () => {
  const current = apiBase();
  const next = window.prompt("Private Tailscale NAS URL", current || DEFAULT_API_BASE_URL);
  if (next === null) return;

  const trimmed = next.trim().replace(/\/+$/, "");
  if (trimmed) {
    window.localStorage.setItem(API_BASE_STORAGE_KEY, trimmed);
    window.sessionStorage.removeItem(API_PASSWORD_STORAGE_KEY);
    toast("NAS worker URL saved. Enter the NAS password when you search.");
  } else {
    window.localStorage.removeItem(API_BASE_STORAGE_KEY);
    window.sessionStorage.removeItem(API_PASSWORD_STORAGE_KEY);
    toast("NAS worker disconnected.");
  }
  runSearch();
});

async function runSearch() {
  const zip = zipInput.value.trim();
  state.maxDistance = selectedDistanceMiles();
  state.maxDriveMinutes = selectedDriveMinutes();
  state.partySize = Number(partySizeInput.value);
  state.tripDate = dateInput.value;
  state.month = monthFilter.value;

  if (zip) {
    state.origin = await resolveOrigin(zip);
    state.originQuery = zip;
  }

  const apiBaseUrl = apiBase();
  const nasResult = apiBaseUrl ? await fetchNasResults(apiBaseUrl) : null;
  if (nasResult?.error === "password_required") {
    state.results = [];
    searchNote.textContent = "Enter the NAS password to query fresh availability.";
  } else if (nasResult?.error === "unauthorized") {
    window.sessionStorage.removeItem(API_PASSWORD_STORAGE_KEY);
    const password = askForNasPassword();
    if (password) {
      window.sessionStorage.setItem(API_PASSWORD_STORAGE_KEY, password);
      return runSearch();
    }
    state.results = [];
    searchNote.textContent = "Enter the NAS password to query fresh availability.";
  } else if (nasResult) {
    state.results = await prepareResults(nasResult.results);
    searchNote.textContent = nasResult.note;
  } else {
    state.results = await prepareResults(availability);
    searchNote.textContent = apiBaseUrl
      ? "NAS worker is unavailable or blocked. Showing the latest saved website snapshot."
      : "Showing the saved website snapshot. Connect a NAS worker for fresh live checks.";
  }

  document.querySelector("#map-scope").textContent =
    `Start: ${state.origin.label}. Numbered pins are parks with available weekends. Click a pin for distance and booking details.`;
  renderResults(state.results);
  renderMap(state.results);
  renderMapList(state.results);
}

async function prepareResults(items) {
  const enriched = await Promise.all(
    items
    .map((item) => ({
      ...item,
      airDistanceMiles: distanceMiles(state.origin, item),
    }))
      .map(withRouteEstimate),
  );

  return enriched
    .filter(matchesSearch)
    .sort((a, b) => sortDistance(a) - sortDistance(b) || a.date.localeCompare(b.date));
}

async function fetchNasResults(apiBaseUrl) {
  const url = new URL("/api/search", apiBaseUrl);
  url.searchParams.set("zip", zipInput.value.trim() || ORIGIN);
  url.searchParams.set("people", String(state.partySize));
  url.searchParams.set("distance", String(state.maxDistance));
  url.searchParams.set("distanceMode", distanceMode.value);
  if (state.tripDate) {
    url.searchParams.set("date", state.tripDate);
  } else if (state.month !== "any") {
    url.searchParams.set("month", state.month);
  }

  try {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 8000);
    const password = apiPassword() || askForNasPassword();
    if (!password) return { error: "password_required" };
    window.sessionStorage.setItem(API_PASSWORD_STORAGE_KEY, password);
    const headers = { Accept: "application/json" };
    headers.Authorization = `Bearer ${password}`;
    headers["X-Campsite-Watch-Password"] = password;
    const response = await fetch(url.toString(), { headers, signal: controller.signal });
    window.clearTimeout(timeout);
    if (response.status === 401) return { error: "unauthorized" };
    if (!response.ok) return null;
    const payload = await response.json();
    if (!Array.isArray(payload.results)) return null;

    const source = payload.source === "live" ? "Live NAS result" : "Saved NAS fallback";
    const checked = payload.lastChecked ? ` · last checked ${formatDateTime(payload.lastChecked)}` : "";
    return {
      results: payload.results,
      note: `${source}${checked}.`,
    };
  } catch {
    return null;
  }
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

function saveCurrentWatch() {
  const watch = currentWatch();
  window.localStorage.setItem("campsite-watch.saved", JSON.stringify(watch));
  renderSavedWatch();
  toast("Saved this search watch.");
}

function currentWatch() {
  return {
    zip: zipInput.value.trim() || ORIGIN,
    partySize: Number(partySizeInput.value),
    tripDate: dateInput.value,
    month: monthFilter.value,
    distanceMode: distanceMode.value,
    distance: distanceFilter.value,
    notify: notifyToggle.checked,
  };
}

function loadSavedWatch() {
  try {
    const raw = window.localStorage.getItem("campsite-watch.saved");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function applyWatch(watch) {
  zipInput.value = watch.zip || ORIGIN;
  partySizeInput.value = String(watch.partySize || 2);
  dateInput.value = watch.tripDate || "";
  monthFilter.value = watch.month || "any";
  distanceMode.value = watch.distanceMode || "hours";
  populateDistanceOptions();
  distanceFilter.value = watch.distance || (distanceMode.value === "hours" ? "120" : "30");
  if (!distanceFilter.value) {
    distanceFilter.value = distanceMode.value === "hours" ? "120" : "30";
  }
  notifyToggle.checked = watch.notify !== false;
}

function renderSavedWatch() {
  const watch = loadSavedWatch();
  runSavedWatchButton.disabled = !watch;
  clearSavedWatchButton.disabled = !watch;

  if (!watch) {
    savedWatchSummary.textContent = "No saved watch yet. Set your search inputs, then click Save Watch.";
    return;
  }

  const when = watch.tripDate
    ? formatDate(watch.tripDate)
    : watch.month && watch.month !== "any"
      ? formatMonth(watch.month)
      : "any available weekend";
  const distanceText = watch.distanceMode === "miles" ? `${watch.distance} miles` : driveTimeLabel(watch.distance);
  savedWatchSummary.textContent = `${watch.zip || ORIGIN} · ${when} · ${watch.partySize || 2} people · ${distanceText}`;
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
  const distanceMatches =
    distanceMode.value === "hours"
      ? item.driveDurationMinutes
        ? item.driveDurationMinutes <= state.maxDriveMinutes
        : item.airDistanceMiles <= state.maxDistance
      : distanceValueMiles(item) <= state.maxDistance;

  return (
    distanceMatches &&
    (!state.tripDate || dateInRange(state.tripDate, item.date, item.end)) &&
    (state.tripDate || monthMatches)
  );
}

function populateDateFilters() {
  const dates = availability.flatMap((item) => [item.date, item.end]).sort();
  dateInput.min = dates[0];
  dateInput.max = dates[dates.length - 1];

  const months = [...new Set(availability.flatMap((item) => [item.date.slice(0, 7), item.end.slice(0, 7)]))].sort();
  monthFilter.insertAdjacentHTML(
    "beforeend",
    months
      .map((month) => `<option value="${month}">${formatMonth(month)}</option>`)
      .join(""),
  );
}

function populateDistanceOptions() {
  const defaultValue = distanceMode.value === "miles" ? "30" : "120";
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
    }[Number(value)] ?? `${value} miles`
  );
}

function apiBase() {
  return window.localStorage.getItem(API_BASE_STORAGE_KEY) || window.CAMPSITE_WATCH_API_BASE_URL || DEFAULT_API_BASE_URL;
}

function apiPassword() {
  return window.sessionStorage.getItem(API_PASSWORD_STORAGE_KEY) || "";
}

function askForNasPassword() {
  return window.prompt("NAS password")?.trim() || "";
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

function dateInRange(value, start, end) {
  return value >= start && value <= end;
}

function renderResults(items) {
  if (!items.length) {
    resultsEl.innerHTML = `<article class="result-card"><h2>No available campsites found</h2><p class="meta">Try a larger distance, a different weekend, or fewer people.</p></article>`;
    return;
  }

  resultsEl.innerHTML = items
    .map((item) => {
      const sites = item.sampleSites
        .map((site) => {
          const exactSite = Boolean(siteMapId(item, site));
          return `<li><a class="site-chip${exactSite ? " exact-site" : ""}" href="${reservationUrl(item, site)}" target="_blank" rel="noreferrer" title="${exactSite ? "Reserve this exact site" : "Open this park and weekend"}">${escapeHtml(site[0])} ${escapeHtml(site[1])}${exactSite ? " · exact" : ""}</a></li>`;
        })
        .join("");
      const firstSite = item.sampleSites[0];
      return `
        <article class="result-card" data-park="${escapeHtml(item.park)}">
          <div class="result-header">
            <div>
              <h2 class="park-name">${escapeHtml(item.park)}</h2>
              <div class="meta">${formatDate(item.date)}-${formatDate(item.end)} · ${escapeHtml(item.city)}, ${escapeHtml(item.zip)} · ${distanceText(item)} from ${escapeHtml(state.origin.label)}</div>
            </div>
            <div class="badge">${item.availableTentSites} sites</div>
          </div>
          <ul class="site-list">${sites}</ul>
          <div class="card-actions">
            <div class="link-group">
              <a class="directions-link reserve-link" href="${reservationUrl(item, firstSite)}" target="_blank" rel="noreferrer">${reservationLabel(item, firstSite)}</a>
              <a class="directions-link" href="${directionsUrl(item)}" target="_blank" rel="noreferrer">Directions</a>
            </div>
            <span class="status-line">1 tent · ${state.partySize} people · Friday-Sunday</span>
          </div>
        </article>
      `;
    })
    .join("");

}

function renderMap(items) {
  markers.forEach((marker) => marker.remove());
  markers.clear();
  connectionLines.forEach((line) => line.remove());
  connectionLines = [];
  originMarker?.remove();
  distanceCircle?.remove();
  distanceCircle = null;

  const originLatLng = [state.origin.lat, state.origin.lon];
  if (distanceMode.value === "miles") {
    distanceCircle = L.circle(originLatLng, {
      radius: state.maxDistance * 1609.34,
      color: "#1f4e79",
      fillOpacity: 0.04,
      opacity: 0.22,
      weight: 2,
    }).addTo(map);
  }

  originMarker = L.marker(originLatLng, {
    interactive: true,
    icon: L.divIcon({
      className: "",
      html: `<div class="origin-marker">${escapeHtml(state.origin.label)}</div>`,
      iconSize: [44, 34],
      iconAnchor: [22, 17],
    }),
  })
    .addTo(map)
    .bindPopup(`<strong>Starting point</strong><br>${escapeHtml(state.origin.label)}`)
    .bindTooltip("Start", { permanent: true, direction: "top", offset: [0, -18], className: "map-label" });

  const byPark = new Map();
  for (const item of items) {
    const existing = byPark.get(item.park);
    if (!existing || item.availableTentSites > existing.availableTentSites) {
      byPark.set(item.park, item);
    }
  }

  [...byPark.entries()].forEach(([parkName, item], index) => {
    const parkLatLng = [item.lat, item.lon];
    const line = L.polyline([originLatLng, parkLatLng], {
      color: "#6f8794",
      dashArray: "4 7",
      opacity: 0.48,
      weight: 2,
      interactive: false,
    }).addTo(map);
    connectionLines.push(line);

    const marker = L.marker([item.lat, item.lon], {
      interactive: true,
      icon: L.divIcon({
        className: "",
        html: `<div class="result-marker">${index + 1}</div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      }),
    })
      .addTo(map)
      .bindPopup(
        `<strong>${index + 1}. ${escapeHtml(parkName)}</strong><br>${escapeHtml(item.city)}, ${escapeHtml(item.zip)}<br>${escapeHtml(distanceText(item))}<br>${item.availableTentSites} available sites`,
      )
      .bindTooltip(`${index + 1}. ${parkName}`, {
        permanent: true,
        direction: "top",
        offset: [0, -18],
        className: "map-label",
      });
    markers.set(parkName, marker);
  });

  visibleCountEl.textContent = String(byPark.size);
  const bounds = [originMarker.getLatLng(), ...[...markers.values()].map((marker) => marker.getLatLng())];
  if (bounds.length > 1) {
    map.fitBounds(bounds, { padding: [56, 56], maxZoom: 10 });
  } else {
    map.setView(originLatLng, 9);
  }
}

function renderMapList(items) {
  const byPark = new Map();
  for (const item of items) {
    const current = byPark.get(item.park);
    if (!current) {
      byPark.set(item.park, {
        park: item.park,
        city: item.city,
        distance: distanceText(item),
        weekends: 1,
      });
    } else {
      current.weekends += 1;
    }
  }

  if (!byPark.size) {
    mapListEl.innerHTML = "";
    return;
  }

  mapListEl.innerHTML = `
    <h2>Available parks on the map</h2>
    <ol>
      ${[...byPark.values()]
        .map(
          (item) =>
            `<li><strong>${escapeHtml(item.park)}</strong><span>${escapeHtml(item.city)} · ${escapeHtml(item.distance)} · ${item.weekends} weekend${item.weekends === 1 ? "" : "s"}</span></li>`,
        )
        .join("")}
    </ol>
  `;
}

function directionsUrl(item) {
  const origin = encodeURIComponent(state.originQuery);
  const destination = encodeURIComponent(`${item.park}, ${item.city}, WA ${item.zip}`);
  return `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}`;
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

function distanceValueMiles(item) {
  return item.driveDistanceMiles ?? item.airDistanceMiles;
}

function sortDistance(item) {
  return distanceMode.value === "hours" ? item.driveDurationMinutes ?? item.airDistanceMiles * 2 : distanceValueMiles(item);
}

function distanceText(item) {
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
  const params = new URLSearchParams({
    transactionLocationId: String(item.transactionLocationId),
    resourceLocationId: String(item.resourceLocationId),
    mapId: String(selectedMapId),
    searchTabGroupId: "0",
    bookingCategoryId: "0",
    startDate: item.date,
    endDate: item.end,
    nights: "2",
    isReserving: "true",
    equipmentId: "-32768",
    subEquipmentId: "-32768",
    peopleCapacityCategoryCounts: `[[-32767,null,${state.partySize},null]]`,
    searchTime,
    flexibleSearch: `[false,false,"${item.date.slice(0, 8)}01",1]`,
  });
  return `https://washington.goingtocamp.com/create-booking/results?${params.toString()}`;
}

function reservationLabel(item, site) {
  return siteMapId(item, site) ? "Reserve exact site" : "Open booking";
}

function siteMapId(item, site) {
  if (!site) return null;
  return siteMapIds[siteKey(item.park, site[0], site[1])] ?? null;
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

runSearch();

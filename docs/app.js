const ORIGIN = "98040";

const parks = {
  "Blake Island State Park": {
    city: "Manchester",
    zip: "98353",
    lat: 47.54247,
    lon: -122.4834,
  },
  "Manchester State Park": {
    city: "Port Orchard",
    zip: "98366",
    lat: 47.57732,
    lon: -122.5563,
  },
  "Illahee State Park": {
    city: "Bremerton",
    zip: "98310",
    lat: 47.59558,
    lon: -122.5974,
  },
  "Dash Point State Park": {
    city: "Federal Way",
    zip: "98023",
    lat: 47.31779,
    lon: -122.4071,
  },
  "Kanaskat-Palmer State Park": {
    city: "Ravensdale",
    zip: "98051",
    lat: 47.31198,
    lon: -121.8987,
  },
  "Kitsap Memorial State Park": {
    city: "Poulsbo",
    zip: "98370",
    lat: 47.81642,
    lon: -122.6444,
  },
  "Scenic Beach State Park": {
    city: "Seabeck",
    zip: "98380",
    lat: 47.64626,
    lon: -122.8469,
  },
  "Belfair State Park": {
    city: "Belfair",
    zip: "98528",
    lat: 47.43167,
    lon: -122.877,
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

const state = {
  search: "",
  month: "all",
  maxDistance: 30,
  minSites: 1,
};

const map = L.map("map", {
  zoomControl: false,
}).setView([47.49, -122.45], 9);

L.control.zoom({ position: "bottomright" }).addTo(map);
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 18,
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
}).addTo(map);

const markers = new Map();
const resultsEl = document.querySelector("#results");
const visibleCountEl = document.querySelector("#visible-count");

document.querySelector("#search-input").addEventListener("input", (event) => {
  state.search = event.target.value.trim().toLowerCase();
  render();
});

document.querySelector("#month-filter").addEventListener("change", (event) => {
  state.month = event.target.value;
  render();
});

document.querySelector("#distance-filter").addEventListener("change", (event) => {
  state.maxDistance = Number(event.target.value);
  render();
});

document.querySelectorAll("input[name='density']").forEach((input) => {
  input.addEventListener("change", () => {
    state.minSites = Number(document.querySelector("input[name='density']:checked").value);
    render();
  });
});

document.querySelector("#account-button").addEventListener("click", () => {
  document.querySelector("#account-dialog").showModal();
});

document.querySelector("#watch-button").addEventListener("click", () => {
  window.localStorage.setItem("campsite-watch.saved", JSON.stringify(state));
  toast("Saved this watch locally.");
});

document.querySelector("#sync-button").addEventListener("click", () => {
  toast("Live sync will connect to the Python monitor next.");
});

function render() {
  const items = availability.filter(matchesFilters);
  visibleCountEl.textContent = String(items.length);
  renderResults(items);
  renderMarkers(items);
}

function matchesFilters(item) {
  const haystack = [
    item.park,
    item.city,
    item.zip,
    item.date,
    item.end,
    ...item.sampleSites.flat(),
  ]
    .join(" ")
    .toLowerCase();

  return (
    item.distanceMiles <= state.maxDistance &&
    item.availableTentSites >= state.minSites &&
    (state.month === "all" || item.date.startsWith(state.month)) &&
    (!state.search || haystack.includes(state.search))
  );
}

function renderResults(items) {
  if (!items.length) {
    resultsEl.innerHTML = `<article class="result-card"><h2>No matches</h2><p class="meta">Try a larger distance, a different month, or lower availability density.</p></article>`;
    return;
  }

  resultsEl.innerHTML = items
    .map((item) => {
      const sites = item.sampleSites
        .map(([loop, site]) => `<li>${escapeHtml(loop)} ${escapeHtml(site)}</li>`)
        .join("");
      return `
        <article class="result-card" data-park="${escapeHtml(item.park)}">
          <div class="result-header">
            <div>
              <h2 class="park-name">${escapeHtml(item.park)}</h2>
              <div class="meta">${formatDate(item.date)}-${formatDate(item.end)} · ${escapeHtml(item.city)}, ${escapeHtml(item.zip)} · ${item.distanceMiles} mi from ${ORIGIN}</div>
            </div>
            <div class="badge">${item.availableTentSites} sites</div>
          </div>
          <ul class="site-list">${sites}</ul>
          <div class="card-actions">
            <a class="directions-link" href="${directionsUrl(item)}" target="_blank" rel="noreferrer">Directions</a>
            <span class="status-line">1 tent · Friday-Sunday · checked in Chrome</span>
          </div>
        </article>
      `;
    })
    .join("");

  resultsEl.querySelectorAll(".result-card").forEach((card) => {
    card.addEventListener("mouseenter", () => focusPark(card.dataset.park));
  });
}

function renderMarkers(items) {
  markers.forEach((marker) => marker.remove());
  markers.clear();

  const byPark = new Map();
  for (const item of items) {
    const existing = byPark.get(item.park);
    if (!existing || item.availableTentSites > existing.availableTentSites) {
      byPark.set(item.park, item);
    }
  }

  byPark.forEach((item, parkName) => {
    const marker = L.circleMarker([item.lat, item.lon], {
      radius: markerSize(item.availableTentSites),
      color: "#0f5258",
      fillColor: "#28a06a",
      fillOpacity: 0.78,
      weight: 2,
    }).addTo(map);

    marker.bindPopup(`
      <div class="popup-title">${escapeHtml(parkName)}</div>
      <div class="popup-copy">${item.availableTentSites} tent sites · ${formatDate(item.date)}-${formatDate(item.end)}</div>
      <a class="directions-link" href="${directionsUrl(item)}" target="_blank" rel="noreferrer">Directions</a>
    `);
    markers.set(parkName, marker);
  });

  const bounds = [...markers.values()].map((marker) => marker.getLatLng());
  if (bounds.length) {
    map.fitBounds(bounds, { padding: [36, 36], maxZoom: 10 });
  }
}

function markerSize(count) {
  if (count >= 50) return 15;
  if (count >= 20) return 12;
  if (count >= 5) return 10;
  return 8;
}

function focusPark(parkName) {
  const marker = markers.get(parkName);
  if (!marker) return;
  marker.openPopup();
  map.panTo(marker.getLatLng());
}

function directionsUrl(item) {
  const destination = encodeURIComponent(`${item.park}, ${item.city}, WA ${item.zip}`);
  return `https://www.google.com/maps/dir/?api=1&origin=${ORIGIN}&destination=${destination}`;
}

function formatDate(value) {
  const date = new Date(`${value}T12:00:00`);
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(date);
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

render();


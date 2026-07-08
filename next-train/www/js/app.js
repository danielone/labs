/* Next Train NYC — app logic
 *
 * Departure times are deterministic, schedule-based estimates: each
 * line/direction/station gets a fixed offset on a headway grid, so the
 * countdown is stable across refreshes. See README for wiring real-time
 * GTFS-RT data.
 */

(function () {
  "use strict";

  const $ = (sel) => document.querySelector(sel);

  const DEFAULT_FROM = "611"; // Times Sq-42 St / Port Authority complex

  function validStation(id) {
    return id && STATIONS[id] ? id : null;
  }

  const state = {
    from: validStation(localStorage.getItem("nt-from")) || DEFAULT_FROM,
    to: validStation(localStorage.getItem("nt-to")),
    picking: null,          // "from" | "to" | null
    route: null,
    departures: [],
    lastFocus: null
  };

  /* ---------- schedule model ---------- */

  function hashStr(s) {
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  // Headway in minutes for a line at a given time of day.
  function headwayFor(lineId, date) {
    const base = LINES[lineId].headway;
    const h = date.getHours() + date.getMinutes() / 60;
    const weekday = date.getDay() >= 1 && date.getDay() <= 5;
    let mult;
    if (h >= 22 || h < 6) mult = 2.2;                                   // late night
    else if (weekday && ((h >= 7 && h < 9.5) || (h >= 16.5 && h < 19))) mult = 0.75; // rush
    else if (h >= 20) mult = 1.3;                                       // evening
    else mult = 1.0;                                                    // midday
    return Math.min(20, Math.max(3, Math.round(base * mult)));
  }

  function isRunning(lineId, date) {
    const service = LINES[lineId].service;
    if (service === "all") return true;
    const weekday = date.getDay() >= 1 && date.getDay() <= 5;
    const h = date.getHours() + date.getMinutes() / 60;
    if (service === "weekday") return weekday && h >= 6 && h < 22;
    if (service === "rush") return weekday && ((h >= 6.5 && h < 10) || (h >= 15.5 && h < 20));
    return true;
  }

  // Next `n` departures (as Dates) for a line/direction at a station.
  function nextDepartures(lineId, dirIndex, stationId, after, n) {
    const hwSec = headwayFor(lineId, after) * 60;
    const offset = hashStr(lineId + ":" + dirIndex + ":" + stationId) % hwSec;
    const t = Math.floor(after.getTime() / 1000);
    let first = t + ((offset - t) % hwSec + hwSec) % hwSec;
    if (first === t) first += hwSec;
    const out = [];
    for (let i = 0; i < n; i++) out.push(new Date((first + i * hwSec) * 1000));
    return out;
  }

  /* ---------- routing ---------- */

  function sharedStations(a, b) {
    const setB = new Set(LINES[b].stops);
    return LINES[a].stops.filter((s) => setB.has(s));
  }

  function makeLeg(lineId, fromId, toId) {
    const idx = LINES[lineId].idx;
    const i = idx[fromId], j = idx[toId];
    if (i === undefined || j === undefined || i === j) return null;
    return { line: lineId, from: fromId, to: toId, dir: j < i ? 0 : 1, stops: Math.abs(j - i) };
  }

  function routeScore(legs) {
    return (legs.length - 1) * 4 + legs.reduce((sum, l) => sum + l.stops, 0);
  }

  // Best route between two stations: direct, one transfer, or two transfers.
  function findRoute(fromId, toId, now) {
    const fromLines = STATIONS[fromId].lines.filter((l) => isRunning(l, now));
    const toLines = STATIONS[toId].lines.filter((l) => isRunning(l, now));
    let best = null;
    const consider = (legs) => {
      if (legs.some((l) => !l)) return;
      if (!best || routeScore(legs) < routeScore(best)) best = legs;
    };

    for (const a of fromLines) {
      if (toLines.includes(a)) consider([makeLeg(a, fromId, toId)]);
    }
    if (best) return best;

    for (const a of fromLines) {
      for (const b of toLines) {
        if (a === b) continue;
        for (const x of sharedStations(a, b)) {
          if (x === fromId || x === toId) continue;
          consider([makeLeg(a, fromId, x), makeLeg(b, x, toId)]);
        }
      }
    }
    if (best) return best;

    for (const a of fromLines) {
      for (const b of toLines) {
        for (const m in LINES) {
          if (m === a || m === b || !isRunning(m, now)) continue;
          for (const x1 of sharedStations(a, m)) {
            if (x1 === fromId || x1 === toId) continue;
            for (const x2 of sharedStations(m, b)) {
              if (x2 === x1 || x2 === fromId || x2 === toId) continue;
              consider([makeLeg(a, fromId, x1), makeLeg(m, x1, x2), makeLeg(b, x2, toId)]);
            }
          }
        }
      }
    }
    return best;
  }

  /* ---------- rendering ---------- */

  function esc(s) {
    return s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  }

  function bulletHTML(lineId, size) {
    const l = LINES[lineId];
    const long = l.label.length > 1 ? " long" : "";
    return `<span class="bullet ${size || ""}${long}" style="background:${l.color};color:${l.text}" aria-hidden="true">${l.label}</span><span class="sr-only">${l.label} train</span>`;
  }

  function fmtClock(date) {
    let h = date.getHours(), m = date.getMinutes();
    const ap = h >= 12 ? "PM" : "AM";
    h = h % 12 || 12;
    return `${h}:${String(m).padStart(2, "0")} ${ap}`;
  }

  function fmtCountdown(sec) {
    if (sec <= 30) return "DUE";
    const m = Math.floor(sec / 60), s = sec % 60;
    return `${m}:${String(s).padStart(2, "0")}`;
  }

  function dirLabel(leg) {
    const line = LINES[leg.line];
    // Stations on a spliced branch are signed with the branch terminal
    // (e.g. A to Ozone Park-Lefferts Blvd vs Far Rockaway).
    if (line.branchDest && line.branchDest[leg.to]) return "to " + line.branchDest[leg.to];
    return "to " + line.terminals[leg.dir];
  }

  // Official platform signage for the boarding station ("Uptown", "Downtown
  // & Brooklyn", ...) from the stations dataset.
  function platformLabel(leg) {
    const line = LINES[leg.line];
    const label = (line.dirLabels[line.idx[leg.from]] || [])[leg.dir];
    return label && label !== "Last Stop" ? label : "";
  }

  function fieldValue(id) {
    return id ? esc(STATIONS[id].name) : "Select station";
  }

  function renderPlanner() {
    $("#to-value").innerHTML = fieldValue(state.to);
    $("#from-value").innerHTML = fieldValue(state.from);
    $("#to-bullets").innerHTML = state.to ? STATIONS[state.to].lines.map((l) => bulletHTML(l, "sm")).join("") : "";
    $("#from-bullets").innerHTML = state.from ? STATIONS[state.from].lines.map((l) => bulletHTML(l, "sm")).join("") : "";
  }

  function computeRoute() {
    state.route = null;
    state.departures = [];
    if (!state.from || !state.to || state.from === state.to) return;
    const now = new Date();
    state.route = findRoute(state.from, state.to, now);
    if (state.route) {
      const leg = state.route[0];
      state.departures = nextDepartures(leg.line, leg.dir, leg.from, now, 3);
    }
  }

  function renderResult() {
    const el = $("#result");
    if (!state.to) { el.innerHTML = ""; return; }
    if (state.from === state.to) {
      el.innerHTML = `<div class="notice">You&rsquo;re already there. Pick a different destination.</div>`;
      return;
    }
    if (!state.route) {
      el.innerHTML = `<div class="notice">No route found between these stations right now.</div>`;
      return;
    }

    const legs = state.route;
    const first = legs[0];
    const dep = state.departures[0];

    let html = `
      <div class="board" role="group" aria-label="Next departure">
        <div class="board-top">
          ${bulletHTML(first.line, "lg")}
          <div class="board-dest">
            <div class="board-dir">${esc(dirLabel(first))}</div>
            <div class="board-at">Board at ${esc(STATIONS[first.from].name)}${platformLabel(first) ? " &middot; " + esc(platformLabel(first)) + " platform" : ""}</div>
          </div>
        </div>
        <div class="board-count">
          <span class="count-num" id="count-num">--:--</span>
          <span class="count-label">until departure</span>
        </div>
        <div class="board-meta">
          <span>Departs <strong>${fmtClock(dep)}</strong></span>
          <span>${esc(LINES[first.line].name)}</span>
        </div>
        <div class="board-next" id="board-next"></div>
      </div>`;

    for (let i = 1; i < legs.length; i++) {
      const leg = legs[i];
      html += `
      <div class="board transfer">
        <div class="transfer-label">Then transfer at ${esc(STATIONS[leg.from].name)}</div>
        <div class="board-top">
          ${bulletHTML(leg.line, "md")}
          <div class="board-dest">
            <div class="board-dir">${esc(dirLabel(leg))}</div>
            <div class="board-at">Ride to ${esc(STATIONS[leg.to].name)} &middot; runs about every ${headwayFor(leg.line, new Date())} min</div>
          </div>
        </div>
      </div>`;
    }

    html += `<div class="sr-only" aria-live="polite" id="count-voice"></div>`;
    el.innerHTML = html;
    tick();
  }

  let lastVoiceMin = null;

  function tick() {
    const nowEl = $("#now-clock");
    if (nowEl) nowEl.textContent = fmtClock(new Date());
    if (!state.route || !state.departures.length) return;

    const now = Date.now();
    // Drop departures that have left; refill the list.
    while (state.departures.length && state.departures[0].getTime() - now < -4000) {
      state.departures.shift();
    }
    if (state.departures.length < 3) {
      const leg = state.route[0];
      state.departures = nextDepartures(leg.line, leg.dir, leg.from, new Date(), 3);
      renderResult();
      return;
    }

    const countEl = $("#count-num");
    if (!countEl) return;
    const sec = Math.max(0, Math.round((state.departures[0].getTime() - now) / 1000));
    const text = fmtCountdown(sec);
    if (countEl.textContent !== text) countEl.textContent = text;
    countEl.classList.toggle("due", text === "DUE");

    const nextEl = $("#board-next");
    if (nextEl) {
      const later = state.departures.slice(1).map((d) => Math.max(1, Math.round((d.getTime() - now) / 60000)) + " min");
      nextEl.textContent = "Following trains: " + later.join(", ");
    }

    // Announce to screen readers once per minute, not every second.
    const min = Math.floor(sec / 60);
    if (min !== lastVoiceMin) {
      lastVoiceMin = min;
      const voice = $("#count-voice");
      if (voice) {
        voice.textContent = sec <= 30
          ? "Train is due now."
          : `Next train departs in about ${min} minute${min === 1 ? "" : "s"}.`;
      }
    }
  }

  /* ---------- station picker ---------- */

  function openPicker(which) {
    state.picking = which;
    state.lastFocus = document.activeElement;
    const sheet = $("#picker");
    sheet.hidden = false;
    document.body.classList.add("sheet-open");
    $("#picker-title").textContent = which === "from" ? "Starting from" : "Where to?";
    $("#picker-search").value = "";
    renderStationList("");
    $("#picker-search").focus();
  }

  function closePicker() {
    state.picking = null;
    $("#picker").hidden = true;
    document.body.classList.remove("sheet-open");
    if (state.lastFocus) state.lastFocus.focus();
  }

  function renderStationList(query) {
    const q = query.trim().toLowerCase();
    const byBorough = {};
    for (const id in STATIONS) {
      const st = STATIONS[id];
      if (q && !st.name.toLowerCase().includes(q)) continue;
      (byBorough[st.borough] = byBorough[st.borough] || []).push(id);
    }
    let html = "";
    for (const borough of ["Manhattan", "Brooklyn", "Queens", "Bronx", "Staten Island"]) {
      const ids = byBorough[borough];
      if (!ids) continue;
      ids.sort((a, b) => STATIONS[a].name.localeCompare(STATIONS[b].name));
      html += `<li class="borough-head" role="presentation">${borough}</li>`;
      for (const id of ids) {
        html += `<li><button type="button" class="station-row" data-id="${id}">
          <span class="station-name">${esc(STATIONS[id].name)}</span>
          <span class="station-bullets">${STATIONS[id].lines.map((l) => bulletHTML(l, "sm")).join("")}</span>
        </button></li>`;
      }
    }
    $("#station-list").innerHTML = html || `<li class="borough-head">No stations match</li>`;
  }

  function pickStation(id) {
    if (state.picking === "from") {
      state.from = id;
      localStorage.setItem("nt-from", id);
    } else {
      state.to = id;
      localStorage.setItem("nt-to", id);
    }
    closePicker();
    refresh();
  }

  /* ---------- wiring ---------- */

  function refresh() {
    renderPlanner();
    computeRoute();
    renderResult();
  }

  function init() {
    $("#from-btn").addEventListener("click", () => openPicker("from"));
    $("#to-btn").addEventListener("click", () => openPicker("to"));
    $("#swap-btn").addEventListener("click", () => {
      const t = state.from;
      state.from = state.to || state.from;
      state.to = t;
      localStorage.setItem("nt-from", state.from);
      if (state.to) localStorage.setItem("nt-to", state.to);
      refresh();
    });
    $("#picker-close").addEventListener("click", closePicker);
    $("#picker-search").addEventListener("input", (e) => renderStationList(e.target.value));
    $("#station-list").addEventListener("click", (e) => {
      const btn = e.target.closest(".station-row");
      if (btn) pickStation(btn.dataset.id);
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && state.picking) closePicker();
    });
    // Basic focus trap for the sheet.
    $("#picker").addEventListener("keydown", (e) => {
      if (e.key !== "Tab") return;
      const focusables = $("#picker").querySelectorAll("button, input");
      const first = focusables[0], last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) { last.focus(); e.preventDefault(); }
      else if (!e.shiftKey && document.activeElement === last) { first.focus(); e.preventDefault(); }
    });

    refresh();
    setInterval(tick, 1000);

    if ("serviceWorker" in navigator && location.protocol !== "file:") {
      navigator.serviceWorker.register("sw.js").catch(() => {});
    }
  }

  document.addEventListener("DOMContentLoaded", init);
})();

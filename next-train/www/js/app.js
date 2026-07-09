/* NYC Next Train — app logic (v2.5: tabs + favorites)
 *
 * Two tabs. Search: pick a stop, get the station board (next trains across
 * every line and direction), tap a train for its countdown card, drill
 * down to later trains — each level is a real history entry, so Back
 * retraces them. Favorites: saved station + line + direction entries, each
 * showing its next train (departure time + minutes until), refreshed every
 * minute; tapping one opens the same detail view as a search, and Back
 * returns to the favorites list.
 *
 * Departures are live MTA GTFS-RT data via /api/departures (30s refresh),
 * with a deterministic schedule-model fallback when live data is
 * unreachable. Favorites persist in localStorage on the web and Capacitor
 * Preferences (UserDefaults) in the iOS/Android wrapper.
 */

(function () {
  "use strict";

  const $ = (sel) => document.querySelector(sel);

  const LIST_ROWS = 6;

  // Real-time data: /api/departures (Vercel function decoding MTA GTFS-RT).
  // Same-origin in production; local dev servers use the deployed API.
  const RT_BASE = (location.hostname === "localhost" || location.hostname === "127.0.0.1")
    ? "https://nyc-next-train.vercel.app" : "";
  const RT_REFRESH_MS = 30000;   // fetch cadence for the current station
  const FAV_REFRESH_MS = 60000;  // favorites refresh at the minute interval
  const RT_STALE_MS = 90000;     // older than this → fall back to schedule

  // Solid left arrow in the spirit of MTA wayfinding signage.
  const BACK_ARROW = `<svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" fill="currentColor"><path d="M8.6 1.6 2.2 8l6.4 6.4 1.4-1.4L5.9 8.9H14V7.1H5.9L10 3z"/></svg>`;

  function heartSVG(filled) {
    return `<svg viewBox="0 0 20 20" width="22" height="22" aria-hidden="true" fill="${filled ? "currentColor" : "none"}" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M10 17S2.5 12.5 2.5 7.5a4 4 0 0 1 7.5-2 4 4 0 0 1 7.5 2C17.5 12.5 10 17 10 17z"/></svg>`;
  }

  function validStation(id) {
    return id && STATIONS[id] ? id : null;
  }

  const state = {
    // Last selected stop on this device; null until the user picks one.
    station: validStation(localStorage.getItem("nt-station"))
      || validStation(localStorage.getItem("nt-from"))   // v1 carry-over
      || null,
    tab: "search",       // "search" | "favorites"
    picking: false,
    view: "list",        // "list" = tab root, "detail" = one train
    sel: null,           // {line, dir} in detail view
    targetKey: null,     // departure the user is targeting in detail view
    favorites: [],       // [{station, line, dir}]
    live: false,         // whether the current screen shows real-time data
    lastFocus: null,
    lastSig: ""
  };

  /* ---------- device storage ----------
   * Web: localStorage. Native (Capacitor): Preferences plugin — backed by
   * UserDefaults on iOS / SharedPreferences on Android, the platform's
   * best practice for small key-value app data. Both are written so the
   * data survives either runtime (iOS can evict WKWebView localStorage).
   * Used for favorites and the last selected stop. */

  function capPreferences() {
    try {
      const p = window.Capacitor && window.Capacitor.Plugins;
      return (p && p.Preferences) || null;
    } catch (e) { return null; }
  }

  const kvStore = {
    async get(key) {
      const prefs = capPreferences();
      if (prefs) {
        try {
          const { value } = await prefs.get({ key });
          if (value != null) return value;
        } catch (e) { /* fall through to localStorage */ }
      }
      try { return localStorage.getItem(key); } catch (e) { return null; }
    },
    set(key, value) {
      try { localStorage.setItem(key, value); } catch (e) {}
      const prefs = capPreferences();
      if (prefs) { try { prefs.set({ key, value }); } catch (e) {} }
    },
    remove(key) {
      try { localStorage.removeItem(key); } catch (e) {}
      const prefs = capPreferences();
      if (prefs) { try { prefs.remove({ key }); } catch (e) {} }
    }
  };

  const favStore = {
    async load() {
      try { return JSON.parse((await kvStore.get("nt-favorites")) || "[]"); }
      catch (e) { return []; }
    },
    save(list) {
      kvStore.set("nt-favorites", JSON.stringify(list));
    }
  };

  function favKey(f) { return f.station + ":" + f.line + ":" + f.dir; }

  function isFav(station, line, dir) {
    return state.favorites.some((f) => f.station === station && f.line === line && f.dir === dir);
  }

  function toggleFav(station, line, dir) {
    if (isFav(station, line, dir)) {
      state.favorites = state.favorites.filter(
        (f) => !(f.station === station && f.line === line && f.dir === dir));
    } else {
      state.favorites.push({ station, line, dir });
    }
    favStore.save(state.favorites);
  }

  /* ---------- schedule model (fallback) ---------- */

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

  // Next `n` schedule-model departures for a line/direction at a station.
  function nextDepartures(lineId, dirIndex, stationId, after, n) {
    const hwSec = headwayFor(lineId, after) * 60;
    const offset = hashStr(lineId + ":" + dirIndex + ":" + stationId) % hwSec;
    const t = Math.floor(after.getTime() / 1000);
    let first = t + ((offset - t) % hwSec + hwSec) % hwSec;
    if (first === t) first += hwSec;
    const out = [];
    for (let i = 0; i < n; i++) {
      const epoch = first + i * hwSec;
      out.push({
        line: lineId, dir: dirIndex, time: new Date(epoch * 1000),
        key: lineId + ":" + dirIndex + ":" + epoch
      });
    }
    return out;
  }

  /* ---------- real-time data (cached per station) ---------- */

  const rtCache = {};   // station id → { at, deps[] }

  // GTFS-RT uses express variants (6X, FX...) — map to the app's routes.
  function normalizeRoute(r) {
    if (LINES[r]) return r;
    const base = r.replace(/X$/, "");
    return LINES[base] ? base : null;
  }

  async function fetchRT(stationId) {
    const st = stationId || state.station;
    const s = STATIONS[st];
    if (!s || !s.gtfs || !navigator.onLine) return;
    try {
      const url = RT_BASE + "/api/departures?stops=" + s.gtfs.join(",") + "&routes=" + s.lines.join(",");
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) throw new Error("HTTP " + res.status);
      const data = await res.json();
      const deps = [];
      for (const d of data.departures || []) {
        const line = normalizeRoute(d.route);
        if (!line) continue;
        deps.push({
          line,
          express: line !== d.route,   // 6X/7X/FX → diamond bullet
          dir: d.dir === "N" ? 0 : 1,
          time: new Date(d.t * 1000),
          key: "rt:" + d.tripId + ":" + d.stop   // real train identity
        });
      }
      deps.sort((a, b) => a.time - b.time);
      rtCache[st] = { at: Date.now(), deps };
    } catch (e) {
      // Keep the last fetch; once it ages past RT_STALE_MS the boards
      // fall back to the schedule model and the footer says so.
    }
  }

  function rtFresh(stationId) {
    const c = rtCache[stationId];
    return !!(c && Date.now() - c.at < RT_STALE_MS);
  }

  function fetchFavRT() {
    const stations = [...new Set(state.favorites.map((f) => f.station))];
    stations.forEach((st) => { if (!rtFresh(st)) fetchRT(st); });
  }

  // Upcoming departures at a stop across every line/direction serving it.
  function stationBoard(stationId, after, count) {
    if (rtFresh(stationId)) {
      state.live = true;
      const cutoff = after.getTime() - 15000;
      return rtCache[stationId].deps.filter((d) => d.time.getTime() > cutoff).slice(0, count);
    }
    state.live = false;
    const out = [];
    for (const lineId of STATIONS[stationId].lines) {
      if (!isRunning(lineId, after)) continue;
      const line = LINES[lineId];
      const i = line.idx[stationId];
      for (const dir of [0, 1]) {
        // No departures toward the terminal the train ends at.
        if (dir === 0 && i === 0) continue;
        if (dir === 1 && i === line.stops.length - 1) continue;
        out.push(...nextDepartures(lineId, dir, stationId, after, 3));
      }
    }
    out.sort((a, b) => a.time - b.time);
    return out.slice(0, count);
  }

  // Departures for the selected line + direction only (detail view).
  function detailBoard(after) {
    if (!state.sel) return [];
    if (rtFresh(state.station)) {
      state.live = true;
      const cutoff = after.getTime() - 15000;
      return rtCache[state.station].deps.filter((d) =>
        d.line === state.sel.line && d.dir === state.sel.dir && d.time.getTime() > cutoff
      ).slice(0, 6);
    }
    state.live = false;
    if (!isRunning(state.sel.line, after)) return [];
    return nextDepartures(state.sel.line, state.sel.dir, state.station, after, 6);
  }

  // Next train for a favorite entry (live if we have it, schedule if not).
  function favNext(f, now) {
    if (rtFresh(f.station)) {
      const d = rtCache[f.station].deps.find((x) =>
        x.line === f.line && x.dir === f.dir && x.time.getTime() > now - 15000);
      if (d) return { dep: d, live: true };
      return { dep: null, live: true };
    }
    if (!isRunning(f.line, new Date(now))) return { dep: null, live: false };
    return { dep: nextDepartures(f.line, f.dir, f.station, new Date(now), 1)[0], live: false };
  }

  /* ---------- rendering ---------- */

  function esc(s) {
    return s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  }

  // Bullet: circle for local service, MTA diamond for express variants
  // (6X/7X/FX). The color paints on a ::before layer (framework-style) so
  // the diamond can rotate while the glyph stays upright.
  function bulletHTML(lineId, size, express) {
    const l = LINES[lineId];
    const long = l.label.length > 1 ? " long" : "";
    return `<span class="bullet ${size || ""}${long}${express ? " express" : ""}" style="--bc:${l.color};color:${l.text}" aria-hidden="true">${l.label}</span><span class="sr-only">${l.label}${express ? " express" : ""} train</span>`;
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

  function fmtMin(dep, now) {
    const sec = (dep.time.getTime() - now) / 1000;
    return sec <= 45 ? "Due" : Math.round(sec / 60) + " min";
  }

  function dirLabel(dep) {
    return "to " + LINES[dep.line].terminals[dep.dir];
  }

  // Long service name; express variants get their MTA express designation.
  const EXPRESS_NAMES = {
    "6": "Lexington Avenue Express",
    "7": "Flushing Express",
    "F": "Culver Express"
  };

  function lineName(dep) {
    const base = LINES[dep.line].name;
    if (!dep.express) return base;
    return EXPRESS_NAMES[dep.line] || base.replace(/Local/, "Express");
  }

  // Official platform signage ("Uptown", "Downtown & Brooklyn", ...).
  function platformLabelFor(line, dir, stationId) {
    const l = LINES[line];
    const label = (l.dirLabels[l.idx[stationId]] || [])[dir];
    return label && label !== "Last Stop" ? label : "";
  }

  function platformLabel(dep) {
    return platformLabelFor(dep.line, dep.dir, state.station);
  }

  function renderPlanner() {
    if (!state.station) {
      $("#station-value").textContent = "Select station";
      $("#station-bullets").innerHTML = "";
      return;
    }
    $("#station-value").innerHTML = esc(STATIONS[state.station].name);
    $("#station-bullets").innerHTML = STATIONS[state.station].lines.map((l) => bulletHTML(l, "sm")).join("");
  }

  function updateTabbar() {
    const search = $("#tab-search"), favs = $("#tab-favorites");
    if (state.tab === "search") {
      search.setAttribute("aria-current", "page");
      favs.removeAttribute("aria-current");
    } else {
      favs.setAttribute("aria-current", "page");
      search.removeAttribute("aria-current");
    }
    // Planner visibility is owned by render() (hidden on Favorites/info).
  }

  /* --- station board (search root) --- */

  function listSig(board) {
    return "L|" + board.map((d) => d.key).join("|");
  }

  function renderList() {
    const el = $("#result");
    const board = stationBoard(state.station, new Date(), LIST_ROWS);
    const hadFocus = el.contains(document.activeElement);
    if (!board.length) {
      el.innerHTML = `<div class="notice">No trains scheduled at this stop right now.</div>`;
      state.lastSig = "L|";
      return;
    }
    const now = Date.now();
    const rows = board.map((d) => {
      const plat = platformLabel(d);
      return `
        <button type="button" tabindex="0" class="next-row" data-key="${d.key}" data-line="${d.line}" data-dir="${d.dir}"
          aria-label="${LINES[d.line].label}${d.express ? " express" : ""} train ${esc(dirLabel(d))}${plat ? ", " + esc(plat) : ""}, ${fmtMin(d, now)}. Show countdown.">
          ${bulletHTML(d.line, "md", d.express)}
          <span class="next-dest">
            <span class="next-term">${esc(dirLabel(d))}</span>
            ${plat ? `<span class="next-dir">${esc(plat)}</span>` : ""}
          </span>
          <span class="next-min" data-key-min="${d.key}">${fmtMin(d, now)}</span>
        </button>`;
    }).join("");

    el.innerHTML = `
      <div class="board" role="group" aria-label="Next trains at this station">
        <div class="nexts-head"><span>Next trains</span><span class="nexts-hint">tap for countdown</span></div>
        ${rows}
      </div>`;

    el.querySelectorAll(".next-row").forEach((btn) => {
      btn.addEventListener("click", () => {
        state.sel = { line: btn.dataset.line, dir: Number(btn.dataset.dir) };
        state.targetKey = btn.dataset.key;
        state.view = "detail";
        lastVoiceMin = null;
        pushLevel();
        render();
      });
    });

    if (hadFocus) {
      const row = el.querySelector(".next-row");
      if (row) row.focus();
    }
    state.lastSig = listSig(board);
  }

  /* --- favorites (favorites root) --- */

  function favEntries(now) {
    return state.favorites
      .filter((f) => STATIONS[f.station] && LINES[f.line])
      .map((f) => ({ f, ...favNext(f, now) }));
  }

  function favSig(entries, now) {
    return "F|" + entries.map(({ f, dep }) =>
      favKey(f) + ":" + (dep ? dep.key + ":" + fmtMin(dep, now) + ":" + fmtClock(dep.time) : "none")
    ).join("|");
  }

  function renderFavorites() {
    const el = $("#result");
    const now = Date.now();
    const entries = favEntries(now);
    const hadFocus = el.contains(document.activeElement);

    if (!entries.length) {
      el.innerHTML = `
        <div class="notice fav-empty">
          <strong>No favorites yet.</strong>
          Search for your stop, open a train, and tap the heart
          ${heartSVG(false)} to save it here.
        </div>`;
      state.lastSig = "F|";
      state.live = false;
      return;
    }

    state.live = entries.every((e) => e.live);
    const rows = entries.map(({ f, dep }) => {
      const plat = platformLabelFor(f.line, f.dir, f.station);
      const right = dep
        ? `<span class="fav-departs">${fmtClock(dep.time)}</span><span class="fav-min">${fmtMin(dep, now)}</span>`
        : `<span class="fav-min">No service</span>`;
      return `
        <button type="button" tabindex="0" class="next-row fav-row" data-fav="${favKey(f)}"
          aria-label="${LINES[f.line].label} train at ${esc(STATIONS[f.station].name)} ${esc("to " + LINES[f.line].terminals[f.dir])}${dep ? ", departs " + fmtClock(dep.time) + ", " + fmtMin(dep, now) : ", no service"}. Open countdown.">
          ${bulletHTML(f.line, "md")}
          <span class="next-dest">
            <span class="next-term">${esc(STATIONS[f.station].name)}</span>
            <span class="next-dir">${esc("to " + LINES[f.line].terminals[f.dir])}${plat ? " · " + esc(plat) : ""}</span>
          </span>
          <span class="fav-times">${right}</span>
        </button>`;
    }).join("");

    el.innerHTML = `
      <div class="board" role="group" aria-label="Favorite trains">
        <div class="nexts-head"><span>Favorites</span><span class="nexts-hint">tap for countdown</span></div>
        ${rows}
      </div>`;

    el.querySelectorAll(".fav-row").forEach((btn) => {
      btn.addEventListener("click", () => {
        const f = state.favorites.find((x) => favKey(x) === btn.dataset.fav);
        if (!f) return;
        state.station = f.station;
        kvStore.set("nt-station", f.station);
        state.sel = { line: f.line, dir: f.dir };
        state.targetKey = null;
        state.view = "detail";
        lastVoiceMin = null;
        renderPlanner();
        fetchRT(f.station);
        // Mark the entry we're leaving as the favorites list, so Back
        // deterministically returns here (spec), whatever came before.
        history.replaceState({ nt: "favroot" }, "");
        pushLevel();
        render();
      });
    });

    if (hadFocus) {
      const row = el.querySelector(".fav-row");
      if (row) row.focus();
    }
    state.lastSig = favSig(entries, now);
  }

  /* --- train detail view --- */

  function primaryIndex(board) {
    if (!state.targetKey) return 0;
    const i = board.findIndex((d) => d.key === state.targetKey);
    return i < 0 ? 0 : i;
  }

  function detailSig(board) {
    const i = primaryIndex(board);
    return "D|" + board.slice(i, i + 3).map((d) => d.key).join("|");
  }

  function renderDetail() {
    const el = $("#result");
    const board = detailBoard(new Date());
    const hadFocus = el.contains(document.activeElement);

    if (!board.length) {
      el.innerHTML = `
        <button type="button" tabindex="0" class="board-back" id="board-back">${BACK_ARROW} Back</button>
        <div class="notice">This train isn&rsquo;t running right now.</div>`;
      wireBack();
      state.lastSig = "D|";
      return;
    }

    const i = primaryIndex(board);
    const p = board[i];
    const following = board.slice(i + 1, i + 3);
    const now = Date.now();
    const plat = platformLabel(p);
    const saved = isFav(state.station, p.line, p.dir);

    const rows = following.map((d) => `
        <button type="button" tabindex="0" class="next-row" data-key="${d.key}"
          aria-label="Target the ${fmtClock(d.time)} ${LINES[d.line].label}${d.express ? " express" : ""} train ${esc(dirLabel(d))}, ${fmtMin(d, now)}">
          ${bulletHTML(d.line, "sm", d.express)}
          <span class="next-dest"><span class="next-term">${esc(dirLabel(d))}</span></span>
          <span class="next-min" data-key-min="${d.key}">${fmtMin(d, now)}</span>
        </button>`).join("");

    el.innerHTML = `
      <button type="button" tabindex="0" class="board-back" id="board-back" aria-label="${state.tab === "favorites" ? "Back to favorites" : "Back to all trains at this station"}">${BACK_ARROW} Back</button>
      <div class="board" role="group" aria-label="Departure countdown">
        <div class="board-top">
          ${bulletHTML(p.line, "lg", p.express)}
          <div class="board-dest">
            <div class="board-dir">${esc(dirLabel(p))}</div>
            <div class="board-at">At ${esc(STATIONS[state.station].name)}${plat ? " &middot; " + esc(plat) + " platform" : ""}</div>
          </div>
          <button type="button" tabindex="0" class="fav-btn" id="fav-btn" aria-pressed="${saved}"
            aria-label="${saved ? "Remove this train from favorites" : "Save this train to favorites"}">${heartSVG(saved)}</button>
        </div>
        <div class="board-count">
          <span class="count-num" id="count-num">--:--</span>
          <span class="count-label">until departure</span>
        </div>
        <div class="board-meta">
          <span>Departs <strong>${fmtClock(p.time)}</strong></span>
          <span>${esc(lineName(p))}</span>
        </div>
        <div class="board-nexts">
          <div class="nexts-head"><span>Next trains ${esc(dirLabel(p))}</span>${following.length ? `<span class="nexts-hint">tap to target</span>` : ""}</div>
          ${following.length ? rows : `<div class="nexts-empty">No more times available to show.</div>`}
        </div>
      </div>
      <div class="sr-only" aria-live="polite" id="count-voice"></div>`;

    wireBack();
    $("#fav-btn").addEventListener("click", () => {
      toggleFav(state.station, p.line, p.dir);
      const nowSaved = isFav(state.station, p.line, p.dir);
      const btn = $("#fav-btn");
      btn.setAttribute("aria-pressed", String(nowSaved));
      btn.setAttribute("aria-label", nowSaved ? "Remove this train from favorites" : "Save this train to favorites");
      btn.innerHTML = heartSVG(nowSaved);
    });
    el.querySelectorAll(".next-row").forEach((btn) => {
      btn.addEventListener("click", () => {
        // Each drill-down to a later train is its own history level, so
        // Back retraces earlier departures before reaching the board.
        state.targetKey = btn.dataset.key;
        lastVoiceMin = null;
        pushLevel();
        render();
      });
    });

    if (hadFocus) {
      const row = el.querySelector(".next-row") || $("#board-back");
      if (row) row.focus();
    }
    state.lastSig = detailSig(board);
    tick();
  }

  // The visible Back control and the browser/phone back gesture are the
  // same thing: Back pops one history level, and popstate restores it.
  function wireBack() {
    const back = $("#board-back");
    if (back) back.addEventListener("click", () => history.back());
  }

  // Every navigation level (train detail, each drill-down, the picker)
  // pushes an entry whose state can rebuild the view on popstate.
  let stackDepth = 0;

  function pushLevel() {
    interacted = true;
    history.pushState({
      nt: "detail",
      tab: state.tab,
      station: state.station,
      sel: state.sel,
      targetKey: state.targetKey
    }, "");
    stackDepth++;
  }

  /* --- info page --- */

  const SITE_URL = "https://www.danielschwartz.com";

  function renderInfo() {
    const el = $("#result");
    el.innerHTML = `
      <button type="button" tabindex="0" class="board-back" id="board-back" aria-label="Back">${BACK_ARROW} Back</button>
      <div class="notice info-key" role="group" aria-label="Service key">
        <h2 class="info-key-title">Key</h2>
        <div class="key-row">
          ${bulletHTML("6", "md")}
          <p class="key-text"><strong>Circle</strong> — local service. The train makes local stops.</p>
        </div>
        <div class="key-row">
          ${bulletHTML("6", "md", true)}
          <p class="key-text"><strong>Diamond</strong> — express service. A rush-hour variant that skips some stations.</p>
        </div>
      </div>
      <div class="notice info-card">
        <h2 class="info-key-title">About</h2>
        <p>I hope this application helps you find your next train faster and with joy!</p>
        <p>This application is currently for demonstration, education, and exploration
           purposes only. This application is not currently sponsored, endorsed, or
           licensed by the MTA. The MTA&rsquo;s station stops and visual language are
           property of the MTA.</p>
        <p>Train times come straight from the
           <a href="https://api.mta.info/" target="_blank" rel="noopener">MTA&rsquo;s real-time data feeds</a>,
           refreshed about every 30 seconds while you watch. Station names, transfers,
           and platform directions come from the
           <a href="https://data.ny.gov/Transportation/MTA-Subway-Stations/39hk-dx4f" target="_blank" rel="noopener">MTA&rsquo;s official station dataset</a>.</p>
        <p>Created with <span aria-label="love" role="img">&#10084;&#65039;</span> in the
           <span aria-hidden="true">&#128509;</span> greatest city in the world!</p>
        <p class="info-sig"><a id="info-site" href="${SITE_URL}" target="_blank" rel="noopener">Daniel Schwartz</a></p>
      </div>`;
    wireBack();
    // Native app: open external links in the system browser
    // (SFSafariViewController / Custom Tabs) via the Capacitor Browser
    // plugin; the web falls back to the anchors' target=_blank.
    el.querySelectorAll('.info-card a[target="_blank"]').forEach((a) => {
      a.addEventListener("click", (e) => {
        const p = window.Capacitor && window.Capacitor.Plugins;
        if (p && p.Browser) {
          e.preventDefault();
          try { p.Browser.open({ url: a.href }); } catch (err) {}
        }
      });
    });
    state.lastSig = "I|";
  }

  function openInfo() {
    interacted = true;
    state.view = "info";
    history.pushState({ nt: "info" }, "");
    stackDepth++;
    render();
  }

  // First-run prompt: signage-style board asking the user to pick a stop.
  // The decorative bullets glow left-to-right on a loop (0.5s in, sweep,
  // ~3s pause — timing lives in the CSS keyframes; the stagger here).
  function renderPrompt() {
    const el = $("#result");
    const bullets = ["1", "2", "3", "A", "C", "E", "N", "Q", "R"]
      .map((l, i) => {
        const ln = LINES[l];
        return `<span class="bullet sm" style="--bc:${ln.color};color:${ln.text};animation-delay:${(0.5 + i * 0.08).toFixed(2)}s">${ln.label}</span>`;
      }).join("");
    el.innerHTML = `
      <div class="board prompt-board" role="group" aria-label="Choose a station">
        <div class="prompt-bullets" aria-hidden="true">${bullets}</div>
        <h2 class="prompt-title">Pick your stop</h2>
        <p class="prompt-text">Choose a station to see the next trains, live from the MTA.</p>
        <button type="button" tabindex="0" class="prompt-cta" id="prompt-cta">Choose your stop</button>
      </div>`;
    $("#prompt-cta").addEventListener("click", openPicker);
    state.lastSig = "P|";
  }

  function render() {
    updateTabbar();
    $("#planner").hidden = state.tab === "favorites" || state.view === "info";
    // No data claim to make on the info page or the first-run prompt.
    $("#data-status").hidden = state.view === "info"
      || (state.tab === "search" && state.view !== "detail" && !state.station);
    if (state.view === "info") renderInfo();
    else if (state.view === "detail" && state.sel) renderDetail();
    else if (state.tab === "favorites") renderFavorites();
    else if (!state.station) renderPrompt();
    else renderList();
  }

  /* --- ticking --- */

  let lastVoiceMin = null;

  function updateStatus() {
    const el = $("#data-status");
    if (!el) return;
    const text = state.live
      ? "Live MTA data: updates every 30 seconds. Check station signage before boarding."
      : "Live data unavailable — showing schedule-based estimates. Check station signage before boarding.";
    if (el.textContent.trim() !== text) el.textContent = text;
  }

  function tick() {
    if (state.view === "info") return;   // static page, nothing to tick
    const now = Date.now();

    if (state.view !== "detail" && state.tab === "favorites") {
      const entries = favEntries(now);
      if (favSig(entries, now) !== state.lastSig) renderFavorites();
      updateStatus();
      return;
    }

    if (!state.station) return;   // first-run prompt: nothing to tick

    if (state.view !== "detail") {
      const board = stationBoard(state.station, new Date(), LIST_ROWS);
      if (listSig(board) !== state.lastSig) { renderList(); updateStatus(); return; }
      board.forEach((d) => {
        const minEl = document.querySelector(`[data-key-min="${d.key}"]`);
        if (minEl) {
          const m = fmtMin(d, now);
          if (minEl.textContent !== m) minEl.textContent = m;
        }
      });
      updateStatus();
      return;
    }

    // detail view
    const board = detailBoard(new Date());
    if (state.targetKey && !board.some((d) => d.key === state.targetKey)) {
      state.targetKey = null;  // targeted train departed → anchor to next
    }
    if (detailSig(board) !== state.lastSig) { renderDetail(); updateStatus(); return; }
    updateStatus();
    if (!board.length) return;

    const i = primaryIndex(board);
    const p = board[i];

    const countEl = $("#count-num");
    if (!countEl) return;
    const sec = Math.max(0, Math.round((p.time.getTime() - now) / 1000));
    const text = fmtCountdown(sec);
    if (countEl.textContent !== text) countEl.textContent = text;
    countEl.classList.toggle("due", text === "DUE");

    board.slice(i + 1, i + 3).forEach((d) => {
      const minEl = document.querySelector(`[data-key-min="${d.key}"]`);
      if (minEl) {
        const m = fmtMin(d, now);
        if (minEl.textContent !== m) minEl.textContent = m;
      }
    });

    // Announce to screen readers once per minute, not every second.
    const min = Math.floor(sec / 60);
    if (min !== lastVoiceMin) {
      lastVoiceMin = min;
      const voice = $("#count-voice");
      if (voice) {
        const label = LINES[p.line].label + " train " + dirLabel(p);
        voice.textContent = sec <= 30
          ? `The ${label} is due now.`
          : `The ${label} departs in about ${min} minute${min === 1 ? "" : "s"}.`;
      }
    }
  }

  /* ---------- station picker ---------- */

  function openPicker() {
    interacted = true;
    state.picking = true;
    state.lastFocus = document.activeElement;
    const sheet = $("#picker");
    sheet.hidden = false;
    document.body.classList.add("sheet-open");
    $("#picker-search").value = "";
    renderStationList("");
    $("#picker-search").focus();
    history.pushState({ nt: "picker" }, "");
    stackDepth++;
  }

  function closePicker() {
    state.picking = false;
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
        html += `<li><button type="button" tabindex="0" class="station-row" data-id="${id}">
          <span class="station-name">${esc(STATIONS[id].name)}</span>
          <span class="station-bullets">${STATIONS[id].lines.map((l) => bulletHTML(l, "sm")).join("")}</span>
        </button></li>`;
      }
    }
    $("#station-list").innerHTML = html || `<li class="borough-head">No stations match</li>`;
  }

  function pickStation(id) {
    // A new station starts fresh on the search board: unwind the whole
    // stack (picker + any drill-down levels) in one suppressed jump.
    const depth = stackDepth;
    state.station = id;
    state.tab = "search";
    state.view = "list";
    state.sel = null;
    state.targetKey = null;
    kvStore.set("nt-station", id);
    closePicker();
    refresh();
    fetchRT(id);
    if (depth > 0) {
      suppressPop = true;
      stackDepth = 0;
      history.go(-depth);
    }
  }

  /* ---------- wiring ---------- */

  function refresh() {
    renderPlanner();
    render();
  }

  // Once the user has navigated anywhere, the async favorites load must
  // not yank them to a different tab.
  let interacted = false;

  function setTab(tab) {
    interacted = true;
    if (state.tab === tab && state.view === "list") return;
    state.tab = tab;
    state.view = "list";
    state.sel = null;
    state.targetKey = null;
    lastVoiceMin = null;
    if (tab === "favorites") fetchFavRT();
    render();
  }

  // Shortcut: 4 quick clicks on the Search tab wipe the saved stop and
  // return the Search tab to its first-run "Pick your stop" state.
  function resetSearch() {
    state.station = null;
    state.tab = "search";
    state.view = "list";
    state.sel = null;
    state.targetKey = null;
    kvStore.remove("nt-station");
    kvStore.remove("nt-from");   // v1 carry-over key would resurrect it
    lastVoiceMin = null;
    renderPlanner();
    render();
  }

  let suppressPop = false;

  function onPopState(e) {
    if (suppressPop) { suppressPop = false; return; }
    stackDepth = Math.max(0, stackDepth - 1);
    if (state.picking) closePicker();
    const s = e.state;
    if (s && s.nt === "info") {
      state.view = "info";
      lastVoiceMin = null;
      render();
      return;
    }
    if (s && s.nt === "favroot") {
      state.tab = "favorites";
      state.view = "list";
      state.sel = null;
      state.targetKey = null;
      lastVoiceMin = null;
      render();
      return;
    }
    if (s && s.nt === "detail" && s.sel && validStation(s.station)) {
      // Restore the level we navigated back (or forward) to — including
      // which tab and station it belonged to.
      state.tab = s.tab === "favorites" ? "favorites" : "search";
      state.station = s.station;
      state.view = "detail";
      state.sel = s.sel;
      state.targetKey = s.targetKey || null;
    } else {
      // Base of the stack: the current tab's root screen.
      state.view = "list";
      state.sel = null;
      state.targetKey = null;
    }
    lastVoiceMin = null;
    renderPlanner();
    render();
  }

  function init() {
    $("#station-btn").addEventListener("click", openPicker);
    $("#picker-close").addEventListener("click", () => history.back());
    $("#picker-search").addEventListener("input", (e) => renderStationList(e.target.value));
    $("#station-list").addEventListener("click", (e) => {
      const btn = e.target.closest(".station-row");
      if (btn) pickStation(btn.dataset.id);
    });
    let searchClicks = 0, lastSearchClick = 0;
    $("#tab-search").addEventListener("click", () => {
      const now = Date.now();
      searchClicks = now - lastSearchClick < 1500 ? searchClicks + 1 : 1;
      lastSearchClick = now;
      if (searchClicks >= 4) {
        searchClicks = 0;
        resetSearch();
        return;
      }
      setTab("search");
    });
    $("#tab-favorites").addEventListener("click", () => setTab("favorites"));
    $("#brand-home").addEventListener("click", () => setTab("search"));
    $("#info-btn").addEventListener("click", openInfo);
    window.addEventListener("popstate", onPopState);
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && state.picking) history.back();
    });
    // Focus trap + arrow-key navigation for the station selector sheet.
    $("#picker").addEventListener("keydown", (e) => {
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        const rows = [...$("#picker").querySelectorAll(".station-row")];
        if (!rows.length) return;
        e.preventDefault();
        const i = rows.indexOf(document.activeElement);
        let next;
        if (i === -1) next = rows[0];                                  // from the search input
        else next = rows[Math.min(rows.length - 1, Math.max(0, i + (e.key === "ArrowDown" ? 1 : -1)))];
        if (e.key === "ArrowUp" && i === 0) next = $("#picker-search"); // back up to the input
        next.focus();
        if (next.scrollIntoView) next.scrollIntoView({ block: "nearest" });
        return;
      }
      if (e.key !== "Tab") return;
      const focusables = $("#picker").querySelectorAll("button, input");
      const first = focusables[0], last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) { last.focus(); e.preventDefault(); }
      else if (!e.shiftKey && document.activeElement === last) { first.focus(); e.preventDefault(); }
    });

    // On native, the stop may live only in Preferences (not localStorage).
    kvStore.get("nt-station").then((v) => {
      if (!state.station && validStation(v) && !interacted && state.view === "list") {
        state.station = v;
        refresh();
        fetchRT(v);
      }
    });

    favStore.load().then((list) => {
      state.favorites = Array.isArray(list) ? list : [];
      // With saved favorites, the app opens on the Favorites tab; without
      // any, Search is the default. Don't override a user already moving.
      if (state.favorites.length && !interacted && state.view === "list" && !state.picking) {
        state.tab = "favorites";
      }
      if (state.tab === "favorites") { fetchFavRT(); render(); }
    });

    refresh();
    setInterval(tick, 1000);

    fetchRT(state.station);
    setInterval(() => fetchRT(state.station), RT_REFRESH_MS);
    setInterval(() => { if (state.tab === "favorites") fetchFavRT(); }, FAV_REFRESH_MS);
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState !== "visible") return;
      fetchRT(state.station);
      if (state.tab === "favorites") fetchFavRT();
    });

    if ("serviceWorker" in navigator && location.protocol !== "file:") {
      navigator.serviceWorker.register("sw.js").catch(() => {});
    }
  }

  document.addEventListener("DOMContentLoaded", init);
})();

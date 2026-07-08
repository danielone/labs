/* Next Train NYC — app logic (v2: station departure board)
 *
 * Pick a stop; the board shows the next train there (any line, either
 * direction), with the two trains after it. Tapping a following train
 * targets it: the big card switches to that train and the following list
 * recomputes from there.
 *
 * Departure times are deterministic, schedule-based estimates: each
 * line/direction/station gets a fixed offset on a headway grid, so the
 * countdown is stable across refreshes. See README for wiring real-time
 * GTFS-RT data.
 */

(function () {
  "use strict";

  const $ = (sel) => document.querySelector(sel);

  const DEFAULT_STATION = "611"; // Times Sq-42 St / Port Authority complex

  function validStation(id) {
    return id && STATIONS[id] ? id : null;
  }

  const state = {
    station: validStation(localStorage.getItem("nt-station"))
      || validStation(localStorage.getItem("nt-from"))   // v1 carry-over
      || DEFAULT_STATION,
    picking: false,
    selectedKey: null,   // departure the user is targeting; null = earliest
    board: [],           // upcoming departures at the stop, soonest first
    lastFocus: null,
    lastSig: ""
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

  // All upcoming departures at a stop across every line/direction serving
  // it, soonest first. Keys are stable (deterministic epochs), so a
  // targeted train keeps its identity as the board recomputes each tick.
  function stationBoard(stationId, after, count) {
    const out = [];
    for (const lineId of STATIONS[stationId].lines) {
      if (!isRunning(lineId, after)) continue;
      const line = LINES[lineId];
      const i = line.idx[stationId];
      for (const dir of [0, 1]) {
        // No departures toward the terminal the train ends at.
        if (dir === 0 && i === 0) continue;
        if (dir === 1 && i === line.stops.length - 1) continue;
        for (const time of nextDepartures(lineId, dir, stationId, after, 3)) {
          out.push({
            line: lineId, dir, time,
            key: lineId + ":" + dir + ":" + Math.floor(time.getTime() / 1000)
          });
        }
      }
    }
    out.sort((a, b) => a.time - b.time);
    return out.slice(0, count);
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

  function fmtMin(dep, now) {
    const sec = (dep.time.getTime() - now) / 1000;
    return sec <= 45 ? "Due" : Math.round(sec / 60) + " min";
  }

  function dirLabel(dep) {
    return "to " + LINES[dep.line].terminals[dep.dir];
  }

  // Official platform signage ("Uptown", "Downtown & Brooklyn", ...).
  function platformLabel(dep) {
    const line = LINES[dep.line];
    const label = (line.dirLabels[line.idx[state.station]] || [])[dep.dir];
    return label && label !== "Last Stop" ? label : "";
  }

  function renderPlanner() {
    $("#station-value").innerHTML = esc(STATIONS[state.station].name);
    $("#station-bullets").innerHTML = STATIONS[state.station].lines.map((l) => bulletHTML(l, "sm")).join("");
  }

  function computeBoard() {
    state.board = stationBoard(state.station, new Date(), 9);
    if (state.selectedKey && !state.board.some((d) => d.key === state.selectedKey)) {
      state.selectedKey = null;  // targeted train departed
    }
  }

  function primaryIndex() {
    if (!state.selectedKey) return 0;
    const i = state.board.findIndex((d) => d.key === state.selectedKey);
    return i < 0 ? 0 : i;
  }

  function boardSig() {
    const i = primaryIndex();
    return state.board.slice(i, i + 3).map((d) => d.key).join("|");
  }

  function renderResult() {
    const el = $("#result");
    if (!state.board.length) {
      el.innerHTML = `<div class="notice">No trains scheduled at this stop right now.</div>`;
      state.lastSig = "";
      return;
    }

    const i = primaryIndex();
    const p = state.board[i];
    const following = state.board.slice(i + 1, i + 3);
    const now = Date.now();
    const plat = platformLabel(p);

    const hadRowFocus = el.contains(document.activeElement);

    const rows = following.map((d) => `
        <button type="button" class="next-row" data-key="${d.key}"
          aria-label="Target the ${fmtClock(d.time)} ${LINES[d.line].label} train ${esc(dirLabel(d))}, ${fmtMin(d, now)}">
          ${bulletHTML(d.line, "sm")}
          <span class="next-dest">${esc(dirLabel(d))}</span>
          <span class="next-min" data-key-min="${d.key}">${fmtMin(d, now)}</span>
        </button>`).join("");

    el.innerHTML = `
      <div class="board" role="group" aria-label="Departure board">
        <div class="board-top">
          ${bulletHTML(p.line, "lg")}
          <div class="board-dest">
            <div class="board-dir">${esc(dirLabel(p))}</div>
            <div class="board-at">At ${esc(STATIONS[state.station].name)}${plat ? " &middot; " + esc(plat) + " platform" : ""}</div>
          </div>
        </div>
        <div class="board-count">
          <span class="count-num" id="count-num">--:--</span>
          <span class="count-label">until departure</span>
        </div>
        <div class="board-meta">
          <span>Departs <strong>${fmtClock(p.time)}</strong></span>
          <span>${esc(LINES[p.line].name)}</span>
        </div>
        <div class="board-nexts">
          <div class="nexts-head"><span>Next trains</span><span class="nexts-hint">tap to target</span></div>
          ${rows}
          ${i > 0 ? `<button type="button" class="board-reset" id="board-reset">&#9666; Back to next train</button>` : ""}
        </div>
      </div>
      <div class="sr-only" aria-live="polite" id="count-voice"></div>`;

    el.querySelectorAll(".next-row").forEach((btn) => {
      btn.addEventListener("click", () => {
        state.selectedKey = btn.dataset.key;
        lastVoiceMin = null;
        renderResult();
        tick();
      });
    });
    const reset = $("#board-reset");
    if (reset) {
      reset.addEventListener("click", () => {
        state.selectedKey = null;
        lastVoiceMin = null;
        renderResult();
        tick();
      });
    }

    // Don't strand keyboard focus when a departure forces a re-render.
    if (hadRowFocus) {
      const row = el.querySelector(".next-row");
      if (row) row.focus();
    }

    state.lastSig = boardSig();
    tick();
  }

  let lastVoiceMin = null;

  function tick() {
    const nowEl = $("#now-clock");
    if (nowEl) nowEl.textContent = fmtClock(new Date());
    if (!state.station) return;

    computeBoard();
    if (!state.board.length) {
      if (state.lastSig !== "") renderResult();
      return;
    }
    // Re-render only when the visible trains change (a departure passed or
    // the target changed); otherwise just update the ticking numbers, so
    // focus on the tappable rows isn't destroyed every second.
    if (boardSig() !== state.lastSig) {
      renderResult();
      return;
    }

    const now = Date.now();
    const p = state.board[primaryIndex()];

    const countEl = $("#count-num");
    if (!countEl) return;
    const sec = Math.max(0, Math.round((p.time.getTime() - now) / 1000));
    const text = fmtCountdown(sec);
    if (countEl.textContent !== text) countEl.textContent = text;
    countEl.classList.toggle("due", text === "DUE");

    state.board.slice(primaryIndex() + 1, primaryIndex() + 3).forEach((d) => {
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
    state.picking = true;
    state.lastFocus = document.activeElement;
    const sheet = $("#picker");
    sheet.hidden = false;
    document.body.classList.add("sheet-open");
    $("#picker-search").value = "";
    renderStationList("");
    $("#picker-search").focus();
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
        html += `<li><button type="button" class="station-row" data-id="${id}">
          <span class="station-name">${esc(STATIONS[id].name)}</span>
          <span class="station-bullets">${STATIONS[id].lines.map((l) => bulletHTML(l, "sm")).join("")}</span>
        </button></li>`;
      }
    }
    $("#station-list").innerHTML = html || `<li class="borough-head">No stations match</li>`;
  }

  function pickStation(id) {
    state.station = id;
    state.selectedKey = null;
    localStorage.setItem("nt-station", id);
    closePicker();
    refresh();
  }

  /* ---------- wiring ---------- */

  function refresh() {
    renderPlanner();
    computeBoard();
    renderResult();
  }

  function init() {
    $("#station-btn").addEventListener("click", openPicker);
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

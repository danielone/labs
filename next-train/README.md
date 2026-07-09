# NYC Next Train

Pick your stop and you get the **station board**: the next trains arriving
there across every line, in both directions, each row signed with its
terminal and platform direction (Uptown/Downtown/Queens…). Tap a train and
you get its **countdown card** — line, direction, platform, departure time,
live countdown — with the following trains for that same line + direction,
tappable to drill down to a later one. Every level is a real history entry:
**Back** (the button or the browser/phone gesture) retraces each departure
you viewed, then lands on the station board. All
in the visual language of the NYC subway: Helvetica, black signage panels,
official route-bullet colors, and countdown-clock departure boards.

**Tabs & favorites (v2.5):** a bottom navigation bar has Search (the flow
above) and Favorites. Tap the heart on any train's countdown card to save
that station + line + direction. The Favorites tab lists each saved entry
with its next train — departure time and minutes until — refreshed every
minute; tapping an entry opens the same countdown detail as a search, and
Back returns to the favorites list. Favorites persist in localStorage on
the web and in Capacitor Preferences (iOS UserDefaults / Android
SharedPreferences) in the native app.

> The previous design (origin → destination trip planner with transfer
> routing) is archived on the `archive/v1-destination-planner` git branch.

Web app (installable PWA) + Capacitor wrapper for iOS App Store /
Google Play submission. Vanilla HTML/CSS/JS front end — no build step.
Departure times are **live MTA data** (see below), with an offline
schedule-based fallback. The only network calls are to the app's own
departures endpoint; no analytics, no data collection.

**Live: https://next-train-zeta.vercel.app**

## Run locally

```bash
php -S localhost:8123 -t www        # or: python3 -m http.server 8123 -d www
```

Visit http://localhost:8123. Choose "Your stop" — the station board lists
the next trains there (all lines, both directions). Tap one for its ticking
countdown and the following trains on that line + direction.

**Dev note:** the service worker caches assets cache-first. When you edit
CSS/JS, bump the `CACHE` version at the top of `www/sw.js` (or unregister the
worker in DevTools) or you'll keep seeing the old files.

## Where the station data comes from

`www/js/stations.js` is **generated from official MTA data** by
`tools/generate_stations.py`:

- **MTA Subway Stations dataset** (data.ny.gov, id `39hk-dx4f`) — all
  station names, transfer complexes, boroughs, coordinates, and the real
  platform direction labels ("Uptown & The Bronx").
- **Official subway GTFS feed** (`rrgtfsfeeds.s3.amazonaws.com/gtfs_subway.zip`)
  — per-route stop order (from the most-common daytime service pattern, with
  true branches like A→Lefferts/Far Rockaway spliced in and signed
  correctly), route colors, and route names.

Coverage is the full system: 444 station complexes (all 423 subway complexes
plus the 21 Staten Island Railway stations; SIR has no free subway transfer,
so subway↔SIR trips report no route). To refresh after an MTA schedule
change, re-download the two sources (commands in the script docstring) and
run `python3 tools/generate_stations.py`.

## Real-time departures

**Live:** https://next-train-zeta.vercel.app (Vercel project
`danielones-projects/next-train`)

Departure times come from the **MTA's real-time GTFS-RT feeds**, refreshed
every 30 seconds:

- `api/departures.js` — Vercel serverless function. The MTA feeds are
  protobuf and CORS-blocked for browsers, so this endpoint fetches the
  feeds for the requested routes (feeds are split by line group), decodes
  them with `gtfs-realtime-bindings`, and returns the departures at the
  requested platform stops as JSON. Edge-cached 15s so concurrent users
  share MTA fetches. No API key required.
- The client asks for its station's platform stop ids (in the generated
  station data) + routes, and keys each departure by the **real GTFS trip
  id** — so a targeted train keeps its identity as predictions shift, and
  the countdown tracks the actual train.
- Express variants (6X/7X/FX) are folded into their base route bullets.

**Fallback:** if live data is unreachable (offline, API down, or running
the static files without the function), boards fall back to deterministic
schedule-based estimates on realistic headways, and the footer says so.
Local dev servers (`localhost`) call the deployed API directly (CORS `*`).

To deploy your own: `npx vercel deploy --prod` from the project root
(`vercel.json` serves `www/` statically + `api/` as functions).

## Ship it as a mobile app (Capacitor)

Prereqs: Node 18+, Xcode + an Apple Developer account ($99/yr) for iOS,
Android Studio for Android.

```bash
npm install
npm run ios        # adds the iOS project, syncs www/, opens Xcode
npm run android    # same for Android
```

In Xcode: set your signing team, use `www/icons/icon-1024.png` for the App
Store icon, archive, and upload via App Store Connect. App Review checklist:

- **Privacy:** the app collects nothing; its only network calls are
  anonymous GETs to the departures endpoint — declare "Data Not Collected"
  in App Store Connect. You still need a privacy-policy URL (a one-liner
  page works).
- **Guideline 4.2 (minimum functionality):** wrapped websites get
  rejected; live real-time departures + offline behavior give this app
  standalone utility, but review is still at Apple's discretion.
- **Screenshots:** 6.7" and 6.5" iPhone sizes minimum.

## ⚠️ Trademark note before you publish

The MTA's route bullets, line colors, and "MTA" name are **licensed
trademarks of the Metropolitan Transportation Authority** (managed via MTA's
licensing program). Plenty of third-party transit apps license them —
apply at https://new.mta.info/doing-business-with-us/licensing — but don't
ship to the App Store with this styling without that license or restyled
generic bullets. This project ships under the neutral name "Next Train NYC"
and makes no MTA affiliation claims.

## Structure

```
www/                   the app (static files; also works offline)
  index.html           single page: stop picker + departure board
  css/style.css        design tokens (MTA palette) + components
  js/stations.js       GENERATED full network: 444 complexes, 26 routes,
                       platform stop ids for real-time lookups
  js/app.js            station board, live data + schedule fallback,
                       countdown, drill-down history
  sw.js                offline cache (static assets only, never /api)
  manifest.webmanifest PWA manifest
  icons/               generated icons incl. 1024px App Store icon
api/departures.js      Vercel function: MTA GTFS-RT protobuf → JSON
vercel.json            serves www/ statically + api/ as functions
tools/generate_stations.py  regenerates stations.js from official MTA data
capacitor.config.json  native wrapper config (appId com.danielschwartz.nexttrain)
```

## Accessibility

Skip link, landmark roles, focus-trapped modal picker, visible focus rings
(bullet yellow), screen-reader countdown announcements once per minute (not
every second), `prefers-reduced-motion` honored, `prefers-color-scheme` dark
mode, 48px touch targets.

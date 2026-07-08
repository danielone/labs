# Next Train NYC

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

> The previous design (origin → destination trip planner with transfer
> routing) is archived on the `archive/v1-destination-planner` git branch.

Web app (installable PWA, works fully offline) + Capacitor wrapper for
iOS App Store / Google Play submission. Vanilla HTML/CSS/JS — no build step,
no dependencies, no network calls, no data collection.

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

## How departures work (important)

Departure times are **deterministic schedule-based estimates**, not live
data: each line/direction/station is assigned a fixed offset on a realistic
headway grid (tighter at rush hour, sparser late nights; B/W weekday-only,
Z rush-hours-only). The UI discloses this. The board merges every
line/direction serving the chosen complex, soonest first. Departure keys are
deterministic, so a targeted train keeps its identity while the board ticks.

### Wiring real-time data

The MTA publishes free real-time GTFS-RT feeds (protobuf, no API key needed):
https://api.mta.info/. Browsers can't read them directly (CORS + protobuf),
so add a small server endpoint that fetches the feed for a line group,
decodes it with `gtfs-realtime-bindings`, and returns
`{ stopId, direction, departureEpochs[] }` as JSON. Then replace
`nextDepartures()` in `www/js/app.js` with a fetch to that endpoint —
everything else (routing, rendering, countdown) stays as is. You'd also map
the curated station ids to GTFS stop ids.

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

- **Privacy:** the app makes zero network requests and collects nothing —
  declare "Data Not Collected" in App Store Connect. You still need a
  privacy-policy URL (a one-liner page works).
- **Guideline 4.2 (minimum functionality):** wrapped websites get rejected;
  this app is fully offline/self-contained, which passes, but expect
  scrutiny of the simulated data — consider wiring real-time data (above)
  before submitting.
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
www/                   the entire app (this folder deploys anywhere static)
  index.html           single page: stop picker + departure board
  css/style.css        design tokens (MTA palette) + components
  js/stations.js       GENERATED full network: 444 complexes, 26 routes
  js/app.js            station board, schedule model, countdown, targeting
tools/generate_stations.py  regenerates stations.js from official MTA data
  sw.js                offline cache
  manifest.webmanifest PWA manifest
  icons/               generated icons incl. 1024px App Store icon
capacitor.config.json  native wrapper config (appId com.danielschwartz.nexttrain)
```

## Accessibility

Skip link, landmark roles, focus-trapped modal picker, visible focus rings
(bullet yellow), screen-reader countdown announcements once per minute (not
every second), `prefers-reduced-motion` honored, `prefers-color-scheme` dark
mode, 48px touch targets.

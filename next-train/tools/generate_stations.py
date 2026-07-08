#!/usr/bin/env python3
"""Generate www/js/stations.js from official MTA data.

Sources (download into this directory first):
  curl -L -o stations_official.csv \
    "https://data.ny.gov/api/views/39hk-dx4f/rows.csv?accessType=DOWNLOAD"
  curl -L -o gtfs_subway.zip "https://rrgtfsfeeds.s3.amazonaws.com/gtfs_subway.zip"
  unzip -o gtfs_subway.zip -d gtfs

Method:
  - Stations are keyed by Complex ID so free in-system transfers (Times Sq /
    Port Authority, etc.) are one node — routing treats a complex as one place.
  - Per route, stop order comes from the longest southbound GTFS trip
    (north terminal first). Branch trips whose stops aren't on the main
    sequence get spliced in after the last common stop, with a branchDest
    override so direction signage shows the branch terminal.
  - Route colors/long names from routes.txt. Platform direction labels
    (North/South Direction Label) from the stations dataset.
"""
import csv, json, os, sys
from collections import defaultdict

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(os.path.dirname(HERE), "www", "js", "stations.js")

BOROUGH = {"M": "Manhattan", "Bk": "Brooklyn", "Q": "Queens", "Bx": "Bronx", "SI": "Staten Island"}

# Display label + base midday headway (min) + service pattern per route.
ROUTE_META = {
    "1": ("1", 5, "all"), "2": ("2", 6, "all"), "3": ("3", 6, "all"),
    "4": ("4", 5, "all"), "5": ("5", 6, "all"), "6": ("6", 4, "all"),
    "7": ("7", 4, "all"),
    "A": ("A", 6, "all"), "C": ("C", 8, "all"), "E": ("E", 5, "all"),
    "B": ("B", 8, "weekday"), "D": ("D", 6, "all"), "F": ("F", 5, "all"),
    "M": ("M", 8, "all"), "G": ("G", 8, "all"),
    "J": ("J", 8, "all"), "Z": ("Z", 10, "rush"),
    "L": ("L", 4, "all"), "N": ("N", 6, "all"), "Q": ("Q", 6, "all"),
    "R": ("R", 8, "all"), "W": ("W", 10, "weekday"),
    "GS": ("S", 4, "all"), "FS": ("S", 8, "all"), "H": ("S", 10, "all"),
    "SI": ("SIR", 15, "all"),
}
ROUTE_ORDER = ["1","2","3","4","5","6","7","A","C","E","B","D","F","M","G","L","J","Z","N","Q","R","W","GS","FS","H","SI"]

# ---- stations dataset -------------------------------------------------
by_gtfs = {}          # GTFS Stop ID -> row
with open(os.path.join(HERE, "stations_official.csv"), newline="", encoding="utf-8-sig") as f:
    for row in csv.DictReader(f):
        by_gtfs[row["GTFS Stop ID"]] = row

# ---- GTFS routes / trips ----------------------------------------------
routes_meta = {}
with open(os.path.join(HERE, "gtfs/routes.txt"), newline="", encoding="utf-8-sig") as f:
    for row in csv.DictReader(f):
        routes_meta[row["route_id"]] = row

trip_route = {}
with open(os.path.join(HERE, "gtfs/trips.txt"), newline="", encoding="utf-8-sig") as f:
    for row in csv.DictReader(f):
        trip_route[row["trip_id"]] = row["route_id"]

# ---- stream stop_times: keep candidate southbound daytime sequences ----
# Only trips departing 07:00-19:00, so we model the daytime service pattern
# (avoids e.g. the night 4 running local to New Lots, rush W to Gravesend).
# Main = longest such trip per route; also keep the longest trip per
# distinct terminal stop, to recover daytime branches (A to Lefferts).
best_by_terminal = defaultdict(dict)   # route -> {terminal_stop: seq}
term_counts = defaultdict(lambda: defaultdict(int))  # route -> terminal_stop -> #trips

def consume(trip_id, seq, first_dep):
    if not seq or not seq[0].endswith("S"):
        return
    try:
        hour = int(first_dep.split(":")[0])
    except (AttributeError, ValueError):
        return
    if not (7 <= hour < 19):
        return
    route = trip_route.get(trip_id)
    if route not in ROUTE_META:
        return
    term = seq[-1]
    term_counts[route][term] += 1
    cur = best_by_terminal[route].get(term)
    if cur is None or len(seq) > len(cur):
        best_by_terminal[route][term] = seq

with open(os.path.join(HERE, "gtfs/stop_times.txt"), newline="", encoding="utf-8-sig") as f:
    reader = csv.DictReader(f)
    cur_trip, seq, first_dep = None, [], None
    for row in reader:
        t = row["trip_id"]
        if t != cur_trip:
            consume(cur_trip, seq, first_dep)
            cur_trip, seq, first_dep = t, [], row["departure_time"]
        seq.append(row["stop_id"])
    consume(cur_trip, seq, first_dep)

# ---- build per-route complex sequences ---------------------------------
complex_rows = defaultdict(list)   # complex id -> CSV rows
lines_out = {}
missing_stops = set()

def to_complexes(seq):
    """GTFS stop ids -> [(complex_id, row)], consecutive dupes removed."""
    out = []
    for sid in seq:
        base = sid[:-1] if sid[-1] in "NS" else sid
        row = by_gtfs.get(base)
        if row is None:
            missing_stops.add(base)
            continue
        cid = row["Complex ID"]
        if not out or out[-1][0] != cid:
            out.append((cid, row))
    return out

skipped_variants = defaultdict(list)

for route, terms in best_by_terminal.items():
    # Main pattern = the terminal most trips are signed for (the typical
    # daytime run), longest trip to it. Other terminals become branches.
    main_term = max(terms, key=lambda t: (term_counts[route][t], len(terms[t])))
    main = to_complexes(terms[main_term])
    # Signage terminals come from the un-spliced main pattern.
    terminals = [main[0][1]["Stop Name"], main[-1][1]["Stop Name"]]
    seqs = sorted((s for t, s in terms.items() if t != main_term), key=len, reverse=True)
    branch_dest = {}
    for alt in seqs:
        altc = to_complexes(alt)
        main_ids = {cid for cid, _ in main}
        is_novel = [cid not in main_ids for cid, _ in altc]
        if not any(is_novel):
            continue
        # Accept only true branches: the novel stops must be a contiguous
        # run at the end (south branch) or start (north branch) of the
        # variant. Mid-route deviations (scheduled reroutes like F via
        # 53 St) are skipped — those stops belong to other routes.
        first_novel, last_novel = is_novel.index(True), len(is_novel) - 1 - is_novel[::-1].index(True)
        if not all(is_novel[first_novel:last_novel + 1]):
            skipped_variants[route].append(altc[-1][1]["Stop Name"])
            continue
        novel = altc[first_novel:last_novel + 1]
        if last_novel == len(altc) - 1 and first_novel > 0:        # south branch
            junction = altc[first_novel - 1][0]
            pos = next(i for i, (cid, _) in enumerate(main) if cid == junction)
            main = main[:pos + 1] + novel + main[pos + 1:]
            dest = novel[-1][1]["Stop Name"]
        elif first_novel == 0 and last_novel < len(altc) - 1:      # north branch
            junction = altc[last_novel + 1][0]
            pos = next(i for i, (cid, _) in enumerate(main) if cid == junction)
            main = main[:pos] + novel + main[pos:]
            dest = novel[0][1]["Stop Name"]
        else:
            skipped_variants[route].append(altc[-1][1]["Stop Name"])
            continue
        for cid, _ in novel:
            branch_dest[cid] = dest

    label, headway, service = ROUTE_META[route]
    rmeta = routes_meta[route]
    stops, dir_labels = [], []
    for cid, row in main:
        stops.append(cid)
        dir_labels.append([row["North Direction Label"], row["South Direction Label"]])
        complex_rows[cid].append(row)
    lines_out[route] = {
        "label": label,
        "color": "#" + (rmeta.get("route_color") or "808183").lower(),
        "text": "#" + (rmeta.get("route_text_color") or "ffffff").lower(),
        "name": rmeta.get("route_long_name") or "",
        "terminals": terminals,
        "headway": headway,
        "service": service,
        "stops": stops,
        "dirLabels": dir_labels,
        "branchDest": branch_dest,
    }

# ---- stations (complexes) ----------------------------------------------
stations_out = {}
for cid, rows in complex_rows.items():
    names = []
    for r in rows:
        if r["Stop Name"] not in names:
            names.append(r["Stop Name"])
    stations_out[cid] = {
        "name": " / ".join(names[:2]),
        "borough": BOROUGH.get(rows[0]["Borough"], rows[0]["Borough"]),
        "lat": round(float(rows[0]["GTFS Latitude"]), 5),
        "lng": round(float(rows[0]["GTFS Longitude"]), 5),
    }

# ---- report -------------------------------------------------------------
print(f"routes: {len(lines_out)}   station complexes: {len(stations_out)}")
if missing_stops:
    print("WARN unmatched GTFS stops:", sorted(missing_stops), file=sys.stderr)
for r in ROUTE_ORDER:
    if r not in lines_out:
        print(f"WARN route {r} missing from GTFS", file=sys.stderr)
    else:
        L = lines_out[r]
        b = ""
        if L["branchDest"]:
            dests = sorted(set(L["branchDest"].values()))
            b = f" (branches to: {', '.join(dests)})"
        if skipped_variants.get(r):
            b += f" [skipped reroute variants ending: {', '.join(sorted(set(skipped_variants[r])))}]"
        print(f"  {r:>3}: {len(L['stops']):3} stops  {L['terminals'][0]} -> {L['terminals'][1]}{b}")

# sanity checks
assert len(stations_out) > 400, "expected 400+ complexes"
hunter = [c for c, s in stations_out.items() if "Hunter" in s["name"]]
assert hunter, "68 St-Hunter College missing!"
print("68 St-Hunter College present:", hunter, "on lines",
      [r for r, L in lines_out.items() if hunter[0] in L["stops"]])

# ---- emit ---------------------------------------------------------------
def js_obj(d, indent):
    return json.dumps(d, ensure_ascii=False, separators=(",", ":"))

lines_body = ",\n".join(
    f'  "{r}": {js_obj(lines_out[r], 2)}' for r in ROUTE_ORDER if r in lines_out
)
stations_body = ",\n".join(
    f'  "{cid}": {js_obj(stations_out[cid], 2)}'
    for cid in sorted(stations_out, key=lambda c: (stations_out[c]["borough"], stations_out[c]["name"]))
)

header = """/* Next Train NYC — network data
 *
 * GENERATED by generate_stations.py from official MTA data:
 *   - MTA Subway Stations dataset (data.ny.gov, id 39hk-dx4f):
 *     station names, complexes, boroughs, platform direction labels
 *   - Official subway GTFS feed (rrgtfsfeeds.s3.amazonaws.com/gtfs_subway.zip):
 *     per-route stop order (longest southbound trip + spliced branches),
 *     route colors and names
 *
 * Stations are keyed by MTA Complex ID, so connected stations (e.g. Times
 * Sq / Port Authority) are a single node for routing. stops[] is ordered
 * north terminal -> south terminal. dirLabels[i] = [north,south] platform
 * signage for stops[i]. branchDest overrides the terminal signage for
 * stations on a spliced branch.
 */

"""

with open(OUT, "w", encoding="utf-8") as f:
    f.write(header)
    f.write("const STATIONS = {\n" + stations_body + "\n};\n\n")
    f.write("const LINES = {\n" + lines_body + "\n};\n\n")
    f.write(f"const LINE_ORDER = {json.dumps([r for r in ROUTE_ORDER if r in lines_out])};\n\n")
    f.write("""// Derive the set of lines serving each station + stop index maps.
(function indexLines() {
  for (const id in STATIONS) STATIONS[id].lines = [];
  for (const lineId in LINES) {
    LINES[lineId].idx = {};
    LINES[lineId].stops.forEach((stopId, i) => {
      LINES[lineId].idx[stopId] = i;
      STATIONS[stopId].lines.push(lineId);
    });
  }
  for (const id in STATIONS) {
    STATIONS[id].lines.sort((a, b) => LINE_ORDER.indexOf(a) - LINE_ORDER.indexOf(b));
  }
})();
""")
print("wrote", OUT, os.path.getsize(OUT), "bytes")

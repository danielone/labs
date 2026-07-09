/* Vercel serverless function: real-time departures from the MTA GTFS-RT feeds.
 *
 * The MTA publishes free protobuf feeds (no API key), split by line group.
 * Browsers can't read them (CORS + protobuf), so this endpoint fetches the
 * feeds for the requested routes, decodes them, and returns the departures
 * at the requested platform stops as JSON.
 *
 * GET /api/departures?stops=127,725,902&routes=1,2,3,7,GS
 *   stops  — GTFS platform stop ids WITHOUT the N/S suffix (from the app's
 *            station data, one or more per station complex)
 *   routes — GTFS route ids serving the station; determines which feeds
 *            to fetch
 *
 * → { departures: [{route, tripId, stop, dir: "N"|"S", t: epochSec}],
 *     updated, feedsOk, feedsFailed }
 */

const { transit_realtime } = require("gtfs-realtime-bindings");

const FEED_BASE = "https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2F";
const FEEDS = {
  main: "gtfs",        // 1 2 3 4 5 6 7 + 42 St Shuttle (GS)
  ace: "gtfs-ace",     // A C E + Rockaway Park Shuttle (H)
  bdfm: "gtfs-bdfm",   // B D F M + Franklin Av Shuttle (FS)
  g: "gtfs-g",
  jz: "gtfs-jz",
  nqrw: "gtfs-nqrw",
  l: "gtfs-l",
  si: "gtfs-si"
};
const ROUTE_FEED = {
  "1": "main", "2": "main", "3": "main", "4": "main", "5": "main", "5X": "main",
  "6": "main", "6X": "main", "7": "main", "7X": "main", "GS": "main",
  "A": "ace", "C": "ace", "E": "ace", "H": "ace",
  "B": "bdfm", "D": "bdfm", "F": "bdfm", "FX": "bdfm", "M": "bdfm", "FS": "bdfm",
  "G": "g", "J": "jz", "Z": "jz",
  "N": "nqrw", "Q": "nqrw", "R": "nqrw", "W": "nqrw",
  "L": "l", "SI": "si"
};

function toEpoch(time) {
  if (time == null) return 0;
  if (typeof time === "object" && typeof time.toNumber === "function") return time.toNumber();
  return Number(time) || 0;
}

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  if (req.method === "OPTIONS") return res.status(204).end();

  const stops = new Set(String(req.query.stops || "").split(",").filter(Boolean));
  const routes = String(req.query.routes || "").split(",").filter(Boolean);
  if (!stops.size || !routes.length || stops.size > 20 || routes.length > 30) {
    return res.status(400).json({ error: "pass stops= and routes= (station-sized lists)" });
  }

  const feedKeys = [...new Set(routes.map((r) => ROUTE_FEED[r]).filter(Boolean))];
  if (!feedKeys.length) return res.status(400).json({ error: "no known routes" });

  const now = Math.floor(Date.now() / 1000);
  const departures = [];
  const feedsOk = [], feedsFailed = [];

  await Promise.all(feedKeys.map(async (key) => {
    try {
      const r = await fetch(FEED_BASE + FEEDS[key], { signal: AbortSignal.timeout(10000) });
      if (!r.ok) throw new Error("HTTP " + r.status);
      const msg = transit_realtime.FeedMessage.decode(Buffer.from(await r.arrayBuffer()));
      for (const entity of msg.entity) {
        const tu = entity.tripUpdate;
        if (!tu || !tu.trip) continue;
        const route = tu.trip.routeId;
        const tripId = tu.trip.tripId;
        for (const stu of tu.stopTimeUpdate || []) {
          const sid = stu.stopId || "";
          const dir = sid.slice(-1);
          if (dir !== "N" && dir !== "S") continue;
          const base = sid.slice(0, -1);
          if (!stops.has(base)) continue;
          const t = toEpoch((stu.departure && stu.departure.time) || (stu.arrival && stu.arrival.time));
          if (!t || t < now - 30 || t > now + 3 * 3600) continue;
          departures.push({ route, tripId, stop: base, dir, t });
        }
      }
      feedsOk.push(key);
    } catch (e) {
      feedsFailed.push(key);
    }
  }));

  if (!feedsOk.length) {
    return res.status(502).json({ error: "all MTA feeds unreachable", feedsFailed });
  }

  departures.sort((a, b) => a.t - b.t);
  // Cache briefly at the edge so a platform full of users shares fetches.
  res.setHeader("Cache-Control", "s-maxage=15, stale-while-revalidate=45");
  return res.status(200).json({ departures, updated: now, feedsOk, feedsFailed });
};

import type { MapFeature, FeatureKind } from "../src/shared/schema.ts";

// Snaps proposed line features onto real streets using OSRM (open-source routing
// over OpenStreetMap data), so a "bus lane on ORR" actually follows ORR instead of
// cutting straight through buildings. Falls back to the original coordinates on
// any failure or when the routed path detours too far from what was proposed.

const OSRM_URL = process.env.BLROAD_OSRM_URL || "https://router.project-osrm.org";
const TIMEOUT_MS = 6000;
const MAX_POINTS = 250;

// Kinds that physically run along an existing road. Metro lines, skywalks and drains don't.
const ROAD_KINDS = new Set<FeatureKind>([
  "flyover",
  "underpass",
  "road_widening",
  "bus_lane",
  "cycle_track",
  "pedestrian_walkway",
  "one_way",
]);

type LatLng = { lat: number; lng: number };

const cache = new Map<string, LatLng[] | null>();

function metres(a: LatLng, b: LatLng): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function pathLength(pts: LatLng[]): number {
  let total = 0;
  for (let i = 1; i < pts.length; i++) total += metres(pts[i - 1], pts[i]);
  return total;
}

function thin(pts: LatLng[]): LatLng[] {
  if (pts.length <= MAX_POINTS) return pts;
  const step = (pts.length - 1) / (MAX_POINTS - 1);
  return Array.from({ length: MAX_POINTS }, (_, i) => pts[Math.round(i * step)]);
}

/** Route through the given waypoints on real roads. Returns null if routing fails. */
export async function routeThrough(waypoints: LatLng[], maxDetour = 1.6): Promise<LatLng[] | null> {
  if (waypoints.length < 2) return null;
  const key = waypoints.map((p) => `${p.lng.toFixed(5)},${p.lat.toFixed(5)}`).join(";");
  if (cache.has(key)) return cache.get(key)!;

  let result: LatLng[] | null = null;
  try {
    const url = `${OSRM_URL}/route/v1/driving/${key}?overview=full&geometries=geojson&continue_straight=true`;
    const res = await fetch(url, {
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: { "User-Agent": "BLRoad/0.1 (road proposal prototype)" },
    });
    if (res.ok) {
      const data = (await res.json()) as { code: string; routes?: { geometry: { coordinates: [number, number][] } }[] };
      const coords = data.code === "Ok" ? data.routes?.[0]?.geometry.coordinates : undefined;
      if (coords && coords.length >= 2) {
        const routed = coords.map(([lng, lat]) => ({ lat, lng }));
        // Reject routes that loop around a block or take a detour: the proposal is a
        // corridor, not a trip, so it should be about as long as the drawn line.
        const drawn = pathLength(waypoints);
        if (pathLength(routed) <= drawn * maxDetour + 250) result = thin(routed);
      }
    }
  } catch {
    // Network error or timeout: keep the original geometry.
  }
  cache.set(key, result);
  return result;
}

export async function snapFeatures(features: MapFeature[]): Promise<MapFeature[]> {
  return Promise.all(
    features.map(async (f) => {
      if (f.geometry !== "line" || !ROAD_KINDS.has(f.kind) || f.coordinates.length < 2) return f;
      const snapped = await routeThrough(f.coordinates.slice(0, 25));
      return snapped ? { ...f, coordinates: snapped } : f;
    }),
  );
}

import { afterEach, describe, expect, it, vi } from "vitest";
import { snapFeatures } from "./roads.ts";
import type { MapFeature } from "../src/shared/schema.ts";

const line = (kind: MapFeature["kind"], n: number, extra: Partial<MapFeature> = {}): MapFeature => ({
  kind,
  geometry: "line",
  label: kind,
  description: "",
  coordinates: Array.from({ length: n }, (_, i) => ({ lat: 12.9 + i * 0.001, lng: 77.6 + i * 0.001 })),
  ...extra,
});

/** Stub OSRM with a route that follows the requested waypoints exactly. */
function osrmEcho() {
  const calls: string[] = [];
  vi.stubGlobal("fetch", async (url: string) => {
    calls.push(url);
    const coords = url.split("/driving/")[1].split("?")[0].split(";").map((p) => p.split(",").map(Number));
    return new Response(JSON.stringify({ code: "Ok", routes: [{ geometry: { coordinates: coords } }] }));
  });
  return calls;
}

afterEach(() => vi.unstubAllGlobals());

describe("snapFeatures", () => {
  it("marks road lines it cannot match as approximate and keeps their geometry", async () => {
    vi.stubGlobal("fetch", async () => { throw new Error("offline"); });
    const f = line("bus_lane", 5);
    const [out] = await snapFeatures([f]);
    expect(out.snapped).toBe(false);
    expect(out.coordinates).toEqual(f.coordinates);
  });

  it("marks matched road lines as snapped", async () => {
    osrmEcho();
    const [out] = await snapFeatures([line("flyover", 6)]);
    expect(out.snapped).toBe(true);
  });

  it("samples long lines along their whole length, not just the start", async () => {
    const calls = osrmEcho();
    const f = line("road_widening", 200);
    await snapFeatures([f]);
    const sent = calls[0].split("/driving/")[1].split("?")[0].split(";");
    expect(sent).toHaveLength(25);
    const last = f.coordinates.at(-1)!;
    expect(sent.at(-1)).toBe(`${last.lng.toFixed(5)},${last.lat.toFixed(5)}`);
  });

  it("leaves lines that are already routed, and non-road features, untouched", async () => {
    const calls = osrmEcho();
    const routed = line("bus_lane", 30, { snapped: true });
    const metro = line("metro_line", 8);
    const [a, b] = await snapFeatures([routed, metro]);
    expect(a).toBe(routed);
    expect(b).toBe(metro);
    expect(b.snapped).toBeUndefined();
    expect(calls).toHaveLength(0);
  });
});

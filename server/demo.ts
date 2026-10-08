import { AREAS, BENGALURU_CENTER, findArea } from "../src/shared/areas.ts";
import { routeThrough } from "./roads.ts";
import type { EvaluateRequest, Evaluation, FactorName, FeatureKind, MapFeature } from "../src/shared/schema.ts";

// Offline rule-based evaluator used when no ANTHROPIC_API_KEY is configured,
// so the app can be explored end to end without API access.

interface Rule {
  kind: FeatureKind;
  words: string[];
  scores: Record<FactorName, number>;
  cost: [number, number];
  months: [number, number];
  travel: number;
  pro: string;
  con: string;
  improvement: string;
}

const RULES: Rule[] = [
  {
    kind: "flyover",
    words: ["flyover", "elevated", "overpass", "signal-free", "signal free"],
    scores: { traffic_flow: 6, cost: 3, feasibility: 4, environment: 3, social_impact: 4, safety: 6, public_transport: 3 },
    cost: [250, 600], months: [30, 48], travel: -15,
    pro: "Removes the main junction conflict for through traffic.",
    con: "Flyovers in Bengaluru tend to shift the bottleneck to the next junction and induce more car trips.",
    improvement: "Reserve one lane on the flyover for BMTC buses and add a bus stop with a skywalk at the landing.",
  },
  {
    kind: "underpass",
    words: ["underpass", "tunnel", "grade separator"],
    scores: { traffic_flow: 6, cost: 3, feasibility: 3, environment: 4, social_impact: 5, safety: 6, public_transport: 3 },
    cost: [150, 450], months: [24, 40], travel: -12,
    pro: "Keeps the surface free for pedestrians and local traffic.",
    con: "Bengaluru underpasses flood during the monsoon unless drainage is rebuilt with them.",
    improvement: "Pair the underpass with a dedicated stormwater drain and sump pumps sized for 100 mm/hour rain.",
  },
  {
    kind: "road_widening",
    words: ["widen", "widened", "widening", "more lanes", "extra lane", "lane addition"],
    scores: { traffic_flow: 5, cost: 4, feasibility: 3, environment: 2, social_impact: 3, safety: 5, public_transport: 3 },
    cost: [80, 300], months: [18, 36], travel: -8,
    pro: "Adds capacity where the carriageway is a clear pinch point.",
    con: "Needs land acquisition and tree felling; extra lanes fill up within a few years.",
    improvement: "Use the widened space for a bus lane and footpaths instead of general traffic lanes.",
  },
  {
    kind: "bus_lane",
    words: ["bus lane", "bus priority", "brt", "bmtc", "bus"],
    scores: { traffic_flow: 7, cost: 9, feasibility: 7, environment: 8, social_impact: 8, safety: 7, public_transport: 9 },
    cost: [5, 40], months: [3, 9], travel: -18,
    pro: "Moves far more people per lane than cars, at a fraction of the cost.",
    con: "Only works with physical separation and enforcement against encroachment.",
    improvement: "Add bollard separation, camera enforcement and signal priority for buses at each junction.",
  },
  {
    kind: "metro_line",
    words: ["metro", "rail", "railway", "suburban", "train"],
    scores: { traffic_flow: 8, cost: 3, feasibility: 5, environment: 8, social_impact: 8, safety: 8, public_transport: 10 },
    cost: [2000, 6000], months: [48, 84], travel: -22,
    pro: "High-capacity transit takes lakhs of trips off the road.",
    con: "Very expensive and slow to build, with years of construction congestion.",
    improvement: "Add feeder bus routes and covered walkways to every station from day one.",
  },
  {
    kind: "cycle_track",
    words: ["cycle", "bicycle", "bike lane", "cycling"],
    scores: { traffic_flow: 5, cost: 9, feasibility: 7, environment: 9, social_impact: 7, safety: 7, public_transport: 6 },
    cost: [3, 20], months: [3, 8], travel: -4,
    pro: "Cheap, quick and zero-emission for short trips to metro stations.",
    con: "Unused if it is not continuous and protected from parked vehicles.",
    improvement: "Connect the track to the nearest metro station and add secure cycle parking there.",
  },
  {
    kind: "pedestrian_walkway",
    words: ["footpath", "walk", "walking", "walkway", "walkable", "pedestrian", "sidewalk", "zebra", "crossing"],
    scores: { traffic_flow: 5, cost: 9, feasibility: 8, environment: 8, social_impact: 9, safety: 9, public_transport: 7 },
    cost: [2, 15], months: [2, 6], travel: -3,
    pro: "Makes the area safer and helps people reach buses and metro.",
    con: "Hawkers and parking will reclaim the footpath without enforcement.",
    improvement: "Raise the crossings to footpath level and shorten crossing distances with kerb extensions.",
  },
  {
    kind: "skywalk",
    words: ["skywalk", "foot overbridge", "fob"],
    scores: { traffic_flow: 6, cost: 7, feasibility: 7, environment: 6, social_impact: 5, safety: 7, public_transport: 6 },
    cost: [5, 20], months: [6, 12], travel: -4,
    pro: "Separates pedestrians from fast traffic.",
    con: "Skywalks without lifts are avoided by elderly and disabled users who then cross at grade.",
    improvement: "Install lifts on both ends and connect the skywalk directly to the bus stop or metro concourse.",
  },
  {
    kind: "junction_redesign",
    words: ["junction", "roundabout", "intersection", "redesign", "redesigned", "u-turn", "free left"],
    scores: { traffic_flow: 7, cost: 8, feasibility: 8, environment: 7, social_impact: 7, safety: 8, public_transport: 6 },
    cost: [5, 30], months: [3, 10], travel: -12,
    pro: "Fixing geometry is the cheapest way to cut conflict points.",
    con: "Gains are limited if downstream roads are already saturated.",
    improvement: "Model the redesign with signal timings and add pedestrian refuges at every arm.",
  },
  {
    kind: "signal_optimisation",
    words: ["signal", "traffic light", "adaptive", "atcs", "smart"],
    scores: { traffic_flow: 6, cost: 9, feasibility: 9, environment: 7, social_impact: 6, safety: 7, public_transport: 6 },
    cost: [2, 12], months: [2, 6], travel: -10,
    pro: "Adaptive signals can be deployed in months with existing roads.",
    con: "Only as good as the sensors and the coordination with neighbouring junctions.",
    improvement: "Coordinate the whole corridor as a green wave and give buses signal priority.",
  },
  {
    kind: "one_way",
    words: ["one way", "one-way"],
    scores: { traffic_flow: 6, cost: 9, feasibility: 8, environment: 6, social_impact: 5, safety: 6, public_transport: 5 },
    cost: [1, 5], months: [1, 3], travel: -8,
    pro: "Removes right-turn conflicts almost for free.",
    con: "Longer detours for residents and buses.",
    improvement: "Keep a contraflow bus lane so BMTC routes are not diverted.",
  },
  {
    kind: "parking",
    words: ["parking", "car park"],
    scores: { traffic_flow: 6, cost: 7, feasibility: 7, environment: 5, social_impact: 6, safety: 6, public_transport: 5 },
    cost: [10, 60], months: [6, 18], travel: -6,
    pro: "Clearing on-street parking frees a whole lane.",
    con: "More parking can attract more car trips.",
    improvement: "Price on-street parking and use the revenue for footpaths and feeder buses.",
  },
  {
    kind: "drainage",
    words: ["drain", "drainage", "flood", "flooding", "flooded", "waterlog", "waterlogging", "waterlogged", "rain", "rainfall"],
    scores: { traffic_flow: 6, cost: 7, feasibility: 7, environment: 8, social_impact: 8, safety: 8, public_transport: 6 },
    cost: [20, 120], months: [6, 18], travel: -5,
    pro: "Monsoon flooding is a top cause of gridlock; drainage fixes it at the root.",
    con: "Needs coordination with lake and stormwater-drain encroachment removal.",
    improvement: "Restore the connected rajakaluve (stormwater drain) and add permeable paving on service roads.",
  },
  {
    kind: "green_buffer",
    words: ["tree", "green", "greenery", "plant", "planting", "park", "shade"],
    scores: { traffic_flow: 4, cost: 9, feasibility: 8, environment: 10, social_impact: 8, safety: 6, public_transport: 5 },
    cost: [1, 8], months: [2, 12], travel: 0,
    pro: "Shade and greenery make walking and waiting for buses bearable.",
    con: "Does little for traffic on its own.",
    improvement: "Combine the green buffer with a continuous footpath and bus shelters.",
  },
];

const FALLBACK = RULES.find((r) => r.kind === "junction_redesign")!;

// Whole-word match, allowing a plural ending, so "park" doesn't fire on "parking",
// "bus" on "business", or "rain" on "train". Other word forms are listed explicitly.
const wordPattern = (w: string) => new RegExp(`\\b${w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?:s|es)?\\b`);

/** Position of the rule's earliest keyword in the text, or -1 if none matches. */
function firstHit(rule: Rule, text: string): number {
  const positions = rule.words.map((w) => text.search(wordPattern(w))).filter((i) => i >= 0);
  return positions.length ? Math.min(...positions) : -1;
}

function pickRules(prompt: string): Rule[] {
  const text = prompt.toLowerCase();
  // Rank matched rules by where they first appear in the prompt, so the main ask comes first.
  const hits = RULES.map((r) => ({ r, at: firstHit(r, text) }))
    .filter((h) => h.at >= 0)
    .sort((a, b) => a.at - b.at)
    .map((h) => h.r);
  return hits.length ? hits.slice(0, 3) : [FALLBACK];
}

// Words people actually use for each hotspot (the first word of "ORR Bellandur" is not distinctive).
const AREA_TERMS: Record<string, string[]> = {
  "silk-board": ["silk board"],
  hebbal: ["hebbal"],
  "kr-puram": ["kr puram", "k r puram", "tin factory"],
  marathahalli: ["marathahalli"],
  bellandur: ["bellandur"],
  whitefield: ["whitefield", "itpl"],
  "electronic-city": ["electronic city", "e-city"],
  "sony-world": ["sony world", "koramangala"],
  "mg-road": ["mg road", "m g road"],
  majestic: ["majestic", "kempegowda"],
  goraguntepalya: ["goraguntepalya", "yeshwanthpur", "tumkur road"],
  "dairy-circle": ["dairy circle", "bannerghatta"],
  "sirsi-circle": ["sirsi", "mysore road"],
  indiranagar: ["indiranagar"],
};

/** Hotspots named in the prompt, in the order they are mentioned. */
function mentionedAreas(prompt: string) {
  const text = prompt.toLowerCase();
  return AREAS.map((a) => {
    const hits = (AREA_TERMS[a.id] ?? [a.name.toLowerCase()]).map((t) => text.indexOf(t)).filter((i) => i >= 0);
    return { area: a, at: hits.length ? Math.min(...hits) : -1 };
  })
    .filter((m) => m.at >= 0)
    .sort((x, y) => x.at - y.at)
    .map((m) => m.area);
}

const POINT_KINDS: FeatureKind[] = ["junction_redesign", "signal_optimisation", "skywalk", "metro_station", "parking"];
const AREA_KINDS: FeatureKind[] = ["green_buffer", "drainage"];
const HEADINGS = [25, 115, 70]; // degrees, so each corridor heads off in a different direction

const titleCase = (k: string) => k.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase());

function offset(c: { lat: number; lng: number }, bearingDeg: number, km: number) {
  const b = (bearingDeg * Math.PI) / 180;
  const dLat = (km / 111) * Math.cos(b);
  const dLng = (km / (111 * Math.cos((c.lat * Math.PI) / 180))) * Math.sin(b);
  return { lat: c.lat + dLat, lng: c.lng + dLng };
}

// Geometry around the centre so the demo has something to draw. Corridors are routed
// over real streets (OSRM); if routing is unavailable they fall back to a gentle curve.
async function shape(
  rule: Rule,
  i: number,
  c: { lat: number; lng: number },
  place: string,
  corridor: { lat: number; lng: number }[] | null,
): Promise<MapFeature[]> {
  const label = `${titleCase(rule.kind)}${place ? ` · ${place}` : ""}`;
  const base = { kind: rule.kind, label, description: rule.pro };
  const heading = HEADINGS[i % HEADINGS.length];

  if (POINT_KINDS.includes(rule.kind)) {
    return [{ ...base, geometry: "point", coordinates: [i === 0 ? c : offset(c, heading, 0.25)] }];
  }
  if (AREA_KINDS.includes(rule.kind)) {
    const p = offset(c, heading, 0.6);
    return [{
      ...base,
      geometry: "polygon",
      coordinates: [0, 72, 144, 216, 288].map((a, k) => offset(p, a + heading, k % 2 ? 0.28 : 0.38)),
    }];
  }

  // The main corridor runs between the places the prompt names ("Silk Board to KR Puram"), if any.
  let [a, b] = i === 0 && corridor ? corridor : [offset(c, heading, 1.5), offset(c, heading + 180, 1.5)];
  let routed = i === 0 && corridor ? await routeThrough([a, b], 1.8) : null;
  // Try a few headings through the centre until one runs along a real road.
  for (let k = 0; !routed && k < 4; k++) {
    a = offset(c, heading + k * 45, 1.5);
    b = offset(c, heading + k * 45 + 180, 1.5);
    routed = await routeThrough([a, c, b], 2.2);
  }
  const coordinates =
    routed ??
    Array.from({ length: 12 }, (_, k) => {
      const t = k / 11;
      return offset({ lat: a.lat + (b.lat - a.lat) * t, lng: a.lng + (b.lng - a.lng) * t }, heading + 90, Math.sin(t * Math.PI) * 0.2);
    });
  const line: MapFeature = { ...base, geometry: "line", coordinates };

  // Corridors that carry people get stops at the ends and the middle.
  if (rule.kind === "bus_lane" || rule.kind === "metro_line") {
    const stopKind: FeatureKind = rule.kind === "metro_line" ? "metro_station" : "bus_lane";
    const stops = [coordinates[0], coordinates[Math.floor(coordinates.length / 2)], coordinates[coordinates.length - 1]];
    return [
      line,
      ...stops.map((s, k): MapFeature => ({
        kind: stopKind,
        geometry: "point",
        label: `${rule.kind === "metro_line" ? "Station" : "Bus stop"} ${k + 1}`,
        description: "Stop with level boarding, shelter and a safe pedestrian crossing.",
        coordinates: [s],
      })),
    ];
  }
  return [line];
}

export async function evaluateDemo(req: EvaluateRequest): Promise<Evaluation> {
  const rules = pickRules(req.prompt);
  const named = mentionedAreas(req.prompt);
  const area = findArea(req.areaId) ?? named[0];
  const corridor = named.length >= 2 ? [named[0], named[1]].map((a) => ({ lat: a.lat, lng: a.lng })) : null;
  const center = req.focus ?? (area ? { lat: area.lat, lng: area.lng } : BENGALURU_CENTER);

  const factorNames = Object.keys(rules[0].scores) as FactorName[];
  const factors = factorNames.map((name) => {
    const score = Math.round(rules.reduce((s, r) => s + r.scores[name], 0) / rules.length);
    return { name, score, reasoning: `Demo estimate based on typical outcomes of ${rules.map((r) => r.kind.replace(/_/g, " ")).join(", ")} in Bengaluru.` };
  });
  const overall = Math.round((factors.reduce((s, f) => s + f.score, 0) / factors.length) * 10);
  const verdict = overall >= 70 ? "recommended" : overall >= 45 ? "recommended_with_changes" : "not_recommended";

  return {
    title: `${rules.map((r) => r.kind.replace(/_/g, " ")).join(" + ")}${area ? ` at ${area.name}` : ""}`,
    verdict,
    overall_score: overall,
    // The UI already labels demo results, so the summary describes the proposal instead.
    summary: `Scored on how ${rules.map((r) => r.kind.replace(/_/g, " ")).join(", ")} schemes usually perform in Bengaluru${
      area ? ` around ${area.name}` : ""
    }. ${rules[0].pro} The main risk: ${rules[0].con.charAt(0).toLowerCase()}${rules[0].con.slice(1)}`,
    factors,
    pros: rules.map((r) => r.pro),
    cons: rules.map((r) => r.con),
    improvements: rules.map((r) => r.improvement),
    estimated_cost_crore: {
      low: rules.reduce((s, r) => s + r.cost[0], 0),
      high: rules.reduce((s, r) => s + r.cost[1], 0),
    },
    timeline_months: {
      low: Math.max(...rules.map((r) => r.months[0])),
      high: Math.max(...rules.map((r) => r.months[1])),
    },
    peak_travel_time_change_pct: Math.max(-40, rules.reduce((s, r) => s + r.travel, 0)),
    features: (await Promise.all(rules.map((r, i) => shape(r, i, center, area?.name ?? "", corridor)))).flat(),
  };
}

import type { FactorName, FeatureKind } from "./shared/schema";

// Palette tuned for the dark basemap: saturated enough to read, not neon.
// `flow` marks corridors that get animated traffic once built.
// `glyph` is drawn inside point markers and the construction log, so a feature can be told apart
// without relying on colour (see npm run check:palette).
export const KIND_STYLE: Record<
  FeatureKind,
  { color: string; label: string; glyph: string; dash?: string; flow?: "slow" | "med" | "fast" }
> = {
  flyover: { color: "#f08a4b", label: "Flyover", glyph: "F", flow: "fast" },
  underpass: { color: "#d0b0ff", label: "Underpass", glyph: "U", dash: "10 7", flow: "fast" },
  road_widening: { color: "#b07a26", label: "Road widening", glyph: "R", flow: "med" },
  bus_lane: { color: "#e8607d", label: "Bus lane", glyph: "B", flow: "med" },
  metro_line: { color: "#8f86f5", label: "Metro line", glyph: "M", flow: "fast" },
  metro_station: { color: "#8f86f5", label: "Metro station", glyph: "M" },
  cycle_track: { color: "#5cc184", label: "Cycle track", glyph: "C", dash: "6 7", flow: "slow" },
  pedestrian_walkway: { color: "#58a8e0", label: "Walkway", glyph: "W", flow: "slow" },
  skywalk: { color: "#4cc3cf", label: "Skywalk", glyph: "K", flow: "slow" },
  junction_redesign: { color: "#e5544b", label: "Junction redesign", glyph: "J" },
  signal_optimisation: { color: "#e8c547", label: "Signal upgrade", glyph: "S" },
  one_way: { color: "#6e747d", label: "One-way", glyph: "1", dash: "12 7", flow: "med" },
  parking: { color: "#c9c9cf", label: "Parking", glyph: "P" },
  green_buffer: { color: "#1f6b5a", label: "Green buffer", glyph: "G" },
  drainage: { color: "#3b6fb5", label: "Drainage", glyph: "D" },
  removal: { color: "#a33d35", label: "Removal", glyph: "X", dash: "3 8" },
  other: { color: "#f0a8d8", label: "Other", glyph: "?" },
};

/** In compare mode every feature of a proposal takes its slot's colour. */
export const TONE = { a: "#f2c230", b: "#5ab0ff" } as const;
export type Tone = keyof typeof TONE;

export const FACTOR_LABEL: Record<FactorName, string> = {
  traffic_flow: "Traffic flow",
  cost: "Value for money",
  feasibility: "Feasibility",
  environment: "Environment",
  social_impact: "Social impact",
  safety: "Safety",
  public_transport: "Public transport",
};

export const VERDICT_STYLE = {
  recommended: { label: "Recommended", color: "#4fbf7a" },
  recommended_with_changes: { label: "Needs changes", color: "#e8a33d" },
  not_recommended: { label: "Not recommended", color: "#e5544b" },
} as const;

export function scoreColor(score10: number): string {
  if (score10 >= 7) return "#4fbf7a";
  if (score10 >= 4.5) return "#e8a33d";
  return "#e5544b";
}

export const SEVERITY_COLOR = ["#c9a227", "#e07b39", "#e5544b"] as const;

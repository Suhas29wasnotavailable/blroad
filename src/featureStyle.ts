import type { FactorName, FeatureKind } from "./shared/schema";

// Palette tuned for the dark basemap: saturated enough to read, not neon.
// `flow` marks corridors that get animated traffic once built.
export const KIND_STYLE: Record<FeatureKind, { color: string; label: string; dash?: string; flow?: "slow" | "med" | "fast" }> = {
  flyover: { color: "#f08a4b", label: "Flyover", flow: "fast" },
  underpass: { color: "#b48ef0", label: "Underpass", dash: "10 7", flow: "fast" },
  road_widening: { color: "#e3b341", label: "Road widening", flow: "med" },
  bus_lane: { color: "#e8607d", label: "Bus lane", flow: "med" },
  metro_line: { color: "#8f86f5", label: "Metro line", flow: "fast" },
  metro_station: { color: "#8f86f5", label: "Metro station" },
  cycle_track: { color: "#5cc184", label: "Cycle track", dash: "6 7", flow: "slow" },
  pedestrian_walkway: { color: "#58a8e0", label: "Walkway", flow: "slow" },
  skywalk: { color: "#4cc3cf", label: "Skywalk", flow: "slow" },
  junction_redesign: { color: "#e5544b", label: "Junction redesign" },
  signal_optimisation: { color: "#e8c547", label: "Signal upgrade" },
  one_way: { color: "#9aa0a8", label: "One-way", dash: "12 7", flow: "med" },
  parking: { color: "#8a8a90", label: "Parking" },
  green_buffer: { color: "#4fae7a", label: "Green buffer" },
  drainage: { color: "#5b8fd9", label: "Drainage" },
  removal: { color: "#d9655b", label: "Removal", dash: "3 8" },
  other: { color: "#8b93d6", label: "Other" },
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

import { z } from "zod";

// The structured verdict the AI returns for a road-improvement proposal.
// Shared by the server (to constrain Claude's output) and the client (types only).

export const FEATURE_KINDS = [
  "flyover",
  "underpass",
  "road_widening",
  "bus_lane",
  "metro_line",
  "metro_station",
  "cycle_track",
  "pedestrian_walkway",
  "skywalk",
  "junction_redesign",
  "signal_optimisation",
  "one_way",
  "parking",
  "green_buffer",
  "drainage",
  "removal",
  "other",
] as const;

export const FACTOR_NAMES = [
  "traffic_flow",
  "cost",
  "feasibility",
  "environment",
  "social_impact",
  "safety",
  "public_transport",
] as const;

const LatLng = z.object({ lat: z.number(), lng: z.number() });

export const MapFeature = z.object({
  kind: z.enum(FEATURE_KINDS),
  geometry: z.enum(["point", "line", "polygon"]),
  label: z.string().describe("Short name shown on the map, e.g. 'Silk Board elevated loop'"),
  description: z.string().describe("One or two sentences on what is built here and why"),
  coordinates: z
    .array(LatLng)
    .describe("1 point for 'point', 2+ points following the real road for 'line', 3+ points for 'polygon'"),
});

export const Factor = z.object({
  name: z.enum(FACTOR_NAMES),
  score: z.number().describe("0 (very bad) to 10 (excellent)"),
  reasoning: z.string(),
});

export const Evaluation = z.object({
  title: z.string().describe("A short name for the proposal"),
  verdict: z.enum(["recommended", "recommended_with_changes", "not_recommended"]),
  overall_score: z.number().describe("0 to 100"),
  summary: z.string().describe("Two to four sentences: the verdict and the main reason"),
  factors: z.array(Factor),
  pros: z.array(z.string()),
  cons: z.array(z.string()),
  improvements: z
    .array(z.string())
    .describe("Concrete changes that would make the proposal better, each usable as a follow-up prompt"),
  estimated_cost_crore: z.object({ low: z.number(), high: z.number() }),
  timeline_months: z.object({ low: z.number(), high: z.number() }),
  peak_travel_time_change_pct: z
    .number()
    .describe("Estimated change in peak-hour travel time through the area; negative is faster"),
  features: z.array(MapFeature),
});

export type MapFeature = z.infer<typeof MapFeature>;
export type Evaluation = z.infer<typeof Evaluation>;
export type FeatureKind = (typeof FEATURE_KINDS)[number];
export type FactorName = (typeof FACTOR_NAMES)[number];

export interface EvaluateRequest {
  prompt: string;
  areaId: string | null;
  focus: { lat: number; lng: number } | null;
}

export interface EvaluateResponse {
  mode: "ai" | "demo";
  evaluation: Evaluation;
}

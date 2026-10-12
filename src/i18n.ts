import { createContext, useContext } from "react";
import type { FactorName, FeatureKind } from "./shared/schema";
import { FACTOR_LABEL, KIND_STYLE, VERDICT_STYLE, type Tone } from "./featureStyle";

// Interface strings, one dictionary per language. AI output (titles, summaries, reasoning) is not
// translated here; it arrives in the language the model writes.

type Verdict = keyof typeof VERDICT_STYLE;

const kindLabels = Object.fromEntries(
  Object.entries(KIND_STYLE).map(([kind, style]) => [kind, style.label]),
) as Record<FeatureKind, string>;
const verdictLabels = Object.fromEntries(
  Object.entries(VERDICT_STYLE).map(([verdict, style]) => [verdict, style.label]),
) as Record<Verdict, string>;

const en = {
  tagline: "Proposals for Bengaluru's streets",
  modeLive: "Live review",
  modeDemo: "Demo data",
  tabPropose: "Propose",
  tabCompare: "Compare",
  where: "Where",
  anywhere: "Anywhere in Bengaluru",
  pinAt: (lat: string, lng: string) => `Pin at ${lat}, ${lng}`,
  remove: "Remove",
  whatChange: "What would you change?",
  promptPlaceholder: "A bus-only lane on Hosur Road from Silk Board to Electronic City",
  composerHint: "Click the map to drop a pin · ⌘↵ to submit",
  evaluate: "Evaluate",
  evaluating: "Evaluating…",
  examplesTitle: "Start from an example",
  exampleTags: { bus: "Bus", flyover: "Flyover", street: "Street", flooding: "Flooding", junction: "Junction" },
  reviewing: "Reviewing",
  stages: ["Reading the site", "Peak-hour traffic", "Cost and feasibility", "Safety and environment", "Laying out the design"],
  reviewSlow: "A full review can take up to a minute.",
  pastProposals: "Your past proposals",
  whichProposal: "Which proposal to show",
  viewBoth: "A + B",
  viewOnly: (tone: Tone) => `Only ${tone.toUpperCase()}`,
  unreachable: "Could not reach the server.",
  language: "Language",

  demoNote: "Demo data from built-in rules. Add an Anthropic API key for a site-specific review.",
  cost: "Cost",
  buildTime: "Build time",
  peakCommute: "Peak commute",
  crore: "Cr",
  months: "mo",
  factors: "Factors",
  forTitle: "For",
  against: "Against",
  improve: "Ways to improve it",
  add: "Add",
  added: "Added",
  addTitle: "Add this to your proposal, then evaluate again",
  copyLink: "Copy link",
  linkCopied: "Link copied",
  copyTitle: "Copy a link that opens BLRoad with this proposal filled in",
  copyPrompt: "Copy this link:",
  compareAnother: "Compare with another →",
  factorScores: "Factor scores out of 10",

  building: "Building",
  plan: "Plan",
  hide: "Hide",
  show: "Show",
  replay: "Replay",
  approximate: "approximate",
  approximateNote:
    "Approximate alignment: this line couldn't be matched to the street network, so it's drawn as proposed.",

  compareLede: "Put two ideas for the same problem side by side. Both are drawn on the map, A in yellow and B in blue.",
  loadPast: "Load a past proposal…",
  noPast: "No past proposals yet",
  loadPastInto: (tone: string) => `Load a past proposal into ${tone}`,
  areaFor: (tone: string) => `Area for ${tone}`,
  placeholderA: "e.g. A second flyover loop at Hebbal",
  placeholderB: "e.g. Bus priority lanes and a metro feeder at Hebbal instead",
  evaluated: (score: number, verdict: string) => `Evaluated · ${score}/100 · ${verdict}`,
  swap: "⇅ Swap",
  swapTitle: "Swap A and B",
  compared: "Compared",
  evaluateBoth: "Evaluate both",
  evaluateAndCompare: "Evaluate and compare",
  tableHint: "Highlighted cells win that row. Factor scores are out of 10.",
  rowScore: "Overall score",
  rowCost: "Cost (mid, ₹ Cr)",
  rowBuild: "Build time (mid)",
  rowCommute: "Peak commute",
  rowPerPct: "₹ Cr per 1% faster",
  rowPerPctHint: "Midpoint cost divided by the peak travel-time saving. Lower means more commute saved per rupee.",
  tooClose: "Too close to call on score alone. Look at cost and build time to decide.",
  ahead: (winner: string, points: number) => `${winner} comes out ahead by ${points} points`,
  cheaper: (costW: string, costL: string) => `and costs less (about ₹${costW} Cr against ₹${costL} Cr)`,
  dearer: (loser: string, costW: string, costL: string) => `but costs more than ${loser} (about ₹${costW} Cr against ₹${costL} Cr)`,
  slower: "and takes much longer to build",
  sentenceEnd: ".",

  kinds: kindLabels,
  factorNames: FACTOR_LABEL as Record<FactorName, string>,
  factorShort: { traffic_flow: "Traffic", cost: "Value", public_transport: "Transit", social_impact: "Social" } as Partial<
    Record<FactorName, string>
  >,
  verdicts: verdictLabels,
};

export type Strings = typeof en;
export type Lang = "en";

export const STRINGS: Record<Lang, Strings> = { en };

export const LangContext = createContext<Lang>("en");

/** The interface strings for the current language. */
export function useT(): Strings {
  return STRINGS[useContext(LangContext)];
}

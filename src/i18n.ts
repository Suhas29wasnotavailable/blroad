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

// Kannada. Written to be read by Bengaluru residents; corrections from native speakers welcome.
const kn: Strings = {
  tagline: "ಬೆಂಗಳೂರಿನ ರಸ್ತೆಗಳಿಗೆ ಪ್ರಸ್ತಾವನೆಗಳು",
  modeLive: "ನೇರ ಪರಿಶೀಲನೆ",
  modeDemo: "ಡೆಮೊ ಡೇಟಾ",
  tabPropose: "ಪ್ರಸ್ತಾಪಿಸಿ",
  tabCompare: "ಹೋಲಿಸಿ",
  where: "ಎಲ್ಲಿ",
  anywhere: "ಬೆಂಗಳೂರಿನಲ್ಲಿ ಎಲ್ಲಿಯಾದರೂ",
  pinAt: (lat: string, lng: string) => `ಪಿನ್: ${lat}, ${lng}`,
  remove: "ತೆಗೆದುಹಾಕಿ",
  whatChange: "ನೀವು ಏನನ್ನು ಬದಲಾಯಿಸುತ್ತೀರಿ?",
  promptPlaceholder: "ಸಿಲ್ಕ್ ಬೋರ್ಡ್‌ನಿಂದ ಎಲೆಕ್ಟ್ರಾನಿಕ್ ಸಿಟಿವರೆಗೆ ಹೊಸೂರು ರಸ್ತೆಯಲ್ಲಿ ಬಸ್‌ಗಳಿಗೆ ಮಾತ್ರ ಮೀಸಲಾದ ಲೇನ್",
  composerHint: "ಪಿನ್ ಇಡಲು ನಕ್ಷೆಯ ಮೇಲೆ ಕ್ಲಿಕ್ ಮಾಡಿ · ಸಲ್ಲಿಸಲು ⌘↵",
  evaluate: "ಮೌಲ್ಯಮಾಪನ ಮಾಡಿ",
  evaluating: "ಮೌಲ್ಯಮಾಪನ ನಡೆಯುತ್ತಿದೆ…",
  examplesTitle: "ಒಂದು ಉದಾಹರಣೆಯಿಂದ ಪ್ರಾರಂಭಿಸಿ",
  exampleTags: { bus: "ಬಸ್", flyover: "ಮೇಲ್ಸೇತುವೆ", street: "ಬೀದಿ", flooding: "ಪ್ರವಾಹ", junction: "ಜಂಕ್ಷನ್" },
  reviewing: "ಪರಿಶೀಲನೆ",
  stages: ["ಸ್ಥಳವನ್ನು ಅರಿಯುತ್ತಿದೆ", "ದಟ್ಟಣೆ ಸಮಯದ ಸಂಚಾರ", "ವೆಚ್ಚ ಮತ್ತು ಕಾರ್ಯಸಾಧ್ಯತೆ", "ಸುರಕ್ಷತೆ ಮತ್ತು ಪರಿಸರ", "ವಿನ್ಯಾಸ ರೂಪಿಸುತ್ತಿದೆ"],
  reviewSlow: "ಪೂರ್ಣ ಪರಿಶೀಲನೆಗೆ ಒಂದು ನಿಮಿಷದವರೆಗೆ ಬೇಕಾಗಬಹುದು.",
  pastProposals: "ನಿಮ್ಮ ಹಿಂದಿನ ಪ್ರಸ್ತಾವನೆಗಳು",
  whichProposal: "ಯಾವ ಪ್ರಸ್ತಾವನೆಯನ್ನು ತೋರಿಸಬೇಕು",
  viewBoth: "A + B",
  viewOnly: (tone: Tone) => `${tone.toUpperCase()} ಮಾತ್ರ`,
  unreachable: "ಸರ್ವರ್ ಸಂಪರ್ಕಿಸಲು ಸಾಧ್ಯವಾಗಲಿಲ್ಲ.",
  language: "ಭಾಷೆ",

  demoNote: "ಅಂತರ್ನಿರ್ಮಿತ ನಿಯಮಗಳಿಂದ ಡೆಮೊ ಡೇಟಾ. ಸ್ಥಳಕ್ಕೆ ತಕ್ಕ ಪರಿಶೀಲನೆಗಾಗಿ Anthropic API ಕೀ ಸೇರಿಸಿ.",
  cost: "ವೆಚ್ಚ",
  buildTime: "ನಿರ್ಮಾಣ ಸಮಯ",
  peakCommute: "ದಟ್ಟಣೆ ಸಮಯದ ಪ್ರಯಾಣ",
  crore: "ಕೋಟಿ",
  months: "ತಿಂಗಳು",
  factors: "ಅಂಶಗಳು",
  forTitle: "ಪರವಾಗಿ",
  against: "ವಿರುದ್ಧವಾಗಿ",
  improve: "ಇದನ್ನು ಉತ್ತಮಗೊಳಿಸುವ ವಿಧಾನಗಳು",
  add: "ಸೇರಿಸಿ",
  added: "ಸೇರಿಸಲಾಗಿದೆ",
  addTitle: "ಇದನ್ನು ನಿಮ್ಮ ಪ್ರಸ್ತಾವನೆಗೆ ಸೇರಿಸಿ, ನಂತರ ಮತ್ತೆ ಮೌಲ್ಯಮಾಪನ ಮಾಡಿ",
  copyLink: "ಲಿಂಕ್ ನಕಲಿಸಿ",
  linkCopied: "ಲಿಂಕ್ ನಕಲಿಸಲಾಗಿದೆ",
  copyTitle: "ಈ ಪ್ರಸ್ತಾವನೆ ತುಂಬಿದ BLRoad ತೆರೆಯುವ ಲಿಂಕ್ ನಕಲಿಸಿ",
  copyPrompt: "ಈ ಲಿಂಕ್ ನಕಲಿಸಿ:",
  compareAnother: "ಇನ್ನೊಂದರೊಂದಿಗೆ ಹೋಲಿಸಿ →",
  factorScores: "10ರಲ್ಲಿ ಅಂಶಗಳ ಅಂಕಗಳು",

  building: "ನಿರ್ಮಾಣ",
  plan: "ಯೋಜನೆ",
  hide: "ಮರೆಮಾಡಿ",
  show: "ತೋರಿಸಿ",
  replay: "ಮರುಪ್ರದರ್ಶನ",
  approximate: "ಅಂದಾಜು",
  approximateNote: "ಅಂದಾಜು ಮಾರ್ಗ: ಈ ಗೆರೆಯನ್ನು ರಸ್ತೆ ಜಾಲಕ್ಕೆ ಹೊಂದಿಸಲು ಆಗಲಿಲ್ಲ, ಆದ್ದರಿಂದ ಪ್ರಸ್ತಾಪಿಸಿದಂತೆಯೇ ತೋರಿಸಲಾಗಿದೆ.",

  compareLede: "ಒಂದೇ ಸಮಸ್ಯೆಗೆ ಎರಡು ಆಲೋಚನೆಗಳನ್ನು ಅಕ್ಕಪಕ್ಕ ಇಡಿ. ಎರಡನ್ನೂ ನಕ್ಷೆಯಲ್ಲಿ ತೋರಿಸಲಾಗುತ್ತದೆ: A ಹಳದಿಯಲ್ಲಿ, B ನೀಲಿಯಲ್ಲಿ.",
  loadPast: "ಹಿಂದಿನ ಪ್ರಸ್ತಾವನೆ ತೆರೆಯಿರಿ…",
  noPast: "ಇನ್ನೂ ಹಿಂದಿನ ಪ್ರಸ್ತಾವನೆಗಳಿಲ್ಲ",
  loadPastInto: (tone: string) => `${tone}ಗೆ ಹಿಂದಿನ ಪ್ರಸ್ತಾವನೆ ತೆರೆಯಿರಿ`,
  areaFor: (tone: string) => `${tone}ಗೆ ಪ್ರದೇಶ`,
  placeholderA: "ಉದಾ. ಹೆಬ್ಬಾಳದಲ್ಲಿ ಎರಡನೇ ಮೇಲ್ಸೇತುವೆ ಲೂಪ್",
  placeholderB: "ಉದಾ. ಬದಲಿಗೆ ಹೆಬ್ಬಾಳದಲ್ಲಿ ಬಸ್ ಆದ್ಯತಾ ಲೇನ್‌ಗಳು ಮತ್ತು ಮೆಟ್ರೋ ಫೀಡರ್",
  evaluated: (score: number, verdict: string) => `ಮೌಲ್ಯಮಾಪನ ಆಗಿದೆ · ${score}/100 · ${verdict}`,
  swap: "⇅ ಅದಲುಬದಲು",
  swapTitle: "A ಮತ್ತು B ಅದಲುಬದಲು ಮಾಡಿ",
  compared: "ಹೋಲಿಸಲಾಗಿದೆ",
  evaluateBoth: "ಎರಡನ್ನೂ ಮೌಲ್ಯಮಾಪನ ಮಾಡಿ",
  evaluateAndCompare: "ಮೌಲ್ಯಮಾಪನ ಮಾಡಿ ಹೋಲಿಸಿ",
  tableHint: "ಹೈಲೈಟ್ ಮಾಡಿದ ಕೋಶಗಳು ಆ ಸಾಲಿನಲ್ಲಿ ಮುಂದಿವೆ. ಅಂಶಗಳ ಅಂಕಗಳು 10ರಲ್ಲಿ.",
  rowScore: "ಒಟ್ಟು ಅಂಕ",
  rowCost: "ವೆಚ್ಚ (ಮಧ್ಯಮ, ₹ ಕೋಟಿ)",
  rowBuild: "ನಿರ್ಮಾಣ ಸಮಯ (ಮಧ್ಯಮ)",
  rowCommute: "ದಟ್ಟಣೆ ಸಮಯದ ಪ್ರಯಾಣ",
  rowPerPct: "1% ವೇಗಕ್ಕೆ ₹ ಕೋಟಿ",
  rowPerPctHint: "ಮಧ್ಯಮ ವೆಚ್ಚವನ್ನು ದಟ್ಟಣೆ ಸಮಯದ ಪ್ರಯಾಣದ ಉಳಿತಾಯದಿಂದ ಭಾಗಿಸಿದ್ದು. ಕಡಿಮೆಯಾದಷ್ಟೂ ಪ್ರತಿ ರೂಪಾಯಿಗೆ ಹೆಚ್ಚು ಸಮಯ ಉಳಿತಾಯ.",
  tooClose: "ಅಂಕಗಳಿಂದ ಮಾತ್ರ ನಿರ್ಧರಿಸುವಷ್ಟು ವ್ಯತ್ಯಾಸವಿಲ್ಲ. ವೆಚ್ಚ ಮತ್ತು ನಿರ್ಮಾಣ ಸಮಯ ನೋಡಿ ನಿರ್ಧರಿಸಿ.",
  ahead: (winner: string, points: number) => `${winner} ${points} ಅಂಕಗಳಿಂದ ಮುಂದಿದೆ.`,
  cheaper: (costW: string, costL: string) => `ವೆಚ್ಚವೂ ಕಡಿಮೆ (ಸುಮಾರು ₹${costW} ಕೋಟಿ, ಎದುರಾಗಿ ₹${costL} ಕೋಟಿ).`,
  dearer: (loser: string, costW: string, costL: string) =>
    `ಆದರೆ ${loser}ಗಿಂತ ವೆಚ್ಚ ಹೆಚ್ಚು (ಸುಮಾರು ₹${costW} ಕೋಟಿ, ಎದುರಾಗಿ ₹${costL} ಕೋಟಿ).`,
  slower: "ನಿರ್ಮಾಣಕ್ಕೆ ಹೆಚ್ಚು ಸಮಯವೂ ಬೇಕಾಗುತ್ತದೆ.",
  sentenceEnd: "",

  kinds: {
    flyover: "ಮೇಲ್ಸೇತುವೆ",
    underpass: "ಕೆಳಸೇತುವೆ",
    road_widening: "ರಸ್ತೆ ಅಗಲೀಕರಣ",
    bus_lane: "ಬಸ್ ಲೇನ್",
    metro_line: "ಮೆಟ್ರೋ ಮಾರ್ಗ",
    metro_station: "ಮೆಟ್ರೋ ನಿಲ್ದಾಣ",
    cycle_track: "ಸೈಕಲ್ ಪಥ",
    pedestrian_walkway: "ಪಾದಚಾರಿ ಮಾರ್ಗ",
    skywalk: "ಸ್ಕೈವಾಕ್",
    junction_redesign: "ಜಂಕ್ಷನ್ ಮರುವಿನ್ಯಾಸ",
    signal_optimisation: "ಸಿಗ್ನಲ್ ಸುಧಾರಣೆ",
    one_way: "ಏಕಮುಖ ಸಂಚಾರ",
    parking: "ವಾಹನ ನಿಲುಗಡೆ",
    green_buffer: "ಹಸಿರು ವಲಯ",
    drainage: "ಚರಂಡಿ",
    removal: "ತೆರವು",
    other: "ಇತರೆ",
  },
  factorNames: {
    traffic_flow: "ಸಂಚಾರ ಹರಿವು",
    cost: "ಹಣಕ್ಕೆ ತಕ್ಕ ಮೌಲ್ಯ",
    feasibility: "ಕಾರ್ಯಸಾಧ್ಯತೆ",
    environment: "ಪರಿಸರ",
    social_impact: "ಸಾಮಾಜಿಕ ಪರಿಣಾಮ",
    safety: "ಸುರಕ್ಷತೆ",
    public_transport: "ಸಾರ್ವಜನಿಕ ಸಾರಿಗೆ",
  },
  factorShort: { traffic_flow: "ಸಂಚಾರ", cost: "ಮೌಲ್ಯ", public_transport: "ಸಾರಿಗೆ", social_impact: "ಸಾಮಾಜಿಕ", feasibility: "ಸಾಧ್ಯತೆ" },
  verdicts: {
    recommended: "ಶಿಫಾರಸು ಮಾಡಲಾಗಿದೆ",
    recommended_with_changes: "ಬದಲಾವಣೆಗಳು ಬೇಕು",
    not_recommended: "ಶಿಫಾರಸು ಮಾಡಲಾಗಿಲ್ಲ",
  },
};

export type Lang = "en" | "kn";

export const STRINGS: Record<Lang, Strings> = { en, kn };

/** The label each language is offered under, written in that language. */
export const LANG_NAMES: Record<Lang, string> = { en: "English", kn: "ಕನ್ನಡ" };

export function loadLang(): Lang {
  try {
    const saved = localStorage.getItem("blroad-lang");
    return saved === "kn" || saved === "en" ? saved : "en";
  } catch {
    return "en";
  }
}

export const LangContext = createContext<Lang>("en");

/** The interface strings for the current language. */
export function useT(): Strings {
  return STRINGS[useContext(LangContext)];
}

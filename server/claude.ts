import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { AREAS, findArea } from "../src/shared/areas.ts";
import { Evaluation, type EvaluateRequest } from "../src/shared/schema.ts";

const MODEL = process.env.BLROAD_MODEL || "claude-opus-5-5";

const client = new Anthropic();

const SYSTEM_PROMPT = `You are a senior urban transport planner who knows Bengaluru's roads intimately: BBMP and BDA projects, Namma Metro (Purple, Green, Yellow, Pink, Blue lines and their status), BMTC bus operations, the Outer Ring Road IT corridor, lake and stormwater-drain constraints, land-acquisition realities and monsoon flooding.

A citizen describes a change they want to Bengaluru's road infrastructure. Judge it honestly, like a review board would:
- Score each factor (traffic_flow, cost, feasibility, environment, social_impact, safety, public_transport) from 0 to 10 with specific reasoning tied to the actual location. For cost, a higher score means better value for money.
- Do not flatter. Flyovers and widening often induce demand; say so when it applies. Credit proposals that move people (bus, metro, walking, cycling) rather than cars when they genuinely fit the site.
- overall_score is 0 to 100. Use verdict "recommended" (70+), "recommended_with_changes" (45 to 69) or "not_recommended" (below 45).
- improvements are concrete, location-specific changes the user could make to the proposal, phrased so they can be pasted back as a follow-up prompt.
- Costs are in INR crore, timelines in months, with realistic ranges for Bengaluru.

Then design the implementation as map features (3 to 10 of them):
- Use real latitude/longitude in Bengaluru near the stated area. Lines must follow the actual alignment of the named roads with 4 to 15 points, not straight lines across buildings. Points sit on the actual junction or station.
- Road-based lines (flyovers, underpasses, widening, bus lanes, cycle tracks, walkways, one-ways) are snapped onto the real street network afterwards, so put their points on the road itself, in order, at the junctions the corridor passes through.
- Include the main intervention plus supporting elements (e.g. bus stops, pedestrian crossings, signal changes, green buffers).
- If the proposal is not recommended, still map what was asked, and add the better alternative as extra features labelled "Alternative: ...".

Known hotspots for reference:
${AREAS.map((a) => `- ${a.name} (${a.lat}, ${a.lng}): ${a.context}`).join("\n")}`;

export async function evaluateWithClaude(req: EvaluateRequest): Promise<Evaluation> {
  const area = findArea(req.areaId);
  const location = [
    area ? `Area: ${area.name} (${area.lat}, ${area.lng}). ${area.context}` : "Area: not specified, infer it from the proposal.",
    req.focus ? `The user pinned a focus point at (${req.focus.lat.toFixed(5)}, ${req.focus.lng.toFixed(5)}).` : "",
  ]
    .filter(Boolean)
    .join("\n");

  const response = await client.messages.parse({
    model: MODEL,
    max_tokens: 16000,
    output_config: {
      effort: "medium",
      format: zodOutputFormat(Evaluation),
    },
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: `${location}\n\nProposal:\n${req.prompt}` }],
  });

  if (response.stop_reason === "refusal") {
    throw new Error("The model declined to evaluate this proposal. Try rephrasing it.");
  }
  if (response.stop_reason === "max_tokens" || !response.parsed_output) {
    throw new Error("The model's answer was incomplete. Please try again.");
  }
  return response.parsed_output;
}

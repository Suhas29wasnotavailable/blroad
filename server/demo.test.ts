import { describe, expect, it } from "vitest";
import { mentionedAreas, pickRules } from "./demo.ts";

const kinds = (prompt: string) => pickRules(prompt).map((r) => r.kind);

describe("pickRules", () => {
  it("matches whole words, not substrings", () => {
    // Regressions from #2: these used to trigger unrelated rules.
    expect(kinds("a pedestrian-first street with paid parking")).not.toContain("green_buffer");
    expect(kinds("help small business owners with better footpaths")).not.toContain("bus_lane");
    expect(kinds("extend the metro train to Whitefield")).not.toContain("drainage");
    expect(kinds("better footpaths on residential streets")).not.toContain("green_buffer");
  });

  it("accepts plurals and listed word forms", () => {
    expect(kinds("plant more trees")).toContain("green_buffer");
    expect(kinds("fix the flooding")).toContain("drainage");
    expect(kinds("make it walkable")).toContain("pedestrian_walkway");
  });

  it("orders rules by where they first appear in the prompt", () => {
    expect(kinds("a cycle track next to the new flyover")).toEqual(["cycle_track", "flyover"]);
  });

  it("returns at most three rules", () => {
    expect(pickRules("flyover, bus lane, metro, cycle track and footpaths").length).toBe(3);
  });

  it("falls back to a junction redesign when nothing matches", () => {
    expect(kinds("make traffic better somehow")).toEqual(["junction_redesign"]);
  });

  it("handles the built-in examples", () => {
    expect(kinds("Build a dedicated, physically separated bus lane on the Outer Ring Road from Silk Board to KR Puram with signal priority.")[0]).toBe("bus_lane");
    expect(kinds("Add a second flyover loop at Hebbal for traffic coming from the city towards the airport.")).toEqual(["flyover"]);
    expect(kinds("Build an underpass at Marathahalli bridge and fix the drainage so it stops flooding.")).toEqual(["underpass", "drainage"]);
  });
});

describe("mentionedAreas", () => {
  it("finds hotspots in the order they are mentioned", () => {
    expect(mentionedAreas("a bus lane from Silk Board to KR Puram").map((a) => a.id)).toEqual(["silk-board", "kr-puram"]);
  });

  it("understands aliases", () => {
    expect(mentionedAreas("pedestrianise city market").map((a) => a.id)).toEqual(["kr-market"]);
    expect(mentionedAreas("traffic near tin factory").map((a) => a.id)).toEqual(["kr-puram"]);
  });

  it("returns nothing for unknown places", () => {
    expect(mentionedAreas("somewhere in Mysuru")).toEqual([]);
  });
});

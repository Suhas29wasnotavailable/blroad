import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Anthropic from "@anthropic-ai/sdk";
import { evaluateWithClaude } from "./claude.ts";
import { evaluateDemo } from "./demo.ts";
import { snapFeatures } from "./roads.ts";
import type { EvaluateRequest, EvaluateResponse } from "../src/shared/schema.ts";

const app = express();
app.use(cors());
app.use(express.json({ limit: "100kb" }));

const hasKey = Boolean(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);
const forceDemo = process.env.BLROAD_DEMO === "1";
const mode: EvaluateResponse["mode"] = hasKey && !forceDemo ? "ai" : "demo";

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, mode });
});

app.post("/api/evaluate", async (req, res) => {
  const body = req.body as Partial<EvaluateRequest>;
  const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
  if (prompt.length < 5) {
    res.status(400).json({ error: "Describe the change you want in a sentence or two." });
    return;
  }
  if (prompt.length > 4000) {
    res.status(400).json({ error: "Please keep the proposal under 4000 characters." });
    return;
  }
  const request: EvaluateRequest = {
    prompt,
    areaId: typeof body.areaId === "string" ? body.areaId : null,
    focus:
      body.focus && typeof body.focus.lat === "number" && typeof body.focus.lng === "number"
        ? { lat: body.focus.lat, lng: body.focus.lng }
        : null,
  };

  try {
    const evaluation = mode === "ai" ? await evaluateWithClaude(request) : await evaluateDemo(request);
    evaluation.features = await snapFeatures(evaluation.features);
    res.json({ mode, evaluation } satisfies EvaluateResponse);
  } catch (err) {
    console.error(err);
    if (err instanceof Anthropic.RateLimitError) {
      res.status(429).json({ error: "The AI is busy right now. Try again in a minute." });
    } else if (err instanceof Anthropic.AuthenticationError) {
      res.status(500).json({ error: "The server's Anthropic API key was rejected." });
    } else if (err instanceof Anthropic.APIError) {
      res.status(502).json({ error: `AI request failed: ${err.message}` });
    } else {
      res.status(500).json({ error: err instanceof Error ? err.message : "Evaluation failed." });
    }
  }
});

// In production, serve the built frontend from the same server.
const dist = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../dist");
app.use(express.static(dist));
app.get(/^\/(?!api).*/, (_req, res) => res.sendFile(path.join(dist, "index.html")));

const port = Number(process.env.PORT) || 8787;
app.listen(port, () => {
  console.log(`BLRoad API on http://localhost:${port} (${mode === "ai" ? "AI mode" : "demo mode, no API key"})`);
});

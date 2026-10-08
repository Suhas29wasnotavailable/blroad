# BLRoad

Propose a fix for Bengaluru's roads, get an AI review board's verdict, and see the design drawn on an interactive map.

1. Pick a congestion hotspot (Silk Board, Hebbal, KR Puram, Marathahalli…) or click anywhere on the map to drop a focus pin.
2. Describe the change you want, e.g. *"Build a separated bus lane on ORR from Silk Board to KR Puram with signal priority."*
3. Claude judges it on traffic flow, value for money, feasibility, environment, social impact, safety and public transport, gives a 0–100 score and a verdict, lists why it's good and why it isn't, estimates cost (₹ crore), timeline and peak travel-time change, and suggests improvements.
4. The proposal is **built on the map**: a survey radar sweeps the site while the board deliberates, then each flyover, bus lane, cycle track, skywalk or junction redesign is constructed one after another along real streets, and traffic starts flowing along finished corridors. The construction log lets you replay the build or jump to any element. Click **Add** on any suggestion to fold it into your proposal and re-evaluate.
5. **Compare** two proposals (new, or loaded from your history): both are drawn on the map, A in yellow and B in blue, with a head-to-head table (score, cost, build time, commute impact, rupees per 1% of commute saved, all 7 factors) and a one-line summary of which wins.

## Run it

Requires Node 20+.

```bash
npm install
cp .env.example .env      # then put your key in ANTHROPIC_API_KEY
npm run dev               # web on http://localhost:5173, API on :8787
```

Without an API key the app runs in **demo mode**: a built-in rule engine scores the proposal and draws rough shapes, so you can try the UI end to end.

Production: `npm run build && npm start`, then open http://localhost:8787.

## How it works

- `src/` — React + Vite + Leaflet (react-leaflet) frontend. Basemaps are keyless: Esri dark canvas (default), Esri satellite and OpenStreetMap.
- `src/components/MapView.tsx` — the map, hotspots, survey radar and the road-construction animation.
- `src/components/ResultPanel.tsx` — score ring, factor radar chart, pros/cons and improvements.
- `server/index.ts` — Express API (`POST /api/evaluate`, `GET /api/health`).
- `server/claude.ts` — calls Claude (`claude-opus-5-5` by default, override with `BLROAD_MODEL`) with structured outputs so the response always matches the schema in `src/shared/schema.ts`.
- `server/roads.ts` — snaps road-based lines onto real streets with [OSRM](https://project-osrm.org) (routing over OpenStreetMap). Uses the public demo server by default; set `BLROAD_OSRM_URL` to your own instance for production use. If routing fails, the original line is kept.
- `server/demo.ts` — offline rule-based evaluator used when no key is set. It still routes its corridors over real roads, between the hotspots your prompt names.
- `src/shared/areas.ts` — Bengaluru hotspots with coordinates and local context fed to the model.

## Contributing

Contributions are welcome, especially local knowledge about Bengaluru's junctions. See [CONTRIBUTING.md](CONTRIBUTING.md) to get started and [CLAUDE.md](CLAUDE.md) for how everything works.

## Licence

[MIT](LICENSE)

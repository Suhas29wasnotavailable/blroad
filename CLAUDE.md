# BLRoad

A citizen describes a change to Bengaluru's roads ("separated bus lane on ORR from Silk Board to KR Puram"). An AI review board judges it the way a transport planner would: it scores 7 factors, gives a 0–100 score, a verdict, pros and cons, cost, timeline, the change in travel time, and improvements. Then the design is **built on a live map**: each element is constructed one after another along real streets. A **Compare** tab puts two proposals side by side, on the map and in a head-to-head table.

## Commands

```bash
npm install
npm run dev        # web on :5173 (Vite) + API on :8787 (tsx watch), via concurrently
npm run build      # tsc -b (client) + tsc -p tsconfig.server.json (server) + vite build → dist/
npm start          # production: Express serves the API and dist/ on :8787
npm run lint       # oxlint
```

There is no test suite. To verify a change, run `npm run build && npm run lint`, then try it in the browser.

## Layout

```
server/
  index.ts      Express app: routes, validation, error mapping, serves dist/ in prod
  claude.ts     The AI agent: system prompt + structured-output call to Claude
  demo.ts       Offline rule-based evaluator (used when there is no API key)
  roads.ts      Snaps lines to real streets via OSRM
src/
  shared/
    schema.ts   Zod schema for an Evaluation; single source of truth for client and server
    areas.ts    14 Bengaluru hotspots: coords, severity 1–3, local context for the AI
  App.tsx       App state, Propose/Compare tabs, composer, loading stages, history, what the map draws
  types.ts      HistoryItem and compare Slot types
  hooks.ts      useCountUp (score reveal)
  components/
    MapView.tsx      Leaflet map, hotspots, survey crosshair, road-construction animation, A/B tones
    ResultPanel.tsx  Score, stats, factors, pros/cons, improvements, "Compare with another proposal"
    ComparePanel.tsx Two slots (A/B), run both, headline + head-to-head table
    BuildLog.tsx     Construction log overlaid on the map (progress, replay, jump to element)
    charts.tsx       FactorRadar: one series, or two overlaid when comparing
  featureStyle.ts    Colours/labels per feature kind, A/B tone colours, verdict and score colours
  index.css          The entire design system (tokens, layout, map overlays, keyframes)
```

## Request lifecycle (end to end)

1. The user picks an area (dropdown or by clicking a hotspot), can click the map to drop a focus pin, writes a prompt, and presses **Evaluate & build** (or ⌘/Ctrl+Enter).
2. `App.evaluate()` POSTs `{ prompt, areaId, focus }` to `/api/evaluate`. While it waits, the panel shows the "Review board in session" checklist and the map shows a radar sweep at the pin, the area, or the city centre.
3. `server/index.ts` validates the prompt (5–4000 characters) and normalises `areaId` and `focus`.
4. It runs `evaluateWithClaude()` in AI mode or `evaluateDemo()` in demo mode. Both return an `Evaluation`.
5. `snapFeatures()` reroutes road-type lines onto the real street network.
6. The response `{ mode, evaluation }` comes back. The client stores it, adds it to history, and bumps `buildRun`, which starts the construction animation.

## How the AI agent works (`server/claude.ts`)

- It is a **single structured-output call**, not a multi-turn agent loop and not tool use. `client.messages.parse()` with `output_config.format: zodOutputFormat(Evaluation)` forces the reply to match the Zod schema exactly. The parsed object comes back as `response.parsed_output`.
- Model: `process.env.BLROAD_MODEL || "claude-opus-5-5"`, with `effort: "medium"` and `max_tokens: 16000`.
- **System prompt** sets the persona: a senior Bengaluru transport planner who knows BBMP/BDA, Namma Metro lines, BMTC, ORR, lakes and flooding, and land acquisition. Its rules:
  - Score each factor 0–10 with location-specific reasoning. For `cost`, a higher score means better value.
  - Don't flatter. Flag induced demand from flyovers and widening, and credit options that move people.
  - Verdict thresholds: ≥70 `recommended`, 45–69 `recommended_with_changes`, <45 `not_recommended`.
  - Improvements must be phrased so they can be pasted back in as follow-up prompts. This is what the **Apply** button relies on.
  - Costs are in INR crore and timelines in months.
  - Draw 3–10 map features with real coordinates. Lines need 4–15 points along the actual road. Road-type lines get snapped afterwards, so their points must sit on the road, in order, at junctions.
  - If the proposal is not recommended, still map what was asked, and add `"Alternative: ..."` features.
  - The prompt ends with the full `AREAS` list as grounding.
- **User message** = the area's name, coordinates and context (or "infer it"), plus the focus pin if there is one, plus the proposal.
- **Failure handling:**
  - `stop_reason === "refusal"` → a friendly error.
  - `max_tokens` or a missing `parsed_output` → "incomplete, try again".
  - SDK errors are mapped in `index.ts`: `RateLimitError` → 429, `AuthenticationError` → 500, other `APIError` → 502.
- **Mode selection** (`index.ts`): AI mode if `ANTHROPIC_API_KEY` or `ANTHROPIC_AUTH_TOKEN` is set and `BLROAD_DEMO !== "1"`. Otherwise demo mode. `GET /api/health` reports the mode, and the UI shows it as a pill.

## The data contract (`src/shared/schema.ts`)

`Evaluation` contains `title`, `verdict`, `overall_score`, `summary`, `factors[]` (7 named factors with score and reasoning), `pros[]`, `cons[]`, `improvements[]`, `estimated_cost_crore{low,high}`, `timeline_months{low,high}`, `peak_travel_time_change_pct` (negative means faster), and `features[]`.

`MapFeature` contains:
- `kind`: one of 17 values (`flyover`, `bus_lane`, `metro_station`, `junction_redesign`, …)
- `geometry`: `point`, `line` or `polygon`
- `label`, `description`
- `coordinates[]`: `{lat,lng}` points

The server uses the Zod schema to constrain Claude. The client imports **types only**.

**Changing the schema touches several places:**
- every `KIND_STYLE` entry, which is a typed `Record<FeatureKind, …>` and so must cover every kind
- `FACTOR_LABEL`
- the demo rules (each rule must score every `FactorName`)
- possibly the system prompt

`.describe()` strings on schema fields are passed to the model, so they work as prompt text.

## Compare mode (`ComparePanel.tsx` + `App.tsx`)

- State is `slots: [Slot, Slot]`, where each slot holds `{prompt, areaId, result, error}`. A slot gets a result either by evaluation or by **loading a past proposal** from history, which needs no API call. Editing a slot's prompt or area clears its result.
- `runCompare()` evaluates every slot that has a prompt but no result, **in parallel** (`Promise.all`), records them in history, then rebuilds the map. "Compare with another proposal →" on a result seeds slot A with it and switches tabs.
- **Map:** `App`'s `layers` memo concatenates A's and B's features and builds a parallel `tones` array (`"a"`/`"b"`). `MapView` colours each feature with `TONE[tone]` (A yellow `#f2c230`, B blue `#5ab0ff`) instead of its kind colour. A draws as a wide band (weight 10) and B as a thin line (3.5), transit-map style, so a road both use shows both colours. The view switch (A + B / Only A / Only B) filters `layers`, which restarts the build.
- **Table:** `rowsFor()` builds the rows: overall score, cost midpoint, build-time midpoint, peak commute, **₹ Cr per 1% faster** (cost midpoint ÷ travel-time saving; null if the commute doesn't get faster, and then the other side wins), plus all 7 factors. `winnerOf()` uses each row's `better: "higher" | "lower"`. `headline()` writes a one-line plain-language read: margin, cost difference, build time. Scores within 4 points count as "too close to call".
- The comparison is computed on the client from the two evaluations. There is no extra AI call.

## Road snapping (`server/roads.ts`)

- `routeThrough(waypoints, maxDetour)` calls OSRM `route/v1/driving` with `overview=full` and `geometries=geojson`, with a 6 s timeout and an in-memory cache keyed by coordinates.
- It **rejects** a route longer than `drawn length × maxDetour + 250 m`. A proposal is a corridor, not a trip, so loops and detours mean the snap went wrong. Rejection, network failure or a non-`Ok` response all return `null`, and the caller keeps the original geometry. Snapping must never break a response.
- Routes are thinned to at most 250 points.
- `snapFeatures()` only snaps `line` features whose kind is in `ROAD_KINDS`: flyover, underpass, road_widening, bus_lane, cycle_track, pedestrian_walkway, one_way. Metro lines, skywalks and drains don't follow roads, so they are left alone.
- `BLROAD_OSRM_URL` overrides the public demo server, which is meant for light use only. Use your own instance in production.

## Demo mode (`server/demo.ts`)

- `RULES` maps keyword lists to a feature kind with fixed factor scores, cost, months, travel change, and one pro, con and improvement each.
- `pickRules()` takes up to 3 matching rules, ordered by where they first appear in the prompt. If nothing matches, it falls back to `junction_redesign`.
- Factor scores are averaged across the chosen rules. Cost ranges are summed, and the timeline is the maximum. The verdict uses the same thresholds as the AI.
- `mentionedAreas()` finds hotspots named in the prompt using `AREA_TERMS` aliases (e.g. "tin factory" → KR Puram). The first one becomes the area. If **two** are named, the main corridor is routed between them.
- `shape()` produces the geometry:
  - point kinds go at or near the centre
  - area kinds (green_buffer, drainage) become a pentagon
  - lines are routed over real roads through the centre, trying up to 4 headings before falling back to a synthetic curve
  - bus lanes and metro lines also get 3 stop or station points
- The summary openly says it is a demo.

## How the frontend works

**State (`App.tsx`):**
- inputs: `areaId`, `focus`, `prompt`
- request: `loading`, `stage`/`elapsed` (the checklist only paces the wait; it doesn't measure progress), `error`
- result: `result`, `serverMode`, `history` (last 20 in localStorage under `blroad-history`)
- build: `buildRun`, `built`, `spotlight`, `showProposal`

**Build sequencing:**
- `buildRun` is a counter. Incrementing it (new result, history restore, or ↻ Replay) restarts construction.
- `MapView`'s `Director` flies to the features' bounds. On `moveend` it ticks `built` from 0 to N, one step every `STEP_MS` (750 ms).
- `MapView` renders `features.slice(0, built)`, keyed `${buildRun}-${i}`. So each feature **mounts in turn**, and mounting is what plays its animation.
- The construction log marks each item done, active or pending based on `built`. Clicking an item sets `spotlight`, which flies to that feature.
- `ResultPanel` is keyed by `buildRun`, so replaying resets its count-up and "Added" state.
- `requestEvaluation()` is shared by both tabs. In demo mode it keeps the loader up for at least 2.2 s, so the survey and checklist can actually be seen.
- History keeps the last 20 entries. Re-running the same prompt and area replaces the old entry.

**Map (`MapView.tsx`):**
- **Basemaps** (all keyless; CARTO now needs a key):
  - **Night** (default): Esri `Canvas/World_Dark_Gray_Base` plus the `World_Dark_Gray_Reference` labels layer
  - **Satellite**: Esri World Imagery
  - **Streets**: OpenStreetMap
- `fadeAnimation={false}` is deliberate. With tile fading on, Leaflet can leave the previous zoom level's tiles in place, and the transparent labels layer then shows doubled labels.
- **Hotspots** are `divIcon` markers coloured by severity with a pulsing ring. Clicking one selects the area; clicking the empty map drops the focus pin.
- While a review runs, a survey crosshair (two rings and a rotating arm) sits on the pin, the area, or the city centre.
- **`RoadLine`** draws a road being built:
  1. A faint dashed survey line of the full route appears.
  2. A `requestAnimationFrame` loop calls `setLatLngs()` on the glow and core polylines with `partial()`, a prefix of the line interpolated by distance with ease-out. The duration scales with length (1–2.4 s).
  3. A glowing build-head marker rides the tip.
  4. When it's done, the head fades and a white dashed **flow** line animates via CSS `stroke-dashoffset`, at a speed set by `KIND_STYLE[kind].flow`.
  - Growing the geometry, rather than animating the SVG dash, is what keeps the effect correct while the map zooms.
- **Points** are `divIcon`s with a drop-in and a ripple. **Polygons** fade in. Every feature gets a tooltip and a styled popup.
- `framePadding()` keeps fly-to framing clear of the construction log (330 px on the right on desktop).

**Results (`ResultPanel.tsx`):**
- a large count-up score numeral, the verdict and a score bar
- 3 stats divided by hairline rules
- `FactorRadar` (`charts.tsx`), a hand-built SVG 7-axis spider chart
- expandable factor bars
- For / Against lists
- improvements with **Add**, which appends `Also: <text>` to the prompt
- the button that starts compare mode

**Styling (`index.css`):**
- **Visual language: road signage and transit maps, not a dashboard.** Dark only. The surfaces are flat neutral blacks (`#0c0c0d`, `#111113`, `#18181b`), not navy. Hairline rules (`--line`) separate content instead of cards. Radii are 4 px. There are no gradients, glassmorphism or glow effects in the UI chrome.
- One accent: road-marking yellow `--accent #f2c230`, used for the primary button, the active tab, the wordmark block and the score chart. The compare tones are `--tone-a` (yellow) and `--tone-b` (blue).
- **Fonts** (loaded in `index.html`):
  - **Archivo** (variable width): the wordmark, score numerals and headings. `font-stretch` is used to condense or expand it.
  - **IBM Plex Sans**: body text.
  - **IBM Plex Mono**: labels, data, table numbers and tags, uppercase with tracking.
- Layout: a docked 440 px sidebar beside the map. Below 860 px it becomes a stacked map-over-panel layout.
- `prefers-reduced-motion` turns off the animations.
- When adding UI, match this style: hairlines over boxes, mono for labels and numbers, at most one accent per element, and no decorative gradients or emoji.

## How the server works (`server/index.ts`)

- Express 5 with `cors()` and `express.json({limit:"100kb"})`.
- `dotenv/config` loads `.env`.
- In production it serves `dist/` statically, with an SPA fallback regex for every non-`/api` path.
- Imports between the server and `src/shared` use explicit `.ts` extensions (`allowImportingTsExtensions`, `nodenext`). `tsx` runs the TypeScript directly, so there is no server build output (`noEmit`).

## Environment

| Variable | Purpose |
|---|---|
| `ANTHROPIC_API_KEY` | Enables AI mode; without it the app runs in demo mode |
| `BLROAD_MODEL` | Override the model (default `claude-opus-5-5`) |
| `BLROAD_DEMO=1` | Force demo mode even if a key is set |
| `BLROAD_OSRM_URL` | Your own OSRM server (default: the public demo server) |
| `PORT` | API port (default 8787) |

## Conventions and gotchas

- Keep the client free of Node and SDK imports. It may import only types (and plain data like `AREAS`) from `src/shared`.
- New feature kinds need a `KIND_STYLE` entry. Add `flow` if traffic should animate along it, and add the kind to `ROAD_KINDS` if it runs along an existing road.
- Every external call (Claude, OSRM, tiles) has a fallback path. Keep it that way, so the app still runs end to end with no key and no network routing.
- Don't add fixed delays on the AI path. The demo-mode minimum wait exists only because demo answers are instant.

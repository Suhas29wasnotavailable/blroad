import { useEffect, useMemo, useState } from "react";
import MapView from "./components/MapView";
import ResultPanel from "./components/ResultPanel";
import ComparePanel from "./components/ComparePanel";
import BuildLog from "./components/BuildLog";
import { AREAS, findArea } from "./shared/areas";
import type { EvaluateResponse, MapFeature } from "./shared/schema";
import type { Tone } from "./featureStyle";
import { emptySlot, type HistoryItem, type Slot } from "./types";

const EXAMPLES = [
  { tag: "Bus", text: "Build a dedicated, physically separated bus lane on the Outer Ring Road from Silk Board to KR Puram with signal priority." },
  { tag: "Flyover", text: "Add a second flyover loop at Hebbal for traffic coming from the city towards the airport." },
  { tag: "Street", text: "Turn Indiranagar 100 Feet Road into a pedestrian-first street with wider footpaths, cycle lanes and paid parking." },
  { tag: "Flooding", text: "Build an underpass at Marathahalli bridge and fix the drainage so it stops flooding." },
  { tag: "Junction", text: "Redesign Sony World junction with a roundabout and adaptive signals instead of the stalled elevated corridor." },
];

// What a review covers. Shown while waiting; it paces the wait, it doesn't measure it.
const STAGES = ["Reading the site", "Peak-hour traffic", "Cost and feasibility", "Safety and environment", "Laying out the design"];

type Tab = "propose" | "compare";

function loadHistory(): HistoryItem[] {
  try {
    return JSON.parse(localStorage.getItem("blroad-history") || "[]");
  } catch {
    return [];
  }
}

async function requestEvaluation(prompt: string, areaId: string | null, focus: { lat: number; lng: number } | null): Promise<EvaluateResponse> {
  const started = Date.now();
  const res = await fetch("/api/evaluate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt, areaId, focus }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Something went wrong.");
  // Demo answers are instant; give the survey a moment on screen so the sequence reads.
  if (data.mode === "demo") await new Promise((r) => setTimeout(r, Math.max(0, 2200 - (Date.now() - started))));
  return data;
}

export default function App() {
  const [tab, setTab] = useState<Tab>("propose");
  const [areaId, setAreaId] = useState<string | null>(null);
  const [focus, setFocus] = useState<{ lat: number; lng: number } | null>(null);
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [stage, setStage] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<EvaluateResponse | null>(null);
  const [slots, setSlots] = useState<[Slot, Slot]>([emptySlot(), emptySlot()]);
  const [compareView, setCompareView] = useState<"both" | Tone>("both");
  const [showProposal, setShowProposal] = useState(true);
  const [serverMode, setServerMode] = useState<"ai" | "demo" | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>(loadHistory);
  const [buildRun, setBuildRun] = useState(0);
  const [built, setBuilt] = useState(0);
  const [spotlight, setSpotlight] = useState<number | null>(null);

  const selectedArea = useMemo(() => findArea(areaId), [areaId]);

  // What the map draws: the current proposal, or both compared proposals tagged A/B.
  const layers = useMemo((): { features: MapFeature[]; tones?: (Tone | undefined)[] } => {
    if (tab === "propose") return { features: result?.evaluation.features ?? [] };
    const features: MapFeature[] = [];
    const tones: Tone[] = [];
    (["a", "b"] as const).forEach((t, i) => {
      const ev = slots[i].result?.evaluation;
      if (!ev || (compareView !== "both" && compareView !== t)) return;
      features.push(...ev.features);
      tones.push(...ev.features.map(() => t));
    });
    return { features, tones };
  }, [tab, result, slots, compareView]);

  useEffect(() => {
    fetch("/api/health")
      .then((r) => r.json())
      .then((d) => setServerMode(d.mode))
      .catch(() => setServerMode(null));
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem("blroad-history", JSON.stringify(history.slice(0, 20)));
    } catch {
      /* storage unavailable */
    }
  }, [history]);

  useEffect(() => {
    if (!loading) return;
    const t0 = Date.now();
    const stagePace = serverMode === "ai" ? 7000 : 400;
    const id = window.setInterval(() => {
      const ms = Date.now() - t0;
      setElapsed(Math.floor(ms / 1000));
      setStage(Math.min(STAGES.length - 1, Math.floor(ms / stagePace)));
    }, 200);
    return () => window.clearInterval(id);
  }, [loading, serverMode]);

  function remember(data: EvaluateResponse, p: string, a: string | null) {
    // Re-running the same proposal replaces its old entry instead of piling up duplicates.
    setHistory((h) => [
      { ...data, prompt: p, areaId: a, at: Date.now() + Math.random() },
      ...h.filter((x) => x.prompt !== p || x.areaId !== a),
    ].slice(0, 20));
  }

  function rebuild() {
    setShowProposal(true);
    setSpotlight(null);
    setBuildRun((n) => n + 1);
  }

  function beginLoading() {
    setLoading(true);
    setStage(0);
    setElapsed(0);
    setError(null);
    setSpotlight(null);
  }

  async function evaluate() {
    if (!prompt.trim() || loading) return;
    beginLoading();
    try {
      const data = await requestEvaluation(prompt, areaId, focus);
      setResult(data);
      remember(data, prompt, areaId);
      rebuild();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not reach the server.");
    } finally {
      setLoading(false);
    }
  }

  async function runCompare() {
    if (loading) return;
    beginLoading();
    const outcomes = await Promise.all(
      slots.map(async (s): Promise<Slot> => {
        if (s.result || !s.prompt.trim()) return s;
        try {
          const data = await requestEvaluation(s.prompt, s.areaId, null);
          remember(data, s.prompt, s.areaId);
          return { ...s, result: data, error: null };
        } catch (e) {
          return { ...s, error: e instanceof Error ? e.message : "Could not reach the server." };
        }
      }),
    );
    setSlots(outcomes as [Slot, Slot]);
    setCompareView("both");
    setLoading(false);
    rebuild();
  }

  function updateSlot(i: 0 | 1, patch: Partial<Slot>) {
    setSlots((s) => {
      const next: [Slot, Slot] = [s[0], s[1]];
      next[i] = { ...next[i], ...patch };
      return next;
    });
    if (patch.result) rebuild();
  }

  function startCompare() {
    if (result) setSlots([{ prompt, areaId, result, error: null }, { ...emptySlot(), areaId }]);
    setTab("compare");
    rebuild();
  }

  function switchTab(t: Tab) {
    setTab(t);
    rebuild();
  }

  function restore(item: HistoryItem) {
    setTab("propose");
    setPrompt(item.prompt);
    setAreaId(item.areaId);
    setResult({ mode: item.mode, evaluation: item.evaluation });
    rebuild();
  }

  const bothCompared = !!slots[0].result && !!slots[1].result;

  return (
    <div className="app">
      <aside className="panel">
        <header className="masthead">
          <div className="wordmark">
            <span>BL</span>Road
          </div>
          <span className="tagline">Proposals for Bengaluru's streets</span>
          {serverMode && <span className={`mode ${serverMode}`}>{serverMode === "ai" ? "Live review" : "Demo data"}</span>}
        </header>

        <nav className="tabs" role="tablist">
          <button role="tab" aria-selected={tab === "propose"} onClick={() => switchTab("propose")}>Propose</button>
          <button role="tab" aria-selected={tab === "compare"} onClick={() => switchTab("compare")}>
            Compare{bothCompared && <i />}
          </button>
        </nav>

        <div className="panel-body">
          {tab === "propose" && (
            <>
              <div className="composer">
                <div className="field">
                  <label htmlFor="area">Where</label>
                  <select id="area" value={areaId ?? ""} onChange={(e) => { setAreaId(e.target.value || null); setFocus(null); }}>
                    <option value="">Anywhere in Bengaluru</option>
                    {AREAS.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
                </div>
                {selectedArea && <p className="area-context">{selectedArea.context}</p>}
                {focus && (
                  <p className="pin-note">
                    Pin at {focus.lat.toFixed(4)}, {focus.lng.toFixed(4)}
                    <button className="link" onClick={() => setFocus(null)}>Remove</button>
                  </p>
                )}
                <div className="field">
                  <label htmlFor="prompt">What would you change?</label>
                  <textarea
                    id="prompt"
                    rows={4}
                    value={prompt}
                    placeholder="A bus-only lane on Hosur Road from Silk Board to Electronic City"
                    onChange={(e) => setPrompt(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) evaluate(); }}
                  />
                </div>
                <div className="composer-bottom">
                  <span className="hint">Click the map to drop a pin · ⌘↵ to submit</span>
                  <button className="primary" onClick={evaluate} disabled={loading || !prompt.trim()}>
                    {loading ? "Evaluating…" : "Evaluate"}
                  </button>
                </div>
              </div>

              {error && <p className="error">{error}</p>}

              {!result && !loading && (
                <section className="examples">
                  <h3>Start from an example</h3>
                  {EXAMPLES.map((ex) => (
                    <button key={ex.text} onClick={() => setPrompt(ex.text)}>
                      <b>{ex.tag}</b>
                      <span>{ex.text}</span>
                    </button>
                  ))}
                </section>
              )}

              {result && !loading && (
                <ResultPanel
                  key={buildRun}
                  evaluation={result.evaluation}
                  mode={result.mode}
                  onUseImprovement={(t) => setPrompt((p) => `${p.trim()}\n\nAlso: ${t}`)}
                  onCompare={startCompare}
                />
              )}
            </>
          )}

          {tab === "compare" && (
            <ComparePanel
              slots={slots}
              onChange={updateSlot}
              history={history}
              running={loading}
              onRun={runCompare}
              onSwap={() => { setSlots(([a, b]) => [b, a]); rebuild(); }}
            />
          )}

          {loading && (
            <section className="stages">
              <div className="stages-head">
                <h3>Reviewing</h3>
                <span className="mono">{elapsed}s</span>
              </div>
              <ol>
                {STAGES.map((s, i) => <li key={s} className={i < stage ? "done" : i === stage ? "active" : ""}>{s}</li>)}
              </ol>
              {serverMode === "ai" && <p className="hint">A full review can take up to a minute.</p>}
            </section>
          )}

          {history.length > 0 && tab === "propose" && (
            <section className="history">
              <h3>Your past proposals</h3>
              {history.map((h) => (
                <button key={h.at} onClick={() => restore(h)}>
                  <span>{h.evaluation.title}</span>
                  <b className={h.evaluation.verdict}>{Math.round(h.evaluation.overall_score)}</b>
                </button>
              ))}
            </section>
          )}
        </div>
      </aside>

      <main className="map-wrap">
        <MapView
          selectedArea={tab === "propose" ? selectedArea : undefined}
          focus={tab === "propose" ? focus : null}
          features={layers.features}
          tones={layers.tones}
          showProposal={showProposal}
          loading={loading}
          buildRun={buildRun}
          built={built}
          onBuilt={setBuilt}
          spotlight={spotlight}
          onSelectArea={(id) => { setTab("propose"); setAreaId(id); setFocus(null); }}
          onFocus={(p) => { if (tab === "propose") setFocus(p); }}
        />

        {tab === "compare" && bothCompared && !loading && (
          <div className="view-switch" role="group" aria-label="Which proposal to show">
            {(["both", "a", "b"] as const).map((v) => (
              <button key={v} className={`${v}${compareView === v ? " on" : ""}`} onClick={() => { setCompareView(v); rebuild(); }}>
                {v === "both" ? "A + B" : `Only ${v.toUpperCase()}`}
              </button>
            ))}
          </div>
        )}

        {!loading && layers.features.length > 0 && (
          <BuildLog
            features={layers.features}
            tones={layers.tones}
            built={built}
            buildRun={buildRun}
            visible={showProposal}
            onToggle={() => setShowProposal((v) => !v)}
            onReplay={rebuild}
            onSpotlight={setSpotlight}
          />
        )}
      </main>
    </div>
  );
}

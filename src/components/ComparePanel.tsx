import type { CSSProperties } from "react";
import type { Evaluation } from "../shared/schema";
import { AREAS } from "../shared/areas";
import { FACTOR_LABEL, TONE, VERDICT_STYLE, type Tone } from "../featureStyle";
import type { HistoryItem, Slot } from "../types";
import { FactorRadar } from "./charts";

interface Props {
  slots: [Slot, Slot];
  onChange: (i: 0 | 1, patch: Partial<Slot>) => void;
  history: HistoryItem[];
  running: boolean;
  onRun: () => void;
  onSwap: () => void;
}

const TONES: Tone[] = ["a", "b"];
const mid = (r: { low: number; high: number }) => (r.low + r.high) / 2;

interface Row {
  label: string;
  a: number | null;
  b: number | null;
  format: (n: number) => string;
  better: "higher" | "lower";
  hint?: string;
}

function rowsFor(a: Evaluation, b: Evaluation): Row[] {
  // Crore spent per 1% of peak travel time saved; only meaningful when the commute gets faster.
  const perPct = (e: Evaluation) => (e.peak_travel_time_change_pct < 0 ? mid(e.estimated_cost_crore) / -e.peak_travel_time_change_pct : null);
  const pct = (n: number) => `${n > 0 ? "+" : ""}${n}%`;
  return [
    { label: "Overall score", a: a.overall_score, b: b.overall_score, format: (n) => `${Math.round(n)}`, better: "higher" },
    { label: "Cost (mid, ₹ Cr)", a: mid(a.estimated_cost_crore), b: mid(b.estimated_cost_crore), format: (n) => `₹${Math.round(n).toLocaleString("en-IN")}`, better: "lower" },
    { label: "Build time (mid)", a: mid(a.timeline_months), b: mid(b.timeline_months), format: (n) => `${Math.round(n)} mo`, better: "lower" },
    { label: "Peak commute", a: a.peak_travel_time_change_pct, b: b.peak_travel_time_change_pct, format: pct, better: "lower" },
    {
      label: "₹ Cr per 1% faster",
      a: perPct(a), b: perPct(b),
      format: (n) => `₹${n < 10 ? n.toFixed(1) : Math.round(n).toLocaleString("en-IN")}`,
      better: "lower",
      hint: "Midpoint cost divided by the peak travel-time saving. Lower means more commute saved per rupee.",
    },
    ...a.factors.map((f): Row => ({
      label: FACTOR_LABEL[f.name] ?? f.name,
      a: f.score,
      b: b.factors.find((g) => g.name === f.name)?.score ?? null,
      format: (n) => `${n}`,
      better: "higher",
    })),
  ];
}

function winnerOf(r: Row): Tone | null {
  // A missing value means "not applicable" (e.g. no travel-time saving), so the other side wins.
  if (r.a == null || r.b == null) return r.a != null ? "a" : r.b != null ? "b" : null;
  if (r.a === r.b) return null;
  return (r.better === "higher") === r.a > r.b ? "a" : "b";
}

/** A plain-language read of the numbers, so the table has a headline. */
function headline(a: Evaluation, b: Evaluation): string {
  const diff = Math.round(a.overall_score - b.overall_score);
  if (Math.abs(diff) < 4) return "Too close to call on score alone. Look at cost and build time to decide.";
  const [w, l, wn, ln] = diff > 0 ? [a, b, "A", "B"] : [b, a, "B", "A"];
  const parts = [`${wn} comes out ahead by ${Math.abs(diff)} points`];
  const costW = mid(w.estimated_cost_crore);
  const costL = mid(l.estimated_cost_crore);
  if (costW < costL * 0.8) parts.push(`and costs less (about ₹${Math.round(costW).toLocaleString("en-IN")} Cr against ₹${Math.round(costL).toLocaleString("en-IN")} Cr)`);
  else if (costW > costL * 1.25) parts.push(`but costs more than ${ln} (about ₹${Math.round(costW).toLocaleString("en-IN")} Cr against ₹${Math.round(costL).toLocaleString("en-IN")} Cr)`);
  if (mid(w.timeline_months) > mid(l.timeline_months) * 1.5) parts.push(`and takes much longer to build`);
  return `${parts.join(" ")}.`;
}

export default function ComparePanel({ slots, onChange, history, running, onRun, onSwap }: Props) {
  const [ea, eb] = slots.map((s) => s.result?.evaluation ?? null);
  const pending = slots.filter((s) => !s.result && s.prompt.trim()).length;
  const ready = slots.every((s) => s.result || s.prompt.trim().length >= 5);

  return (
    <div className="compare">
      <p className="lede">Put two ideas for the same problem side by side. Both are drawn on the map, A in yellow and B in blue.</p>

      {slots.map((slot, i) => {
        const tone = TONES[i];
        return (
          <div key={tone} className="slot" style={{ "--tone": TONE[tone] } as CSSProperties}>
            <div className="slot-head">
              <span className="slot-tag">{tone.toUpperCase()}</span>
              <select
                value=""
                onChange={(e) => {
                  const item = history.find((h) => String(h.at) === e.target.value);
                  if (item) onChange(i as 0 | 1, { prompt: item.prompt, areaId: item.areaId, result: { mode: item.mode, evaluation: item.evaluation }, error: null });
                }}
                aria-label={`Load a past proposal into ${tone.toUpperCase()}`}
                disabled={!history.length}
              >
                <option value="">{history.length ? "Load a past proposal…" : "No past proposals yet"}</option>
                {history.map((h) => <option key={h.at} value={h.at}>{h.evaluation.title} ({Math.round(h.evaluation.overall_score)})</option>)}
              </select>
            </div>
            <select
              className="slot-area"
              value={slot.areaId ?? ""}
              onChange={(e) => onChange(i as 0 | 1, { areaId: e.target.value || null, result: null })}
              aria-label={`Area for ${tone.toUpperCase()}`}
            >
              <option value="">Anywhere in Bengaluru</option>
              {AREAS.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
            <textarea
              rows={3}
              value={slot.prompt}
              placeholder={i === 0 ? "e.g. A second flyover loop at Hebbal" : "e.g. Bus priority lanes and a metro feeder at Hebbal instead"}
              onChange={(e) => onChange(i as 0 | 1, { prompt: e.target.value, result: null, error: null })}
              onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && ready) onRun(); }}
            />
            {slot.result && <p className="slot-status">Evaluated · {Math.round(slot.result.evaluation.overall_score)}/100 · {VERDICT_STYLE[slot.result.evaluation.verdict].label}</p>}
            {slot.error && <p className="error">{slot.error}</p>}
          </div>
        );
      })}

      <div className="compare-actions">
        <button className="secondary" onClick={onSwap} title="Swap A and B">⇅ Swap</button>
        <button className="primary" onClick={onRun} disabled={running || !ready || (pending === 0 && !!ea && !!eb)}>
          {running ? "Evaluating…" : ea && eb && !pending ? "Compared" : pending === 1 && (ea || eb) ? "Evaluate and compare" : "Evaluate both"}
        </button>
      </div>

      {ea && eb && !running && (
        <div className="verdict-table">
          <p className="headline">{headline(ea, eb)}</p>

          <div className="vt-names">
            {[ea, eb].map((e, i) => (
              <div key={i} style={{ "--tone": TONE[TONES[i]] } as CSSProperties}>
                <span className="slot-tag">{TONES[i].toUpperCase()}</span>
                <strong>{e.title}</strong>
                <em style={{ color: VERDICT_STYLE[e.verdict].color }}>{VERDICT_STYLE[e.verdict].label}</em>
              </div>
            ))}
          </div>

          <FactorRadar series={[{ factors: ea.factors, color: TONE.a }, { factors: eb.factors, color: TONE.b }]} />

          <table>
            <thead>
              <tr><th /><th className="a">A</th><th className="b">B</th></tr>
            </thead>
            <tbody>
              {rowsFor(ea, eb).map((r, idx) => {
                const w = winnerOf(r);
                return (
                  <tr key={r.label} className={idx === 5 ? "group-start" : ""}>
                    <th scope="row" title={r.hint}>{r.label}{r.hint && <sup>?</sup>}</th>
                    <td className={w === "a" ? "win a" : ""}>{r.a == null ? "–" : r.format(r.a)}</td>
                    <td className={w === "b" ? "win b" : ""}>{r.b == null ? "–" : r.format(r.b)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p className="hint">Highlighted cells win that row. Factor scores are out of 10.</p>
        </div>
      )}
    </div>
  );
}

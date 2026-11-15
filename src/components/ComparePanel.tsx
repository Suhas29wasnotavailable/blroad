import type { CSSProperties } from "react";
import type { Evaluation } from "../shared/schema";
import { AREAS } from "../shared/areas";
import { TONE, VERDICT_STYLE, type Tone } from "../featureStyle";
import { useT, type Strings } from "../i18n";
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

function rowsFor(a: Evaluation, b: Evaluation, t: Strings): Row[] {
  // Crore spent per 1% of peak travel time saved; only meaningful when the commute gets faster.
  const perPct = (e: Evaluation) => (e.peak_travel_time_change_pct < 0 ? mid(e.estimated_cost_crore) / -e.peak_travel_time_change_pct : null);
  const pct = (n: number) => `${n > 0 ? "+" : ""}${n}%`;
  return [
    { label: t.rowScore, a: a.overall_score, b: b.overall_score, format: (n) => `${Math.round(n)}`, better: "higher" },
    { label: t.rowCost, a: mid(a.estimated_cost_crore), b: mid(b.estimated_cost_crore), format: (n) => `₹${Math.round(n).toLocaleString("en-IN")}`, better: "lower" },
    { label: t.rowBuild, a: mid(a.timeline_months), b: mid(b.timeline_months), format: (n) => `${Math.round(n)} ${t.months}`, better: "lower" },
    { label: t.rowCommute, a: a.peak_travel_time_change_pct, b: b.peak_travel_time_change_pct, format: pct, better: "lower" },
    {
      label: t.rowPerPct,
      a: perPct(a), b: perPct(b),
      format: (n) => `₹${n < 10 ? n.toFixed(1) : Math.round(n).toLocaleString("en-IN")}`,
      better: "lower",
      hint: t.rowPerPctHint,
    },
    ...a.factors.map((f): Row => ({
      label: t.factorNames[f.name] ?? f.name,
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
function headline(a: Evaluation, b: Evaluation, t: Strings): string {
  const diff = Math.round(a.overall_score - b.overall_score);
  if (Math.abs(diff) < 4) return t.tooClose;
  const [w, l, wn, ln] = diff > 0 ? [a, b, "A", "B"] : [b, a, "B", "A"];
  const parts = [t.ahead(wn, Math.abs(diff))];
  const costW = mid(w.estimated_cost_crore);
  const costL = mid(l.estimated_cost_crore);
  const crore = (n: number) => Math.round(n).toLocaleString("en-IN");
  if (costW < costL * 0.8) parts.push(t.cheaper(crore(costW), crore(costL)));
  else if (costW > costL * 1.25) parts.push(t.dearer(ln, crore(costW), crore(costL)));
  if (mid(w.timeline_months) > mid(l.timeline_months) * 1.5) parts.push(t.slower);
  return `${parts.join(" ")}${t.sentenceEnd}`;
}

export default function ComparePanel({ slots, onChange, history, running, onRun, onSwap }: Props) {
  const t = useT();
  const [ea, eb] = slots.map((s) => s.result?.evaluation ?? null);
  const pending = slots.filter((s) => !s.result && s.prompt.trim()).length;
  const ready = slots.every((s) => s.result || s.prompt.trim().length >= 5);

  return (
    <div className="compare">
      <p className="lede">{t.compareLede}</p>

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
                aria-label={t.loadPastInto(tone.toUpperCase())}
                disabled={!history.length}
              >
                <option value="">{history.length ? t.loadPast : t.noPast}</option>
                {history.map((h) => <option key={h.at} value={h.at}>{h.evaluation.title} ({Math.round(h.evaluation.overall_score)})</option>)}
              </select>
            </div>
            <select
              className="slot-area"
              value={slot.areaId ?? ""}
              onChange={(e) => onChange(i as 0 | 1, { areaId: e.target.value || null, result: null })}
              aria-label={t.areaFor(tone.toUpperCase())}
            >
              <option value="">{t.anywhere}</option>
              {AREAS.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
            <textarea
              rows={3}
              value={slot.prompt}
              placeholder={i === 0 ? t.placeholderA : t.placeholderB}
              onChange={(e) => onChange(i as 0 | 1, { prompt: e.target.value, result: null, error: null })}
              onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && ready) onRun(); }}
            />
            {slot.result && <p className="slot-status">{t.evaluated(Math.round(slot.result.evaluation.overall_score), t.verdicts[slot.result.evaluation.verdict])}</p>}
            {slot.error && <p className="error">{slot.error}</p>}
          </div>
        );
      })}

      <div className="compare-actions">
        <button className="secondary" onClick={onSwap} title={t.swapTitle}>{t.swap}</button>
        <button className="primary" onClick={onRun} disabled={running || !ready || (pending === 0 && !!ea && !!eb)}>
          {running ? t.evaluating : ea && eb && !pending ? t.compared : pending === 1 && (ea || eb) ? t.evaluateAndCompare : t.evaluateBoth}
        </button>
      </div>

      {ea && eb && !running && (
        <div className="verdict-table">
          <p className="headline">{headline(ea, eb, t)}</p>

          <div className="vt-names">
            {[ea, eb].map((e, i) => (
              <div key={i} style={{ "--tone": TONE[TONES[i]] } as CSSProperties}>
                <span className="slot-tag">{TONES[i].toUpperCase()}</span>
                <strong>{e.title}</strong>
                <em style={{ color: VERDICT_STYLE[e.verdict].color }}>{t.verdicts[e.verdict]}</em>
              </div>
            ))}
          </div>

          <FactorRadar series={[{ factors: ea.factors, color: TONE.a }, { factors: eb.factors, color: TONE.b }]} />

          <table>
            <thead>
              <tr><th /><th className="a">A</th><th className="b">B</th></tr>
            </thead>
            <tbody>
              {rowsFor(ea, eb, t).map((r, idx) => {
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
          <p className="hint">{t.tableHint}</p>
        </div>
      )}
    </div>
  );
}

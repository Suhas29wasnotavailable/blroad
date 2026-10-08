import { useState } from "react";
import type { Evaluation } from "../shared/schema";
import { FACTOR_LABEL, VERDICT_STYLE, scoreColor } from "../featureStyle";
import { FactorRadar } from "./charts";
import { useCountUp } from "../hooks";

interface Props {
  evaluation: Evaluation;
  mode: "ai" | "demo";
  onUseImprovement: (text: string) => void;
  onCompare: () => void;
}

export default function ResultPanel({ evaluation: ev, mode, onUseImprovement, onCompare }: Props) {
  const verdict = VERDICT_STYLE[ev.verdict];
  const travel = ev.peak_travel_time_change_pct;
  const score = useCountUp(Math.max(0, Math.min(100, ev.overall_score)));
  const [openFactor, setOpenFactor] = useState<string | null>(null);
  const [applied, setApplied] = useState<Set<number>>(new Set());

  return (
    <div className="result">
      {mode === "demo" && <p className="note">Demo data from built-in rules. Add an Anthropic API key for a site-specific review.</p>}

      <div className="score-block">
        <div className="score-num">
          <span>{Math.round(score)}</span>
          <small>/100</small>
        </div>
        <div className="score-meta">
          <span className="verdict" style={{ color: verdict.color }}>
            <i style={{ background: verdict.color }} />{verdict.label}
          </span>
          <h2>{ev.title}</h2>
        </div>
      </div>
      <div className="score-bar"><i style={{ width: `${score}%`, background: verdict.color }} /></div>

      <p className="summary">{ev.summary}</p>

      <dl className="stats">
        <div>
          <dt>Cost</dt>
          <dd>₹{ev.estimated_cost_crore.low}–{ev.estimated_cost_crore.high}<small>Cr</small></dd>
        </div>
        <div>
          <dt>Build time</dt>
          <dd>{ev.timeline_months.low}–{ev.timeline_months.high}<small>mo</small></dd>
        </div>
        <div>
          <dt>Peak commute</dt>
          <dd className={travel <= 0 ? "good" : "bad"}>{travel > 0 ? "+" : ""}{travel}<small>%</small></dd>
        </div>
      </dl>

      <section>
        <h3>Factors</h3>
        <FactorRadar series={[{ factors: ev.factors, color: "#f2c230" }]} />
        <ul className="factors">
          {ev.factors.map((f) => (
            <li key={f.name}>
              <button className="factor-row" onClick={() => setOpenFactor(openFactor === f.name ? null : f.name)} aria-expanded={openFactor === f.name}>
                <span>{FACTOR_LABEL[f.name] ?? f.name}</span>
                <span className="bar"><i style={{ width: `${Math.max(0, Math.min(10, f.score)) * 10}%`, background: scoreColor(f.score) }} /></span>
                <span className="factor-score">{f.score}</span>
              </button>
              {openFactor === f.name && <p>{f.reasoning}</p>}
            </li>
          ))}
        </ul>
      </section>

      <section className="two-col">
        <div>
          <h3>For</h3>
          <ul className="list pros">{ev.pros.map((p, i) => <li key={i}>{p}</li>)}</ul>
        </div>
        <div>
          <h3>Against</h3>
          <ul className="list cons">{ev.cons.map((p, i) => <li key={i}>{p}</li>)}</ul>
        </div>
      </section>

      <section>
        <h3>Ways to improve it</h3>
        <ul className="improvements">
          {ev.improvements.map((p, i) => (
            <li key={i}>
              <span>{p}</span>
              <button
                className={applied.has(i) ? "done" : ""}
                onClick={() => { onUseImprovement(p); setApplied((s) => new Set(s).add(i)); }}
                title="Add this to your proposal, then evaluate again"
              >
                {applied.has(i) ? "Added" : "Add"}
              </button>
            </li>
          ))}
        </ul>
      </section>

      <button className="secondary wide" onClick={onCompare}>Compare with another proposal →</button>
    </div>
  );
}

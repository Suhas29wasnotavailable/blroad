import type { Evaluation } from "../shared/schema";
import { useT } from "../i18n";

const clamp10 = (n: number) => Math.max(0, Math.min(10, n));

/** Seven-axis spider chart. Pass one series for a single proposal, two to compare. */
export function FactorRadar({ series }: { series: { factors: Evaluation["factors"]; color: string }[] }) {
  const t = useT();
  const axes = series[0]?.factors.map((f) => f.name) ?? [];
  const size = 240;
  const cx = size / 2;
  const cy = size / 2;
  const R = 78;
  const n = axes.length;
  const at = (i: number, r: number) => {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / n;
    return [cx + Math.cos(a) * r, cy + Math.sin(a) * r] as const;
  };
  const ring = (k: number) => axes.map((_, i) => at(i, R * k).join(",")).join(" ");
  const scoreOf = (s: (typeof series)[number], name: string) => s.factors.find((f) => f.name === name)?.score ?? 0;

  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="radar-chart" role="img" aria-label={t.factorScores}>
      {[0.25, 0.5, 0.75, 1].map((k) => <polygon key={k} points={ring(k)} className="radar-grid" />)}
      {axes.map((_, i) => {
        const [x, y] = at(i, R);
        return <line key={i} x1={cx} y1={cy} x2={x} y2={y} className="radar-grid" />;
      })}
      {series.map((s, si) => (
        <g key={si}>
          <polygon
            points={axes.map((name, i) => at(i, (clamp10(scoreOf(s, name)) / 10) * R).join(",")).join(" ")}
            fill={s.color} fillOpacity={series.length > 1 ? 0.12 : 0.16} stroke={s.color} strokeWidth="1.5" strokeLinejoin="round"
            className="radar-shape"
          />
          {axes.map((name, i) => {
            const [x, y] = at(i, (clamp10(scoreOf(s, name)) / 10) * R);
            return <circle key={name} cx={x} cy={y} r="2.5" fill={s.color} />;
          })}
        </g>
      ))}
      {axes.map((name, i) => {
        const [x, y] = at(i, R + 16);
        const anchor = Math.abs(x - cx) < 8 ? "middle" : x > cx ? "start" : "end";
        return (
          <text key={name} x={x} y={y + 3} textAnchor={anchor} className="radar-label">
            {t.factorShort[name] ?? t.factorNames[name]}
          </text>
        );
      })}
    </svg>
  );
}

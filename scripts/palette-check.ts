// Checks that the map palette stays distinguishable for colour-blind viewers.
//
// Simulates protanopia, deuteranopia and tritanopia with the Machado, Oliveira & Fernandes (2009)
// matrices at full severity, then measures every pair of feature colours in CIELAB (ΔE*76).
// Pairs below the threshold are hard to tell apart as thin lines on a dark map.
//
//   npx tsx scripts/palette-check.ts
import { KIND_STYLE, TONE } from "../src/featureStyle.ts";

type RGB = [number, number, number];
type Matrix = [RGB, RGB, RGB];

const THRESHOLD = 12;

const DEFICIENCIES: Record<string, Matrix> = {
  protanopia: [[0.152286, 1.052583, -0.204868], [0.114503, 0.786281, 0.099216], [-0.003882, -0.048116, 1.051998]],
  deuteranopia: [[0.367322, 0.860646, -0.227968], [0.280085, 0.672501, 0.047413], [-0.01182, 0.04294, 0.968881]],
  tritanopia: [[1.255528, -0.076749, -0.178779], [-0.078411, 0.930809, 0.147602], [0.004733, 0.691367, 0.3039]],
};

const hex = (h: string): RGB => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255) as RGB;
const toLinear = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const clamp = (c: number) => Math.min(1, Math.max(0, c));

function simulate(rgb: RGB, m: Matrix): RGB {
  const lin = rgb.map(toLinear) as RGB;
  return m.map((row) => clamp(row[0] * lin[0] + row[1] * lin[1] + row[2] * lin[2])) as RGB;
}

/** Linear sRGB to CIELAB (D65). */
function lab([r, g, b]: RGB): RGB {
  const x = (0.4124 * r + 0.3576 * g + 0.1805 * b) / 0.95047;
  const y = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  const z = (0.0193 * r + 0.1192 * g + 0.9505 * b) / 1.08883;
  const f = (t: number) => (t > 216 / 24389 ? Math.cbrt(t) : (24389 / 27 * t + 16) / 116);
  return [116 * f(y) - 16, 500 * (f(x) - f(y)), 200 * (f(y) - f(z))];
}

const deltaE = (a: RGB, b: RGB) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

// Kinds that share a colour on purpose (a metro line and its stations) are one entry.
const swatches = new Map<string, string>();
for (const style of Object.values(KIND_STYLE)) {
  const names = swatches.get(style.color);
  swatches.set(style.color, names ? `${names} / ${style.label}` : style.label);
}
// Compare mode recolours every feature A or B, so the tones are only ever seen against each other.
const groups: [string, string][][] = [[...swatches.entries()], [[TONE.a, "Compare A"], [TONE.b, "Compare B"]]];

let problems = 0;
for (const [name, matrix] of [["normal vision", null] as const, ...Object.entries(DEFICIENCIES)]) {
  const close: string[] = [];
  const toLab = (h: string) => lab(matrix ? simulate(hex(h), matrix) : (hex(h).map(toLinear) as RGB));
  for (const entries of groups) {
    for (let i = 0; i < entries.length; i++) {
      for (let j = i + 1; j < entries.length; j++) {
        const d = deltaE(toLab(entries[i][0]), toLab(entries[j][0]));
        if (d < THRESHOLD) close.push(`  ΔE ${d.toFixed(1).padStart(4)}  ${entries[i][1]}  ↔  ${entries[j][1]}`);
      }
    }
  }
  console.log(`${name}: ${close.length ? `${close.length} pair(s) below ΔE ${THRESHOLD}` : "all pairs distinct"}`);
  close.sort().forEach((line) => console.log(line));
  problems += close.length;
}
process.exitCode = problems ? 1 : 0;

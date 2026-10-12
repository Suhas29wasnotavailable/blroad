import type { MapFeature } from "../shared/schema";
import { KIND_STYLE, TONE, type Tone } from "../featureStyle";

interface Props {
  features: MapFeature[];
  tones?: (Tone | undefined)[];
  built: number;
  buildRun: number;
  visible: boolean;
  onToggle: () => void;
  onReplay: () => void;
  onSpotlight: (i: number) => void;
}

/** The list of map elements in build order, overlaid on the map. */
export default function BuildLog({ features, tones, built, buildRun, visible, onToggle, onReplay, onSpotlight }: Props) {
  const done = Math.min(built, features.length);
  const building = done < features.length;
  return (
    <section className="build-log">
      <header>
        <div>
          <span className="label">{building ? "Building" : "Plan"}</span>
          <strong>{done}<small>/{features.length}</small></strong>
        </div>
        <div className="build-actions">
          <button onClick={onToggle}>{visible ? "Hide" : "Show"}</button>
          <button onClick={onReplay}>Replay</button>
        </div>
      </header>
      <div className="progress"><i style={{ width: `${(done / features.length) * 100}%` }} /></div>
      <ol>
        {features.map((f, i) => {
          const style = KIND_STYLE[f.kind] ?? KIND_STYLE.other;
          const tone = tones?.[i];
          const state = i < built - 1 || (!building && i < built) ? "done" : i === built - 1 ? "active" : "pending";
          return (
            <li key={`${buildRun}-${i}`} className={state}>
              <button onClick={() => onSpotlight(i)}>
                <i style={{ background: tone ? TONE[tone] : style.color }}>{style.glyph}</i>
                <span>{tone && <b>{tone.toUpperCase()}</b>}{f.label}</span>
                <em>{style.label}{f.snapped === false && " · approximate"}</em>
              </button>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

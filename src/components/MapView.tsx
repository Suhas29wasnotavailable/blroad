import { useEffect, useMemo, useRef, type CSSProperties } from "react";
import {
  LayerGroup,
  LayersControl,
  MapContainer,
  Marker,
  Polygon,
  Polyline,
  Popup,
  TileLayer,
  Tooltip,
  ZoomControl,
  useMap,
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import { AREAS, BENGALURU_CENTER, type Area } from "../shared/areas";
import type { MapFeature } from "../shared/schema";
import { KIND_STYLE, SEVERITY_COLOR, TONE, type Tone } from "../featureStyle";

type LatLng = { lat: number; lng: number };

interface Props {
  selectedArea: Area | undefined;
  focus: LatLng | null;
  features: MapFeature[];
  /** Compare mode: which proposal each feature belongs to; overrides its colour. */
  tones?: (Tone | undefined)[];
  showProposal: boolean;
  loading: boolean;
  /** Changes whenever a (re)build should play: new result or "Replay". */
  buildRun: number;
  /** How many features have started construction so far. */
  built: number;
  onBuilt: (n: number) => void;
  /** Index of a feature to fly to, from the construction log. */
  spotlight: number | null;
  onSelectArea: (id: string) => void;
  onFocus: (p: LatLng) => void;
}

const STEP_MS = 750; // gap between one feature starting construction and the next

const esriAttribution = 'Tiles &copy; <a href="https://www.esri.com/">Esri</a>, OpenStreetMap contributors';
const esri = (service: string) => `https://server.arcgisonline.com/ArcGIS/rest/services/${service}/MapServer/tile/{z}/{y}/{x}`;

const focusIcon = L.divIcon({ className: "focus-pin", html: "<div></div>", iconSize: [22, 22], iconAnchor: [11, 11] });

function hotspotIcon(a: Area, selected: boolean) {
  const size = 14 + a.severity * 6;
  return L.divIcon({
    className: "",
    html: `<div class="hotspot sev${a.severity}${selected ? " selected" : ""}" style="--c:${SEVERITY_COLOR[a.severity - 1]};--s:${size}px"><i></i><b></b>${
      selected ? `<span>${a.name}</span>` : ""
    }</div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

function pointIcon(color: string, glyph: string) {
  return L.divIcon({
    className: "",
    html: `<div class="site-pt" style="--c:${color}"><i></i><b>${glyph}</b></div>`,
    iconSize: [26, 26],
    iconAnchor: [13, 13],
  });
}

const surveyIcon = L.divIcon({
  className: "",
  html: '<div class="radar"><i class="ring r1"></i><i class="ring r2"></i><i class="arm"></i><i class="cross"></i><i class="core"></i></div>',
  iconSize: [280, 280],
  iconAnchor: [140, 140],
});

function ClickToFocus({ onFocus }: { onFocus: Props["onFocus"] }) {
  useMapEvents({ click: (e) => onFocus({ lat: e.latlng.lat, lng: e.latlng.lng }) });
  return null;
}

function boundsOf(features: MapFeature[]) {
  return L.latLngBounds(features.flatMap((f) => f.coordinates.map((c) => [c.lat, c.lng] as [number, number])));
}

/** Flies to the proposal, then starts construction one feature at a time. */
function Director({ features, buildRun, onBuilt, selectedArea, spotlight }: Pick<Props, "features" | "buildRun" | "onBuilt" | "selectedArea" | "spotlight">) {
  const map = useMap();

  useEffect(() => {
    if (!features.length) return;
    onBuilt(0);
    let timer: number | undefined;
    let n = 0;
    let started = false;
    const start = () => {
      if (started) return;
      started = true;
      const tick = () => {
        n += 1;
        onBuilt(n);
        if (n < features.length) timer = window.setTimeout(tick, STEP_MS);
      };
      timer = window.setTimeout(tick, 150);
    };
    map.flyToBounds(boundsOf(features).pad(0.25), { duration: 1.1, maxZoom: 16, ...framePadding() });
    map.once("moveend", start);
    // Don't depend on the camera alone: if the fly is skipped or interrupted, build anyway.
    const fallback = window.setTimeout(start, 1600);
    return () => {
      map.off("moveend", start);
      window.clearTimeout(timer);
      window.clearTimeout(fallback);
    };
  }, [features, buildRun, map, onBuilt]);

  useEffect(() => {
    if (selectedArea) map.flyTo([selectedArea.lat, selectedArea.lng], 15, { duration: 0.9 });
  }, [selectedArea, map]);

  useEffect(() => {
    if (spotlight == null || !features[spotlight]) return;
    map.flyToBounds(boundsOf([features[spotlight]]).pad(0.6), { duration: 0.7, maxZoom: 17, ...framePadding() });
  }, [spotlight, features, map]);

  return null;
}

// Keep the proposal clear of the construction log in the bottom-right corner on desktop.
function framePadding(): { paddingTopLeft: [number, number]; paddingBottomRight: [number, number] } {
  const wide = window.innerWidth > 860;
  return { paddingTopLeft: [40, wide ? 60 : 40], paddingBottomRight: [wide ? 330 : 40, 40] };
}

function cumulative(pts: LatLng[]) {
  const d = [0];
  for (let i = 1; i < pts.length; i++) {
    const a = L.latLng(pts[i - 1].lat, pts[i - 1].lng);
    d.push(d[i - 1] + a.distanceTo([pts[i].lat, pts[i].lng]));
  }
  return d;
}

/** The part of a polyline from its start up to fraction t of its length. */
function partial(pts: LatLng[], dist: number[], t: number): L.LatLngExpression[] {
  const target = dist[dist.length - 1] * t;
  const out: L.LatLngExpression[] = [[pts[0].lat, pts[0].lng]];
  for (let i = 1; i < pts.length; i++) {
    if (dist[i] <= target) {
      out.push([pts[i].lat, pts[i].lng]);
      continue;
    }
    const seg = dist[i] - dist[i - 1] || 1;
    const k = (target - dist[i - 1]) / seg;
    out.push([pts[i - 1].lat + (pts[i].lat - pts[i - 1].lat) * k, pts[i - 1].lng + (pts[i].lng - pts[i - 1].lng) * k]);
    break;
  }
  return out;
}

const ease = (t: number) => 1 - Math.pow(1 - t, 3);

function FeaturePopup({ feature, tone }: { feature: MapFeature; tone?: Tone }) {
  const style = KIND_STYLE[feature.kind] ?? KIND_STYLE.other;
  return (
    <Popup>
      <div className="popup">
        <span className="chip" style={{ "--c": tone ? TONE[tone] : style.color } as CSSProperties}>
          {tone && `${tone.toUpperCase()} · `}{style.label}
        </span>
        <strong>{feature.label}</strong>
        <p>{feature.description}</p>
        {feature.snapped === false && (
          <p className="popup-note">Approximate alignment: this line couldn't be matched to the street network, so it's drawn as proposed.</p>
        )}
      </div>
    </Popup>
  );
}

/**
 * A road being built: a faint survey line appears first, then the paved road
 * grows along it with a bright construction head, then traffic starts flowing.
 */
function RoadLine({ feature, tone }: { feature: MapFeature; tone?: Tone }) {
  const style = KIND_STYLE[feature.kind] ?? KIND_STYLE.other;
  const color = tone ? TONE[tone] : style.color;
  // When comparing, A is a wide band and B a thin line, so a road both proposals use shows both colours.
  const weight = tone === "a" ? 10 : tone === "b" ? 3.5 : 5;
  // A line that couldn't be matched to real streets is drawn dashed and dimmer, so it isn't mistaken for a surveyed route.
  const approximate = feature.snapped === false;
  const pts = feature.coordinates;
  const full = useMemo(() => pts.map((c) => [c.lat, c.lng] as [number, number]), [pts]);
  const dist = useMemo(() => cumulative(pts), [pts]);
  const glow = useRef<L.Polyline>(null);
  const core = useRef<L.Polyline>(null);
  const flow = useRef<L.Polyline>(null);
  const head = useRef<L.Marker>(null);

  useEffect(() => {
    const length = dist[dist.length - 1];
    const duration = Math.min(2400, Math.max(1000, length / 2.2));
    const t0 = performance.now();
    let raf = 0;
    flow.current?.setStyle({ opacity: 0 });
    const frame = (now: number) => {
      const t = Math.min(1, (now - t0) / duration);
      const part = partial(pts, dist, ease(t));
      glow.current?.setLatLngs(part);
      core.current?.setLatLngs(part);
      head.current?.setLatLng(part[part.length - 1]);
      if (t < 1) {
        raf = requestAnimationFrame(frame);
      } else {
        head.current?.setOpacity(0);
        flow.current?.setStyle({ opacity: 0.9 });
      }
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [pts, dist]);

  const start: L.LatLngExpression = full[0];
  return (
    <>
      <Polyline positions={full} pathOptions={{ color, weight: 1.5, opacity: 0.5, dashArray: "2 6", className: "survey" }} interactive={false} />
      <Polyline ref={glow} positions={[start, start]} pathOptions={{ color, weight: weight + 7, opacity: 0.18, lineCap: "round", className: "glow" }} interactive={false} />
      <Polyline ref={core} positions={[start, start]} pathOptions={{ color, weight, opacity: approximate ? 0.65 : 1, lineCap: "round", lineJoin: "round", dashArray: approximate ? "2 9" : style.dash }}>
        <Tooltip sticky className="map-tip">{feature.label}</Tooltip>
        <FeaturePopup feature={feature} tone={tone} />
      </Polyline>
      {style.flow && (
        <Polyline
          ref={flow}
          positions={full}
          pathOptions={{ color: "#fff", weight: 2.5, opacity: 0, lineCap: "round", dashArray: "1 16", className: `flow flow-${style.flow}` }}
          interactive={false}
        />
      )}
      <Marker ref={head} position={start} icon={L.divIcon({ className: "", html: `<div class="build-head" style="--c:${color}"></div>`, iconSize: [16, 16], iconAnchor: [8, 8] })} interactive={false} />
    </>
  );
}

function FeatureLayer({ feature, tone }: { feature: MapFeature; tone?: Tone }) {
  const style = KIND_STYLE[feature.kind] ?? KIND_STYLE.other;
  const color = tone ? TONE[tone] : style.color;
  const positions = feature.coordinates.map((c) => [c.lat, c.lng] as [number, number]);
  if (!positions.length) return null;

  if (feature.geometry === "point" || positions.length === 1) {
    return (
      <Marker position={positions[0]} icon={pointIcon(color, style.glyph)}>
        <Tooltip direction="top" offset={[0, -12]} className="map-tip">{feature.label}</Tooltip>
        <FeaturePopup feature={feature} tone={tone} />
      </Marker>
    );
  }
  if (feature.geometry === "polygon") {
    return (
      <Polygon positions={positions} pathOptions={{ color: color, weight: 2, fillColor: color, fillOpacity: 0.22, dashArray: style.dash, className: "zone" }}>
        <Tooltip sticky className="map-tip">{feature.label}</Tooltip>
        <FeaturePopup feature={feature} tone={tone} />
      </Polygon>
    );
  }
  return <RoadLine feature={feature} tone={tone} />;
}

export default function MapView(props: Props) {
  const { selectedArea, focus, features, tones, showProposal, loading, buildRun, built, onBuilt, spotlight, onSelectArea, onFocus } = props;
  const scanAt = focus ?? (selectedArea ? { lat: selectedArea.lat, lng: selectedArea.lng } : BENGALURU_CENTER);

  return (
    <MapContainer
      center={[BENGALURU_CENTER.lat, BENGALURU_CENTER.lng]}
      zoom={12}
      className={`map${loading ? " is-loading" : ""}`}
      zoomControl={false}
      // Without fading, Leaflet drops the previous zoom level's tiles as soon as new ones
      // load, so the transparent labels layer never shows two zoom levels at once.
      fadeAnimation={false}
    >
      <ZoomControl position="bottomright" />
      <LayersControl position="topright">
        <LayersControl.BaseLayer checked name="Night">
          <LayerGroup>
            <TileLayer attribution={esriAttribution} url={esri("Canvas/World_Dark_Gray_Base")} maxNativeZoom={16} maxZoom={19} />
            <TileLayer url={esri("Canvas/World_Dark_Gray_Reference")} maxNativeZoom={16} maxZoom={19} />
          </LayerGroup>
        </LayersControl.BaseLayer>
        <LayersControl.BaseLayer name="Satellite">
          <TileLayer attribution={esriAttribution} url={esri("World_Imagery")} maxNativeZoom={18} maxZoom={19} className="sat" />
        </LayersControl.BaseLayer>
        <LayersControl.BaseLayer name="Streets">
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
            maxZoom={19}
          />
        </LayersControl.BaseLayer>
      </LayersControl>

      <ClickToFocus onFocus={onFocus} />
      <Director features={features} buildRun={buildRun} onBuilt={onBuilt} selectedArea={selectedArea} spotlight={spotlight} />

      {AREAS.map((a) => (
        <Marker
          key={a.id}
          position={[a.lat, a.lng]}
          icon={hotspotIcon(a, a.id === selectedArea?.id)}
          zIndexOffset={a.id === selectedArea?.id ? 500 : 0}
          eventHandlers={{ click: (e) => { L.DomEvent.stopPropagation(e); onSelectArea(a.id); } }}
        >
          {a.id !== selectedArea?.id && <Tooltip direction="top" offset={[0, -10]} className="map-tip">{a.name}</Tooltip>}
        </Marker>
      ))}

      {focus && <Marker position={[focus.lat, focus.lng]} icon={focusIcon} />}
      {loading && <Marker position={[scanAt.lat, scanAt.lng]} icon={surveyIcon} interactive={false} />}

      {showProposal && !loading && features.slice(0, built).map((f, i) => <FeatureLayer key={`${buildRun}-${i}`} feature={f} tone={tones?.[i]} />)}
    </MapContainer>
  );
}

import { useId } from "react";

export type Body = "Hatchback" | "Sedan" | "SUV";
export type Trim = { tier: number; tiers: number; fuel: string; transmission: string };

type Shape = {
  tail: number;
  nose: number;
  wheels: [number, number];
  wheelR: number;
  archR: number;
  sill: number;
  belt: number;
  roof: number;
  upper: string;
  glass: string;
  seams: number[];
  rails: string;
  spoiler: string;
  mirror: [number, number];
};

const GROUND = 180;
const CX = 245;
const DEFAULT_TRIM: Trim = { tier: 1, tiers: 3, fuel: "Petrol", transmission: "Manual" };

const SHAPES: Record<Body, Shape> = {
  SUV: {
    tail: 30, nose: 459, wheels: [110, 371], wheelR: 34, archR: 42, sill: 161, belt: 74, roof: 17,
    upper: "L30 108 L34 80 L58 26 Q62 17 74 17 L318 17 Q330 17 338 26 L386 76 L430 84 Q455 88 459 108",
    glass: "M62 32 L182 32 L182 72 L42 72 Z M200 32 L314 32 Q324 32 330 39 L366 72 L200 72 Z",
    seams: [191, 300],
    rails: "M84 13 L310 13",
    spoiler: "M46 40 L68 21 L82 21 L58 42 Z",
    mirror: [352, 74],
  },
  Sedan: {
    tail: 20, nose: 470, wheels: [110, 375], wheelR: 31, archR: 39, sill: 162, belt: 90, roof: 35,
    upper: "L20 120 Q20 104 32 102 L118 92 L152 44 Q158 35 176 35 L276 35 Q290 35 300 44 L350 88 L430 98 Q468 104 470 124",
    glass: "M124 88 L154 47 Q158 42 168 42 L200 42 L200 88 Z M208 42 L274 42 Q284 42 291 49 L326 88 L208 88 Z",
    seams: [204, 312],
    rails: "M170 32 L280 32",
    spoiler: "M22 103 L70 96 L72 100 L24 108 Z",
    mirror: [322, 90],
  },
  Hatchback: {
    tail: 50, nose: 441, wheels: [125, 370], wheelR: 31, archR: 39, sill: 162, belt: 80, roof: 25,
    upper: "L50 118 Q50 104 54 94 L72 36 Q75 25 88 25 L290 25 Q304 25 312 34 L352 84 L412 92 Q440 96 441 116",
    glass: "M80 36 L186 36 L186 76 L62 76 Z M196 36 L286 36 Q296 36 302 43 L332 76 L196 76 Z",
    seams: [191, 292],
    rails: "M92 21 L284 21",
    spoiler: "M56 42 L78 24 L92 25 L68 46 Z",
    mirror: [322, 80],
  },
};

export function trimSpec(trim: Trim, body: Body) {
  const f = trim.tiers > 1 ? trim.tier / (trim.tiers - 1) : 0.5;
  return {
    scale: 0.92 + f * 0.1,
    rails: body === "SUV" ? f >= 0.34 : f >= 0.67,
    spoiler: body !== "SUV" && f >= 0.67,
    chrome: f >= 0.34,
    led: f >= 0.5,
    ev: trim.fuel === "Electric",
    cng: trim.fuel === "CNG",
    wheel: trim.fuel === "Electric" ? "aero" : f < 0.34 ? "steel" : f < 0.67 ? "alloy5" : "alloy10",
  } as const;
}

function outline(s: Shape) {
  const [r, f] = s.wheels;
  const cy = GROUND - s.wheelR;
  const dx = Math.sqrt(s.archR ** 2 - (s.sill - cy) ** 2);
  const arc = `A${s.archR} ${s.archR} 0 1 0`;
  return [
    `M${s.tail + 12} ${s.sill} Q${s.tail} ${s.sill} ${s.tail} ${s.sill - 12}`,
    s.upper,
    `L${s.nose} ${s.sill - 12} Q${s.nose} ${s.sill} ${s.nose - 12} ${s.sill}`,
    `L${f + dx} ${s.sill} ${arc} ${f - dx} ${s.sill}`,
    `L${r + dx} ${s.sill} ${arc} ${r - dx} ${s.sill}`,
    "Z",
  ].join(" ");
}

const fade = (on: boolean): React.CSSProperties => ({ opacity: on ? 1 : 0, transition: "opacity .5s ease" });

function Wheel({ x, cy, r, style }: { x: number; cy: number; r: number; style: string }) {
  const show = (name: string) => fade(style === name);
  return (
    <g>
      <circle cx={x} cy={cy} r={r} fill="#101215" />
      <circle cx={x} cy={cy} r={r * 0.88} fill="none" stroke="#2a2d32" strokeWidth="1.4" />
      <circle cx={x} cy={cy} r={r * 0.68} fill="#d6d9de" />
      <circle cx={x} cy={cy} r={r * 0.5} fill="#9aa0a8" opacity="0.5" />

      <g style={show("steel")}>
        <circle cx={x} cy={cy} r={r * 0.68} fill="#aeb3ba" />
        <circle cx={x} cy={cy} r={r * 0.3} fill="#7b8088" />
        {[0, 72, 144, 216, 288].map((a) => <circle key={a} cx={x} cy={cy - r * 0.46} r="1.6" fill="#4a4e55" transform={`rotate(${a} ${x} ${cy})`} />)}
      </g>
      <g style={show("alloy5")}>
        {[0, 72, 144, 216, 288].map((a) => <rect key={a} x={x - 2.8} y={cy - r * 0.66} width="5.6" height={r * 0.46} rx="2.6" fill="#7d838b" transform={`rotate(${a} ${x} ${cy})`} />)}
      </g>
      <g style={show("alloy10")}>
        <circle cx={x} cy={cy} r={r * 0.68} fill="#2c3036" />
        {Array.from({ length: 10 }, (_, i) => i * 36).map((a) => <rect key={a} x={x - 1.7} y={cy - r * 0.66} width="3.4" height={r * 0.46} rx="1.6" fill="#e3e6ea" transform={`rotate(${a} ${x} ${cy})`} />)}
        <circle cx={x} cy={cy} r={r * 0.68} fill="none" stroke="#e3e6ea" strokeWidth="1" />
      </g>
      <g style={show("aero")}>
        <circle cx={x} cy={cy} r={r * 0.68} fill="#e8eaee" />
        <circle cx={x} cy={cy} r={r * 0.56} fill="none" stroke="#b4bac2" strokeWidth="2" />
        <circle cx={x} cy={cy} r={r * 0.4} fill="none" stroke="#c7ccd3" strokeWidth="1.2" />
        <circle cx={x} cy={cy} r={r * 0.16} fill="#1d8fa0" />
      </g>
      <circle cx={x} cy={cy} r={r * 0.12} fill="#101215" opacity="0.8" />
    </g>
  );
}

type Props = {
  body: Body;
  colour: string;
  fromColour?: string;
  animKey?: number;
  trim?: Trim;
  reflection?: boolean;
  className?: string;
};

export function CarArt({ body, colour, fromColour, animKey = 0, trim = DEFAULT_TRIM, reflection = false, className }: Props) {
  const uid = useId().replace(/:/g, "");
  const s = SHAPES[body];
  const t = trimSpec(trim, body);
  const path = outline(s);
  const cy = GROUND - s.wheelR;
  const baseColour = fromColour ?? colour;
  const animating = !!fromColour && fromColour !== colour;
  const bandEdges = [s.roof - 6, s.belt - 4, s.belt + (s.sill - s.belt) * 0.42, s.sill - 14, GROUND + 4];
  const layerDelays = [0, 0.14, 0.28, 0.42];

  const paint = (c: string) => (
    <g>
      <path d={path} fill={c} />
      <g clipPath={`url(#c${uid})`}>
        <rect x="0" y={s.sill - 16} width="490" height="20" fill="#000" opacity="0.3" />
        <path d={path} fill={`url(#b${uid})`} />
        <rect x="0" y={s.belt - 8} width="490" height="14" fill={`url(#sp${uid})`} />
      </g>
    </g>
  );

  const car = (isReflection: boolean) => (
    <g style={{ transform: `scale(${t.scale})`, transformOrigin: `${CX}px ${GROUND}px`, transition: "transform .8s cubic-bezier(.2,.8,.2,1)" }}>
      <ellipse cx={(s.tail + s.nose) / 2} cy={GROUND - 1} rx={(s.nose - s.tail) / 2 + 6} ry="6" fill="#000" opacity="0.22" />
      {s.wheels.map((x) => <circle key={`w${x}`} cx={x} cy={cy} r={s.archR - 1} fill="#08090b" />)}

      {paint(baseColour)}
      {animating && !isReflection && (
        <g key={animKey}>
          {bandEdges.slice(0, 4).map((y, i) => (
            <g key={i} clipPath={`url(#band${i}${uid})`}>
              <g className="paint-sweep" style={{ animationDelay: `${layerDelays[i]}s` }}>{paint(colour)}</g>
            </g>
          ))}
        </g>
      )}
      {isReflection && animating && paint(colour)}

      <g style={fade(t.ev)}>
        <rect x={s.tail + 30} y={s.sill - 5} width={s.nose - s.tail - 60} height="2.2" rx="1.1" fill="#35c3d8" opacity="0.9" />
        <rect x={s.wheels[1] + 52} y={s.belt + 6} width="9" height="7" rx="2" fill="#1d8fa0" />
      </g>

      <path d={s.glass} fill={`url(#g${uid})`} />
      <path d={s.glass} fill="#fff" opacity="0.07" transform="translate(7 -2)" />
      <path d={s.glass} fill="none" stroke="#d8dce1" strokeWidth="1.6" style={fade(t.chrome)} />
      <path d={s.rails} stroke="#16181b" strokeWidth="3.5" strokeLinecap="round" style={{ opacity: t.rails ? 0.78 : 0, transition: "opacity .5s ease" }} />
      <path d={s.spoiler} fill="#15171a" style={{ opacity: t.spoiler ? 0.92 : 0, transition: "opacity .5s ease" }} />

      <g clipPath={`url(#c${uid})`}>
        <path d={`M${s.tail + 6} ${s.belt} L${s.nose - 6} ${s.belt + 6}`} stroke="#000" strokeOpacity="0.18" strokeWidth="1.5" fill="none" />
        {s.seams.map((x) => <path key={x} d={`M${x} ${s.belt + 2} L${x} ${s.sill - 10}`} stroke="#000" strokeOpacity="0.2" strokeWidth="1.2" />)}
        <path d={`M${s.tail + 14} ${s.sill - 9} L${s.nose - 14} ${s.sill - 9}`} stroke="#d8dce1" strokeWidth="1.6" style={fade(t.chrome)} />
      </g>

      <path d={`M${s.nose - 30} ${s.belt + 14} L${s.nose - 3} ${s.belt + 24} L${s.nose - 3} ${s.belt + 32} L${s.nose - 34} ${s.belt + 26} Z`} fill="#fff" opacity="0.95" />
      <path d={`M${s.nose - 34} ${s.belt + 12} L${s.nose - 6} ${s.belt + 21}`} stroke="#9fe9f5" strokeWidth="2.2" strokeLinecap="round" style={fade(t.led)} />
      <rect x={s.tail + 1} y={s.belt + 14} width="8" height="18" rx="3" fill="#c0392b" opacity="0.92" />
      <rect x={s.tail + 1} y={s.belt + 20} width="14" height="3" rx="1.5" fill="#ff6a5a" style={fade(t.led)} />
      <rect x={s.seams[0] + 6} y={s.belt + 10} width="14" height="3.5" rx="1.75" fill="#000" opacity="0.3" />
      <rect x={s.seams[1] + 6} y={s.belt + 10} width="14" height="3.5" rx="1.75" fill="#000" opacity="0.3" />
      <path d={`M${s.mirror[0]} ${s.mirror[1]} q8 -2 14 2 q-2 7 -12 6 z`} fill={baseColour} stroke="#000" strokeOpacity="0.25" strokeWidth="1" />
      <text x={s.wheels[0] + 52} y={s.belt + 30} fontSize="9" fontWeight="700" fill="#fff" opacity={t.cng ? 0.85 : 0} style={{ transition: "opacity .5s ease" }}>CNG</text>

      {s.wheels.map((x) => <Wheel key={x} x={x} cy={cy} r={s.wheelR} style={t.wheel} />)}
    </g>
  );

  return (
    <svg viewBox={`8 6 474 ${reflection ? 236 : 184}`} role="img" aria-label={`${body} in ${colour}`} className={className}>
      <defs>
        <linearGradient id={`b${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0.4" />
          <stop offset="0.35" stopColor="#fff" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity="0.32" />
        </linearGradient>
        <linearGradient id={`sp${uid}`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#fff" stopOpacity="0" />
          <stop offset="0.45" stopColor="#fff" stopOpacity="0.38" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <linearGradient id={`g${uid}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#3b434c" />
          <stop offset="1" stopColor="#0e1217" />
        </linearGradient>
        <linearGradient id={`fl${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0.9" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <mask id={`m${uid}`}><rect x="0" y={GROUND} width="490" height="58" fill={`url(#fl${uid})`} /></mask>
        <linearGradient id={`scan${uid}`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#7fe7ff" stopOpacity="0" />
          <stop offset="0.85" stopColor="#7fe7ff" stopOpacity="0.55" />
          <stop offset="1" stopColor="#fff" stopOpacity="1" />
        </linearGradient>
        <clipPath id={`c${uid}`}><path d={path} /></clipPath>
        {bandEdges.slice(0, 4).map((y, i) => (
          <clipPath key={i} id={`band${i}${uid}`}><rect x="0" y={y} width="490" height={bandEdges[i + 1] - y} /></clipPath>
        ))}
      </defs>

      {reflection && (
        <g mask={`url(#m${uid})`}>
          <g transform={`translate(0 ${GROUND * 2}) scale(1 -1)`} opacity="0.22">{car(true)}</g>
        </g>
      )}
      {car(false)}

      {animating && (
        <g key={`fx${animKey}`} style={{ transform: `scale(${t.scale})`, transformOrigin: `${CX}px ${GROUND}px` }}>
          <path d={path} pathLength="1" fill="none" stroke="#7fe7ff" strokeWidth="1.6" className="wire" />
          <g className="scan-line">
            <rect x="-26" y={s.roof - 12} width="26" height={GROUND - s.roof + 20} fill={`url(#scan${uid})`} />
          </g>
        </g>
      )}
    </svg>
  );
}

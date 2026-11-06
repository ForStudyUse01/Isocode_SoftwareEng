import { useId } from "react";

type Body = "Hatchback" | "Sedan" | "SUV";

type Shape = {
  tail: number;
  nose: number;
  wheels: [number, number];
  wheelR: number;
  archR: number;
  sill: number;
  belt: number;
  upper: string;
  glass: string;
  seams: number[];
  rails?: string;
};

const GROUND = 180;

// Wheel centre sits above the sill, as on a real car; arches are cut out of the body outline.
const SHAPES: Record<Body, Shape> = {
  SUV: {
    tail: 30, nose: 459, wheels: [110, 371], wheelR: 34, archR: 42, sill: 161, belt: 74,
    upper: "L30 108 L34 80 L58 26 Q62 17 74 17 L318 17 Q330 17 338 26 L386 76 L430 84 Q455 88 459 108",
    glass: "M62 32 L182 32 L182 72 L42 72 Z M200 32 L314 32 Q324 32 330 39 L366 72 L200 72 Z",
    seams: [191, 300],
    rails: "M84 13 L310 13",
  },
  Sedan: {
    tail: 20, nose: 470, wheels: [110, 375], wheelR: 31, archR: 39, sill: 162, belt: 90,
    upper: "L20 120 Q20 104 32 102 L118 92 L152 44 Q158 35 176 35 L276 35 Q290 35 300 44 L350 88 L430 98 Q468 104 470 124",
    glass: "M124 88 L154 47 Q158 42 168 42 L200 42 L200 88 Z M208 42 L274 42 Q284 42 291 49 L326 88 L208 88 Z",
    seams: [204, 312],
  },
  Hatchback: {
    tail: 50, nose: 441, wheels: [125, 370], wheelR: 31, archR: 39, sill: 162, belt: 80,
    upper: "L50 118 Q50 104 54 94 L72 36 Q75 25 88 25 L290 25 Q304 25 312 34 L352 84 L412 92 Q440 96 441 116",
    glass: "M80 36 L186 36 L186 76 L62 76 Z M196 36 L286 36 Q296 36 302 43 L332 76 L196 76 Z",
    seams: [191, 292],
  },
};

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

export function CarArt({ body, colour, className }: { body: Body; colour: string; className?: string }) {
  const uid = useId().replace(/:/g, "");
  const s = SHAPES[body];
  const path = outline(s);
  const cy = GROUND - s.wheelR;

  return (
    <svg viewBox="0 6 490 184" role="img" aria-label={`${body} in ${colour}`} className={className}>
      <defs>
        <linearGradient id={`b${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0.4" />
          <stop offset="0.35" stopColor="#fff" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity="0.32" />
        </linearGradient>
        <linearGradient id={`g${uid}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#3b434c" />
          <stop offset="1" stopColor="#0e1217" />
        </linearGradient>
        <clipPath id={`c${uid}`}><path d={path} /></clipPath>
      </defs>

      <ellipse cx={(s.tail + s.nose) / 2} cy={GROUND - 1} rx={(s.nose - s.tail) / 2 + 4} ry="6" fill="#000" opacity="0.18" />

      {s.wheels.map((x) => <circle key={`w${x}`} cx={x} cy={cy} r={s.archR - 1} fill="#0a0c0f" />)}

      <path d={path} fill={colour} />
      <g clipPath={`url(#c${uid})`}>
        <rect x="0" y={s.sill - 16} width="490" height="20" fill="#000" opacity="0.3" />
        <path d={path} fill={`url(#b${uid})`} />
        <path d={`M${s.tail + 6} ${s.belt} L${s.nose - 6} ${s.belt + 6}`} stroke="#000" strokeOpacity="0.18" strokeWidth="1.5" fill="none" />
        {s.seams.map((x) => <path key={x} d={`M${x} ${s.belt + 2} L${x} ${s.sill - 10}`} stroke="#000" strokeOpacity="0.2" strokeWidth="1.2" />)}
      </g>

      <path d={s.glass} fill={`url(#g${uid})`} />
      <path d={s.glass} fill="#fff" opacity="0.07" transform="translate(7 -2)" />
      {s.rails && <path d={s.rails} stroke="#16181b" strokeWidth="3.5" strokeLinecap="round" opacity="0.75" />}

      <path d={`M${s.nose - 30} ${s.belt + 14} L${s.nose - 3} ${s.belt + 24} L${s.nose - 3} ${s.belt + 32} L${s.nose - 34} ${s.belt + 26} Z`} fill="#fff" opacity="0.95" />
      <rect x={s.tail + 1} y={s.belt + 14} width="8" height="18" rx="3" fill="#c0392b" opacity="0.92" />
      <rect x={s.seams[0] + 6} y={s.belt + 10} width="14" height="3.5" rx="1.75" fill="#000" opacity="0.3" />
      <rect x={s.seams[1] + 6} y={s.belt + 10} width="14" height="3.5" rx="1.75" fill="#000" opacity="0.3" />

      {s.wheels.map((x) => (
        <g key={x}>
          <circle cx={x} cy={cy} r={s.wheelR} fill="#14161a" />
          <circle cx={x} cy={cy} r={s.wheelR * 0.68} fill="#d3d6db" />
          {[0, 72, 144, 216, 288].map((a) => (
            <rect key={a} x={x - 2.2} y={cy - s.wheelR * 0.64} width="4.4" height={s.wheelR * 0.42} rx="2" fill="#7d838b" transform={`rotate(${a} ${x} ${cy})`} />
          ))}
          <circle cx={x} cy={cy} r={s.wheelR * 0.2} fill="#14161a" />
        </g>
      ))}
    </svg>
  );
}

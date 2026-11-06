import { useId } from "react";

type Body = "Hatchback" | "Sedan" | "SUV";

const SHAPES: Record<Body, { body: string; glass: string; wheels: [number, number]; r: number; base: number }> = {
  Hatchback: {
    body: "M18 118 C18 102 30 96 54 93 L96 68 C110 58 128 54 150 54 L240 54 C262 54 276 62 290 76 L312 94 C346 97 374 102 382 116 L382 128 L18 128 Z",
    glass: "M104 72 L142 59 L186 59 L186 90 L90 90 Z M194 59 L238 59 C252 59 262 66 272 76 L284 90 L194 90 Z",
    wheels: [96, 304],
    r: 22,
    base: 128,
  },
  Sedan: {
    body: "M12 118 C12 104 24 98 48 96 L92 72 C106 60 126 56 152 56 L232 56 C256 56 270 64 284 76 L300 92 L346 98 C372 102 388 108 390 118 L390 130 L12 130 Z",
    glass: "M100 75 L140 62 L184 62 L184 92 L88 92 Z M192 62 L230 62 C244 62 254 68 264 78 L276 92 L192 92 Z",
    wheels: [92, 312],
    r: 22,
    base: 130,
  },
  SUV: {
    body: "M14 112 C14 96 26 90 48 88 L80 58 C92 48 108 44 132 44 L282 44 C302 44 316 52 326 66 L346 90 C368 94 384 100 386 112 L386 132 L14 132 Z",
    glass: "M92 62 L124 52 L186 52 L186 88 L78 88 Z M194 52 L280 52 C292 52 300 58 308 68 L322 88 L194 88 Z",
    wheels: [94, 306],
    r: 26,
    base: 132,
  },
};

export function CarArt({ body, colour, className }: { body: Body; colour: string; className?: string }) {
  const uid = useId().replace(/:/g, "");
  const s = SHAPES[body];
  return (
    <svg viewBox="0 0 400 160" role="img" aria-label={`${body} in ${colour}`} className={className}>
      <defs>
        <linearGradient id={`b${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0.38" />
          <stop offset="0.45" stopColor="#fff" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity="0.28" />
        </linearGradient>
        <linearGradient id={`g${uid}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#2b3138" />
          <stop offset="1" stopColor="#10141a" />
        </linearGradient>
      </defs>
      <ellipse cx="200" cy={s.base + s.r * 0.55} rx="176" ry="8" fill="#000" opacity="0.14" />
      <path d={s.body} fill={colour} />
      <path d={s.body} fill={`url(#b${uid})`} />
      <path d={s.glass} fill={`url(#g${uid})`} />
      <path d={`M60 ${s.base - 18} L350 ${s.base - 18}`} stroke="#000" strokeOpacity="0.12" strokeWidth="1.5" />
      <rect x="360" y={s.base - 28} width="20" height="6" rx="3" fill="#fff" opacity="0.85" />
      <rect x="18" y={s.base - 30} width="14" height="6" rx="3" fill="#b42318" opacity="0.8" />
      {s.wheels.map((cx) => (
        <g key={cx}>
          <circle cx={cx} cy={s.base} r={s.r + 4} fill="#fff" />
          <circle cx={cx} cy={s.base} r={s.r} fill="#17191c" />
          <circle cx={cx} cy={s.base} r={s.r * 0.58} fill="#c9ccd0" />
          <circle cx={cx} cy={s.base} r={s.r * 0.2} fill="#17191c" />
        </g>
      ))}
    </svg>
  );
}

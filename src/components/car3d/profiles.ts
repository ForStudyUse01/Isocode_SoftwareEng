export type Body = "Hatchback" | "Sedan" | "SUV";

export type Profile = {
  L: number;
  W: number;
  sill: number;
  belt: number;
  clad: number;
  wheelR: number;
  tireW: number;
  wheelbase: number;
  rearOver: number;
  top: [number, number][];
  r0: number;
  r1: number;
  f0: number;
  f1: number;
  pillarB: number;
  doors: number[];
  rails: [number, number];
  height: number;
};

// u runs 0 (tail) to 1 (nose). y is height above the ground in metres.
export const PROFILES: Record<Body, Profile> = {
  SUV: {
    L: 4.3, W: 1.8, sill: 0.2, belt: 0.98, clad: 0.17, wheelR: 0.37, tireW: 0.23, wheelbase: 2.6, rearOver: 0.85,
    top: [[0, 0.96], [0.03, 1.1], [0.1, 1.5], [0.17, 1.6], [0.56, 1.6], [0.63, 1.55], [0.78, 1.08], [0.85, 1.02], [0.94, 0.98], [1, 0.82]],
    r0: 0.03, r1: 0.17, f0: 0.56, f1: 0.78, pillarB: 0.4, doors: [0.27, 0.4, 0.55], rails: [0.2, 0.55], height: 1.6,
  },
  Sedan: {
    L: 4.5, W: 1.82, sill: 0.18, belt: 0.95, clad: 0.17, wheelR: 0.33, tireW: 0.22, wheelbase: 2.65, rearOver: 0.95,
    top: [[0, 0.9], [0.06, 0.95], [0.2, 0.99], [0.27, 1.1], [0.36, 1.42], [0.4, 1.45], [0.6, 1.45], [0.66, 1.4], [0.77, 1.04], [0.84, 1.0], [0.95, 0.94], [1, 0.8]],
    r0: 0.22, r1: 0.37, f0: 0.62, f1: 0.77, pillarB: 0.5, doors: [0.34, 0.5, 0.64], rails: [0.4, 0.6], height: 1.45,
  },
  Hatchback: {
    L: 3.9, W: 1.72, sill: 0.19, belt: 0.92, clad: 0.2, wheelR: 0.31, tireW: 0.2, wheelbase: 2.45, rearOver: 0.75,
    top: [[0, 0.92], [0.03, 1.02], [0.1, 1.28], [0.19, 1.47], [0.23, 1.5], [0.58, 1.5], [0.64, 1.46], [0.75, 1.03], [0.83, 0.97], [0.95, 0.91], [1, 0.77]],
    r0: 0.03, r1: 0.2, f0: 0.58, f1: 0.75, pillarB: 0.42, doors: [0.3, 0.45, 0.58], rails: [0.23, 0.56], height: 1.5,
  },
};

export function sampleTop(points: [number, number][], u: number): number {
  const n = points.length;
  if (u <= points[0][0]) return points[0][1];
  if (u >= points[n - 1][0]) return points[n - 1][1];
  let i = 0;
  while (u > points[i + 1][0]) i++;
  const tangent = (k: number) => {
    const a = points[Math.max(0, k - 1)];
    const b = points[Math.min(n - 1, k + 1)];
    return (b[1] - a[1]) / (b[0] - a[0]);
  };
  const [x0, y0] = points[i];
  const [x1, y1] = points[i + 1];
  const h = x1 - x0;
  const t = (u - x0) / h;
  const t2 = t * t;
  const t3 = t2 * t;
  return (2 * t3 - 3 * t2 + 1) * y0 + (t3 - 2 * t2 + t) * h * tangent(i) + (-2 * t3 + 3 * t2) * y1 + (t3 - t2) * h * tangent(i + 1);
}

export function plan(u: number): number {
  const t = Math.max(0, Math.min(u / 0.06, (1 - u) / 0.085, 1));
  return Math.pow(1 - Math.pow(1 - t, 4), 0.25);
}

export const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

export const cabinWeight = (p: Profile, u: number) => smooth(p.r0 - 0.02, p.r0 + 0.05, u) * (1 - smooth(p.f1 - 0.02, p.f1 + 0.04, u));

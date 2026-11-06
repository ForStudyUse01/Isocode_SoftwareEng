import * as THREE from "three";
import { PROFILES, cabinWeight, plan, sampleTop, smooth, type Body, type Profile } from "./profiles";

export type TrimSpec = {
  scale: number;
  rails: boolean;
  spoiler: boolean;
  chrome: boolean;
  led: boolean;
  ev: boolean;
  wheel: "steel" | "alloy5" | "alloy10" | "aero";
};

export type PaintUniforms = {
  uFrom: { value: THREE.Color };
  uTo: { value: THREE.Color };
  uProg: { value: number };
  uBox: { value: THREE.Vector4 };
  uGlow: { value: THREE.Color };
};

export type CarModel = {
  root: THREE.Group;
  bounds: { x0: number; x1: number; y0: number; y1: number };
  paintUniforms: PaintUniforms;
  setTrim: (t: TrimSpec) => void;
  snap: (t: TrimSpec) => void;
  tick: (dt: number) => void;
  dispose: () => void;
};

const WHEEL_STYLES = ["steel", "alloy5", "alloy10", "aero"] as const;
const STATIONS = 160;
const TRIM = 0;
const PAINT = 1;
const WINDOW = 2;
const TOP = 3;

function patchPaint(material: THREE.MeshPhysicalMaterial, u: PaintUniforms) {
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, u);
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nvarying vec3 vWPos;")
      .replace("#include <begin_vertex>", "#include <begin_vertex>\nvWPos = (modelMatrix * vec4(transformed, 1.0)).xyz;");
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        "#include <common>\nvarying vec3 vWPos;\nuniform vec3 uFrom;\nuniform vec3 uTo;\nuniform float uProg;\nuniform vec4 uBox;\nuniform vec3 uGlow;",
      )
      .replace(
        "#include <color_fragment>",
        `#include <color_fragment>
vec3 scanGlow = vec3(0.0);
if (uProg < 1.0) {
  float yn = clamp((vWPos.y - uBox.z) / (uBox.w - uBox.z), 0.0, 1.0);
  float band = floor((1.0 - yn) * 3.999);
  float front = (vWPos.x - uBox.x) / (uBox.y - uBox.x);
  float p = uProg * 1.62 - band * 0.18;
  float m = smoothstep(front, front + 0.04, p);
  diffuseColor.rgb = mix(uFrom, uTo, m);
  float edge = exp(-pow((p - front - 0.02) * 20.0, 2.0)) * step(0.001, p);
  float rows = 0.6 + 0.4 * step(0.5, fract(vWPos.y * 26.0));
  scanGlow = uGlow * edge * rows * 2.4;
} else {
  diffuseColor.rgb = uTo;
}`,
      )
      .replace("#include <emissivemap_fragment>", "#include <emissivemap_fragment>\ntotalEmissiveRadiance += scanGlow;");
  };
  material.customProgramCacheKey = () => "brandx-paint";
}

type Pt = [number, number];

// One round of corner cutting. Each new segment keeps the material zone of the segment it came from.
function chaikin(pts: Pt[], zones: number[]) {
  const out: Pt[] = [pts[0]];
  const oz: number[] = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i];
    const b = pts[i + 1];
    oz.push(i === 0 ? zones[0] : zones[i - 1]);
    out.push([a[0] * 0.75 + b[0] * 0.25, a[1] * 0.75 + b[1] * 0.25]);
    oz.push(zones[i]);
    out.push([a[0] * 0.25 + b[0] * 0.75, a[1] * 0.25 + b[1] * 0.75]);
  }
  oz.push(zones[zones.length - 1]);
  out.push(pts[pts.length - 1]);
  return { pts: out, zones: oz };
}

const BASE_ZONES = [TRIM, TRIM, TRIM, PAINT, PAINT, WINDOW, PAINT, TOP, TOP];

function halfWidth(p: Profile, u: number, wheelUs: number[]) {
  const flare = wheelUs.reduce((sum, wu) => sum + Math.exp(-(((u - wu) / 0.07) ** 2)), 0);
  return plan(u) * p.W * 0.5 * (1 + 0.016 * Math.min(1, flare));
}

function buildBody(p: Profile, wheelUs: number[], mats: { paint: THREE.Material; glass: THREE.Material; trim: THREE.Material }) {
  const pos: number[] = [];
  const index: number[][] = [[], [], []];
  let ringLen = 0;
  let ringZones: number[] = [];

  for (let i = 0; i <= STATIONS; i++) {
    const u = 0.5 - 0.5 * Math.cos((Math.PI * i) / STATIONS);
    const x = (u - 0.5) * p.L;
    const wl = halfWidth(p, u, wheelUs);
    const y2 = sampleTop(p.top, u);
    const y1 = Math.min(p.belt, y2 - 0.05);
    const rise = 0.11 * (1 - smooth(0, 0.09, Math.min(u, 1 - u)));
    const y0 = p.sill + rise;
    const c = cabinWeight(p, u);
    const wTop = wl * (0.92 - 0.2 * c);
    const crown = 0.02 + 0.03 * c;
    const clad = Math.min(p.clad, (y1 - y0) * 0.5);
    const yWin = Math.max(y1 + 0.01, y2 - 0.1);
    const wMid = wl * 0.99 + (wTop - wl * 0.99) * 0.55;
    const base: Pt[] = [
      [0, y0], [wl * 0.84, y0], [wl * 0.95, y0 + 0.09], [wl, y0 + clad], [wl * 1.012, (y0 + clad + y1) / 2],
      [wl * 1.0, y1], [wMid, yWin], [wTop, y2 - 0.04], [wTop * 0.6, y2 + crown * 0.6], [0, y2 + crown],
    ];
    const half = chaikin(base, BASE_ZONES);
    const n = half.pts.length;

    const ring: Pt[] = half.pts.map(([z, y]) => [z, y]);
    for (let k = n - 2; k >= 1; k--) ring.push([-half.pts[k][0], half.pts[k][1]]);
    for (const [z, y] of ring) pos.push(x, y, z);

    if (i === 0) {
      ringLen = ring.length;
      ringZones = [];
      for (let j = 0; j <= n - 2; j++) ringZones.push(half.zones[j]);
      ringZones.push(half.zones[n - 2]);
      for (let t = 0; t <= n - 4; t++) ringZones.push(half.zones[n - 3 - t]);
      ringZones.push(half.zones[0]);
    }
  }

  const zoneMaterial = (zone: number, u: number, glassH: number) => {
    if (zone === TRIM) return 2;
    if (zone === PAINT) return 0;
    if (zone === WINDOW) {
      const inside = u >= p.r0 + 0.006 && u <= p.f1 - 0.004 && Math.abs(u - p.pillarB) > 0.014;
      return inside && glassH > 0.16 ? 1 : 0;
    }
    return (u >= p.r0 && u <= p.r1) || (u >= p.f0 && u <= p.f1) ? 1 : 0;
  };

  for (let i = 0; i < STATIONS; i++) {
    const uMid = 0.5 - 0.5 * Math.cos((Math.PI * (i + 0.5)) / STATIONS);
    const top = sampleTop(p.top, uMid);
    const glassH = top - 0.1 - Math.min(p.belt, top - 0.05);
    for (let j = 0; j < ringLen; j++) {
      const a = i * ringLen + j;
      const b = i * ringLen + ((j + 1) % ringLen);
      const c = (i + 1) * ringLen + j;
      const d = (i + 1) * ringLen + ((j + 1) % ringLen);
      index[zoneMaterial(ringZones[j], uMid, glassH)].push(a, c, b, b, c, d);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  const all: number[] = [];
  index.forEach((list, m) => {
    geometry.addGroup(all.length, list.length, m);
    all.push(...list);
  });
  geometry.setIndex(all);
  geometry.computeVertexNormals();
  const mesh = new THREE.Mesh(geometry, [mats.paint, mats.glass, mats.trim]);
  mesh.castShadow = true;
  return mesh;
}

function edgePoint(p: Profile, z: number, end: "nose" | "tail") {
  const half = (u: number) => (plan(u) * p.W) / 2;
  const target = Math.abs(z);
  const solve = (zz: number) => {
    let lo = end === "nose" ? 0.9 : 0;
    let hi = end === "nose" ? 1 : 0.1;
    for (let i = 0; i < 30; i++) {
      const mid = (lo + hi) / 2;
      const inside = half(mid) < zz;
      if (end === "nose") inside ? (lo = mid) : (hi = mid);
      else inside ? (hi = mid) : (lo = mid);
    }
    return ((lo + hi) / 2 - 0.5) * p.L;
  };
  const x = solve(target);
  const x2 = solve(Math.min(target + 0.06, p.W / 2 - 0.01));
  const angle = Math.atan2(x2 - x, 0.06);
  return { x, z: Math.sign(z) * target, angle: end === "nose" ? Math.abs(angle) : -Math.abs(angle) };
}

function canvasTexture(w: number, h: number, draw: (g: CanvasRenderingContext2D) => void) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  draw(c.getContext("2d")!);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

export function buildCar(body: Body, colour: string): CarModel {
  const p = PROFILES[body];
  const disposables: { dispose: () => void }[] = [];
  const keep = <T extends { dispose: () => void }>(o: T) => (disposables.push(o), o);

  const paintUniforms: PaintUniforms = {
    uFrom: { value: new THREE.Color(colour) },
    uTo: { value: new THREE.Color(colour) },
    uProg: { value: 1 },
    uBox: { value: new THREE.Vector4(-p.L / 2, p.L / 2, 0, p.height + 0.1) },
    uGlow: { value: new THREE.Color(0x7fe7ff) },
  };

  const paint = keep(new THREE.MeshPhysicalMaterial({ color: colour, metalness: 0.5, roughness: 0.26, clearcoat: 1, clearcoatRoughness: 0.04 }));
  patchPaint(paint, paintUniforms);
  const glass = keep(new THREE.MeshPhysicalMaterial({ color: 0x16222c, metalness: 0.1, roughness: 0.02, clearcoat: 1, transparent: true, opacity: 0.55, envMapIntensity: 2.6, side: THREE.DoubleSide, depthWrite: false }));
  const trim = keep(new THREE.MeshStandardMaterial({ color: 0x17191c, roughness: 0.62, metalness: 0.15 }));
  const liner = keep(new THREE.MeshStandardMaterial({ color: 0x1b1c1f, roughness: 0.95, side: THREE.BackSide }));
  const seatM = keep(new THREE.MeshStandardMaterial({ color: 0x3b362f, roughness: 0.85 }));
  const dashM = keep(new THREE.MeshStandardMaterial({ color: 0x1e2023, roughness: 0.7 }));
  const chromeM = keep(new THREE.MeshStandardMaterial({ color: 0xe4e8ed, metalness: 1, roughness: 0.12 }));
  const tireM = keep(new THREE.MeshStandardMaterial({ color: 0x0c0d0f, roughness: 0.95 }));
  const rimM = keep(new THREE.MeshStandardMaterial({ color: 0xd2d6dc, metalness: 1, roughness: 0.2 }));
  const rimDark = keep(new THREE.MeshStandardMaterial({ color: 0x23262b, metalness: 0.8, roughness: 0.4 }));
  const discM = keep(new THREE.MeshStandardMaterial({ color: 0x80858c, metalness: 0.95, roughness: 0.35 }));
  const caliperM = keep(new THREE.MeshStandardMaterial({ color: 0xb5261c, metalness: 0.4, roughness: 0.4 }));
  const lampDark = keep(new THREE.MeshStandardMaterial({ color: 0x0d0e10, metalness: 0.9, roughness: 0.3 }));
  const lensM = keep(new THREE.MeshPhysicalMaterial({ color: 0xffffff, transparent: true, opacity: 0.32, roughness: 0.02, clearcoat: 1, envMapIntensity: 2 }));
  const projM = keep(new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xfff2d2, emissiveIntensity: 1.6, roughness: 0.2 }));
  const drlM = keep(new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xb8f3ff, emissiveIntensity: 2.6 }));
  const tailM = keep(new THREE.MeshPhysicalMaterial({ color: 0x8a0c0c, emissive: 0xff1c1c, emissiveIntensity: 0.9, roughness: 0.15, clearcoat: 1 }));
  const evM = keep(new THREE.MeshStandardMaterial({ color: 0x35c3d8, emissive: 0x35c3d8, emissiveIntensity: 1.2 }));
  const archM = keep(new THREE.MeshStandardMaterial({ color: 0x050607, roughness: 1 }));

  const grilleTex = keep(
    canvasTexture(256, 64, (g) => {
      g.fillStyle = "#0b0c0e";
      g.fillRect(0, 0, 256, 64);
      g.fillStyle = "#30343a";
      for (let y = 0; y < 8; y++) for (let x = 0; x < 32; x++) {
        g.beginPath();
        g.arc(x * 8 + 4 + (y % 2) * 4, y * 8 + 4, 2.2, 0, Math.PI * 2);
        g.fill();
      }
    }),
  );
  const grilleM = keep(new THREE.MeshStandardMaterial({ map: grilleTex, roughness: 0.5, metalness: 0.4 }));

  const root = new THREE.Group();
  const variant = new THREE.Group();
  root.add(variant);

  const rearX = -p.L / 2 + p.rearOver;
  const frontX = rearX + p.wheelbase;
  const uOf = (x: number) => x / p.L + 0.5;
  const wheelUs = [uOf(rearX), uOf(frontX)];
  const halfAt = (u: number) => halfWidth(p, u, wheelUs);
  const xAt = (u: number) => (u - 0.5) * p.L;

  const bodyMesh = buildBody(p, wheelUs, { paint, glass, trim });
  keep(bodyMesh.geometry);
  variant.add(bodyMesh);

  const innerWall = new THREE.Mesh(bodyMesh.geometry, liner);
  innerWall.scale.set(0.992, 0.97, 0.955);
  variant.add(innerWall);

  const mk = <G extends THREE.BufferGeometry>(g: G, m: THREE.Material, shadow = false) => {
    keep(g);
    const mesh = new THREE.Mesh(g, m);
    mesh.castShadow = shadow;
    return mesh;
  };
  const addBox = (w: number, h: number, d: number, m: THREE.Material, x: number, y: number, z: number, ry = 0, shadow = false) => {
    const b = mk(new THREE.BoxGeometry(w, h, d), m, shadow);
    b.position.set(x, y, z);
    b.rotation.y = ry;
    variant.add(b);
    return b;
  };

  // Interior seen through the glass. India drives on the left, so the driver sits on the car's right (+z).
  const cabinX = ((p.r1 + p.f0) / 2 - 0.5) * p.L;
  const dashX = ((p.f0 + p.f1) / 2 - 0.5) * p.L - 0.05;
  addBox(0.42, 0.2, p.W * 0.72, dashM, dashX, p.belt - 0.14, 0);
  const steering = mk(new THREE.TorusGeometry(0.16, 0.014, 8, 28), dashM);
  steering.position.set(dashX - 0.42, p.belt - 0.02, 0.4);
  steering.rotation.y = Math.PI / 2 - 0.35;
  variant.add(steering);
  for (const s of [1, -1]) {
    addBox(0.5, 0.12, 0.46, seatM, cabinX + 0.35, p.sill + 0.42, s * 0.4);
    addBox(0.1, 0.56, 0.46, seatM, cabinX + 0.12, p.sill + 0.7, s * 0.4);
  }
  addBox(0.5, 0.12, p.W * 0.62, seatM, cabinX - 0.55, p.sill + 0.42, 0);
  addBox(0.1, 0.5, p.W * 0.62, seatM, cabinX - 0.8, p.sill + 0.68, 0);

  const wheelStyles: Record<string, THREE.Group[]> = { steel: [], alloy5: [], alloy10: [], aero: [] };
  const R = p.wheelR;
  const tireLathe = (() => {
    const w = p.tireW / 2;
    const pts: THREE.Vector2[] = [
      new THREE.Vector2(R * 0.62, -w * 0.9), new THREE.Vector2(R * 0.86, -w * 1.0), new THREE.Vector2(R * 0.95, -w * 0.9), new THREE.Vector2(R * 0.99, -w * 0.62),
      new THREE.Vector2(R, -w * 0.5), new THREE.Vector2(R * 0.985, -w * 0.4), new THREE.Vector2(R, -w * 0.3), new THREE.Vector2(R, -w * 0.12), new THREE.Vector2(R * 0.985, -w * 0.04),
      new THREE.Vector2(R * 0.985, w * 0.04), new THREE.Vector2(R, w * 0.12), new THREE.Vector2(R, w * 0.3), new THREE.Vector2(R * 0.985, w * 0.4), new THREE.Vector2(R, w * 0.5),
      new THREE.Vector2(R * 0.99, w * 0.62), new THREE.Vector2(R * 0.95, w * 0.9), new THREE.Vector2(R * 0.86, w * 1.0), new THREE.Vector2(R * 0.62, w * 0.9),
    ];
    const g = new THREE.LatheGeometry(pts, 72);
    g.rotateX(Math.PI / 2);
    g.computeVertexNormals();
    return keep(g);
  })();

  const spokeGeometry = (inner: number, outer: number, wIn: number, wOut: number) => {
    const s = new THREE.Shape();
    s.moveTo(inner, -wIn / 2);
    s.lineTo(outer, -wOut / 2);
    s.lineTo(outer, wOut / 2);
    s.lineTo(inner, wIn / 2);
    s.closePath();
    return keep(new THREE.ExtrudeGeometry(s, { depth: 0.014, bevelEnabled: true, bevelThickness: 0.004, bevelSize: 0.004, bevelSegments: 1 }));
  };
  const spoke5 = spokeGeometry(R * 0.12, R * 0.64, R * 0.26, R * 0.15);
  const spoke10 = spokeGeometry(R * 0.12, R * 0.64, R * 0.1, R * 0.06);

  const addWheel = (x: number, side: 1 | -1) => {
    const u = uOf(x);
    const outerZ = halfAt(u) * 1.012;
    const w = new THREE.Group();
    w.position.set(x, R, side * (outerZ - p.tireW / 2 + 0.045));
    w.add(mk(tireLathe, tireM, true));
    const face = (p.tireW / 2) * 0.9 * side;

    const barrel = mk(new THREE.CylinderGeometry(R * 0.64, R * 0.64, p.tireW * 0.85, 40, 1, true), rimDark);
    barrel.rotation.x = Math.PI / 2;
    w.add(barrel);
    const disc = mk(new THREE.CylinderGeometry(R * 0.52, R * 0.52, 0.03, 40), discM);
    disc.rotation.x = Math.PI / 2;
    disc.position.z = side * 0.02;
    w.add(disc);
    const caliper = mk(new THREE.BoxGeometry(R * 0.26, R * 0.36, 0.05), caliperM);
    caliper.position.set(Math.cos(1.45) * R * 0.46, Math.sin(1.45) * R * 0.46, side * 0.05);
    caliper.rotation.z = 1.45 - Math.PI / 2;
    w.add(caliper);

    const style = (name: string, build: (g: THREE.Group) => void) => {
      const g = new THREE.Group();
      build(g);
      wheelStyles[name].push(g);
      w.add(g);
    };
    const flat = (r: number, mat: THREE.Material, zOff: number) => {
      const m = mk(new THREE.CylinderGeometry(r, r, 0.022, 48), mat);
      m.rotation.x = Math.PI / 2;
      m.position.z = face + zOff * side;
      return m;
    };

    style("steel", (g) => {
      g.add(flat(R * 0.66, rimDark, 0));
      g.add(flat(R * 0.3, rimM, 0.01));
      for (let i = 0; i < 5; i++) {
        const lug = mk(new THREE.CylinderGeometry(0.012, 0.012, 0.02, 10), chromeM);
        lug.rotation.x = Math.PI / 2;
        const a = (i / 5) * Math.PI * 2;
        lug.position.set(Math.cos(a) * R * 0.17, Math.sin(a) * R * 0.17, face + 0.02 * side);
        g.add(lug);
      }
    });

    const spokeSet = (count: number, geo: THREE.BufferGeometry) => (g: THREE.Group) => {
      g.add(flat(R * 0.66, rimDark, 0));
      for (let i = 0; i < count; i++) {
        const holder = new THREE.Group();
        const m = mk(geo, rimM);
        m.position.z = side > 0 ? 0 : -0.014;
        holder.add(m);
        holder.rotation.z = (i / count) * Math.PI * 2;
        holder.position.z = face + 0.002 * side;
        g.add(holder);
      }
      const lip = mk(new THREE.TorusGeometry(R * 0.655, 0.012, 8, 56), chromeM);
      lip.position.z = face + 0.008 * side;
      g.add(lip);
      g.add(flat(R * 0.11, chromeM, 0.02));
    };
    style("alloy5", spokeSet(5, spoke5));
    style("alloy10", spokeSet(10, spoke10));
    style("aero", (g) => {
      g.add(flat(R * 0.66, rimM, 0.004));
      const ring = mk(new THREE.TorusGeometry(R * 0.5, 0.016, 8, 56), rimDark);
      ring.position.z = face + 0.016 * side;
      g.add(ring);
      g.add(flat(R * 0.14, evM, 0.02));
    });
    variant.add(w);

    const archZ = side * (halfAt(u) * 1.012 + 0.006);
    const arch = mk(new THREE.CircleGeometry(R + 0.075, 48, -0.5, Math.PI + 1), archM);
    arch.position.set(x, R, archZ);
    if (side < 0) arch.rotation.y = Math.PI;
    variant.add(arch);
    const lip = mk(new THREE.TorusGeometry(R + 0.075, 0.016, 8, 48, Math.PI + 1), trim);
    lip.rotation.z = -0.5;
    lip.position.set(x, R, archZ + side * 0.004);
    variant.add(lip);
  };
  [rearX, frontX].forEach((x) => ([1, -1] as const).forEach((s) => addWheel(x, s)));

  const noseTop = sampleTop(p.top, 1);
  for (const s of [1, -1] as const) {
    p.doors.forEach((du) => {
      addBox(0.007, p.belt - p.sill - 0.18, 0.004, trim, xAt(du), (p.belt + p.sill) / 2 + 0.03, s * (halfAt(du) * 1.012 + 0.001));
    });
    const mu = p.f1 - 0.015;
    const mirror = mk(new THREE.CapsuleGeometry(0.045, 0.12, 8, 14), paint, true);
    mirror.rotation.x = Math.PI / 2;
    mirror.scale.set(1.15, 1, 0.7);
    mirror.position.set(xAt(mu), p.belt + 0.07, s * (halfAt(mu) + 0.12));
    variant.add(mirror);
    const stalk = mk(new THREE.BoxGeometry(0.04, 0.025, 0.1), trim);
    stalk.position.set(xAt(mu), p.belt + 0.04, s * (halfAt(mu) + 0.04));
    variant.add(stalk);
    [p.doors[0] + 0.05, p.doors[1] + 0.05].forEach((hu) => addBox(0.13, 0.022, 0.014, chromeM, xAt(hu), p.belt - 0.08, s * (halfAt(hu) * 1.012 + 0.007)));

    const head = edgePoint(p, s * 0.6, "nose");
    const lampG = new THREE.Group();
    lampG.position.set(head.x - 0.01, noseTop - 0.1, head.z);
    lampG.rotation.y = s * -head.angle;
    const housing = mk(new THREE.CapsuleGeometry(0.052, 0.27, 8, 16), lampDark);
    housing.rotation.x = Math.PI / 2;
    housing.scale.set(0.5, 1, 1);
    const lens = mk(new THREE.CapsuleGeometry(0.056, 0.275, 8, 16), lensM);
    lens.rotation.x = Math.PI / 2;
    lens.scale.set(0.35, 1, 1);
    lens.position.x = 0.012;
    lampG.add(housing, lens);
    for (const dz of [-0.075, 0.075]) {
      const proj = mk(new THREE.CircleGeometry(0.03, 24), projM);
      proj.rotation.y = Math.PI / 2;
      proj.position.set(0.021, 0, dz);
      lampG.add(proj);
      const ring = mk(new THREE.TorusGeometry(0.031, 0.004, 6, 24), chromeM);
      ring.rotation.y = Math.PI / 2;
      ring.position.set(0.022, 0, dz);
      lampG.add(ring);
    }
    variant.add(lampG);

    const tail = edgePoint(p, s * 0.6, "tail");
    const tailG = new THREE.Group();
    tailG.position.set(tail.x + 0.012, sampleTop(p.top, 0) - 0.18, tail.z);
    tailG.rotation.y = s * tail.angle;
    const tl = mk(new THREE.CapsuleGeometry(0.055, 0.3, 8, 16), tailM);
    tl.rotation.x = Math.PI / 2;
    tl.scale.set(0.45, 1, 1);
    tailG.add(tl);
    const tlStrip = mk(new THREE.BoxGeometry(0.01, 0.018, 0.3), lampDark);
    tlStrip.position.x = -0.014;
    tailG.add(tlStrip);
    variant.add(tailG);

    const fog = mk(new THREE.CircleGeometry(0.035, 20), projM);
    const fp = edgePoint(p, s * 0.62, "nose");
    fog.position.set(fp.x + 0.003, noseTop - 0.52, fp.z);
    fog.rotation.y = Math.PI / 2 - s * fp.angle;
    variant.add(fog);
  }

  const grille = new THREE.Group();
  grille.add(mk(new THREE.BoxGeometry(0.03, 0.17, 0.86), grilleM));
  const badge = mk(new THREE.CylinderGeometry(0.035, 0.035, 0.012, 24), chromeM);
  badge.rotation.z = Math.PI / 2;
  badge.position.set(0.018, 0, 0);
  grille.add(badge);
  grille.position.set(p.L / 2 - 0.012, noseTop - 0.2, 0);
  variant.add(grille);
  addBox(0.02, 0.1, 0.62, grilleM, p.L / 2 - 0.016, noseTop - 0.52, 0);

  const exhaustGroup = new THREE.Group();
  const pipe = mk(new THREE.CylinderGeometry(0.03, 0.03, 0.08, 20), chromeM);
  pipe.rotation.z = Math.PI / 2;
  pipe.position.set(-p.L / 2 + 0.02, p.sill + 0.04, 0.5);
  exhaustGroup.add(pipe);
  variant.add(exhaustGroup);

  const railsGroup = new THREE.Group();
  const [ra, rb] = p.rails;
  for (const s of [1, -1]) {
    const len = (rb - ra) * p.L;
    const rail = mk(new THREE.CylinderGeometry(0.018, 0.018, len, 12), trim, true);
    rail.rotation.z = Math.PI / 2;
    rail.position.set(((ra + rb) / 2 - 0.5) * p.L, p.height + 0.055, s * 0.58);
    railsGroup.add(rail);
    [ra + 0.02, (ra + rb) / 2, rb - 0.02].forEach((u) => {
      const post = mk(new THREE.BoxGeometry(0.03, 0.06, 0.03), trim);
      post.position.set(xAt(u), p.height + 0.02, s * 0.58);
      railsGroup.add(post);
    });
  }
  variant.add(railsGroup);

  const spoilerGroup = new THREE.Group();
  const spoilerU = body === "Sedan" ? 0.1 : p.r1 + 0.005;
  const spoilerY = body === "Sedan" ? sampleTop(p.top, 0.1) + 0.03 : sampleTop(p.top, p.r1 + 0.005) + 0.01;
  const spoiler = mk(new THREE.BoxGeometry(body === "Sedan" ? 0.2 : 0.22, 0.03, p.W * 0.62), trim, true);
  spoiler.position.set(xAt(spoilerU), spoilerY, 0);
  spoilerGroup.add(spoiler);
  variant.add(spoilerGroup);

  const chromeGroup = new THREE.Group();
  for (const s of [1, -1]) {
    const strip = mk(new THREE.BoxGeometry((p.f0 - p.r1) * p.L, 0.012, 0.01), chromeM);
    strip.position.set(((p.f0 + p.r1) / 2 - 0.5) * p.L, p.belt + 0.015, s * (halfAt(0.5) * 1.004));
    chromeGroup.add(strip);
    const sillStrip = mk(new THREE.BoxGeometry(p.wheelbase - 0.4, 0.014, 0.01), chromeM);
    sillStrip.position.set((rearX + frontX) / 2, p.sill + 0.12, s * (halfAt(0.5) * 1.012 + 0.003));
    chromeGroup.add(sillStrip);
  }
  const grilleChrome = mk(new THREE.BoxGeometry(0.012, 0.018, 0.88), chromeM);
  grilleChrome.position.set(p.L / 2 - 0.004, noseTop - 0.1, 0);
  chromeGroup.add(grilleChrome);
  variant.add(chromeGroup);

  const ledGroup = new THREE.Group();
  for (const s of [1, -1]) {
    const dp = edgePoint(p, s * 0.6, "nose");
    const drl = mk(new THREE.BoxGeometry(0.02, 0.016, 0.3), drlM);
    drl.position.set(dp.x + 0.004, noseTop - 0.145, dp.z);
    drl.rotation.y = s * -dp.angle;
    ledGroup.add(drl);
  }
  variant.add(ledGroup);

  const evGroup = new THREE.Group();
  for (const s of [1, -1]) {
    const stripe = mk(new THREE.BoxGeometry(p.wheelbase, 0.018, 0.008), evM);
    stripe.position.set((rearX + frontX) / 2, p.sill + 0.2, s * (halfAt(0.5) * 1.012 + 0.005));
    evGroup.add(stripe);
  }
  const port = mk(new THREE.BoxGeometry(0.1, 0.07, 0.01), evM);
  port.position.set(frontX + 0.55, p.belt - 0.12, halfAt(uOf(frontX + 0.55)) * 1.012 + 0.006);
  evGroup.add(port);
  variant.add(evGroup);

  const feat = { rails: 0, spoiler: 0, chrome: 0, led: 0, ev: 0, scale: 0.97, steel: 0, alloy5: 1, alloy10: 0, aero: 0 };
  let target = { ...feat };

  const apply = () => {
    railsGroup.scale.y = Math.max(feat.rails, 0.001);
    railsGroup.visible = feat.rails > 0.01;
    spoilerGroup.scale.set(1, Math.max(feat.spoiler, 0.001), 1);
    spoilerGroup.visible = feat.spoiler > 0.01;
    chromeGroup.visible = feat.chrome > 0.01;
    chromeGroup.scale.x = Math.max(feat.chrome, 0.001);
    ledGroup.visible = feat.led > 0.01;
    ledGroup.scale.z = Math.max(feat.led, 0.001);
    evGroup.visible = feat.ev > 0.01;
    exhaustGroup.visible = feat.ev < 0.5;
    for (const name of WHEEL_STYLES) {
      const k = Math.max(feat[name], 0.001);
      wheelStyles[name].forEach((g) => {
        g.scale.setScalar(k);
        g.visible = feat[name] > 0.01;
      });
    }
    variant.scale.set(feat.scale, feat.scale, feat.scale);
  };

  const setTrim = (t: TrimSpec) => {
    target = {
      rails: t.rails ? 1 : 0, spoiler: t.spoiler ? 1 : 0, chrome: t.chrome ? 1 : 0, led: t.led ? 1 : 0, ev: t.ev ? 1 : 0, scale: t.scale,
      steel: t.wheel === "steel" ? 1 : 0, alloy5: t.wheel === "alloy5" ? 1 : 0, alloy10: t.wheel === "alloy10" ? 1 : 0, aero: t.wheel === "aero" ? 1 : 0,
    };
  };

  const snap = (t: TrimSpec) => {
    setTrim(t);
    Object.assign(feat, target);
    apply();
  };

  const tick = (dt: number) => {
    const k = 1 - Math.exp(-dt * 5);
    (Object.keys(feat) as (keyof typeof feat)[]).forEach((key) => {
      feat[key] += (target[key] - feat[key]) * k;
    });
    apply();
  };

  apply();
  return {
    root,
    bounds: { x0: -p.L / 2, x1: p.L / 2, y0: 0, y1: p.height },
    paintUniforms,
    setTrim,
    snap,
    tick,
    dispose: () => disposables.forEach((d) => d.dispose()),
  };
}

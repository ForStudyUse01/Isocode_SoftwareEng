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

const WHEEL_STYLES = ["steel", "alloy5", "alloy10", "aero"] as const;
const RING = 15;
const STATIONS = 140;

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

function buildBody(p: Profile, mats: { paint: THREE.Material; glass: THREE.Material; trim: THREE.Material }) {
  const pos: number[] = [];
  const index: number[][] = [[], [], []];

  for (let i = 0; i <= STATIONS; i++) {
    const u = 0.5 - 0.5 * Math.cos((Math.PI * i) / STATIONS);
    const x = (u - 0.5) * p.L;
    const wl = (plan(u) * p.W) / 2;
    const y2 = sampleTop(p.top, u);
    const y1 = Math.min(p.belt, y2 - 0.05);
    const rise = 0.1 * (1 - smooth(0, 0.08, Math.min(u, 1 - u)));
    const y0 = p.sill + rise;
    const c = cabinWeight(p, u);
    const wTop = wl * (0.9 - 0.12 * c);
    const crown = 0.018 + 0.02 * c;
    const clad = Math.min(p.clad, (y1 - y0) * 0.5);
    const wb = wl * 0.86;
    const yWin = Math.max(y1 + 0.01, y2 - 0.1);
    const wMid = (wl * 0.99 + wTop) / 2;
    const ring: [number, number][] = [
      [-wb, y0], [wb, y0], [wl, y0 + 0.1], [wl, y0 + clad], [wl * 0.99, y1], [wMid, yWin], [wTop, y2 - 0.03], [wTop * 0.55, y2 + crown * 0.6],
      [0, y2 + crown], [-wTop * 0.55, y2 + crown * 0.6], [-wTop, y2 - 0.03], [-wMid, yWin], [-wl * 0.99, y1], [-wl, y0 + clad], [-wl, y0 + 0.1],
    ];
    for (const [z, y] of ring) pos.push(x, y, z);
  }

  const materialIndex = (u: number, j: number, glassHeight: number) => {
    if (j === 0 || j === 1 || j === 2 || j === 13 || j === 14) return 2;
    if (j === 3 || j === 12 || j === 5 || j === 10) return 0;
    if (j === 4 || j === 11) {
      const inside = u >= p.r0 + 0.006 && u <= p.f1 - 0.004 && Math.abs(u - p.pillarB) > 0.014;
      return inside && glassHeight > 0.16 ? 1 : 0;
    }
    return (u >= p.r0 && u <= p.r1) || (u >= p.f0 && u <= p.f1) ? 1 : 0;
  };

  for (let i = 0; i < STATIONS; i++) {
    const uMid = 0.5 - 0.5 * Math.cos((Math.PI * (i + 0.5)) / STATIONS);
    const glassH = Math.min(sampleTop(p.top, uMid) - 0.1, 9) - Math.min(p.belt, sampleTop(p.top, uMid) - 0.05);
    for (let j = 0; j < RING; j++) {
      const a = i * RING + j;
      const b = i * RING + ((j + 1) % RING);
      const c = (i + 1) * RING + j;
      const d = (i + 1) * RING + ((j + 1) % RING);
      index[materialIndex(uMid, j, glassH)].push(a, c, b, b, c, d);
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

export type CarModel = {
  root: THREE.Group;
  bounds: { x0: number; x1: number; y0: number; y1: number };
  paintUniforms: PaintUniforms;
  setTrim: (t: TrimSpec) => void;
  snap: (t: TrimSpec) => void;
  tick: (dt: number) => void;
  dispose: () => void;
};

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

  const paint = keep(new THREE.MeshPhysicalMaterial({ color: colour, metalness: 0.42, roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.05 }));
  patchPaint(paint, paintUniforms);
  const glass = keep(new THREE.MeshPhysicalMaterial({ color: 0x1a2630, metalness: 0.35, roughness: 0.04, clearcoat: 1, clearcoatRoughness: 0.02, envMapIntensity: 2.4 }));
  const trim = keep(new THREE.MeshStandardMaterial({ color: 0x141619, roughness: 0.72, metalness: 0.1 }));
  const chromeM = keep(new THREE.MeshStandardMaterial({ color: 0xe2e6eb, metalness: 1, roughness: 0.14 }));
  const tireM = keep(new THREE.MeshStandardMaterial({ color: 0x0d0e10, roughness: 0.92 }));
  const rimM = keep(new THREE.MeshStandardMaterial({ color: 0xcdd2d8, metalness: 0.95, roughness: 0.22 }));
  const rimDark = keep(new THREE.MeshStandardMaterial({ color: 0x2a2d33, metalness: 0.7, roughness: 0.45 }));
  const discM = keep(new THREE.MeshStandardMaterial({ color: 0x6d7279, metalness: 0.9, roughness: 0.4 }));
  const lampM = keep(new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xfff4d6, emissiveIntensity: 1.1, roughness: 0.15 }));
  const drlM = keep(new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xb8f3ff, emissiveIntensity: 2.2 }));
  const tailM = keep(new THREE.MeshStandardMaterial({ color: 0x7a0f0f, emissive: 0xff1c1c, emissiveIntensity: 0.9, roughness: 0.25 }));
  const plateM = keep(new THREE.MeshStandardMaterial({ color: 0xf1f1ee, roughness: 0.5 }));
  const evM = keep(new THREE.MeshStandardMaterial({ color: 0x35c3d8, emissive: 0x35c3d8, emissiveIntensity: 1.2 }));
  const archM = keep(new THREE.MeshStandardMaterial({ color: 0x060708, roughness: 1 }));

  const root = new THREE.Group();
  const variant = new THREE.Group();
  root.add(variant);

  const bodyMesh = buildBody(p, { paint, glass, trim });
  keep(bodyMesh.geometry);
  variant.add(bodyMesh);

  const halfAt = (u: number) => (plan(u) * p.W) / 2;
  const xAt = (u: number) => (u - 0.5) * p.L;
  const mk = <G extends THREE.BufferGeometry>(g: G, m: THREE.Material, shadow = false) => {
    keep(g);
    const mesh = new THREE.Mesh(g, m);
    mesh.castShadow = shadow;
    return mesh;
  };

  const rearX = -p.L / 2 + p.rearOver;
  const frontX = rearX + p.wheelbase;
  const uOf = (x: number) => x / p.L + 0.5;

  const wheelStyles: Record<string, THREE.Group[]> = { steel: [], alloy5: [], alloy10: [], aero: [] };
  const tireLathe = (() => {
    const R = p.wheelR;
    const w = p.tireW / 2;
    const pts: THREE.Vector2[] = [];
    const rIn = R * 0.64;
    pts.push(new THREE.Vector2(rIn, -w * 0.9), new THREE.Vector2(R * 0.9, -w), new THREE.Vector2(R * 0.985, -w * 0.78), new THREE.Vector2(R, -w * 0.35));
    pts.push(new THREE.Vector2(R, w * 0.35), new THREE.Vector2(R * 0.985, w * 0.78), new THREE.Vector2(R * 0.9, w), new THREE.Vector2(rIn, w * 0.9));
    const g = new THREE.LatheGeometry(pts, 48);
    g.rotateX(Math.PI / 2);
    g.computeVertexNormals();
    return g;
  })();
  keep(tireLathe);

  const addWheel = (x: number, side: 1 | -1) => {
    const u = uOf(x);
    const z = side * (halfAt(u) - p.tireW / 2 + 0.04);
    const w = new THREE.Group();
    w.position.set(x, p.wheelR, z);
    w.add(mk(tireLathe, tireM, true));
    const R = p.wheelR;
    const face = ((p.tireW / 2) * 0.9 - 0.004) * side;

    const disc = mk(new THREE.CylinderGeometry(R * 0.5, R * 0.5, 0.03, 32), discM);
    disc.rotation.x = Math.PI / 2;
    disc.position.z = side * 0.02;
    w.add(disc);

    const style = (name: string, build: (g: THREE.Group) => void) => {
      const g = new THREE.Group();
      build(g);
      wheelStyles[name].push(g);
      w.add(g);
    };
    const flat = (r: number, mat: THREE.Material, zOff: number) => {
      const m = mk(new THREE.CylinderGeometry(r, r, 0.025, 40), mat);
      m.rotation.x = Math.PI / 2;
      m.position.z = face + zOff * side;
      return m;
    };
    const arm = (len: number, wid: number, ang: number, mat: THREE.Material) => {
      const m = mk(new THREE.BoxGeometry(len, wid, 0.02), mat);
      const holder = new THREE.Group();
      m.position.x = R * 0.36;
      holder.add(m);
      holder.rotation.z = ang;
      holder.position.z = face + 0.012 * side;
      return holder;
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
    style("alloy5", (g) => {
      g.add(flat(R * 0.66, rimDark, 0));
      for (let i = 0; i < 5; i++) g.add(arm(R * 0.62, R * 0.14, (i / 5) * Math.PI * 2, rimM));
      g.add(flat(R * 0.13, chromeM, 0.02));
    });
    style("alloy10", (g) => {
      g.add(flat(R * 0.66, rimDark, 0));
      for (let i = 0; i < 10; i++) g.add(arm(R * 0.6, R * 0.07, (i / 10) * Math.PI * 2, rimM));
      const ring = mk(new THREE.TorusGeometry(R * 0.66, 0.012, 8, 48), chromeM);
      ring.position.z = face + 0.01 * side;
      g.add(ring);
      g.add(flat(R * 0.12, chromeM, 0.02));
    });
    style("aero", (g) => {
      g.add(flat(R * 0.66, rimM, 0.005));
      const ring = mk(new THREE.TorusGeometry(R * 0.5, 0.015, 8, 48), rimDark);
      ring.position.z = face + 0.02 * side;
      g.add(ring);
      g.add(flat(R * 0.14, evM, 0.02));
    });

    variant.add(w);

    const archU = u;
    const arch = mk(new THREE.CircleGeometry(R + 0.07, 40, -0.5, Math.PI + 1), archM);
    arch.position.set(x, R, side * (halfAt(archU) + 0.004));
    if (side < 0) arch.rotation.y = Math.PI;
    variant.add(arch);
  };
  [rearX, frontX].forEach((x) => ([1, -1] as const).forEach((s) => addWheel(x, s)));

  const addBox = (w: number, h: number, d: number, m: THREE.Material, x: number, y: number, z: number, ry = 0, shadow = false) => {
    const b = mk(new THREE.BoxGeometry(w, h, d), m, shadow);
    b.position.set(x, y, z);
    b.rotation.y = ry;
    variant.add(b);
    return b;
  };

  for (const s of [1, -1]) {
    p.doors.forEach((du) => {
      const z = s * (halfAt(du) + 0.002);
      addBox(0.008, p.belt - p.sill - 0.16, 0.004, trim, xAt(du), (p.belt + p.sill) / 2 + 0.02, z);
    });
    const mu = p.f1 - 0.015;
    const mirror = mk(new THREE.CapsuleGeometry(0.045, 0.11, 6, 12), paint, true);
    mirror.rotation.x = Math.PI / 2;
    mirror.scale.set(1, 1, 0.7);
    mirror.position.set(xAt(mu), p.belt + 0.07, s * (halfAt(mu) + 0.12));
    variant.add(mirror);
    [p.doors[0] + 0.05, p.doors[1] + 0.05].forEach((hu) => addBox(0.13, 0.022, 0.012, chromeM, xAt(hu), p.belt - 0.08, s * (halfAt(hu) + 0.006)));

    const head = edgePoint(p, s * 0.62, "nose");
    addBox(0.06, 0.1, 0.34, lampM, head.x - 0.02, sampleTop(p.top, 1) - 0.1, head.z, s * -head.angle);
    const tail = edgePoint(p, s * 0.62, "tail");
    addBox(0.05, 0.12, 0.3, tailM, tail.x + 0.015, sampleTop(p.top, 0) - 0.17, tail.z, s * tail.angle);
  }

  const noseTop = sampleTop(p.top, 1);
  const grille = addBox(0.03, 0.15, 0.9, trim, p.L / 2 - 0.012, noseTop - 0.18, 0, 0);
  addBox(0.012, 0.11, 0.36, plateM, p.L / 2 - 0.004, noseTop - 0.42, 0);
  addBox(0.012, 0.11, 0.36, plateM, -p.L / 2 + 0.004, sampleTop(p.top, 0) - 0.32, 0);

  const railsGroup = new THREE.Group();
  const [ra, rb] = p.rails;
  for (const s of [1, -1]) {
    const len = (rb - ra) * p.L;
    const rail = mk(new THREE.CylinderGeometry(0.018, 0.018, len, 12), trim, true);
    rail.rotation.z = Math.PI / 2;
    rail.position.set(((ra + rb) / 2 - 0.5) * p.L, p.height + 0.05, s * 0.6);
    railsGroup.add(rail);
    [ra + 0.02, rb - 0.02].forEach((u) => {
      const post = mk(new THREE.BoxGeometry(0.03, 0.05, 0.03), trim);
      post.position.set(xAt(u), p.height + 0.015, s * 0.6);
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
    strip.position.set(((p.f0 + p.r1) / 2 - 0.5) * p.L, p.belt + 0.015, s * (halfAt(0.5) + 0.002));
    chromeGroup.add(strip);
    const sillStrip = mk(new THREE.BoxGeometry(p.wheelbase - 0.4, 0.014, 0.01), chromeM);
    sillStrip.position.set((rearX + frontX) / 2, p.sill + 0.12, s * (halfAt(0.5) + 0.004));
    chromeGroup.add(sillStrip);
  }
  const grilleChrome = mk(new THREE.BoxGeometry(0.012, 0.016, 0.92), chromeM);
  grilleChrome.position.set(p.L / 2 - 0.004, noseTop - 0.1, 0);
  chromeGroup.add(grilleChrome);
  variant.add(chromeGroup);

  const ledGroup = new THREE.Group();
  for (const s of [1, -1]) {
    const drl = mk(new THREE.BoxGeometry(0.03, 0.018, 0.3), drlM);
    drl.position.set(xAt(0.975) + 0.012, noseTop - 0.04, s * (halfAt(0.975) - 0.2));
    drl.rotation.y = s * -0.28;
    ledGroup.add(drl);
  }
  variant.add(ledGroup);

  const evGroup = new THREE.Group();
  for (const s of [1, -1]) {
    const stripe = mk(new THREE.BoxGeometry(p.wheelbase, 0.018, 0.008), evM);
    stripe.position.set((rearX + frontX) / 2, p.sill + 0.2, s * (halfAt(0.5) + 0.004));
    evGroup.add(stripe);
  }
  const port = mk(new THREE.BoxGeometry(0.1, 0.07, 0.01), evM);
  port.position.set(frontX + 0.55, p.belt - 0.12, halfAt(uOf(frontX + 0.55)) + 0.006);
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
    chromeGroup.position.x = 0;
    ledGroup.visible = feat.led > 0.01;
    ledGroup.scale.z = Math.max(feat.led, 0.001);
    evGroup.visible = feat.ev > 0.01;
    grille.scale.set(1, Math.max(1 - feat.ev, 0.001), 1);
    grille.visible = feat.ev < 0.99;
    for (const name of WHEEL_STYLES) {
      const k = Math.max(feat[name], 0.001);
      wheelStyles[name].forEach((g) => {
        g.scale.setScalar(k);
        g.visible = feat[name] > 0.01;
      });
    }
    variant.scale.set(feat.scale * 1.0, feat.scale, feat.scale);
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

  const model: CarModel = {
    root,
    bounds: { x0: -p.L / 2, x1: p.L / 2, y0: 0, y1: p.height },
    paintUniforms,
    setTrim,
    snap,
    tick,
    dispose: () => disposables.forEach((d) => d.dispose()),
  };
  apply();
  return model;
}

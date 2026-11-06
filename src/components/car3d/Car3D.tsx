"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { buildCar, type CarModel, type TrimSpec } from "./buildCar";
import type { Body } from "./profiles";

const TRANSITION_S = 2.8;
const ease = (t: number) => 0.5 - 0.5 * Math.cos(Math.PI * Math.min(1, Math.max(0, t)));

type Props = { body: Body; colour: string; trim: TrimSpec; onReady: () => void; onFail: () => void; className?: string };

function softShadowTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const g = c.getContext("2d")!;
  const grad = g.createRadialGradient(64, 64, 4, 64, 64, 62);
  grad.addColorStop(0, "rgba(0,0,0,0.55)");
  grad.addColorStop(0.55, "rgba(0,0,0,0.22)");
  grad.addColorStop(1, "rgba(0,0,0,0)");
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function studioEnv() {
  const s = new THREE.Scene();
  const geo = new THREE.SphereGeometry(30, 48, 24);
  const pos = geo.attributes.position;
  const colours: number[] = [];
  const floor = new THREE.Color(0x30343a);
  const horizon = new THREE.Color(0xc9ced5);
  const top = new THREE.Color(0xeef2f7);
  const c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i) / 30;
    if (y < 0) c.copy(horizon).lerp(floor, Math.min(1, -y * 3));
    else c.copy(horizon).lerp(top, Math.min(1, y * 1.6));
    colours.push(c.r, c.g, c.b);
  }
  geo.setAttribute("color", new THREE.Float32BufferAttribute(colours, 3));
  s.add(new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide })));

  const panel = (w: number, h: number, intensity: number, x: number, y: number, z: number, look: THREE.Vector3) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color().setScalar(intensity), side: THREE.DoubleSide }));
    m.position.set(x, y, z);
    m.lookAt(look);
    s.add(m);
  };
  const origin = new THREE.Vector3(0, 1, 0);
  panel(14, 6, 7, 0, 14, 0, origin);
  panel(2.6, 12, 6, -16, 7, 2, origin);
  panel(2.6, 12, 5, 16, 7, -5, origin);
  panel(12, 2.2, 3.5, 0, 4, 18, origin);
  panel(12, 2.2, 3, 2, 4, -18, origin);
  panel(1.4, 10, 8, 10, 6, 14, origin);
  return s;
}

function scanTexture() {
  const c = document.createElement("canvas");
  c.width = 64;
  c.height = 128;
  const g = c.getContext("2d")!;
  const grad = g.createLinearGradient(0, 0, 0, 128);
  grad.addColorStop(0, "rgba(127,231,255,0)");
  grad.addColorStop(0.5, "rgba(127,231,255,0.9)");
  grad.addColorStop(1, "rgba(127,231,255,0)");
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 128);
  return new THREE.CanvasTexture(c);
}

export default function Car3D({ body, colour, trim, onReady, onFail, className }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const api = useRef<{ setColour: (c: string) => void; setTrim: (t: TrimSpec) => void } | null>(null);
  const first = useRef({ colour, trim });

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
    } catch {
      onFail();
      return;
    }
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.95;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.domElement.style.cssText = "width:100%;height:100%;display:block;touch-action:pan-y;cursor:grab";
    el.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const pmrem = new THREE.PMREMGenerator(renderer);
    const envTexture = pmrem.fromScene(studioEnv(), 0.02).texture;
    scene.environment = envTexture;
    scene.environmentIntensity = 0.55;

    const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 60);
    camera.position.set(5.2, 1.55, 5.6);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 0.7, 0);
    controls.enablePan = false;
    controls.enableZoom = false;
    controls.enableDamping = true;
    controls.dampingFactor = 0.07;
    controls.rotateSpeed = 0.7;
    controls.minPolarAngle = 0.95;
    controls.maxPolarAngle = 1.52;
    controls.autoRotate = !reduced;
    controls.autoRotateSpeed = 0.9;
    renderer.domElement.style.touchAction = "pan-y";

    const key = new THREE.DirectionalLight(0xffffff, 1.4);
    key.position.set(4, 7, 3);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.camera.left = -4;
    key.shadow.camera.right = 4;
    key.shadow.camera.top = 4;
    key.shadow.camera.bottom = -4;
    key.shadow.bias = -0.0004;
    key.shadow.radius = 5;
    scene.add(key);
    const rim = new THREE.DirectionalLight(0xcfe8ff, 1.1);
    rim.position.set(-5, 3, -4);
    scene.add(rim);

    const floor = new THREE.Mesh(new THREE.PlaneGeometry(14, 14), new THREE.ShadowMaterial({ opacity: 0.16 }));
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    const blobTex = softShadowTexture();
    const blob = new THREE.Mesh(new THREE.PlaneGeometry(6.2, 3.2), new THREE.MeshBasicMaterial({ map: blobTex, transparent: true, depthWrite: false }));
    blob.rotation.x = -Math.PI / 2;
    blob.position.y = 0.004;
    scene.add(blob);

    let car: CarModel = buildCar(body, first.current.colour);
    scene.add(car.root);
    car.root.traverse((o) => ((o as THREE.Mesh).isMesh ? (o.castShadow = true) : undefined));
    car.snap(first.current.trim);

    const scanTex = scanTexture();
    const scan = new THREE.Mesh(
      new THREE.PlaneGeometry(2.6, 2.2),
      new THREE.MeshBasicMaterial({ map: scanTex, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }),
    );
    scan.rotation.y = Math.PI / 2;
    scan.position.y = 1;
    scan.visible = false;
    scene.add(scan);

    let transition: { start: number } | null = null;
    let idleResume = 0;
    let visible = true;
    let raf = 0;
    let last = performance.now();

    controls.addEventListener("start", () => {
      controls.autoRotate = false;
      renderer.domElement.style.cursor = "grabbing";
    });
    controls.addEventListener("end", () => {
      renderer.domElement.style.cursor = "grab";
      idleResume = performance.now() + 5000;
    });

    const resize = () => {
      const w = el.clientWidth || 1;
      const h = el.clientHeight || 1;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.position.setLength(w / h < 1.2 ? 9 : 7.1);
      camera.updateProjectionMatrix();
    };
    const ro = new ResizeObserver(resize);
    ro.observe(el);
    resize();

    const io = new IntersectionObserver(([e]) => (visible = e.isIntersecting));
    io.observe(el);

    const loop = () => {
      raf = requestAnimationFrame(loop);
      const now = performance.now();
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      if (!visible || document.hidden) return;
      const u = car.paintUniforms;
      if (transition) {
        const t = (performance.now() - transition.start) / 1000 / TRANSITION_S;
        const e = ease(t);
        u.uProg.value = Math.min(1, e);
        const { x0, x1 } = car.bounds;
        scan.visible = e > 0.001 && e < 0.995;
        scan.position.x = x0 + (e * 1.62 - 0.02) * (x1 - x0);
        scan.position.y = (car.bounds.y1 + 0.1) / 2;
        (scan.material as THREE.MeshBasicMaterial).opacity = 0.5 * Math.sin(Math.PI * Math.min(1, e * 1.1));
        controls.autoRotate = !reduced;
        controls.autoRotateSpeed = 5 * Math.sin(Math.PI * Math.min(1, t)) + 0.9;
        if (t >= 1) {
          transition = null;
          u.uProg.value = 1;
          u.uFrom.value.copy(u.uTo.value);
          scan.visible = false;
          controls.autoRotateSpeed = 0.9;
        }
      } else if (!controls.autoRotate && !reduced && idleResume && performance.now() > idleResume) {
        controls.autoRotate = true;
        idleResume = 0;
      }
      car.tick(dt);
      controls.update();
      renderer.render(scene, camera);
    };
    loop();
    onReady();

    api.current = {
      setColour: (c: string) => {
        const u = car.paintUniforms;
        const next = new THREE.Color(c);
        if (u.uTo.value.equals(next)) return;
        if (reduced) {
          u.uFrom.value.copy(next);
          u.uTo.value.copy(next);
          u.uProg.value = 1;
          return;
        }
        u.uFrom.value.copy(u.uTo.value);
        u.uTo.value.copy(next);
        u.uProg.value = 0;
        transition = { start: performance.now() };
      },
      setTrim: (t: TrimSpec) => car.setTrim(t),
    };

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      controls.dispose();
      car.dispose();
      [blobTex, scanTex, envTexture].forEach((t) => t.dispose());
      blob.geometry.dispose();
      (blob.material as THREE.Material).dispose();
      floor.geometry.dispose();
      (floor.material as THREE.Material).dispose();
      scan.geometry.dispose();
      (scan.material as THREE.Material).dispose();
      pmrem.dispose();
      renderer.dispose();
      renderer.domElement.remove();
      api.current = null;
    };
    // The scene is built once per body shape. Colour and trim are pushed in through `api`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [body]);

  useEffect(() => api.current?.setColour(colour), [colour]);
  useEffect(() => api.current?.setTrim(trim), [trim]);

  return <div ref={host} className={className} aria-hidden />;
}

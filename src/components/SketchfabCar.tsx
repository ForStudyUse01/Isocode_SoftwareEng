"use client";

import { useEffect, useRef, useState } from "react";
import { sketchfabFor } from "@/lib/sketchfabCars";

type Material = { id: string; name: string; channels: Record<string, { color?: number[]; enable?: boolean; texture?: unknown; factor?: number; type?: string }> };
type Api = {
  start(): void;
  addEventListener(name: string, cb: () => void): void;
  setCameraConstraints(c: Record<string, unknown>, cb?: () => void): void;
  setEnableCameraConstraints(on: boolean, opts?: Record<string, unknown>): void;
  getMaterialList(cb: (err: unknown, list: Material[]) => void): void;
  setMaterial(m: Material, cb?: () => void): void;
};
declare global {
  interface Window { Sketchfab?: new (iframe: HTMLIFrameElement) => { init(uid: string, opts: Record<string, unknown>): void } }
}

const SDK = "https://static.sketchfab.com/api/sketchfab-viewer-1.12.1.js";
const MS = 2800;

const toLinear = (hex: string) =>
  [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });

function loadSdk() {
  return new Promise<void>((resolve, reject) => {
    if (window.Sketchfab) return resolve();
    const s = document.createElement("script");
    s.src = SDK;
    s.onload = () => resolve();
    s.onerror = reject;
    document.head.appendChild(s);
  });
}

export function SketchfabCar({ body, fuel, colour, tier, tiers, onFail }: { body: "Hatchback" | "Sedan" | "SUV"; fuel?: string; colour: string; tier: number; tiers: number; onFail?: () => void }) {
  const model = sketchfabFor(body, fuel);
  const frame = useRef<HTMLIFrameElement>(null);
  const api = useRef<Api | null>(null);
  const paint = useRef<Material[]>([]);
  const shown = useRef<string>(colour);
  const timer = useRef(0);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let dead = false;
    setReady(false);
    api.current = null;
    loadSdk().then(() => {
      if (dead || !frame.current || !window.Sketchfab) return;
      new window.Sketchfab(frame.current).init(model.uid, {
        autostart: 1, preload: 1, transparent: 1, dnt: 1, ui_infos: 0, ui_controls: 0, ui_watermark: 0, ui_loading: 0, ui_inspector: 0, ui_help: 0, ui_settings: 0, ui_vr: 0, ui_fullscreen: 0, ui_annotations: 0, ui_stop: 0, ui_hint: 0,
        success: (a: Api) => {
          a.start();
          a.addEventListener("viewerready", () => {
            if (dead) return;
            a.getMaterialList((_, list) => {
              if (dead) return;
              paint.current = list.filter((m) => model.paint.test(m.name));
              // Number plates stay invisible.
              for (const m of list.filter((m) => model.plate?.test(m.name))) {
                m.channels.Opacity = { ...m.channels.Opacity, enable: true, factor: 0 };
                a.setMaterial(m);
              }
              api.current = a;
              // Orbit stays above the ground: no looking at the car from below.
              try {
                a.setCameraConstraints({ usePitchConstraints: true, pitchLimitUp: Math.PI / 2 - 0.05, pitchLimitDown: 0.03 }, () => a.setEnableCameraConstraints(true, { preventCameraUnderground: true }));
              } catch {}
              shown.current = model.native;
              setReady(true);
            });
          });
        },
        error: () => onFail?.(),
      });
    }, () => onFail?.());
    return () => { dead = true; cancelAnimationFrame(timer.current); };
  }, [model, onFail]);

  useEffect(() => {
    const a = api.current;
    if (!ready || !a || !paint.current.length) return;
    const from = toLinear(shown.current);
    const to = toLinear(colour);
    shown.current = colour;
    const t0 = performance.now();
    cancelAnimationFrame(timer.current);
    const step = (now: number) => {
      const p = Math.min(1, (now - t0) / MS);
      const e = 0.5 - 0.5 * Math.cos(Math.PI * p);
      const c = from.map((v, i) => v + (to[i] - v) * e);
      for (const m of paint.current) {
        const ch = m.channels.AlbedoPBR ?? m.channels.DiffusePBR ?? m.channels.DiffuseColor;
        if (!ch) continue;
        ch.color = c;
        ch.enable = true;
        ch.texture = undefined;
        a.setMaterial(m);
      }
      if (p < 1) timer.current = requestAnimationFrame(step);
    };
    timer.current = requestAnimationFrame(step);
  }, [colour, ready, model]);

  // Higher variants get a richer finish: metallic clear-coated paint, darker privacy glass, brighter alloys.
  useEffect(() => {
    const a = api.current;
    if (!ready || !a) return;
    const k = tiers > 1 ? tier / (tiers - 1) : 1;
    for (const m of paint.current) {
      const c = m.channels;
      c.MetalnessPBR = { ...c.MetalnessPBR, enable: true, factor: 0.7 * k };
      c.GlossinessPBR = { ...c.GlossinessPBR, enable: true, factor: 0.35 + 0.6 * k };
      c.ClearCoat = { ...c.ClearCoat, enable: k > 0.3, factor: 1 };
      a.setMaterial(m);
    }
    a.getMaterialList((_, list) => {
      const tone = 0.08 + 0.6 * k;
      for (const m of list) {
        if (/glass|vidro/i.test(m.name) && !/light|lamp|farol|lanterna|red/i.test(m.name) && m.channels.Opacity) {
          m.channels.Opacity = { ...m.channels.Opacity, enable: true, factor: 0.3 + 0.5 * k };
          a.setMaterial(m);
        } else if (model.wheels?.test(m.name)) {
          const ch = m.channels.AlbedoPBR ?? m.channels.DiffuseColor;
          if (!ch) continue;
          ch.color = [tone, tone, tone];
          ch.enable = true;
          a.setMaterial(m);
        }
      }
    });
  }, [tier, tiers, ready, model]);

  return (
    // The frame is taller than its box so Sketchfab's own title and control bars fall outside and are clipped.
    <div className="absolute inset-0 overflow-hidden">
      <iframe ref={frame} title={`${model.name} 3D view`} allow="autoplay; fullscreen; xr-spatial-tracking" className={`absolute inset-x-0 -top-16 h-[calc(100%+8rem)] w-full border-0 transition-opacity duration-700 ${ready ? "opacity-100" : "opacity-0"}`} />
      {!ready && <div className="absolute inset-0 grid place-items-center text-sm text-muted">Loading 3D model…</div>}
    </div>
  );
}

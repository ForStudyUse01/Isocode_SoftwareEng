"use client";

import { useEffect, useRef, useState } from "react";
import { Recolorer, type PhotoMeta } from "@/lib/recolor";

const DURATION_MS = 2800;
const ease = (t: number) => 0.5 - 0.5 * Math.cos(Math.PI * Math.min(1, Math.max(0, t)));

export function PhotoStage({ meta, colour, alt }: { meta: PhotoMeta | null; colour: string; alt: string }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const engine = useRef<Recolorer | null>(null);
  const shown = useRef(meta?.paint ?? colour);
  const frame = useRef(0);
  const [ready, setReady] = useState(false);
  const wanted = useRef(colour);
  wanted.current = colour;

  const play = (from: string, to: string) => {
    cancelAnimationFrame(frame.current);
    const gl = engine.current;
    if (!gl) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      gl.draw(to, to, 1);
      shown.current = to;
      return;
    }
    const start = performance.now();
    const step = () => {
      const t = (performance.now() - start) / DURATION_MS;
      if (t >= 1) {
        gl.draw(to, to, 1);
        shown.current = to;
        return;
      }
      gl.draw(from, to, ease(t));
      frame.current = requestAnimationFrame(step);
    };
    step();
  };

  useEffect(() => {
    const el = canvas.current;
    if (!el || !meta) return;
    let live = true;
    let rec: Recolorer;
    try {
      rec = new Recolorer(el);
    } catch (e) {
      console.error("Recolor setup failed: " + String(e));
      return;
    }
    engine.current = rec;

    const fit = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      rec.resize(el.clientWidth * dpr, (el.clientWidth * dpr * meta.height) / meta.width);
      rec.draw(shown.current, shown.current, 1);
    };
    rec.load(meta).catch((e) => console.error("Recolor load failed: " + String(e))).then(() => {
      if (!live) return;
      fit();
      setReady(true);
      play(meta.paint, wanted.current);
    });
    const ro = new ResizeObserver(() => engine.current && fit());
    ro.observe(el);

    return () => {
      live = false;
      cancelAnimationFrame(frame.current);
      ro.disconnect();
      rec.dispose();
      engine.current = null;
    };
    // The engine is built once per photo. Colour changes are handled by the effect below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meta?.src]);

  useEffect(() => {
    if (ready && shown.current !== colour) play(shown.current, colour);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [colour, ready]);

  if (!meta) return <div className="aspect-[3/2] w-full bg-surface" />;

  return (
    <div className="relative w-full overflow-hidden" style={{ aspectRatio: `${meta.width} / ${meta.height}` }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={meta.src} alt={alt} className="absolute inset-0 h-full w-full object-cover" fetchPriority="high" />
      <canvas ref={canvas} className={`absolute inset-0 h-full w-full transition-opacity duration-500 ${ready ? "opacity-100" : "opacity-0"}`} aria-hidden />
    </div>
  );
}

"use client";

import { useCallback, useState } from "react";
import { CarImage } from "@/components/CarImage";
import { SketchfabCar } from "@/components/SketchfabCar";

type Props = { body: "Hatchback" | "Sedan" | "SUV"; fuel?: string; colour: string; tier?: number; tiers?: number; alt: string };

// Interactive 3D model; shows the pre-rendered image if the viewer cannot load.
export function Car3DView({ body, fuel, colour, tier = 0, tiers = 1, alt }: Props) {
  const [failed, setFailed] = useState(false);
  const fail = useCallback(() => setFailed(true), []);
  return (
    <div className="relative aspect-[16/9] overflow-hidden rounded-3xl bg-[radial-gradient(ellipse_at_50%_70%,#ffffff_0%,#f3f3f0_62%,#e6e6e2_100%)] shadow-card">
      {failed ? <CarImage body={body} fuel={fuel} colour={colour} alt={alt} className="h-full !aspect-auto" /> : <SketchfabCar body={body} fuel={fuel} colour={colour} tier={tier} tiers={tiers} onFail={fail} />}
    </div>
  );
}

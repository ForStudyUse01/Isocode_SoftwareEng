"use client";

import { useState } from "react";
import { carImage } from "@/lib/carImages";

export function CarImage({ body, fuel, colour, alt, className = "" }: { body: "Hatchback" | "Sedan" | "SUV"; fuel?: string; colour: string; alt: string; className?: string }) {
  const { src, fallback } = carImage(body, fuel, colour);
  const [broken, setBroken] = useState(false);
  return (
    <div className={`relative aspect-[16/10] w-full bg-[radial-gradient(ellipse_at_50%_75%,#ffffff_0%,#f4f4f1_62%,#e8e8e4_100%)] ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={broken ? fallback : src} alt={alt} loading="lazy" onError={() => setBroken(true)} className="absolute inset-0 h-full w-full object-contain p-3 drop-shadow-[0_14px_14px_rgb(0_0_0/0.18)]" />
    </div>
  );
}

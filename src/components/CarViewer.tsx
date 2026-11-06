"use client";

import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import { CarStage } from "@/components/CarStage";
import { trimSpec, type Body, type Trim } from "@/components/CarArt";

const Car3D = dynamic(() => import("@/components/car3d/Car3D"), { ssr: false });

export function CarViewer({ body, colour, trim, label }: { body: Body; colour: string; trim: Trim; label: string }) {
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const { tier, tiers, fuel, transmission } = trim;
  const spec = useMemo(() => trimSpec({ tier, tiers, fuel, transmission }, body), [tier, tiers, fuel, transmission, body]);
  const showSvg = !ready || failed;

  return (
    <div className="relative h-full w-full">
      <div className={`absolute inset-0 grid place-items-center transition-opacity duration-700 ${showSvg ? "opacity-100" : "pointer-events-none opacity-0"}`}>
        <CarStage body={body} colour={colour} trim={{ tier, tiers, fuel, transmission }} className="w-full" />
      </div>
      {!failed && <Car3D className="absolute inset-0" body={body} colour={colour} trim={spec} onReady={() => setReady(true)} onFail={() => setFailed(true)} />}
      {ready && !failed && <span className="pointer-events-none absolute bottom-3 right-4 rounded-full bg-white/80 px-3 py-1 text-xs text-muted backdrop-blur">{label}</span>}
    </div>
  );
}

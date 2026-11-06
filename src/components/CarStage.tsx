"use client";

import { useEffect, useRef, useState } from "react";
import { CarArt, type Body, type Trim } from "@/components/CarArt";

const SWEEP_MS = 1700;

export function CarStage({ body, colour, trim, className }: { body: Body; colour: string; trim: Trim; className?: string }) {
  const [from, setFrom] = useState<string | undefined>();
  const [key, setKey] = useState(0);
  const shown = useRef(colour);

  useEffect(() => {
    if (colour === shown.current) return;
    setFrom(shown.current);
    shown.current = colour;
    setKey((k) => k + 1);
    const timer = setTimeout(() => setFrom(undefined), SWEEP_MS);
    return () => clearTimeout(timer);
  }, [colour]);

  return (
    <div className="[perspective:900px]">
      <div key={key} className={from ? "stage-tilt" : ""}>
        <CarArt body={body} colour={colour} fromColour={from} animKey={key} trim={trim} reflection className={className} />
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { renderStatic, type PhotoMeta } from "@/lib/recolor";

export function CarPhoto({ meta, colour, alt, className = "" }: { meta: PhotoMeta | null; colour: string; alt: string; className?: string }) {
  const [url, setUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!meta) return;
    let live = true;
    renderStatic(meta, colour)
      .then((u) => live && setUrl(u))
      .catch(() => live && setFailed(true));
    return () => {
      live = false;
    };
  }, [meta, colour]);

  if (!meta) return <div className={`aspect-[3/2] w-full bg-surface ${className}`} />;

  const src = failed ? meta.src : url;
  return (
    <div className={`relative w-full overflow-hidden ${className}`} style={{ aspectRatio: `${meta.width} / ${meta.height}` }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {src && <img src={src} alt={alt} loading="lazy" className="absolute inset-0 h-full w-full object-cover" />}
    </div>
  );
}

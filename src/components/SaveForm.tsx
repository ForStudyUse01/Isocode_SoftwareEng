"use client";

import { useActionState } from "react";
import type { SaveState } from "@/app/actions/admin";

export function SaveForm({ action, children, label = "Save", className = "", compact = false }: { action: (s: SaveState, f: FormData) => Promise<SaveState>; children: React.ReactNode; label?: string; className?: string; compact?: boolean }) {
  const [state, act, pending] = useActionState(action, {} as SaveState);
  return (
    <form action={act} className={className} aria-busy={pending}>
      {children}
      <div className={`flex items-center gap-3 ${compact ? "" : "mt-1"}`}>
        <button className="btn btn-ghost min-h-10 px-5" disabled={pending}>{pending ? "Saving..." : label}</button>
        {state.ok && <span role="status" className="text-sm text-ok">Saved</span>}
        {state.error && <span role="alert" className="text-sm text-danger">{state.error}</span>}
      </div>
    </form>
  );
}

export function NumberInput({ name, label, defaultValue, step = 1, min = 0, hint }: { name: string; label: string; defaultValue: number | string; step?: number | string; min?: number; hint?: string }) {
  return (
    <div>
      <label htmlFor={`${name}-${defaultValue}`} className="label text-xs">{label}</label>
      <input id={`${name}-${defaultValue}`} name={name} type="number" inputMode="decimal" step={step} min={min} defaultValue={defaultValue} className="field" required />
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </div>
  );
}

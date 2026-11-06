"use client";

import { useEffect, useState } from "react";

export function slaState(dueAt: string, createdAt: string, respondedAt: string | null, now: number) {
  const due = Date.parse(dueAt);
  if (respondedAt) {
    const mins = Math.max(0, Math.round((Date.parse(respondedAt) - Date.parse(createdAt)) / 60000));
    return { kind: Date.parse(respondedAt) <= due ? "met" : "late", mins, ms: 0 } as const;
  }
  const ms = due - now;
  return { kind: ms >= 0 ? "running" : "breached", mins: 0, ms } as const;
}

const clock = (ms: number) => {
  const total = Math.abs(Math.floor(ms / 1000));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
};

const humanOver = (ms: number) => {
  const mins = Math.floor(Math.abs(ms) / 60000);
  return mins >= 60 ? `${Math.floor(mins / 60)}h ${mins % 60}m` : `${mins}m`;
};

export function SlaTimer({ dueAt, createdAt, respondedAt, serverNow, active = true }: { dueAt: string; createdAt: string; respondedAt: string | null; serverNow: string; active?: boolean }) {
  const [now, setNow] = useState(Date.parse(serverNow));
  const live = !respondedAt && active;

  useEffect(() => {
    if (!live) return;
    const id = setInterval(() => setNow((n) => n + 1000), 1000);
    return () => clearInterval(id);
  }, [live]);

  if (!respondedAt && !active) return <span className="text-xs text-muted">Closed</span>;
  const s = slaState(dueAt, createdAt, respondedAt, now);

  const style = { running: "bg-amber-50 text-warn", breached: "bg-red-50 text-danger", met: "bg-green-50 text-ok", late: "bg-surface text-muted" }[s.kind];
  const text = { running: `${clock(s.ms)} left`, breached: `Overdue ${humanOver(s.ms)}`, met: `Replied in ${s.mins}m`, late: `Replied in ${s.mins}m (late)` }[s.kind];

  return <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium tabular-nums ${style}`}><span aria-hidden className={`size-1.5 rounded-full bg-current ${s.kind === "running" ? "animate-pulse" : ""}`} />{text}</span>;
}

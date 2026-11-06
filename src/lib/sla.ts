export type SlaState =
  | { kind: "met" | "late"; mins: number; ms: 0 }
  | { kind: "running" | "breached"; mins: 0; ms: number };

export function slaState(dueAt: string, createdAt: string, respondedAt: string | null, now: number): SlaState {
  const due = Date.parse(dueAt);
  if (respondedAt) {
    const mins = Math.max(0, Math.round((Date.parse(respondedAt) - Date.parse(createdAt)) / 60000));
    return { kind: Date.parse(respondedAt) <= due ? "met" : "late", mins, ms: 0 };
  }
  const ms = due - now;
  return { kind: ms >= 0 ? "running" : "breached", mins: 0, ms };
}

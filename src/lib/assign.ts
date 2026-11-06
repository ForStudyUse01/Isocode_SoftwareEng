export type Consultant = {
  id: number;
  showroomId: number | null;
  modelIds: number[];
  openLeads: number;
  lastAssignedAt: string | null;
};

export type AssignResult = { consultantId: number; reason: "showroom+model" | "showroom" | "model" | "load" } | null;

const TIERS = ["showroom+model", "showroom", "model", "load"] as const;

function tierOf(c: Consultant, lead: { showroomId: number | null; modelId: number | null }) {
  const showroomMatch = lead.showroomId !== null && c.showroomId === lead.showroomId;
  const modelMatch = lead.modelId !== null && c.modelIds.includes(lead.modelId);
  if (showroomMatch && modelMatch) return 0;
  if (showroomMatch) return 1;
  if (modelMatch) return 2;
  return 3;
}

export function assignLead(lead: { showroomId: number | null; modelId: number | null }, consultants: Consultant[]): AssignResult {
  if (consultants.length === 0) return null;

  const ranked = [...consultants].sort((a, b) => {
    return (
      tierOf(a, lead) - tierOf(b, lead) ||
      a.openLeads - b.openLeads ||
      (a.lastAssignedAt ?? "").localeCompare(b.lastAssignedAt ?? "") ||
      a.id - b.id
    );
  });
  const best = ranked[0];
  return { consultantId: best.id, reason: TIERS[tierOf(best, lead)] };
}

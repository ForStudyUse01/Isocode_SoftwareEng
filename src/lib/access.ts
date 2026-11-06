import "server-only";
import { eq } from "drizzle-orm";
import { db, schema as s } from "@/db";
import type { SessionUser } from "@/lib/auth";

export type LeadRow = typeof s.leads.$inferSelect;

export function canSeeLead(user: SessionUser, lead: Pick<LeadRow, "assignedTo" | "showroomId">) {
  if (user.role === "admin") return true;
  if (user.role !== "consultant") return false;
  return lead.assignedTo === user.id || (lead.assignedTo === null && lead.showroomId === user.showroomId);
}

export async function loadLeadFor(user: SessionUser, id: number) {
  const [lead] = await db.select().from(s.leads).where(eq(s.leads.id, id));
  return lead && canSeeLead(user, lead) ? lead : null;
}

import "server-only";
import { randomBytes } from "node:crypto";
import { after } from "next/server";
import { and, count, eq, gte, isNull, max, notInArray } from "drizzle-orm";
import { db, schema as s } from "@/db";
import { assignLead } from "@/lib/assign";
import { generateLeadAssist, rulesDraft, rulesSummary, type LeadContext } from "@/lib/ai";
import type { LeadInput } from "@/lib/validation";

export const SLA_MINUTES = 5;
const DUPLICATE_WINDOW_MS = 24 * 60 * 60 * 1000;

type Db = Pick<typeof db, "select" | "insert" | "update">;

export type CreatedLead = { leadId: number; duplicate: boolean; consultantId: number | null; consultantName: string | null };

const siteUrl = () => process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

function acknowledgement(locale: "en" | "hi", first: string, consultant: string, token: string) {
  const link = `${siteUrl()}/opt-out/${token}`;
  return locale === "hi"
    ? `नमस्ते ${first}, ब्रांड X लखनऊ से संपर्क करने के लिए धन्यवाद। ${consultant} जल्द ही आपसे संपर्क करेंगे। संदेश बंद करने के लिए: ${link}`
    : `Hello ${first}, thank you for contacting Brand X Lucknow. ${consultant} will contact you shortly. To stop messages: ${link}`;
}

async function consultantPool(dbc: Db) {
  const [users, links, loads, lasts] = await Promise.all([
    dbc.select().from(s.users).where(eq(s.users.role, "consultant")),
    dbc.select().from(s.consultantModels),
    dbc.select({ id: s.leads.assignedTo, n: count() }).from(s.leads).where(notInArray(s.leads.status, ["won", "lost"])).groupBy(s.leads.assignedTo),
    dbc.select({ id: s.leads.assignedTo, at: max(s.leads.createdAt) }).from(s.leads).groupBy(s.leads.assignedTo),
  ]);
  return users.map((u) => ({
    id: u.id,
    name: u.name,
    showroomId: u.showroomId,
    modelIds: links.filter((l) => l.userId === u.id).map((l) => l.modelId),
    openLeads: loads.find((l) => l.id === u.id)?.n ?? 0,
    lastAssignedAt: lasts.find((l) => l.id === u.id)?.at ?? null,
  }));
}

export async function createLead(dbc: Db, input: LeadInput): Promise<CreatedLead> {
  const since = new Date(Date.now() - DUPLICATE_WINDOW_MS).toISOString();
  const [dup] = await dbc
    .select({ id: s.leads.id, assignedTo: s.leads.assignedTo })
    .from(s.leads)
    .where(and(eq(s.leads.phone, input.phone), eq(s.leads.interest, input.interest), gte(s.leads.createdAt, since), input.modelId ? eq(s.leads.modelId, input.modelId) : isNull(s.leads.modelId)))
    .limit(1);

  if (dup) {
    await dbc.insert(s.leadEvents).values({ leadId: dup.id, type: "repeat", note: "Repeat enquiry within 24 hours merged into this lead" });
    const [owner] = dup.assignedTo ? await dbc.select().from(s.users).where(eq(s.users.id, dup.assignedTo)) : [];
    return { leadId: dup.id, duplicate: true, consultantId: owner?.id ?? null, consultantName: owner?.name ?? null };
  }

  let showroomId = input.showroomId ?? null;
  if (!showroomId && input.usedCarId) {
    const [car] = await dbc.select({ showroomId: s.usedCars.showroomId }).from(s.usedCars).where(eq(s.usedCars.id, input.usedCarId));
    showroomId = car?.showroomId ?? null;
  }

  const now = new Date();
  const pool = await consultantPool(dbc);
  const pick = assignLead({ showroomId, modelId: input.modelId ?? null }, pool);
  const consultant = pool.find((c) => c.id === pick?.consultantId) ?? null;

  const [lead] = await dbc
    .insert(s.leads)
    .values({
      name: input.name, phone: input.phone, email: input.email ?? null, locale: input.locale, source: input.source, interest: input.interest,
      modelId: input.modelId ?? null, usedCarId: input.usedCarId ?? null, showroomId, city: input.city ?? null, message: input.message ?? null,
      budget: input.budget ?? null, tradeIn: input.tradeIn ?? null, assignedTo: consultant?.id ?? null, consentAt: now.toISOString(),
      optOutToken: randomBytes(16).toString("hex"), slaDueAt: new Date(now.getTime() + SLA_MINUTES * 60_000).toISOString(),
    })
    .returning();

  await dbc.insert(s.leadEvents).values([
    { leadId: lead.id, type: "created", note: `Lead received from ${input.source}` },
    { leadId: lead.id, type: consultant ? "assigned" : "unassigned", note: consultant ? `Auto-assigned to ${consultant.name} (${pick!.reason})` : "No consultant available. Needs manual assignment." },
  ]);

  const ctx = await leadContext(dbc, lead.id);
  await dbc
    .update(s.leads)
    .set({ aiSummary: ctx ? rulesSummary(ctx) : null, aiDraft: ctx ? rulesDraft(ctx) : null, aiSource: "rules" })
    .where(eq(s.leads.id, lead.id));

  await dbc.insert(s.messages).values({
    leadId: lead.id, channel: "whatsapp", kind: "acknowledgement",
    body: acknowledgement(input.locale, input.name.split(" ")[0], consultant?.name ?? "Our team", lead.optOutToken),
  });

  return { leadId: lead.id, duplicate: false, consultantId: consultant?.id ?? null, consultantName: consultant?.name ?? null };
}

export async function leadContext(dbc: Db, leadId: number): Promise<LeadContext | null> {
  const [lead] = await dbc.select().from(s.leads).where(eq(s.leads.id, leadId));
  if (!lead) return null;
  const [model] = lead.modelId ? await dbc.select().from(s.carModels).where(eq(s.carModels.id, lead.modelId)) : [];
  const [used] = lead.usedCarId ? await dbc.select().from(s.usedCars).where(eq(s.usedCars.id, lead.usedCarId)) : [];
  const [showroom] = lead.showroomId ? await dbc.select().from(s.showrooms).where(eq(s.showrooms.id, lead.showroomId)) : [];
  const [consultant] = lead.assignedTo ? await dbc.select().from(s.users).where(eq(s.users.id, lead.assignedTo)) : [];
  const [drive] = await dbc.select().from(s.testDrives).where(and(eq(s.testDrives.leadId, leadId), eq(s.testDrives.status, "booked"))).limit(1);

  return {
    firstName: lead.name.split(" ")[0],
    locale: lead.locale,
    interest: lead.interest,
    vehicle: used ? `${used.year} ${used.model} ${used.variant}` : (model?.name ?? null),
    budget: lead.budget,
    message: lead.message,
    tradeIn: lead.tradeIn,
    testDrive: drive ? new Date(drive.startsAt).toLocaleString("en-IN", { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" }) : null,
    showroom: showroom?.name ?? null,
    consultant: consultant?.name ?? "the Brand X team",
  };
}

export async function runAssist(leadId: number) {
  const ctx = await leadContext(db, leadId);
  if (!ctx) return null;
  const out = await generateLeadAssist(ctx);
  await db.update(s.leads).set({ aiSummary: out.summary, aiDraft: out.draft, aiSource: out.source }).where(eq(s.leads.id, leadId));
  if (out.removed > 0) {
    await db.insert(s.leadEvents).values({ leadId, type: "guardrail", note: `Removed ${out.removed} sentence(s) quoting discounts or prices from the AI draft` });
  }
  return out;
}

export function scheduleAssist(leadId: number) {
  after(() => runAssist(leadId).catch(() => undefined));
}

export async function closeOptOut(leadId: number) {
  await db.update(s.leads).set({ optedOut: true }).where(eq(s.leads.id, leadId));
  await db.insert(s.leadEvents).values({ leadId, type: "opt_out", note: "Buyer opted out of further contact (DPDP)" });
}

export const OPEN_STATUSES = ["new", "contacted", "test_drive", "negotiation"] as const;
export const isOpen = (status: string) => (OPEN_STATUSES as readonly string[]).includes(status);

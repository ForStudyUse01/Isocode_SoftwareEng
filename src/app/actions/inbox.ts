"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db, schema as s } from "@/db";
import { requireRole } from "@/lib/auth";
import { loadLeadFor } from "@/lib/access";
import { sanitizeDraft } from "@/lib/guardrails";
import { runAssist, createLead } from "@/lib/leads";
import { csvToObjects } from "@/lib/csv";
import { fieldErrors, leadInput } from "@/lib/validation";

export type ActionState = { ok?: boolean; error?: string; detail?: string[] };

const idSchema = z.coerce.number().int().positive();

async function authorised(formData: FormData) {
  const user = await requireRole(["consultant", "admin"], "/inbox");
  const id = idSchema.safeParse(formData.get("leadId"));
  if (!id.success) return null;
  const lead = await loadLeadFor(user, id.data);
  return lead ? { user, lead } : null;
}

export async function sendReply(_: ActionState, formData: FormData): Promise<ActionState> {
  const ctx = await authorised(formData);
  if (!ctx) return { error: "Lead not found or not assigned to you." };
  const { user, lead } = ctx;
  if (lead.optedOut) return { error: "This buyer has opted out. Do not contact them." };

  const body = z.string().trim().min(10).max(1000).safeParse(formData.get("body"));
  if (!body.success) return { error: "Write a reply of at least 10 characters." };
  if (sanitizeDraft(body.data).removed > 0) return { error: "The first reply must not quote discounts, offers or prices. Remove that wording and send again." };

  await db.insert(s.messages).values({ leadId: lead.id, channel: "whatsapp", kind: "reply", body: body.data });
  await db.insert(s.leadEvents).values({ leadId: lead.id, type: "replied", note: `Reply sent by ${user.name}`, actorId: user.id });
  await db
    .update(s.leads)
    .set({ firstResponseAt: lead.firstResponseAt ?? new Date().toISOString(), status: lead.status === "new" ? "contacted" : lead.status })
    .where(eq(s.leads.id, lead.id));

  revalidatePath(`/inbox/${lead.id}`);
  revalidatePath("/inbox");
  return { ok: true };
}

export async function setStatus(formData: FormData) {
  const ctx = await authorised(formData);
  const status = z.enum(s.LEAD_STATUSES).safeParse(formData.get("status"));
  if (!ctx || !status.success || ctx.lead.status === status.data) return;

  await db.update(s.leads).set({ status: status.data, firstResponseAt: ctx.lead.firstResponseAt ?? (status.data !== "new" ? new Date().toISOString() : null) }).where(eq(s.leads.id, ctx.lead.id));
  await db.insert(s.leadEvents).values({ leadId: ctx.lead.id, type: "status", note: `Status ${ctx.lead.status} to ${status.data}`, actorId: ctx.user.id });
  revalidatePath(`/inbox/${ctx.lead.id}`);
  revalidatePath("/inbox");
}

export async function reassign(formData: FormData) {
  const ctx = await authorised(formData);
  const to = idSchema.safeParse(formData.get("consultantId"));
  if (!ctx || !to.success) return;

  const [target] = await db.select().from(s.users).where(eq(s.users.id, to.data));
  if (!target || target.role !== "consultant") return;

  await db.update(s.leads).set({ assignedTo: target.id }).where(eq(s.leads.id, ctx.lead.id));
  await db.insert(s.leadEvents).values({ leadId: ctx.lead.id, type: "reassigned", note: `Reassigned to ${target.name} by ${ctx.user.name}`, actorId: ctx.user.id });
  revalidatePath("/inbox");
  revalidatePath(`/inbox/${ctx.lead.id}`);
}

export async function regenerateAssist(formData: FormData) {
  const ctx = await authorised(formData);
  if (!ctx) return;
  await runAssist(ctx.lead.id);
  revalidatePath(`/inbox/${ctx.lead.id}`);
}

const MAX_ROWS = 500;

export async function importLeads(_: ActionState, formData: FormData): Promise<ActionState> {
  await requireRole(["consultant", "admin"], "/inbox/import");
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: "Choose a CSV file." };
  if (file.size > 1_000_000) return { error: "File is larger than 1 MB." };

  const rows = csvToObjects(await file.text());
  if (rows.length === 0) return { error: "No rows found. The first line must be a header." };
  if (rows.length > MAX_ROWS) return { error: `Too many rows. Import at most ${MAX_ROWS} at a time.` };

  const [models, showrooms] = await Promise.all([db.select().from(s.carModels), db.select().from(s.showrooms)]);
  let created = 0;
  let duplicates = 0;
  const problems: string[] = [];

  for (const [i, r] of rows.entries()) {
    const model = models.find((m) => m.name.toLowerCase() === (r.model ?? "").toLowerCase());
    const showroom = showrooms.find((x) => r.showroom && x.name.toLowerCase().includes(r.showroom.toLowerCase()));
    const source = (s.LEAD_SOURCES as readonly string[]).includes(r.source) ? r.source : "portal";
    const parsed = leadInput.safeParse({
      name: r.name, phone: r.phone ?? "", email: r.email ?? "", source, interest: r.interest || "new", modelId: model?.id, showroomId: showroom?.id,
      city: r.city, message: r.message, budget: r.budget, consent: true,
    });
    if (!parsed.success) {
      problems.push(`Row ${i + 2}: ${Object.keys(fieldErrors(parsed.error)).join(", ")} invalid`);
      continue;
    }
    if (r.model && !model) problems.push(`Row ${i + 2}: model "${r.model}" not found, imported without a model`);
    const res = await createLead(db, parsed.data);
    if (res.duplicate) duplicates++;
    else created++;
  }

  revalidatePath("/inbox");
  return { ok: true, detail: [`${created} imported`, `${duplicates} duplicates merged`, ...problems.slice(0, 20)] };
}

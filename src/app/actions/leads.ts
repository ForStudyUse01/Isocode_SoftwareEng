"use server";

import { headers } from "next/headers";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db, schema as s } from "@/db";
import { getLocale } from "@/lib/i18n";
import { getUser } from "@/lib/auth";
import { rateLimited } from "@/lib/rateLimit";
import { fieldErrors, formToObject, leadInput } from "@/lib/validation";
import { createLead, scheduleAssist } from "@/lib/leads";
import { isValidSlot } from "@/lib/slots";

export type LeadState = {
  ok?: boolean;
  error?: "fixFields" | "tooManyRequests" | "generic" | "tdSlotTaken";
  fields?: Record<string, string>;
  consultant?: string | null;
  summary?: string;
};

const ip = async () => (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";

const isUnique = (e: unknown) => /UNIQUE|constraint/i.test(`${(e as Error)?.message ?? ""} ${((e as { cause?: Error })?.cause?.message) ?? ""}`);

export async function submitLead(_: LeadState, formData: FormData): Promise<LeadState> {
  if (formData.get("website")) return { ok: true };
  if (rateLimited(`lead:${await ip()}`, 6, 60 * 60_000)) return { error: "tooManyRequests" };

  const parsed = leadInput.safeParse({ ...formToObject(formData), locale: await getLocale(), source: "web" });
  if (!parsed.success) return { error: "fixFields", fields: fieldErrors(parsed.error) };

  try {
    const user = await getUser();
    const result = await db.transaction(async (tx) => createLead(tx as unknown as typeof db, parsed.data));
    if (user?.role === "buyer") await db.update(s.leads).set({ userId: user.id }).where(eq(s.leads.id, result.leadId));
    if (!result.duplicate) scheduleAssist(result.leadId);
    return { ok: true, consultant: result.consultantName };
  } catch {
    return { error: "generic" };
  }
}

const driveInput = z.object({ demoCarId: z.coerce.number().int().positive(), startsAt: z.string().datetime({ offset: true }) });

export type DriveState = LeadState & { booking?: { car: string; showroom: string; startsAt: string } };

export async function bookTestDrive(_: DriveState, formData: FormData): Promise<DriveState> {
  if (formData.get("website")) return { ok: true };
  if (rateLimited(`drive:${await ip()}`, 6, 60 * 60_000)) return { error: "tooManyRequests" };

  const drive = driveInput.safeParse(Object.fromEntries(formData));
  const locale = await getLocale();
  if (!drive.success) return { error: "fixFields", fields: { startsAt: "Choose a slot" } };

  const [demo] = await db
    .select({ id: s.demoCars.id, label: s.demoCars.label, showroomId: s.demoCars.showroomId, showroom: s.showrooms.name, modelId: s.variants.modelId })
    .from(s.demoCars)
    .innerJoin(s.showrooms, eq(s.demoCars.showroomId, s.showrooms.id))
    .innerJoin(s.variants, eq(s.demoCars.variantId, s.variants.id))
    .where(eq(s.demoCars.id, drive.data.demoCarId));
  if (!demo) return { error: "generic" };

  const startsAt = new Date(drive.data.startsAt).toISOString();
  if (!isValidSlot(startsAt)) return { error: "tdSlotTaken" };

  const parsed = leadInput.safeParse({
    ...formToObject(formData), locale, source: "web", interest: "test_drive", modelId: demo.modelId, showroomId: demo.showroomId, city: "Lucknow",
  });
  if (!parsed.success) return { error: "fixFields", fields: fieldErrors(parsed.error) };

  try {
    const user = await getUser();
    const result = await db.transaction(async (tx) => {
      const created = await createLead(tx as unknown as typeof db, parsed.data);
      await tx.insert(s.testDrives).values({ demoCarId: demo.id, startsAt, leadId: created.leadId });
      await tx.update(s.leads).set({ status: "test_drive", userId: user?.role === "buyer" ? user.id : undefined }).where(and(eq(s.leads.id, created.leadId), eq(s.leads.status, "new")));
      await tx.insert(s.leadEvents).values({ leadId: created.leadId, type: "test_drive", note: `Test drive booked: ${demo.label} at ${demo.showroom}` });
      await tx.insert(s.messages).values({
        leadId: created.leadId, channel: "sms", kind: "confirmation",
        body: `Brand X: test drive confirmed for ${demo.label} at ${demo.showroom}, ${new Date(startsAt).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" })}. Bring your driving licence.`,
      });
      return created;
    });
    if (!result.duplicate) scheduleAssist(result.leadId);
    return { ok: true, consultant: result.consultantName, booking: { car: demo.label, showroom: demo.showroom, startsAt } };
  } catch (e) {
    return { error: isUnique(e) ? "tdSlotTaken" : "generic" };
  }
}

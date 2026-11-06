"use server";

import { revalidatePath } from "next/cache";
import { and, count, eq, ne } from "drizzle-orm";
import { z } from "zod";
import { db, schema as s } from "@/db";
import { requireRole } from "@/lib/auth";

export type SaveState = { ok?: boolean; error?: string };

const bool = z.preprocess((v) => v === "on" || v === "true", z.boolean());
const id = z.coerce.number().int().positive();
const money = z.coerce.number().int().min(0).max(100_000_000);
const pctField = z.coerce.number().min(0).max(40);
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

async function guarded<T extends z.ZodType>(schema: T, formData: FormData, paths: string[], run: (data: z.infer<T>) => Promise<SaveState | void>): Promise<SaveState> {
  await requireRole(["admin"], "/admin");
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: `Check ${parsed.error.issues.map((i) => String(i.path[0])).join(", ")}` };
  try {
    const result = await run(parsed.data);
    if (result?.error) return result;
  } catch (e) {
    return { error: /UNIQUE/i.test(String(e) + String((e as { cause?: unknown })?.cause)) ? "That value already exists." : "Could not save." };
  }
  paths.forEach((p) => revalidatePath(p, "layout"));
  return { ok: true };
}

const slugify = (v: string) => v.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export async function createModel(_: SaveState, f: FormData) {
  return guarded(
    z.object({ name: z.string().trim().min(2).max(40), bodyType: z.enum(["Hatchback", "Sedan", "SUV"]), tagline: z.string().trim().min(3).max(100), description: z.string().trim().min(10).max(600) }),
    f, ["/new-cars", "/admin"],
    async (d) => { await db.insert(s.carModels).values({ ...d, slug: slugify(d.name), published: false }); },
  );
}

export async function updateModel(_: SaveState, f: FormData) {
  return guarded(
    z.object({ id, name: z.string().trim().min(2).max(40), tagline: z.string().trim().min(3).max(100), description: z.string().trim().min(10).max(600), published: bool }),
    f, ["/new-cars", "/"],
    async ({ id: modelId, ...d }) => { await db.update(s.carModels).set(d).where(eq(s.carModels.id, modelId)); },
  );
}

export async function createVariant(_: SaveState, f: FormData) {
  return guarded(
    z.object({ modelId: id, name: z.string().trim().min(1).max(40), fuel: z.enum(s.FUELS), transmission: z.enum(["Manual", "Automatic"]), exShowroom: money.min(100_000), accessories: money, mileage: z.string().trim().min(2).max(30) }),
    f, ["/new-cars", "/admin"],
    async (d) => { await db.insert(s.variants).values({ ...d, specs: "[]" }); },
  );
}

export async function updateVariant(_: SaveState, f: FormData) {
  return guarded(
    z.object({ id, exShowroom: money.min(100_000), accessories: money, published: bool }),
    f, ["/new-cars"],
    async ({ id: variantId, ...d }) => { await db.update(s.variants).set(d).where(eq(s.variants.id, variantId)); },
  );
}

export async function updatePriceRule(_: SaveState, f: FormData) {
  return guarded(
    z.object({ id, roadTaxPct: pctField, luxuryTaxPct: pctField, registrationFee: money.max(100_000), insurancePct: pctField, validTill: isoDate }),
    f, ["/new-cars", "/admin/prices"],
    async ({ id: ruleId, ...d }) => { await db.update(s.priceRules).set(d).where(eq(s.priceRules.id, ruleId)); },
  );
}

export async function extendValidity(_: SaveState, f: FormData) {
  return guarded(z.object({ validTill: isoDate }), f, ["/new-cars", "/admin/prices"], async (d) => { await db.update(s.priceRules).set(d); });
}

export async function updateSettings(_: SaveState, f: FormData) {
  return guarded(
    z.object({ luxuryThreshold: money, tcsThreshold: money, tcsPct: pctField, defaultLoanRate: z.coerce.number().min(1).max(30), priceNote: z.string().trim().min(10).max(300) }),
    f, ["/new-cars", "/used-cars", "/emi", "/admin/prices"],
    async (d) => {
      for (const [key, value] of Object.entries(d)) {
        await db.insert(s.settings).values({ key, value: String(value) }).onConflictDoUpdate({ target: s.settings.key, set: { value: String(value) } });
      }
    },
  );
}

const usedFields = {
  price: money.min(50_000),
  status: z.enum(["available", "booked", "sold"]),
  published: bool,
};

export async function updateUsedCar(_: SaveState, f: FormData) {
  return guarded(z.object({ id, ...usedFields }), f, ["/used-cars", "/", "/admin/used"], async ({ id: carId, ...d }) => { await db.update(s.usedCars).set(d).where(eq(s.usedCars.id, carId)); });
}

export async function createUsedCar(_: SaveState, f: FormData) {
  return guarded(
    z.object({
      stockId: z.string().trim().regex(/^[A-Z]{2}-\d{3,6}$/, "stockId"), model: z.string().trim().min(2).max(40), variant: z.string().trim().min(1).max(40),
      bodyType: z.enum(["Hatchback", "Sedan", "SUV"]), fuel: z.enum(s.FUELS), year: z.coerce.number().int().min(2005).max(new Date().getFullYear() + 1),
      km: money.max(500_000), owners: z.coerce.number().int().min(1).max(6), regNo: z.string().trim().min(8).max(14), colour: z.string().trim().min(3).max(30),
      colourHex: z.string().regex(/^#[0-9a-fA-F]{6}$/), price: usedFields.price, showroomId: id,
    }),
    f, ["/used-cars", "/admin/used"],
    async (d) => { await db.insert(s.usedCars).values({ ...d, regNo: d.regNo.toUpperCase().replace(/\s/g, ""), status: "available", inspection: JSON.stringify([]) }); },
  );
}

export async function updateUser(_: SaveState, f: FormData) {
  return guarded(
    z.object({ id, role: z.enum(s.ROLES), showroomId: z.preprocess((v) => (v === "" ? null : v), z.coerce.number().int().positive().nullable()) }),
    f, ["/admin/users"],
    async ({ id: userId, role, showroomId }) => {
      const [target] = await db.select().from(s.users).where(eq(s.users.id, userId));
      if (!target) return { error: "User not found." };
      if (target.role === "admin" && role !== "admin") {
        const [{ n }] = await db.select({ n: count() }).from(s.users).where(and(eq(s.users.role, "admin"), ne(s.users.id, userId)));
        if (n === 0) return { error: "Keep at least one admin." };
      }
      await db.update(s.users).set({ role, showroomId: role === "consultant" ? showroomId : null }).where(eq(s.users.id, userId));
    },
  );
}

export async function createPromo(_: SaveState, f: FormData) {
  return guarded(
    z.object({ kind: z.enum(["banner", "offer"]), title: z.string().trim().min(3).max(80), body: z.string().trim().min(5).max(240), ctaLabel: z.string().trim().max(30).optional(), ctaHref: z.string().trim().regex(/^\//, "ctaHref").optional() }),
    f, ["/", "/admin/promos"],
    async (d) => { await db.insert(s.promos).values({ ...d, ctaLabel: d.ctaLabel || null, ctaHref: d.ctaHref || null }); },
  );
}

export async function togglePromo(_: SaveState, f: FormData) {
  return guarded(z.object({ id, active: bool }), f, ["/", "/admin/promos"], async ({ id: promoId, active }) => { await db.update(s.promos).set({ active }).where(eq(s.promos.id, promoId)); });
}

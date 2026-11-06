import "server-only";
import { cache } from "react";
import { and, asc, eq, lte, inArray, sql } from "drizzle-orm";
import { db, schema as s } from "@/db";
import { computeOnRoad, type OnRoadPrice, type PriceRule, type TaxSettings } from "@/lib/pricing";

export type Settings = TaxSettings & { priceNote: string; defaultLoanRate: number };

export const getSettings = cache(async (): Promise<Settings> => {
  const rows = await db.select().from(s.settings);
  const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  return {
    luxuryThreshold: Number(map.luxuryThreshold ?? 1_000_000),
    tcsThreshold: Number(map.tcsThreshold ?? 1_000_000),
    tcsPct: Number(map.tcsPct ?? 1),
    defaultLoanRate: Number(map.defaultLoanRate ?? 9.5),
    priceNote: map.priceNote ?? "Prices may change without notice.",
  };
});

export const getPriceRules = cache(async () => {
  const rows = await db.select().from(s.priceRules);
  const byKey = new Map<string, PriceRule>(rows.map((r) => [`${r.city}|${r.fuel}`, r]));
  const cities = [...new Set(rows.map((r) => r.city))].sort();
  return { byKey, cities };
});

export type VariantView = {
  id: number;
  name: string;
  label: string;
  fuel: string;
  transmission: string;
  exShowroom: number;
  mileage: string;
  seats: number;
  specs: [string, string][];
  onRoad: Record<string, { withAccessories: OnRoadPrice | null; withoutAccessories: OnRoadPrice | null }>;
};

export async function listModels() {
  const models = await db.select().from(s.carModels).where(eq(s.carModels.published, true)).orderBy(asc(s.carModels.id));
  const variants = await db.select().from(s.variants).where(eq(s.variants.published, true));
  const colours = await db.select().from(s.modelColours);
  return models.map((m) => {
    const vs = variants.filter((v) => v.modelId === m.id);
    return {
      ...m,
      fromPrice: vs.length ? Math.min(...vs.map((v) => v.exShowroom)) : null,
      fuels: [...new Set(vs.map((v) => v.fuel))],
      colour: colours.find((c) => c.modelId === m.id)?.hex ?? "#c3c6ca",
    };
  });
}

export async function getModel(slug: string) {
  const [model] = await db.select().from(s.carModels).where(and(eq(s.carModels.slug, slug), eq(s.carModels.published, true)));
  if (!model) return null;

  const [variantRows, colours, settings, rules] = await Promise.all([
    db.select().from(s.variants).where(and(eq(s.variants.modelId, model.id), eq(s.variants.published, true))).orderBy(asc(s.variants.exShowroom)),
    db.select().from(s.modelColours).where(eq(s.modelColours.modelId, model.id)),
    getSettings(),
    getPriceRules(),
  ]);

  const variants: VariantView[] = variantRows.map((v) => ({
    id: v.id,
    name: v.name,
    label: `${v.name} · ${v.fuel}${v.transmission === "Automatic" && !/auto|AMT/i.test(v.name) ? " · Automatic" : ""}`,
    fuel: v.fuel,
    transmission: v.transmission,
    exShowroom: v.exShowroom,
    mileage: v.mileage,
    seats: v.seats,
    specs: JSON.parse(v.specs) as [string, string][],
    onRoad: Object.fromEntries(
      rules.cities.map((city) => {
        const rule = rules.byKey.get(`${city}|${v.fuel}`);
        return [
          city,
          {
            withAccessories: computeOnRoad(v, rule, settings, true),
            withoutAccessories: computeOnRoad(v, rule, settings, false),
          },
        ];
      }),
    ),
  }));

  return { model, colours, variants, cities: rules.cities, settings };
}

export type UsedFilters = { model?: string; fuel?: string; maxPrice?: number; maxKm?: number };

export async function listUsedCars(f: UsedFilters = {}, limit?: number) {
  const conds = [eq(s.usedCars.published, true), inArray(s.usedCars.status, ["available", "booked"])];
  if (f.model) conds.push(eq(s.usedCars.model, f.model));
  if (f.fuel) conds.push(eq(s.usedCars.fuel, f.fuel as (typeof s.FUELS)[number]));
  if (f.maxPrice) conds.push(lte(s.usedCars.price, f.maxPrice));
  if (f.maxKm) conds.push(lte(s.usedCars.km, f.maxKm));

  const q = db
    .select({ car: s.usedCars, showroom: s.showrooms.name })
    .from(s.usedCars)
    .innerJoin(s.showrooms, eq(s.usedCars.showroomId, s.showrooms.id))
    .where(and(...conds))
    .orderBy(sql`case ${s.usedCars.status} when 'available' then 0 else 1 end`, asc(s.usedCars.price));
  return limit ? q.limit(limit) : q;
}

export async function getUsedCar(stockId: string) {
  const [row] = await db
    .select({ car: s.usedCars, showroom: s.showrooms })
    .from(s.usedCars)
    .innerJoin(s.showrooms, eq(s.usedCars.showroomId, s.showrooms.id))
    .where(and(eq(s.usedCars.stockId, stockId), eq(s.usedCars.published, true)));
  return row ?? null;
}

export async function usedFilterOptions() {
  const rows = await db.select({ model: s.usedCars.model, fuel: s.usedCars.fuel }).from(s.usedCars).where(eq(s.usedCars.published, true));
  return { models: [...new Set(rows.map((r) => r.model))].sort(), fuels: [...new Set(rows.map((r) => r.fuel))].sort() };
}

export const getShowrooms = cache(() => db.select().from(s.showrooms).orderBy(asc(s.showrooms.id)));

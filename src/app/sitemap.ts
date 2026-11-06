import type { MetadataRoute } from "next";
import { eq } from "drizzle-orm";
import { db, schema as s } from "@/db";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const [models, used] = await Promise.all([
    db.select({ slug: s.carModels.slug }).from(s.carModels).where(eq(s.carModels.published, true)),
    db.select({ stockId: s.usedCars.stockId }).from(s.usedCars).where(eq(s.usedCars.published, true)),
  ]);
  const fixed = ["", "/new-cars", "/used-cars", "/test-drive", "/emi", "/trade-in"];
  return [
    ...fixed.map((p) => ({ url: `${base}${p}`, changeFrequency: "weekly" as const })),
    ...models.map((m) => ({ url: `${base}/new-cars/${m.slug}`, changeFrequency: "weekly" as const })),
    ...used.map((u) => ({ url: `${base}/used-cars/${u.stockId}`, changeFrequency: "daily" as const })),
  ];
}

import type { Metadata } from "next";
import { eq } from "drizzle-orm";
import { db, schema as s } from "@/db";
import { getT } from "@/lib/i18n";
import { getUser } from "@/lib/auth";
import { getShowrooms } from "@/lib/queries";
import { bookableDates } from "@/lib/slots";
import { TestDriveBooker } from "@/components/TestDriveBooker";

export const metadata: Metadata = {
  title: "Book a test drive",
  description: "Choose a showroom, a demo car and a time slot. Instant confirmation, no phone call needed.",
  alternates: { canonical: "/test-drive" },
};

export default async function TestDrivePage({ searchParams }: { searchParams: Promise<{ model?: string }> }) {
  const { model } = await searchParams;
  const [{ t, locale }, user, showrooms] = await Promise.all([getT(), getUser(), getShowrooms()]);
  const cars = await db
    .select({ id: s.demoCars.id, showroomId: s.demoCars.showroomId, label: s.demoCars.label, modelSlug: s.carModels.slug })
    .from(s.demoCars)
    .innerJoin(s.variants, eq(s.demoCars.variantId, s.variants.id))
    .innerJoin(s.carModels, eq(s.variants.modelId, s.carModels.id));

  return (
    <div className="container-page max-w-3xl py-12 sm:py-16">
      <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{t("tdTitle")}</h1>
      <p className="mt-3 text-muted">{t("how2d")}</p>
      <div className="mt-10">
        <TestDriveBooker locale={locale} showrooms={showrooms} cars={cars} dates={bookableDates()} preferModel={model} prefill={user ? { name: user.name } : undefined} />
      </div>
    </div>
  );
}

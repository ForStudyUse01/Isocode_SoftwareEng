import type { Metadata } from "next";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { getT } from "@/lib/i18n";
import { LeadForm } from "@/components/LeadForm";

export const metadata: Metadata = { title: "Trade-in valuation", description: "Request a valuation for your current car.", alternates: { canonical: "/trade-in" } };

export default async function TradeIn({ searchParams }: { searchParams: Promise<{ buy?: string }> }) {
  const { buy } = await searchParams;
  const { t, locale } = await getT();
  const [car] = buy ? await db.select().from(schema.usedCars).where(eq(schema.usedCars.stockId, buy)) : [];
  return (
    <div className="container-page max-w-xl py-12 sm:py-16">
      <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{t("tradeInTitle")}</h1>
      <p className="mt-3 text-muted">{t("tradeInSub")}</p>
      <div className="mt-8">
        <LeadForm locale={locale} hidden={{ interest: "trade_in", city: "Lucknow", ...(car ? { usedCarId: car.id } : {}) }} tradeIn messageLabel={t("tradeInInterest")} />
      </div>
    </div>
  );
}

import type { Metadata } from "next";
import { getT } from "@/lib/i18n";
import { getSettings } from "@/lib/queries";
import { EmiCalculator } from "@/components/EmiCalculator";

export const metadata: Metadata = { title: "EMI calculator", description: "Work out the monthly EMI for a new or used car.", alternates: { canonical: "/emi" } };

export default async function EmiPage({ searchParams }: { searchParams: Promise<{ price?: string }> }) {
  const { price } = await searchParams;
  const { t, locale } = await getT();
  const settings = await getSettings();
  const initial = Math.min(5_000_000, Math.max(300_000, Math.round(Number(price) / 10000) * 10000 || 1_000_000));
  return (
    <div className="container-page py-12 sm:py-16">
      <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{t("emiTitle")}</h1>
      <div className="mt-10"><EmiCalculator locale={locale} initialPrice={initial} defaultRate={settings.defaultLoanRate} /></div>
    </div>
  );
}

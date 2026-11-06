import type { Metadata } from "next";
import Link from "next/link";
import { getT } from "@/lib/i18n";
import { getSettings, listUsedCars, usedFilterOptions } from "@/lib/queries";
import { UsedCard } from "@/components/Cards";

export const metadata: Metadata = {
  title: "Certified used cars",
  description: "Inspected, certified used cars in Lucknow with published inspection reports, owner history and kilometres.",
  alternates: { canonical: "/used-cars" },
};

const PRICE_STEPS = [500000, 750000, 1000000, 1250000];
const KM_STEPS = [30000, 50000, 70000];

const num = (v: string | string[] | undefined) => {
  const n = Number(Array.isArray(v) ? v[0] : v);
  return Number.isFinite(n) && n > 0 ? n : undefined;
};
const str = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) || undefined;

export default async function UsedCars({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const { t, locale } = await getT();
  const filters = { model: str(sp.model), fuel: str(sp.fuel), maxPrice: num(sp.maxPrice), maxKm: num(sp.maxKm) };
  const [cars, options, settings] = await Promise.all([listUsedCars(filters), usedFilterOptions(), getSettings()]);
  const active = Object.values(filters).some(Boolean);

  const select = (name: string, label: string, values: { value: string | number; text: string }[], current?: string | number) => (
    <div>
      <label htmlFor={name} className="label">{label}</label>
      <select id={name} name={name} defaultValue={current ?? ""} className="field">
        <option value="">{t("any")}</option>
        {values.map((v) => <option key={v.value} value={v.value}>{v.text}</option>)}
      </select>
    </div>
  );

  return (
    <div className="container-page py-12 sm:py-16">
      <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{t("usedTitle")}</h1>
      <p className="mt-3 max-w-2xl text-muted">{t("usedSub")}</p>

      <form method="get" className="mt-8 grid gap-4 rounded-2xl border border-line p-4 sm:grid-cols-2 sm:p-5 lg:grid-cols-[repeat(4,1fr)_auto] lg:items-end">
        {select("model", t("filterModel"), options.models.map((m) => ({ value: m, text: m })), filters.model)}
        {select("fuel", t("filterFuel"), options.fuels.map((f) => ({ value: f, text: f })), filters.fuel)}
        {select("maxPrice", t("filterMaxPrice"), PRICE_STEPS.map((p) => ({ value: p, text: `₹${(p / 100000).toFixed(p % 100000 ? 2 : 0)} lakh` })), filters.maxPrice)}
        {select("maxKm", t("filterMaxKm"), KM_STEPS.map((k) => ({ value: k, text: `${k.toLocaleString("en-IN")} km` })), filters.maxKm)}
        <div className="flex gap-2 sm:col-span-2 lg:col-span-1">
          <button className="btn btn-primary flex-1">{t("apply")}</button>
          {active && <Link href="/used-cars" className="btn btn-ghost">{t("clearFilters")}</Link>}
        </div>
      </form>

      {cars.length === 0 ? (
        <div className="mt-10 rounded-2xl bg-surface p-10 text-center">
          <p className="font-medium">{t("noResults")}</p>
          <Link href="/used-cars" className="btn btn-ghost mt-4">{t("clearFilters")}</Link>
        </div>
      ) : (
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {cars.map(({ car, showroom }) => <UsedCard key={car.id} locale={locale} car={car} showroom={showroom} defaultRate={settings.defaultLoanRate} />)}
        </div>
      )}
    </div>
  );
}

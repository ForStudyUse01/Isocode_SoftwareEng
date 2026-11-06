import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getT } from "@/lib/i18n";
import { getSettings, getUsedCar } from "@/lib/queries";
import { CarViewer } from "@/components/CarViewer";
import { LeadForm } from "@/components/LeadForm";
import { JsonLd } from "@/components/JsonLd";
import { EmiCalculator } from "@/components/EmiCalculator";
import { km, rupees } from "@/lib/format";
import { maskRegistration } from "@/lib/mask";

type Params = { params: Promise<{ stockId: string }> };
type Check = { item: string; result: "ok" | "attention"; note: string };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const row = await getUsedCar((await params).stockId);
  if (!row) return {};
  const { car } = row;
  return {
    title: `${car.year} ${car.model} ${car.variant} ${car.fuel}, ${km(car.km)}`,
    description: `Certified used ${car.model} ${car.variant} ${car.fuel}, ${car.year}, ${km(car.km)}, ${car.owners} owner. ${rupees(car.price)} with a published inspection report.`,
    alternates: { canonical: `/used-cars/${car.stockId}` },
  };
}

export default async function UsedCarPage({ params }: Params) {
  const { stockId } = await params;
  const [row, { t, locale }, settings] = await Promise.all([getUsedCar(stockId), getT(), getSettings()]);
  if (!row) notFound();
  const { car, showroom } = row;
  const checks = JSON.parse(car.inspection) as Check[];
  const passed = checks.filter((c) => c.result === "ok").length;
  const open = car.status !== "sold";

  const facts: [string, string][] = [
    [t("year"), String(car.year)],
    [t("kmDriven"), km(car.km)],
    [t("owners"), String(car.owners)],
    [t("fuel"), car.fuel],
    [t("colour"), car.colour],
    [t("registrationNo"), maskRegistration(car.regNo)],
    [t("showroom"), showroom.name],
    [t("stockId"), car.stockId],
  ];

  return (
    <div className="container-page py-10 sm:py-14">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Car",
          name: `${car.year} ${car.model} ${car.variant}`,
          brand: { "@type": "Brand", name: "Brand X" },
          vehicleModelDate: String(car.year),
          mileageFromOdometer: { "@type": "QuantitativeValue", value: car.km, unitCode: "KMT" },
          fuelType: car.fuel,
          offers: { "@type": "Offer", priceCurrency: "INR", price: car.price, availability: car.status === "available" ? "https://schema.org/InStock" : "https://schema.org/SoldOut", itemCondition: "https://schema.org/UsedCondition" },
        }}
      />
      <Link href="/used-cars" className="text-sm text-muted hover:text-ink">← {t("navUsed")}</Link>

      <div className="mt-6 grid gap-10 lg:grid-cols-[1.15fr_1fr] lg:gap-14">
        <div>
          <div className="relative aspect-[16/10] overflow-hidden rounded-3xl bg-[radial-gradient(ellipse_at_50%_70%,#ffffff_0%,#f3f3f0_62%,#e6e6e2_100%)]">
            <CarViewer body={car.bodyType} colour={car.colourHex} label={t("dragRotate")} trim={{ tier: 1, tiers: 3, fuel: car.fuel, transmission: "Manual" }} />
          </div>

          <h2 className="mt-12 text-xl font-semibold tracking-tight">{t("inspection")}</h2>
          <p className="mt-1 text-sm text-muted">{t("inspectionScore", { ok: passed, total: checks.length })}</p>
          <ul className="mt-4 divide-y divide-line rounded-2xl border border-line">
            {checks.map((c) => (
              <li key={c.item} className="flex items-start justify-between gap-4 px-4 py-3 text-sm">
                <div>
                  <p className="font-medium">{c.item}</p>
                  {c.result === "attention" && <p className="mt-0.5 text-muted">{c.note}</p>}
                </div>
                <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${c.result === "ok" ? "bg-green-50 text-ok" : "bg-amber-50 text-warn"}`}>
                  {c.result === "ok" ? t("inspectionOk") : t("inspectionAttention")}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className="lg:sticky lg:top-24 lg:self-start">
          <p className="eyebrow">{t("stockId")} {car.stockId}</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">{car.year} {car.model} {car.variant}</h1>
          <p className="mt-4 text-4xl font-semibold tracking-tight tabular-nums">{rupees(car.price)}</p>
          {car.status === "booked" && <p className="mt-3 rounded-lg bg-amber-50 p-3 text-sm text-warn">{t("carBooked")}</p>}
          {car.status === "sold" && <p className="mt-3 rounded-lg bg-surface p-3 text-sm">{t("carSold")}</p>}

          <dl className="mt-6 divide-y divide-line rounded-2xl border border-line">
            {facts.map(([k, v]) => (
              <div key={k} className="flex justify-between gap-4 px-4 py-3 text-sm">
                <dt className="text-muted">{k}</dt>
                <dd className="font-medium">{v}</dd>
              </div>
            ))}
          </dl>

          {open && (
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <a href="#enquire" className="btn btn-primary">{t("enquire")}</a>
              <Link href={`/trade-in?buy=${car.stockId}`} className="btn btn-ghost">{t("tradeInThis")}</Link>
            </div>
          )}
        </div>
      </div>

      <section className="mt-20">
        <h2 className="text-2xl font-semibold tracking-tight">{t("emiTitle")}</h2>
        <div className="mt-6"><EmiCalculator locale={locale} initialPrice={car.price} defaultRate={settings.defaultLoanRate + 1.5} compact /></div>
      </section>

      {open && (
        <section id="enquire" className="mx-auto mt-20 max-w-xl scroll-mt-24">
          <LeadForm locale={locale} hidden={{ usedCarId: car.id, interest: "used", city: "Lucknow", showroomId: car.showroomId }} title={t("enquiryTitle", { car: `${car.model} ${car.variant}` })} showBudget />
        </section>
      )}
    </div>
  );
}

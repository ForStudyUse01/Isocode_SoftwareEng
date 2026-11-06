import Link from "next/link";
import { CarArt } from "@/components/CarArt";
import { makeT, type Locale } from "@/lib/dict";
import { km, rupees } from "@/lib/format";
import { computeEmi } from "@/lib/emi";

export function ModelCard({ locale, model }: { locale: Locale; model: { slug: string; name: string; bodyType: "Hatchback" | "Sedan" | "SUV"; tagline: string; fromPrice: number | null; fuels: string[]; colour: string } }) {
  const t = makeT(locale);
  return (
    <Link href={`/new-cars/${model.slug}`} className="group card overflow-hidden transition hover:shadow-card">
      <div className="grid aspect-[16/10] place-items-center bg-gradient-to-b from-surface to-white p-6">
        <CarArt body={model.bodyType} colour={model.colour} className="w-full max-w-xs transition-transform duration-500 group-hover:scale-[1.03]" />
      </div>
      <div className="p-5">
        <p className="eyebrow">{model.bodyType} · {model.fuels.join(" / ")}</p>
        <h3 className="mt-1.5 text-lg font-semibold tracking-tight">{model.name}</h3>
        <p className="mt-1 text-sm text-muted">{model.tagline}</p>
        {model.fromPrice && (
          <p className="mt-4 text-sm"><span className="text-muted">{t("from")} </span><span className="font-semibold">{rupees(model.fromPrice)}</span> <span className="text-muted">{t("exShowroom")}</span></p>
        )}
      </div>
    </Link>
  );
}

export type UsedCardData = { stockId: string; model: string; variant: string; bodyType: "Hatchback" | "Sedan" | "SUV"; fuel: string; year: number; km: number; owners: number; price: number; status: "available" | "booked" | "sold"; colourHex: string };

export function UsedCard({ locale, car, showroom, defaultRate }: { locale: Locale; car: UsedCardData; showroom: string; defaultRate: number }) {
  const t = makeT(locale);
  const emi = computeEmi({ price: car.price, downPayment: Math.round((car.price * 0.2) / 10000) * 10000, annualRatePct: defaultRate + 1.5, months: 48 }).emi;
  return (
    <Link href={`/used-cars/${car.stockId}`} className="group card overflow-hidden transition hover:shadow-card">
      <div className="relative grid aspect-[16/10] place-items-center bg-gradient-to-b from-surface to-white p-6">
        <CarArt body={car.bodyType} colour={car.colourHex} className="w-full max-w-xs transition-transform duration-500 group-hover:scale-[1.03]" />
        {car.status === "booked" && <span className="absolute right-3 top-3 rounded-full bg-ink px-3 py-1 text-xs font-medium text-white">{t("booked")}</span>}
      </div>
      <div className="p-5">
        <p className="eyebrow">{car.year} · {km(car.km)} · {car.fuel}</p>
        <h3 className="mt-1.5 text-lg font-semibold tracking-tight">{car.model} {car.variant}</h3>
        <p className="mt-1 text-sm text-muted">{car.owners} {t("owners").toLowerCase()} · {showroom}</p>
        <div className="mt-4 flex items-baseline justify-between gap-3">
          <span className="text-xl font-semibold tracking-tight">{rupees(car.price)}</span>
          <span className="text-xs text-muted">{t("emiFrom", { amount: rupees(emi) })}</span>
        </div>
      </div>
    </Link>
  );
}

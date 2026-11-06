"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { CarArt } from "@/components/CarArt";
import { computeEmi } from "@/lib/emi";
import { dateLabel, rupees } from "@/lib/format";
import { makeT, type Locale } from "@/lib/dict";
import type { VariantView } from "@/lib/queries";

type Props = {
  locale: Locale;
  slug: string;
  bodyType: "Hatchback" | "Sedan" | "SUV";
  colours: { id: number; name: string; hex: string }[];
  variants: VariantView[];
  cities: string[];
  defaultRate: number;
  initialVariantId?: number;
};

const CITY_KEY = "preferred-city";

export function ModelExplorer({ locale, slug, bodyType, colours, variants, cities, defaultRate, initialVariantId }: Props) {
  const t = makeT(locale);
  const [colourId, setColourId] = useState(colours[0]?.id);
  const [variantId, setVariantId] = useState(initialVariantId && variants.some((v) => v.id === initialVariantId) ? initialVariantId : variants[0]?.id);
  const [city, setCity] = useState(cities.includes("Lucknow") ? "Lucknow" : cities[0]);
  const [accessories, setAccessories] = useState(true);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(CITY_KEY);
      if (saved && cities.includes(saved)) setCity(saved);
    } catch {}
  }, [cities]);

  const colour = colours.find((c) => c.id === colourId) ?? colours[0];
  const variant = variants.find((v) => v.id === variantId) ?? variants[0];
  const entry = variant?.onRoad[city];
  const price = entry ? (accessories ? entry.withAccessories : entry.withoutAccessories) : null;

  const emi = useMemo(() => {
    if (!price || price.expired) return null;
    return computeEmi({ price: price.total, downPayment: Math.round((price.total * 0.2) / 10000) * 10000, annualRatePct: defaultRate, months: 60 }).emi;
  }, [price, defaultRate]);

  if (!variant) return null;

  return (
    <div className="grid gap-10 lg:grid-cols-[1.15fr_1fr] lg:gap-14">
      <div>
        <div className="grid aspect-[16/10] place-items-center rounded-3xl bg-gradient-to-b from-surface to-white p-6 sm:p-10">
          <CarArt body={bodyType} colour={colour.hex} className="w-full max-w-xl drop-shadow-sm" />
        </div>
        <div className="mt-5 flex flex-wrap items-center gap-3" role="radiogroup" aria-label={t("colour")}>
          <span className="text-sm text-muted">{t("colour")}: <span className="font-medium text-ink">{colour.name}</span></span>
          {colours.map((c) => (
            <button key={c.id} type="button" role="radio" aria-checked={c.id === colourId} aria-label={c.name} title={c.name} onClick={() => setColourId(c.id)}
              className={`size-9 rounded-full border border-black/10 ring-offset-2 transition ${c.id === colourId ? "ring-2 ring-ink" : "hover:ring-2 hover:ring-line"}`} style={{ background: c.hex }} />
          ))}
        </div>

        <h2 className="mt-12 text-xl font-semibold tracking-tight">{t("specs")}</h2>
        <dl className="mt-4 divide-y divide-line rounded-2xl border border-line">
          {[[t("fuel"), variant.fuel], [t("transmission"), variant.transmission], [t("seats"), String(variant.seats)], [t("mileage"), variant.mileage], ...variant.specs].map(([k, v]) => (
            <div key={k} className="grid grid-cols-[9rem_1fr] gap-4 px-4 py-3 text-sm sm:grid-cols-[12rem_1fr]">
              <dt className="text-muted">{k}</dt>
              <dd>{v}</dd>
            </div>
          ))}
        </dl>
      </div>

      <div className="lg:sticky lg:top-24 lg:self-start">
        <p className="label">{t("variant")}</p>
        <div className="grid gap-2" role="radiogroup" aria-label={t("variant")}>
          {variants.map((v) => (
            <button key={v.id} type="button" role="radio" aria-checked={v.id === variantId} onClick={() => setVariantId(v.id)}
              className={`flex items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left text-sm transition ${v.id === variantId ? "border-ink bg-white shadow-card" : "border-line hover:border-ink/40"}`}>
              <span className="font-medium">{v.label}</span>
              <span className="text-muted">{rupees(v.exShowroom)}</span>
            </button>
          ))}
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="city" className="label">{t("city")}</label>
            <select id="city" value={city} className="field" onChange={(e) => { setCity(e.target.value); try { localStorage.setItem(CITY_KEY, e.target.value); } catch {} }}>
              {cities.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
          <label className="flex cursor-pointer items-end gap-3 pb-2.5 text-sm">
            <input type="checkbox" checked={accessories} onChange={(e) => setAccessories(e.target.checked)} className="size-5 accent-[var(--color-accent)]" />
            {t("includeAccessories")}
          </label>
        </div>

        <section aria-live="polite" className="mt-6 rounded-2xl border border-line p-5 sm:p-6">
          <h2 className="text-sm font-medium text-muted">{t("priceBreakup")} · {city}</h2>
          {!price ? (
            <p className="mt-4 rounded-lg bg-surface p-4 text-sm">{t("priceUnavailable", { city })}</p>
          ) : (
            <>
              <dl className={`mt-4 grid gap-2.5 text-sm ${price.expired ? "opacity-50" : ""}`}>
                {price.lines.map((l) => (
                  <div key={l.key} className="flex justify-between gap-4">
                    <dt className="text-muted">{l.key === "exShowroom" ? t("exShowroom") : t(l.key)}</dt>
                    <dd className="tabular-nums">{rupees(l.amount)}</dd>
                  </div>
                ))}
              </dl>
              {price.expired ? (
                <p role="alert" className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-warn">{t("priceExpired", { date: dateLabel(price.validTill) })}</p>
              ) : (
                <>
                  <div className="mt-4 flex items-baseline justify-between gap-4 border-t border-line pt-4">
                    <span className="font-medium">{t("total")}</span>
                    <span className="text-3xl font-semibold tracking-tight tabular-nums">{rupees(price.total)}</span>
                  </div>
                  <p className="mt-3 text-xs leading-relaxed text-muted">{t("priceNotice", { date: dateLabel(price.validTill) })}</p>
                </>
              )}
            </>
          )}
        </section>

        {emi !== null && price && (
          <Link href={`/emi?price=${price.total}`} className="mt-4 flex items-center justify-between rounded-xl bg-accent-soft px-4 py-3 text-sm font-medium text-accent-dark hover:bg-accent-soft/70">
            <span>{t("emiFrom", { amount: rupees(emi) })}</span>
            <span>{t("calcEmi")} →</span>
          </Link>
        )}

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <Link href={`/test-drive?model=${slug}`} className="btn btn-primary">{t("bookTestDrive")}</Link>
          <a href="#enquire" className="btn btn-ghost">{t("enquire")}</a>
        </div>
      </div>
    </div>
  );
}

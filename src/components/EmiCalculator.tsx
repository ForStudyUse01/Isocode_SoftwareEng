"use client";

import { useMemo, useState } from "react";
import { computeEmi } from "@/lib/emi";
import { rupees } from "@/lib/format";
import { makeT, type Locale } from "@/lib/dict";

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, Number.isFinite(n) ? n : lo));

export function EmiCalculator({ locale, initialPrice = 1000000, defaultRate = 9.5, compact = false }: { locale: Locale; initialPrice?: number; defaultRate?: number; compact?: boolean }) {
  const t = makeT(locale);
  const [price, setPrice] = useState(initialPrice);
  const [down, setDown] = useState(Math.round((initialPrice * 0.2) / 10000) * 10000);
  const [rate, setRate] = useState(defaultRate);
  const [months, setMonths] = useState(60);

  const r = useMemo(() => computeEmi({ price, downPayment: Math.min(down, price), annualRatePct: rate, months }), [price, down, rate, months]);
  const principalShare = r.totalPayable > 0 ? Math.round((r.loan / r.totalPayable) * 100) : 100;

  return (
    <div className={`grid gap-8 ${compact ? "" : "md:grid-cols-[1.1fr_1fr]"}`}>
      <div className="grid gap-6">
        <Slider id="price" label={t("carPrice")} value={price} min={300000} max={5000000} step={10000} onChange={(v) => { setPrice(v); setDown((d) => Math.min(d, v)); }} display={rupees(price)} />
        <Slider id="down" label={t("downPayment")} value={Math.min(down, price)} min={0} max={price} step={10000} onChange={setDown} display={rupees(Math.min(down, price))} />
        <Slider id="rate" label={t("interestRate")} value={rate} min={6} max={18} step={0.1} onChange={setRate} display={`${rate.toFixed(1)}%`} />
        <div>
          <p className="label">{t("tenure")}</p>
          <div role="radiogroup" aria-label={t("tenure")} className="flex flex-wrap gap-2">
            {[36, 48, 60, 72, 84].map((m) => (
              <button key={m} type="button" role="radio" aria-checked={months === m} onClick={() => setMonths(m)} className={`btn min-h-10 px-4 ${months === m ? "bg-ink text-white" : "btn-ghost"}`}>{m}</button>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-2xl bg-surface p-6 sm:p-8" aria-live="polite">
        <p className="eyebrow">{t("monthlyEmi")}</p>
        <p className="mt-2 text-4xl font-semibold tracking-tight sm:text-5xl">{rupees(r.emi)}</p>
        <div className="mt-6 h-2 overflow-hidden rounded-full bg-line" role="img" aria-label={`${principalShare}% principal`}>
          <div className="h-full bg-accent" style={{ width: `${principalShare}%` }} />
        </div>
        <dl className="mt-6 grid gap-3 text-sm">
          <Row k={t("loanAmount")} v={rupees(r.loan)} />
          <Row k={t("totalInterest")} v={rupees(r.totalInterest)} />
          <Row k={t("totalPayable")} v={rupees(r.totalPayable)} strong />
        </dl>
        <p className="mt-6 text-xs text-muted">{t("emiNote")}</p>
      </div>
    </div>
  );
}

function Row({ k, v, strong }: { k: string; v: string; strong?: boolean }) {
  return (
    <div className={`flex justify-between gap-4 ${strong ? "border-t border-line pt-3 font-semibold" : ""}`}>
      <dt className="text-muted">{k}</dt>
      <dd>{v}</dd>
    </div>
  );
}

function Slider({ id, label, value, min, max, step, onChange, display }: { id: string; label: string; value: number; min: number; max: number; step: number; onChange: (n: number) => void; display: string }) {
  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between gap-4">
        <label htmlFor={id} className="text-sm font-medium">{label}</label>
        <span className="text-base font-semibold">{display}</span>
      </div>
      <input id={id} type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(clamp(Number(e.target.value), min, max))} className="h-2 w-full cursor-pointer accent-[var(--color-accent)]" />
    </div>
  );
}

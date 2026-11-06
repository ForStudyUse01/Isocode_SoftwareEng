"use client";

import { useCallback, useEffect, useState } from "react";
import { bookTestDrive, type DriveState } from "@/app/actions/leads";
import { ConsentField, TextField } from "@/components/LeadForm";
import { useFormAction } from "@/components/useFormAction";
import { makeT, type Locale } from "@/lib/dict";
import { dateTimeLabel } from "@/lib/format";
import type { Slot } from "@/lib/slots";

type Props = {
  locale: Locale;
  showrooms: { id: number; name: string; address: string }[];
  cars: { id: number; showroomId: number; label: string; modelSlug: string }[];
  dates: string[];
  preferModel?: string;
  prefill?: { name: string };
};

const dayLabel = (d: string, locale: Locale) =>
  new Date(`${d}T12:00:00+05:30`).toLocaleDateString(locale === "hi" ? "hi-IN" : "en-IN", { weekday: "short", day: "numeric", month: "short", timeZone: "Asia/Kolkata" });

export function TestDriveBooker({ locale, showrooms, cars, dates, preferModel, prefill }: Props) {
  const t = makeT(locale);
  const preferred = cars.find((c) => c.modelSlug === preferModel);
  const [showroomId, setShowroomId] = useState(preferred?.showroomId ?? showrooms[0].id);
  const [carId, setCarId] = useState<number | null>(preferred?.id ?? null);
  const [date, setDate] = useState(dates[0]);
  const [slots, setSlots] = useState<Slot[] | null>(null);
  const [slot, setSlot] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const { state, pending, onSubmit, onChange, fields: f, bannerError } = useFormAction<DriveState>(bookTestDrive, {});

  const showroomCars = cars.filter((c) => c.showroomId === showroomId);
  const activeCar = carId && showroomCars.some((c) => c.id === carId) ? carId : showroomCars[0]?.id ?? null;

  const load = useCallback(
    async (advance: boolean) => {
      if (!activeCar) return;
      setLoading(true);
      setLoadError(false);
      let day = date;
      try {
        for (let i = 0; i < 3; i++) {
          const res = await fetch(`/api/slots?demoCarId=${activeCar}&date=${day}`, { cache: "no-store" });
          if (!res.ok) throw new Error();
          const { slots: found } = (await res.json()) as { slots: Slot[] };
          const next = dates[dates.indexOf(day) + 1];
          if (advance && !found.some((s) => s.available) && next) {
            day = next;
            continue;
          }
          setSlots(found);
          if (day !== date) setDate(day);
          return;
        }
      } catch {
        setLoadError(true);
        setSlots(null);
      } finally {
        setLoading(false);
      }
    },
    [activeCar, date, dates],
  );

  useEffect(() => {
    setSlot(null);
    void load(false);
  }, [activeCar, date]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (state.error === "tdSlotTaken") {
      setSlot(null);
      void load(false);
    }
  }, [state]); // eslint-disable-line react-hooks/exhaustive-deps

  if (state.ok && state.booking) {
    return (
      <div role="status" className="rounded-3xl bg-accent-soft p-8">
        <p className="text-2xl font-semibold tracking-tight text-accent-dark">{t("tdDone")}</p>
        <p className="mt-3 leading-relaxed">{t("tdDoneBody", { car: state.booking.car, showroom: state.booking.showroom, when: dateTimeLabel(state.booking.startsAt), consultant: state.consultant ?? "Our team" })}</p>
        <p className="mt-2 text-sm text-muted">{t("tdBring")}</p>
        <a href="/test-drive" className="btn btn-ghost mt-6">{t("tdAnother")}</a>
      </div>
    );
  }


  return (
    <form onSubmit={onSubmit} onChange={onChange} noValidate className="grid gap-10" aria-busy={pending}>
      <input type="hidden" name="demoCarId" value={activeCar ?? ""} />
      <input type="hidden" name="startsAt" value={slot ?? ""} />
      <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden className="hidden" />

      <Step n={1} title={t("tdStep1")}>
        <div className="grid gap-3 sm:grid-cols-3" role="radiogroup" aria-label={t("tdShowroom")}>
          {showrooms.map((s) => (
            <button key={s.id} type="button" role="radio" aria-checked={s.id === showroomId} onClick={() => setShowroomId(s.id)}
              className={`rounded-xl border p-4 text-left text-sm transition ${s.id === showroomId ? "border-ink shadow-card" : "border-line hover:border-ink/40"}`}>
              <p className="font-medium">{s.name}</p>
              <p className="mt-1 text-muted">{s.address}</p>
            </button>
          ))}
        </div>
        <div className="mt-4 grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label={t("tdCar")}>
          {showroomCars.map((c) => (
            <button key={c.id} type="button" role="radio" aria-checked={c.id === activeCar} onClick={() => setCarId(c.id)}
              className={`rounded-xl border px-4 py-3 text-left text-sm transition ${c.id === activeCar ? "border-ink bg-white shadow-card" : "border-line hover:border-ink/40"}`}>
              {c.label}
            </button>
          ))}
        </div>
      </Step>

      <Step n={2} title={t("tdStep2")}>
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-2 sm:mx-0 sm:flex-wrap sm:px-0" role="radiogroup" aria-label={t("tdDate")}>
          {dates.map((d) => (
            <button key={d} type="button" role="radio" aria-checked={d === date} onClick={() => setDate(d)}
              className={`btn min-h-11 shrink-0 px-4 ${d === date ? "bg-ink text-white" : "btn-ghost"}`}>{dayLabel(d, locale)}</button>
          ))}
        </div>

        <div className="mt-4 min-h-24">
          {loading && !slots ? (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">{Array.from({ length: 7 }).map((_, i) => <div key={i} className="skeleton h-11" />)}</div>
          ) : loadError ? (
            <div role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-danger">
              {t("genericError")} <button type="button" onClick={() => load(false)} className="font-medium underline">Retry</button>
            </div>
          ) : slots && !slots.some((s) => s.available) ? (
            <div className="rounded-xl bg-surface p-4 text-sm">
              {t("tdNoSlots")} <button type="button" onClick={() => load(true)} className="font-medium text-accent underline">→</button>
            </div>
          ) : (
            <div className={`grid grid-cols-2 gap-2 sm:grid-cols-4 ${loading ? "opacity-60" : ""}`} role="radiogroup" aria-label={t("tdSlot")}>
              {slots?.map((s) => (
                <button key={s.startsAt} type="button" role="radio" aria-checked={slot === s.startsAt} disabled={!s.available} onClick={() => setSlot(s.startsAt)}
                  className={`btn min-h-11 px-3 ${slot === s.startsAt ? "bg-ink text-white" : "btn-ghost"} disabled:line-through`}>{s.label}</button>
              ))}
            </div>
          )}
          {f.startsAt && !slot && <p role="alert" className="mt-2 text-sm text-danger">{t("tdSlot")}</p>}
        </div>
      </Step>

      <Step n={3} title={t("tdStep3")}>
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField locale={locale} name="name" label={t("name")} defaultValue={prefill?.name} error={f.name} autoComplete="name" required />
          <TextField locale={locale} name="phone" label={t("phone")} error={f.phone} hint={t("phoneHint")} type="tel" inputMode="tel" autoComplete="tel" required />
        </div>
        <div className="mt-4"><TextField locale={locale} name="email" label={t("email")} error={f.email} type="email" autoComplete="email" /></div>
        <div className="mt-4"><ConsentField locale={locale} error={f.consent} /></div>
      </Step>

      {bannerError && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-danger">{t(bannerError === "tdSlotTaken" ? "tdSlotTaken" : bannerError === "fixFields" ? "fixFields" : bannerError === "tooManyRequests" ? "tooManyRequests" : "genericError")}</p>}

      <button className="btn btn-primary w-full sm:w-fit sm:px-10" disabled={pending || !slot || !activeCar}>{pending ? t("sending") : t("tdConfirm")}</button>
    </form>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-4 flex items-center gap-3 text-lg font-semibold tracking-tight">
        <span aria-hidden className="grid size-7 place-items-center rounded-full bg-ink text-sm text-white">{n}</span>
        {title}
      </h2>
      {children}
    </section>
  );
}

"use client";

import { submitLead, type LeadState } from "@/app/actions/leads";
import { makeT, type Locale } from "@/lib/dict";
import { useFormAction } from "@/components/useFormAction";

type Props = {
  locale: Locale;
  hidden: Record<string, string | number>;
  title?: string;
  showBudget?: boolean;
  tradeIn?: boolean;
  messageLabel?: string;
  submitLabel?: string;
};

export function ConsentField({ locale, error }: { locale: Locale; error?: string }) {
  const t = makeT(locale);
  return (
    <div>
      <label className="flex cursor-pointer items-start gap-3 text-sm leading-relaxed text-muted">
        <input type="checkbox" name="consent" required aria-invalid={!!error} className="mt-1 size-5 shrink-0 accent-[var(--color-accent)]" />
        <span>{t("consent")}</span>
      </label>
      {error && <p role="alert" className="mt-1.5 text-sm text-danger">{t("consentRequired")}</p>}
    </div>
  );
}

export function TextField({ name, label, error, hint, locale, ...rest }: { name: string; label: string; error?: string; hint?: string; locale: Locale } & React.InputHTMLAttributes<HTMLInputElement>) {
  const t = makeT(locale);
  return (
    <div>
      <label htmlFor={name} className="label">{label}</label>
      <input id={name} name={name} aria-invalid={!!error} aria-describedby={error ? `${name}-err` : hint ? `${name}-hint` : undefined} className={`field ${error ? "border-danger" : ""}`} {...rest} />
      {error ? <p id={`${name}-err`} role="alert" className="mt-1 text-sm text-danger">{name === "phone" ? t("phoneHint") : t("checkField")}</p> : hint ? <p id={`${name}-hint`} className="mt-1 text-xs text-muted">{hint}</p> : null}
    </div>
  );
}

export function LeadForm({ locale, hidden, title, showBudget, tradeIn, messageLabel, submitLabel }: Props) {
  const t = makeT(locale);
  const { state, pending, onSubmit, onChange, fields: f, bannerError } = useFormAction<LeadState>(submitLead, {});

  if (state.ok) {
    return (
      <div role="status" className="rounded-2xl bg-accent-soft p-6">
        <p className="text-lg font-semibold text-accent-dark">{t("enquirySent")}</p>
        <p className="mt-2 text-sm text-ink/80">{t("enquirySentBody", { consultant: state.consultant ?? "Our team" })}</p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} onChange={onChange} noValidate className="grid gap-4" aria-busy={pending}>
      {title && <h2 className="text-xl font-semibold tracking-tight">{title}</h2>}
      {Object.entries(hidden).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
      <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden className="hidden" />

      <TextField locale={locale} name="name" label={t("name")} error={f.name} autoComplete="name" required />
      <TextField locale={locale} name="phone" label={t("phone")} error={f.phone} hint={t("phoneHint")} type="tel" inputMode="tel" autoComplete="tel" required />
      <TextField locale={locale} name="email" label={t("email")} error={f.email} type="email" autoComplete="email" />
      {showBudget && <TextField locale={locale} name="budget" label={t("budget")} error={f.budget} type="number" inputMode="numeric" min={100000} step={10000} />}
      {tradeIn && <TextField locale={locale} name="tradeIn" label={t("tradeInCar")} error={f.tradeIn} required />}
      <div>
        <label htmlFor="message" className="label">{messageLabel ?? t("message")}</label>
        <textarea id="message" name="message" rows={3} maxLength={600} className="field py-2.5" />
      </div>

      <ConsentField locale={locale} error={f.consent} />

      {bannerError && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-danger">{t(bannerError === "tooManyRequests" ? "tooManyRequests" : bannerError === "fixFields" ? "fixFields" : "genericError")}</p>}

      <button className="btn btn-primary w-full" disabled={pending}>{pending ? t("sending") : (submitLabel ?? t("send"))}</button>
    </form>
  );
}

"use client";

import Link from "next/link";
import { useActionState } from "react";
import { login, register, type AuthState } from "@/app/actions/session";
import { TextField } from "@/components/LeadForm";
import { makeT, type Locale } from "@/lib/dict";

export function AuthForm({ mode, locale, next }: { mode: "login" | "register"; locale: Locale; next: string }) {
  const t = makeT(locale);
  const [state, action, pending] = useActionState<AuthState, FormData>(mode === "login" ? login : register, {});
  const f = state.fields ?? {};
  const message = state.error === "badLogin" ? t("badLogin") : state.error === "emailTaken" ? t("emailTaken") : state.error === "tooManyRequests" ? t("tooManyRequests") : state.error ? t("fixFields") : null;

  return (
    <form action={action} noValidate className="grid gap-4" aria-busy={pending}>
      <input type="hidden" name="next" value={next} />
      {mode === "register" && <TextField locale={locale} name="name" label={t("name")} error={f.name} autoComplete="name" required />}
      <TextField locale={locale} name="email" label={t("email").replace(/ \(.*\)/, "")} error={f.email} type="email" autoComplete="email" required />
      <TextField locale={locale} name="password" label={t("password")} error={f.password} hint={mode === "register" ? t("passwordHint") : undefined} type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} required />
      {message && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-danger">{message}</p>}
      <button className="btn btn-primary w-full" disabled={pending}>{pending ? t("sending") : mode === "login" ? t("signIn") : t("register")}</button>
      <p className="text-center text-sm text-muted">
        {mode === "login" ? t("noAccount") : t("haveAccount")}{" "}
        <Link href={mode === "login" ? `/register?next=${encodeURIComponent(next)}` : `/login?next=${encodeURIComponent(next)}`} className="font-medium text-accent">
          {mode === "login" ? t("register") : t("signIn")}
        </Link>
      </p>
    </form>
  );
}

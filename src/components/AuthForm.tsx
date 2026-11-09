"use client";

import Link from "next/link";
import { useState } from "react";
import { demoLogin, login, register, type AuthState } from "@/app/actions/session";
import { TextField } from "@/components/LeadForm";
import { makeT, type Locale } from "@/lib/dict";
import { DEMO_ACCOUNTS, DEMO_PASSWORD } from "@/lib/demo";
import { useFormAction } from "@/components/useFormAction";

type Role = keyof typeof DEMO_ACCOUNTS;
const ROLES: Role[] = ["buyer", "consultant", "admin"];
const ROLE_KEY = { buyer: "roleBuyer", consultant: "roleConsultant", admin: "roleAdmin" } as const;
const DESC_KEY = { buyer: "roleBuyerDesc", consultant: "roleConsultantDesc", admin: "roleAdminDesc" } as const;

export function AuthForm({ mode, locale, next, demo = false, demoMissing = false }: { mode: "login" | "register"; locale: Locale; next: string; demo?: boolean; demoMissing?: boolean }) {
  const t = makeT(locale);
  const [role, setRole] = useState<Role>("buyer");
  const { pending, onSubmit, onChange, fields: f, bannerError } = useFormAction<AuthState>(mode === "login" ? login : register, {});
  const roleName = t(ROLE_KEY[role]);
  const message =
    bannerError === "badLogin" ? t("badLogin")
    : bannerError === "wrongRole" ? t("wrongRole", { role: roleName })
    : bannerError === "emailTaken" ? t("emailTaken")
    : bannerError === "tooManyRequests" ? t("tooManyRequests")
    : bannerError ? t("fixFields")
    : demoMissing ? t("demoMissing")
    : null;

  return (
    <div className="grid gap-6">
      <form onSubmit={onSubmit} onChange={onChange} noValidate className="grid gap-4" aria-busy={pending}>
        <input type="hidden" name="next" value={next} />
        {mode === "login" && (
          <>
            <input type="hidden" name="role" value={role} />
            <div>
              <p className="label">{t("roleLabel")}</p>
              <div role="radiogroup" aria-label={t("roleLabel")} className="grid grid-cols-3 gap-2">
                {ROLES.map((r) => (
                  <button key={r} type="button" role="radio" aria-checked={role === r} onClick={() => setRole(r)}
                    className={`min-h-11 rounded-xl border px-2 text-sm font-medium transition ${role === r ? "border-ink bg-ink text-white" : "border-line hover:border-ink/40"}`}>
                    {t(ROLE_KEY[r])}
                  </button>
                ))}
              </div>
              <p className="mt-2 text-sm text-muted">{t(DESC_KEY[role])}</p>
            </div>
          </>
        )}
        {mode === "register" && <TextField locale={locale} name="name" label={t("name")} error={f.name} autoComplete="name" required />}
        <TextField locale={locale} name="email" label={t("email").replace(/ \(.*\)/, "")} error={f.email} type="email" autoComplete="email" required />
        <TextField locale={locale} name="password" label={t("password")} error={f.password} hint={mode === "register" ? t("passwordHint") : undefined} type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} required />
        {message && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-danger">{message}</p>}
        <button className="btn btn-primary w-full" disabled={pending}>{pending ? t("sending") : mode === "login" ? t("signInAs", { role: roleName }) : t("register")}</button>
        {(mode === "register" || role === "buyer") && (
          <p className="text-center text-sm text-muted">
            {mode === "login" ? t("noAccount") : t("haveAccount")}{" "}
            <Link href={mode === "login" ? `/register?next=${encodeURIComponent(next)}` : `/login?next=${encodeURIComponent(next)}`} className="font-medium text-accent">
              {mode === "login" ? t("register") : t("signIn")}
            </Link>
          </p>
        )}
      </form>

      {mode === "login" && demo && (
        <section className="rounded-2xl border border-line bg-surface p-4 sm:p-5">
          <h2 className="text-sm font-semibold">{t("demoTitle")}</h2>
          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            {ROLES.map((r) => (
              <form key={r} action={demoLogin}>
                <input type="hidden" name="role" value={r} />
                <button className="btn btn-ghost w-full flex-col gap-0 py-2 text-center leading-tight">
                  <span>{t("demoSignIn", { role: t(ROLE_KEY[r]) })}</span>
                  <span className="text-[11px] font-normal text-muted">{DEMO_ACCOUNTS[r].email}</span>
                </button>
              </form>
            ))}
          </div>
          <p className="mt-3 text-xs text-muted">{t("demoHint", { password: DEMO_PASSWORD })}</p>
        </section>
      )}
    </div>
  );
}

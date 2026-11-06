import Link from "next/link";
import { makeT, type Locale } from "@/lib/dict";
import type { SessionUser } from "@/lib/auth";
import { logout, setLocale } from "@/app/actions/session";

export function Header({ user, locale }: { user: SessionUser | null; locale: Locale }) {
  const t = makeT(locale);
  const links = [
    { href: "/new-cars", label: t("navNew") },
    { href: "/used-cars", label: t("navUsed") },
    { href: "/test-drive", label: t("navTestDrive") },
    { href: "/emi", label: t("navEmi") },
    { href: "/trade-in", label: t("navTradeIn") },
  ];
  const staff = [
    ...(user && user.role !== "buyer" ? [{ href: "/inbox", label: t("navInbox") }] : []),
    ...(user?.role === "admin" ? [{ href: "/admin", label: t("navAdmin") }] : []),
    ...(user?.role === "buyer" ? [{ href: "/account", label: t("navAccount") }] : []),
  ];

  const langForm = (
    <form action={setLocale} className="flex items-center gap-1 text-sm" aria-label={t("language")}>
      <button name="lang" value="en" aria-pressed={locale === "en"} className={`min-h-9 rounded-full px-2.5 ${locale === "en" ? "bg-ink text-white" : "text-muted hover:text-ink"}`}>EN</button>
      <button name="lang" value="hi" aria-pressed={locale === "hi"} lang="hi" className={`min-h-9 rounded-full px-2.5 ${locale === "hi" ? "bg-ink text-white" : "text-muted hover:text-ink"}`}>हिं</button>
    </form>
  );

  const account = user ? (
    <form action={logout}>
      <button className="min-h-9 text-sm text-muted hover:text-ink">{t("signOut")} ({user.name.split(" ")[0]})</button>
    </form>
  ) : (
    <Link href="/login" className="btn btn-ghost min-h-9 px-4">{t("signIn")}</Link>
  );

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-white/90 backdrop-blur">
      <div className="container-page flex h-16 items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-2.5 font-semibold tracking-tight">
          <span aria-hidden className="grid size-8 place-items-center rounded-lg bg-ink text-sm text-white">X</span>
          <span>{t("brand")}</span>
        </Link>

        <nav aria-label="Main" className="hidden items-center gap-1 lg:flex">
          {[...links, ...staff].map((l) => (
            <Link key={l.href} href={l.href} className="rounded-full px-3.5 py-2 text-sm text-muted transition-colors hover:text-ink">{l.label}</Link>
          ))}
        </nav>

        <div className="hidden items-center gap-3 lg:flex">
          {langForm}
          {account}
        </div>

        <details className="group relative lg:hidden">
          <summary className="btn btn-ghost min-h-10 cursor-pointer list-none px-4" aria-label="Menu">
            <span aria-hidden>☰</span>
          </summary>
          <div className="absolute right-0 mt-2 w-72 rounded-2xl border border-line bg-white p-3 shadow-card">
            <nav aria-label="Mobile" className="flex flex-col">
              {[...links, ...staff].map((l) => (
                <Link key={l.href} href={l.href} className="rounded-lg px-3 py-3 text-base hover:bg-surface">{l.label}</Link>
              ))}
            </nav>
            <div className="mt-2 flex items-center justify-between border-t border-line px-1 pt-3">
              {langForm}
              {account}
            </div>
          </div>
        </details>
      </div>
    </header>
  );
}

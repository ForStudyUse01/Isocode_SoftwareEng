import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getT } from "@/lib/i18n";
import { getUser } from "@/lib/auth";
import { demoLoginsOn } from "@/lib/demo";
import { AuthForm } from "@/components/AuthForm";

export const metadata: Metadata = { title: "Sign in", robots: { index: false } };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; demo?: string }> }) {
  const { next = "/", demo } = await searchParams;
  if (await getUser()) redirect("/");
  const { t, locale } = await getT();
  return (
    <div className="container-page max-w-lg py-14 sm:py-20">
      <h1 className="text-3xl font-semibold tracking-tight">{t("loginTitle")}</h1>
      <div className="mt-8"><AuthForm mode="login" locale={locale} next={next} demo={demoLoginsOn()} demoMissing={demo === "missing"} /></div>
    </div>
  );
}

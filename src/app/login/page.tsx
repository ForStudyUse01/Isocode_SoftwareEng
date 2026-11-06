import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getT } from "@/lib/i18n";
import { getUser } from "@/lib/auth";
import { AuthForm } from "@/components/AuthForm";

export const metadata: Metadata = { title: "Sign in", robots: { index: false } };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next = "/" } = await searchParams;
  if (await getUser()) redirect("/");
  const { t, locale } = await getT();
  return (
    <div className="container-page max-w-md py-16 sm:py-24">
      <h1 className="text-3xl font-semibold tracking-tight">{t("loginTitle")}</h1>
      <div className="mt-8"><AuthForm mode="login" locale={locale} next={next} /></div>
    </div>
  );
}

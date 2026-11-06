import type { Metadata } from "next";
import Link from "next/link";
import { getT } from "@/lib/i18n";

export const metadata: Metadata = { title: "No access", robots: { index: false } };

export default async function Forbidden() {
  const { t } = await getT();
  return (
    <div className="container-page max-w-lg py-24 text-center">
      <h1 className="text-2xl font-semibold tracking-tight">{t("forbiddenTitle")}</h1>
      <p className="mt-3 text-muted">{t("forbiddenBody")}</p>
      <Link href="/" className="btn btn-primary mt-8">{t("backHome")}</Link>
    </div>
  );
}

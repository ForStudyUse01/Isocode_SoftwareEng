import Link from "next/link";
import { getT } from "@/lib/i18n";

export default async function NotFound() {
  const { t } = await getT();
  return (
    <div className="container-page max-w-lg py-24 text-center">
      <p className="eyebrow">404</p>
      <h1 className="mt-3 text-2xl font-semibold tracking-tight">{t("notFoundTitle")}</h1>
      <Link href="/" className="btn btn-primary mt-8">{t("backHome")}</Link>
    </div>
  );
}

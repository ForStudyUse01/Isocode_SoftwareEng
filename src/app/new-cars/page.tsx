import type { Metadata } from "next";
import { getT } from "@/lib/i18n";
import { listModels } from "@/lib/queries";
import { ModelCard } from "@/components/Cards";

export const revalidate = 60;
export const metadata: Metadata = {
  title: "New cars",
  description: "Explore the Brand X range in Lucknow with ex-showroom and on-road prices for your city.",
  alternates: { canonical: "/new-cars" },
};

export default async function NewCars() {
  const { t, locale } = await getT();
  const models = await listModels();
  return (
    <div className="container-page py-12 sm:py-16">
      <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{t("navNew")}</h1>
      <p className="mt-3 max-w-xl text-muted">{t("heroSub")}</p>
      <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {models.map((m) => <ModelCard key={m.id} locale={locale} model={m} />)}
      </div>
    </div>
  );
}

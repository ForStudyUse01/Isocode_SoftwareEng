import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getT } from "@/lib/i18n";
import { getModel } from "@/lib/queries";
import { ModelExplorer } from "@/components/ModelExplorer";
import { LeadForm } from "@/components/LeadForm";
import { JsonLd } from "@/components/JsonLd";

export const revalidate = 60;

type Params = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const data = await getModel((await params).slug);
  if (!data) return {};
  const from = Math.min(...data.variants.map((v) => v.exShowroom));
  return {
    title: `${data.model.name} price, variants and colours`,
    description: `${data.model.tagline} ${data.model.name} from ₹${from.toLocaleString("en-IN")} ex-showroom. On-road price breakup for Lucknow and nearby cities.`,
    alternates: { canonical: `/new-cars/${data.model.slug}` },
  };
}

export default async function ModelPage({ params }: Params) {
  const { slug } = await params;
  const [data, { t, locale }] = await Promise.all([getModel(slug), getT()]);
  if (!data) notFound();
  const { model, colours, variants, cities, settings } = data;

  return (
    <div className="container-page py-10 sm:py-14">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Product",
          name: model.name,
          description: model.description,
          brand: { "@type": "Brand", name: "Brand X" },
          offers: {
            "@type": "AggregateOffer",
            priceCurrency: "INR",
            lowPrice: Math.min(...variants.map((v) => v.exShowroom)),
            highPrice: Math.max(...variants.map((v) => v.exShowroom)),
            offerCount: variants.length,
          },
        }}
      />
      <p className="eyebrow">{model.bodyType}</p>
      <h1 className="mt-2 text-4xl font-semibold tracking-tight sm:text-5xl">{model.name}</h1>
      <p className="mt-3 max-w-2xl text-lg text-muted">{model.description}</p>

      <div className="mt-10">
        <ModelExplorer locale={locale} slug={model.slug} bodyType={model.bodyType} colours={colours} variants={variants} cities={cities} defaultRate={settings.defaultLoanRate} />
      </div>

      <section id="enquire" className="mx-auto mt-20 max-w-xl scroll-mt-24">
        <LeadForm locale={locale} hidden={{ modelId: model.id, interest: "new", city: "Lucknow" }} title={t("enquiryTitle", { car: model.name })} showBudget />
      </section>
    </div>
  );
}

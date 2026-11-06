import Link from "next/link";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { getT } from "@/lib/i18n";
import { getSettings, listModels, listUsedCars } from "@/lib/queries";
import { CarPhoto } from "@/components/CarPhoto";
import { photoFor } from "@/lib/carPhotos";
import { ModelCard, UsedCard } from "@/components/Cards";


export default async function Home() {
  const { t, locale } = await getT();
  const [models, used, settings, promos] = await Promise.all([
    listModels(),
    listUsedCars({}, 3),
    getSettings(),
    db.select().from(schema.promos).where(eq(schema.promos.active, true)),
  ]);
  const offers = promos.filter((p) => p.kind === "offer");
  const hero = models.find((m) => m.bodyType === "SUV") ?? models[0];

  return (
    <>
      <section className="border-b border-line bg-gradient-to-b from-surface to-white">
        <div className="container-page grid items-center gap-10 py-14 sm:py-20 lg:grid-cols-[1fr_1.1fr]">
          <div>
            <p className="eyebrow">{t("brand")}</p>
            <h1 className="mt-4 text-4xl font-semibold leading-[1.08] tracking-tight sm:text-5xl lg:text-6xl">{t("heroTitle")}</h1>
            <p className="mt-5 max-w-lg text-lg leading-relaxed text-muted">{t("heroSub")}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/test-drive" className="btn btn-primary">{t("bookTestDrive")}</Link>
              <Link href="/new-cars" className="btn btn-ghost">{t("ctaBrowse")}</Link>
            </div>
          </div>
          {hero && <div className="overflow-hidden rounded-3xl shadow-card"><CarPhoto meta={photoFor(hero.bodyType, hero.fuels.length === 1 ? hero.fuels[0] : undefined)} colour={hero.colour} alt={`${hero.name} ${hero.bodyType}`} /></div>}
        </div>
      </section>

      <section className="container-page pt-16">
        <div className="flex items-end justify-between gap-4">
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">{t("featuredNew")}</h2>
          <Link href="/new-cars" className="text-sm font-medium text-accent">{t("viewAll")} →</Link>
        </div>
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {models.map((m) => <ModelCard key={m.id} locale={locale} model={m} />)}
        </div>
      </section>

      {offers.length > 0 && (
        <section className="container-page pt-16">
          <div className="grid gap-4 md:grid-cols-2">
            {offers.map((o) => (
              <div key={o.id} className="flex flex-col justify-between gap-6 rounded-2xl bg-ink p-7 text-white">
                <div>
                  <h3 className="text-xl font-semibold tracking-tight">{o.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-white/70">{o.body}</p>
                </div>
                {o.ctaHref && <Link href={o.ctaHref} className="btn w-fit bg-white text-ink hover:bg-white/90">{o.ctaLabel}</Link>}
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="container-page pt-16">
        <div className="flex items-end justify-between gap-4">
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">{t("featuredUsed")}</h2>
          <Link href="/used-cars" className="text-sm font-medium text-accent">{t("viewAll")} →</Link>
        </div>
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {used.map(({ car, showroom }) => <UsedCard key={car.id} locale={locale} car={car} showroom={showroom} defaultRate={settings.defaultLoanRate} />)}
        </div>
      </section>

      <section className="container-page pt-20">
        <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">{t("howTitle")}</h2>
        <div className="mt-8 grid gap-8 md:grid-cols-3">
          {([["how1", "how1d"], ["how2", "how2d"], ["how3", "how3d"]] as const).map(([h, d], i) => (
            <div key={h} className="border-t-2 border-ink pt-5">
              <p className="text-sm text-muted">0{i + 1}</p>
              <h3 className="mt-2 text-lg font-semibold">{t(h)}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{t(d)}</p>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}

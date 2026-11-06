import { db, schema } from "@/db";
import { makeT, type Locale } from "@/lib/dict";

export async function Footer({ locale }: { locale: Locale }) {
  const t = makeT(locale);
  const showrooms = await db.select().from(schema.showrooms);
  return (
    <footer className="mt-24 border-t border-line bg-surface">
      <div className="container-page grid gap-10 py-12 md:grid-cols-[1.2fr_2fr]">
        <div>
          <p className="font-semibold">{t("brand")}</p>
          <p className="mt-3 max-w-sm text-sm leading-relaxed text-muted">{t("footerPrivacy")}</p>
        </div>
        <div>
          <p className="eyebrow">{t("footerShowrooms")}</p>
          <ul className="mt-4 grid gap-6 text-sm sm:grid-cols-3">
            {showrooms.map((s) => (
              <li key={s.id}>
                <p className="font-medium">{s.name}</p>
                <p className="mt-1 text-muted">{s.address}</p>
                <a href={`tel:${s.phone.replace(/\s/g, "")}`} className="mt-1 inline-block text-accent">{s.phone}</a>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="border-t border-line py-4 text-center text-xs text-muted">{t("footerNote")}</div>
    </footer>
  );
}

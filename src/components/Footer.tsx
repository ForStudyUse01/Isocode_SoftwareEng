import { db, schema } from "@/db";
import { Logo } from "@/components/Logo";
import { makeT, type Locale } from "@/lib/dict";

export async function Footer({ locale }: { locale: Locale }) {
  const t = makeT(locale);
  const showrooms = await db.select().from(schema.showrooms);
  return (
    <footer className="mt-24 bg-ink text-white">
      <div className="container-page grid gap-10 py-12 md:grid-cols-[1.2fr_2fr]">
        <div>
          <p className="flex items-center gap-2.5 font-semibold"><Logo size={32} />{t("brand")}</p>
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-white/60">{t("footerPrivacy")}</p>
        </div>
        <div>
          <p className="eyebrow text-white/50">{t("footerShowrooms")}</p>
          <ul className="mt-4 grid gap-6 text-sm sm:grid-cols-3">
            {showrooms.map((s) => (
              <li key={s.id}>
                <p className="font-medium">{s.name}</p>
                <p className="mt-1 text-white/60">{s.address}</p>
                <a href={`tel:${s.phone.replace(/\s/g, "")}`} className="mt-1 inline-block text-[#7fd3da] hover:text-white">{s.phone}</a>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10 py-5 text-center text-xs text-white/50">{t("footerNote")}</div>
    </footer>
  );
}

import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { count, eq, notInArray } from "drizzle-orm";
import { db, schema as s } from "@/db";
import { istDate } from "@/lib/slots";
import { dateLabel } from "@/lib/format";

export default async function AdminHome() {
  await requireRole(["admin"], "/admin");
  const [[models], [variants], [available], [booked], [openLeads], rules] = await Promise.all([
    db.select({ n: count() }).from(s.carModels),
    db.select({ n: count() }).from(s.variants),
    db.select({ n: count() }).from(s.usedCars).where(eq(s.usedCars.status, "available")),
    db.select({ n: count() }).from(s.usedCars).where(eq(s.usedCars.status, "booked")),
    db.select({ n: count() }).from(s.leads).where(notInArray(s.leads.status, ["won", "lost"])),
    db.select().from(s.priceRules),
  ]);

  const today = istDate(new Date());
  const soon = istDate(new Date(Date.now() + 14 * 86_400_000));
  const lapsed = [...new Set(rules.filter((r) => r.validTill < today).map((r) => r.city))];
  const expiring = [...new Set(rules.filter((r) => r.validTill >= today && r.validTill <= soon).map((r) => r.city))];

  const tiles = [
    { label: "Models", value: models.n, href: "/admin/models" },
    { label: "Variants", value: variants.n, href: "/admin/models" },
    { label: "Used cars available", value: available.n, href: "/admin/used" },
    { label: "Used cars booked", value: booked.n, href: "/admin/used" },
    { label: "Open leads", value: openLeads.n, href: "/inbox" },
  ];

  return (
    <div>
      <h1 className="text-3xl font-semibold tracking-tight">Overview</h1>
      <ul className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-5">
        {tiles.map((t) => (
          <li key={t.label}>
            <Link href={t.href} className="card block p-4 transition hover:shadow-card sm:p-5">
              <p className="text-xs text-muted">{t.label}</p>
              <p className="mt-1 text-3xl font-semibold tabular-nums tracking-tight">{t.value}</p>
            </Link>
          </li>
        ))}
      </ul>

      {(lapsed.length > 0 || expiring.length > 0) && (
        <div role="alert" className="mt-8 rounded-2xl bg-amber-50 p-5 text-sm text-warn">
          {lapsed.length > 0 && <p><strong>Prices have lapsed</strong> for {lapsed.join(", ")}. Buyers there see no on-road total until you renew them.</p>}
          {expiring.length > 0 && <p className={lapsed.length ? "mt-2" : ""}>Prices expire before {dateLabel(soon)} for {expiring.join(", ")}.</p>}
          <Link href="/admin/prices" className="mt-3 inline-block font-medium underline">Review price tables</Link>
        </div>
      )}
    </div>
  );
}

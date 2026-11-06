import type { Metadata } from "next";
import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { db, schema as s } from "@/db";
import { getT } from "@/lib/i18n";
import { requireRole } from "@/lib/auth";
import { dateTimeLabel } from "@/lib/format";

export const metadata: Metadata = { title: "My bookings", robots: { index: false } };

export default async function Account() {
  const user = await requireRole(["buyer"], "/account");
  const { t } = await getT();
  const drives = await db
    .select({ id: s.testDrives.id, startsAt: s.testDrives.startsAt, status: s.testDrives.status, car: s.demoCars.label, showroom: s.showrooms.name })
    .from(s.testDrives)
    .innerJoin(s.leads, eq(s.testDrives.leadId, s.leads.id))
    .innerJoin(s.demoCars, eq(s.testDrives.demoCarId, s.demoCars.id))
    .innerJoin(s.showrooms, eq(s.demoCars.showroomId, s.showrooms.id))
    .where(eq(s.leads.userId, user.id))
    .orderBy(desc(s.testDrives.startsAt));

  return (
    <div className="container-page max-w-2xl py-12 sm:py-16">
      <h1 className="text-3xl font-semibold tracking-tight">{t("accountTitle")}</h1>
      <p className="mt-2 text-muted">{user.name} · {user.email}</p>
      {drives.length === 0 ? (
        <div className="mt-8 rounded-2xl bg-surface p-8 text-center">
          <p>{t("accountEmpty")}</p>
          <Link href="/test-drive" className="btn btn-primary mt-4">{t("bookTestDrive")}</Link>
        </div>
      ) : (
        <ul className="mt-8 divide-y divide-line rounded-2xl border border-line">
          {drives.map((d) => (
            <li key={d.id} className="flex items-center justify-between gap-4 p-4">
              <div>
                <p className="font-medium">{d.car}</p>
                <p className="text-sm text-muted">{d.showroom} · {dateTimeLabel(d.startsAt)}</p>
              </div>
              <span className="rounded-full bg-accent-soft px-3 py-1 text-xs font-medium capitalize text-accent-dark">{d.status}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

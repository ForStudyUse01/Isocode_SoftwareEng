import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { requireRole } from "@/lib/auth";
import { db, schema as s } from "@/db";
import { dateTimeLabel } from "@/lib/format";

export const metadata = { title: "Activity logs" };

const FILTERS = [
  { key: "all", label: "All activity" },
  { key: "testdrive", label: "Test drives" },
  { key: "lead", label: "Lead events" },
  { key: "message", label: "Messages sent" },
] as const;
type Filter = (typeof FILTERS)[number]["key"];

type Row = { at: string; kind: Exclude<Filter, "all">; who: string; title: string; detail: string; leadId: number };

const CHIP: Record<Row["kind"], string> = {
  testdrive: "bg-accent-soft text-accent-dark",
  lead: "bg-surface text-ink",
  message: "bg-amber-50 text-warn",
};
const KIND_LABEL: Record<Row["kind"], string> = { testdrive: "Test drive", lead: "Lead", message: "Message" };

export default async function AdminLogs({ searchParams }: { searchParams: Promise<{ type?: string }> }) {
  await requireRole(["admin"], "/admin/logs");
  const { type } = await searchParams;
  const active: Filter = FILTERS.some((f) => f.key === type) ? (type as Filter) : "all";
  const want = (k: Exclude<Filter, "all">) => active === "all" || active === k;

  const [drives, events, msgs] = await Promise.all([
    want("testdrive")
      ? db
          .select({ at: s.testDrives.createdAt, startsAt: s.testDrives.startsAt, status: s.testDrives.status, lead: s.leads.name, leadId: s.leads.id, car: s.demoCars.label, showroom: s.showrooms.name })
          .from(s.testDrives)
          .innerJoin(s.leads, eq(s.testDrives.leadId, s.leads.id))
          .innerJoin(s.demoCars, eq(s.testDrives.demoCarId, s.demoCars.id))
          .innerJoin(s.showrooms, eq(s.demoCars.showroomId, s.showrooms.id))
          .orderBy(desc(s.testDrives.createdAt))
          .limit(200)
      : [],
    want("lead")
      ? db
          .select({ at: s.leadEvents.createdAt, type: s.leadEvents.type, note: s.leadEvents.note, lead: s.leads.name, leadId: s.leads.id, actor: s.users.name })
          .from(s.leadEvents)
          .innerJoin(s.leads, eq(s.leadEvents.leadId, s.leads.id))
          .leftJoin(s.users, eq(s.leadEvents.actorId, s.users.id))
          .orderBy(desc(s.leadEvents.createdAt))
          .limit(200)
      : [],
    want("message")
      ? db
          .select({ at: s.messages.createdAt, channel: s.messages.channel, kind: s.messages.kind, body: s.messages.body, lead: s.leads.name, leadId: s.leads.id })
          .from(s.messages)
          .innerJoin(s.leads, eq(s.messages.leadId, s.leads.id))
          .orderBy(desc(s.messages.createdAt))
          .limit(200)
      : [],
  ]);

  const rows: Row[] = [
    ...drives.map((d): Row => ({ at: d.at, kind: "testdrive", who: d.lead, leadId: d.leadId, title: `${d.status[0].toUpperCase()}${d.status.slice(1)}: ${d.car}`, detail: `${d.showroom}, slot ${dateTimeLabel(d.startsAt)}` })),
    ...events.map((e): Row => ({ at: e.at, kind: "lead", who: e.lead, leadId: e.leadId, title: e.type.replaceAll("_", " "), detail: `${e.note}${e.actor ? ` (by ${e.actor})` : ""}` })),
    ...msgs.map((m): Row => ({ at: m.at, kind: "message", who: m.lead, leadId: m.leadId, title: `${m.kind} via ${m.channel}`, detail: m.body })),
  ]
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, 200);

  return (
    <div>
      <h1 className="text-3xl font-semibold tracking-tight">Activity logs</h1>
      <p className="mt-2 max-w-2xl text-sm text-muted">Everything that happened on the site: test-drive bookings, lead events from assignment to first reply, and every message sent. Newest first, last 200 entries.</p>

      <div role="tablist" aria-label="Log type" className="mt-6 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <Link key={f.key} href={f.key === "all" ? "/admin/logs" : `/admin/logs?type=${f.key}`} role="tab" aria-selected={active === f.key}
            className={`rounded-full border px-4 py-2 text-sm transition ${active === f.key ? "border-ink bg-ink text-white" : "border-line text-muted hover:border-ink hover:text-ink"}`}>
            {f.label}
          </Link>
        ))}
      </div>

      {rows.length === 0 ? (
        <p className="mt-10 text-sm text-muted">Nothing logged yet.</p>
      ) : (
        <ul className="mt-6 divide-y divide-line overflow-hidden rounded-2xl border border-line bg-white">
          {rows.map((r, i) => (
            <li key={`${r.kind}-${r.at}-${i}`} className="grid gap-1 px-4 py-4 sm:grid-cols-[9rem_6.5rem_1fr] sm:gap-4 sm:px-5">
              <time dateTime={r.at} className="text-xs text-muted sm:pt-1">{dateTimeLabel(r.at)}</time>
              <span className={`h-fit w-fit rounded-full px-2.5 py-1 text-xs font-medium ${CHIP[r.kind]}`}>{KIND_LABEL[r.kind]}</span>
              <div className="min-w-0 text-sm">
                <p className="font-medium capitalize">{r.title}</p>
                <p className="mt-0.5 break-words text-muted">{r.detail}</p>
                <p className="mt-1 text-xs"><Link href={`/inbox/${r.leadId}`} className="text-accent hover:underline">{r.who}</Link></p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

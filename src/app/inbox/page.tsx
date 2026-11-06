import type { Metadata } from "next";
import Link from "next/link";
import { and, desc, eq, isNull, or, sql, type SQL } from "drizzle-orm";
import { db, schema as s } from "@/db";
import { requireRole } from "@/lib/auth";
import { SlaTimer } from "@/components/SlaTimer";
import { slaState } from "@/lib/sla";
import { StatusChip } from "@/components/StatusChip";
import { isOpen } from "@/lib/leads";
import { dateTimeLabel } from "@/lib/format";

export const metadata: Metadata = { title: "Lead inbox", robots: { index: false } };
export const dynamic = "force-dynamic";

const VIEWS = [
  { id: "open", label: "Open" },
  { id: "waiting", label: "Awaiting reply" },
  { id: "closed", label: "Won / lost" },
  { id: "all", label: "All" },
] as const;

export default async function Inbox({ searchParams }: { searchParams: Promise<{ view?: string; scope?: string }> }) {
  const user = await requireRole(["consultant", "admin"], "/inbox");
  const sp = await searchParams;
  const view = VIEWS.some((v) => v.id === sp.view) ? sp.view! : "open";
  const mineOnly = user.role === "consultant" || sp.scope === "mine";

  const visible: SQL | undefined = mineOnly
    ? or(eq(s.leads.assignedTo, user.id), and(isNull(s.leads.assignedTo), user.showroomId ? eq(s.leads.showroomId, user.showroomId) : sql`0`))
    : undefined;

  const rows = await db
    .select({ lead: s.leads, model: s.carModels.name, used: s.usedCars, showroom: s.showrooms.name, owner: s.users.name })
    .from(s.leads)
    .leftJoin(s.carModels, eq(s.leads.modelId, s.carModels.id))
    .leftJoin(s.usedCars, eq(s.leads.usedCarId, s.usedCars.id))
    .leftJoin(s.showrooms, eq(s.leads.showroomId, s.showrooms.id))
    .leftJoin(s.users, eq(s.leads.assignedTo, s.users.id))
    .where(visible)
    .orderBy(sql`case when ${s.leads.firstResponseAt} is null and ${s.leads.status} not in ('won','lost') then 0 else 1 end`, desc(s.leads.createdAt));

  const nowMs = Date.now();
  const serverNow = new Date(nowMs).toISOString();
  const open = rows.filter((r) => isOpen(r.lead.status));
  const waiting = open.filter((r) => !r.lead.firstResponseAt);
  const states = rows.map((r) => slaState(r.lead.slaDueAt, r.lead.createdAt, r.lead.firstResponseAt, nowMs).kind);
  const met = states.filter((k) => k === "met").length;
  const decided = states.filter((k) => k !== "running").length;
  const breached = rows.filter((r, i) => states[i] === "breached" && isOpen(r.lead.status)).length;

  const shown = rows.filter((r) => {
    if (view === "open") return isOpen(r.lead.status);
    if (view === "waiting") return isOpen(r.lead.status) && !r.lead.firstResponseAt;
    if (view === "closed") return !isOpen(r.lead.status);
    return true;
  });

  const stats = [
    { label: "Open leads", value: open.length },
    { label: "Awaiting first reply", value: waiting.length },
    { label: "SLA breached now", value: breached, bad: breached > 0 },
    { label: "Replied within 5 min", value: decided ? `${Math.round((met / decided) * 100)}%` : "-" },
  ];

  const href = (v: string, scope = sp.scope) => `/inbox?view=${v}${scope ? `&scope=${scope}` : ""}`;

  return (
    <div className="container-page py-10 sm:py-14">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Lead inbox</h1>
          <p className="mt-1 text-sm text-muted">{user.role === "admin" ? (mineOnly ? "Your leads" : "All showrooms") : "Your leads and unassigned leads at your showroom"}</p>
        </div>
        <div className="flex gap-2">
          {user.role === "admin" && <Link href={href(view, mineOnly ? "" : "mine")} className="btn btn-ghost min-h-10 px-4">{mineOnly ? "Show all" : "Only mine"}</Link>}
          <Link href="/inbox/import" className="btn btn-primary min-h-10 px-4">Import portal CSV</Link>
        </div>
      </div>

      <dl className="mt-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((x) => (
          <div key={x.label} className="card p-4 sm:p-5">
            <dt className="text-xs text-muted">{x.label}</dt>
            <dd className={`mt-1 text-3xl font-semibold tracking-tight tabular-nums ${x.bad ? "text-danger" : ""}`}>{x.value}</dd>
          </div>
        ))}
      </dl>

      <nav aria-label="Lead views" className="mt-8 flex gap-2 overflow-x-auto pb-1">
        {VIEWS.map((v) => (
          <Link key={v.id} href={href(v.id)} aria-current={view === v.id ? "page" : undefined} className={`btn min-h-10 shrink-0 px-4 ${view === v.id ? "bg-ink text-white" : "btn-ghost"}`}>{v.label}</Link>
        ))}
      </nav>

      {shown.length === 0 ? (
        <div className="mt-6 rounded-2xl bg-surface p-12 text-center text-muted">No leads in this view.</div>
      ) : (
        <ul className="mt-4 divide-y divide-line overflow-hidden rounded-2xl border border-line">
          {shown.map(({ lead, model, used, showroom, owner }) => (
            <li key={lead.id}>
              <Link href={`/inbox/${lead.id}`} className="grid gap-3 p-4 transition hover:bg-surface sm:grid-cols-[1.4fr_1.2fr_1fr_auto] sm:items-center sm:gap-5 sm:px-5">
                <div>
                  <p className="font-medium">{lead.name}{lead.optedOut && <span className="ml-2 rounded-full bg-red-50 px-2 py-0.5 text-xs text-danger">Opted out</span>}</p>
                  <p className="mt-0.5 text-sm text-muted">{used ? `${used.year} ${used.model} ${used.variant}` : (model ?? "General enquiry")} · {lead.interest.replace("_", " ")}</p>
                </div>
                <p className="text-sm text-muted">{showroom ?? "No showroom"} · {lead.source}<br /><span className="text-xs">{dateTimeLabel(lead.createdAt)}{user.role === "admin" && owner ? ` · ${owner}` : ""}{!owner && " · Unassigned"}</span></p>
                <StatusChip status={lead.status} />
                <SlaTimer dueAt={lead.slaDueAt} createdAt={lead.createdAt} respondedAt={lead.firstResponseAt} serverNow={serverNow} active={isOpen(lead.status)} />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

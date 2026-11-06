import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { db, schema as s } from "@/db";
import { requireRole } from "@/lib/auth";
import { loadLeadFor } from "@/lib/access";
import { SlaTimer } from "@/components/SlaTimer";
import { StatusChip } from "@/components/StatusChip";
import { ReplyComposer } from "@/components/ReplyComposer";
import { PendingButton } from "@/components/PendingButton";
import { reassign, regenerateAssist, setStatus } from "@/app/actions/inbox";
import { isOpen } from "@/lib/leads";
import { dateTimeLabel, rupees } from "@/lib/format";

export const metadata: Metadata = { title: "Lead", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function LeadPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireRole(["consultant", "admin"], "/inbox");
  const id = Number((await params).id);
  const lead = Number.isInteger(id) ? await loadLeadFor(user, id) : null;
  if (!lead) notFound();

  const [[model], [used], [showroom], events, msgs, consultants, [drive]] = await Promise.all([
    lead.modelId ? db.select().from(s.carModels).where(eq(s.carModels.id, lead.modelId)) : [],
    lead.usedCarId ? db.select().from(s.usedCars).where(eq(s.usedCars.id, lead.usedCarId)) : [],
    lead.showroomId ? db.select().from(s.showrooms).where(eq(s.showrooms.id, lead.showroomId)) : [],
    db.select().from(s.leadEvents).where(eq(s.leadEvents.leadId, lead.id)).orderBy(asc(s.leadEvents.createdAt), asc(s.leadEvents.id)),
    db.select().from(s.messages).where(eq(s.messages.leadId, lead.id)).orderBy(asc(s.messages.createdAt)),
    db.select().from(s.users).where(eq(s.users.role, "consultant")),
    db
      .select({ startsAt: s.testDrives.startsAt, car: s.demoCars.label })
      .from(s.testDrives)
      .innerJoin(s.demoCars, eq(s.testDrives.demoCarId, s.demoCars.id))
      .where(eq(s.testDrives.leadId, lead.id))
      .limit(1),
  ]);

  const vehicle = used ? `${used.year} ${used.model} ${used.variant} (${used.stockId})` : (model?.name ?? "No model chosen");
  const hasReply = msgs.some((m) => m.kind === "reply");
  const serverNow = new Date().toISOString();

  return (
    <div className="container-page py-10 sm:py-14">
      <Link href="/inbox" className="text-sm text-muted hover:text-ink">← Lead inbox</Link>
      <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">{lead.name}</h1>
          <p className="mt-1 text-muted">{vehicle} · {lead.interest.replace("_", " ")} · via {lead.source}</p>
        </div>
        <div className="flex items-center gap-3">
          <StatusChip status={lead.status} />
          <SlaTimer dueAt={lead.slaDueAt} createdAt={lead.createdAt} respondedAt={lead.firstResponseAt} serverNow={serverNow} active={isOpen(lead.status)} />
        </div>
      </div>

      {lead.optedOut && <p role="alert" className="mt-6 rounded-xl bg-red-50 p-4 text-sm text-danger">This buyer opted out of contact. Do not call or message them.</p>}

      <div className="mt-8 grid gap-8 lg:grid-cols-[1.6fr_1fr]">
        <div className="grid content-start gap-8">
          <section className="card p-5 sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-semibold">Buyer summary</h2>
              <span className="rounded-full bg-accent-soft px-2.5 py-1 text-xs font-medium text-accent-dark">{lead.aiSource === "ai" ? "AI generated" : "Auto-generated"}</span>
            </div>
            <p className="mt-3 leading-relaxed">{lead.aiSummary ?? "No summary yet."}</p>
            {lead.message && <blockquote className="mt-4 border-l-2 border-line pl-4 text-sm text-muted">&ldquo;{lead.message}&rdquo;</blockquote>}
            <dl className="mt-4 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
              {lead.budget && <Item k="Budget" v={rupees(lead.budget)} />}
              {lead.tradeIn && <Item k="Trade-in" v={lead.tradeIn} />}
              {drive && <Item k="Test drive" v={`${drive.car}, ${dateTimeLabel(drive.startsAt)}`} />}
              <Item k="Showroom" v={showroom?.name ?? "Not chosen"} />
            </dl>
            <form action={regenerateAssist} className="mt-4">
              <input type="hidden" name="leadId" value={lead.id} />
              <PendingButton className="btn btn-ghost min-h-9 px-4 text-xs" pending="Regenerating...">Regenerate summary and draft</PendingButton>
            </form>
          </section>

          <section className="card p-5 sm:p-6">
            <h2 className="font-semibold">{hasReply ? "Reply sent" : "First reply"}</h2>
            <p className="mt-1 text-sm text-muted">Edit before sending. Drafts never quote discounts or prices, and the system blocks them if you add them.</p>
            <div className="mt-4"><ReplyComposer leadId={lead.id} draft={lead.aiDraft ?? ""} disabled={lead.optedOut || hasReply} /></div>
          </section>

          <section>
            <h2 className="font-semibold">Activity</h2>
            <ol className="mt-4 grid gap-4 border-l border-line pl-5">
              {[...events.map((e) => ({ at: e.createdAt, text: e.note, kind: e.type })), ...msgs.map((m) => ({ at: m.createdAt, text: `${m.channel} ${m.kind} (mock): ${m.body}`, kind: "message" }))]
                .sort((a, b) => a.at.localeCompare(b.at))
                .map((e, i) => (
                  <li key={i} className="relative text-sm">
                    <span aria-hidden className="absolute -left-[25px] top-1.5 size-2 rounded-full bg-ink" />
                    <p>{e.text}</p>
                    <p className="text-xs text-muted">{dateTimeLabel(e.at)}</p>
                  </li>
                ))}
            </ol>
          </section>
        </div>

        <aside className="grid content-start gap-6">
          <section className="card p-5">
            <h2 className="font-semibold">Contact</h2>
            <p className="mt-3 text-lg font-medium"><a href={`tel:+91${lead.phone}`} className="text-accent">+91 {lead.phone}</a></p>
            {lead.email && <p className="mt-1 text-sm text-muted">{lead.email}</p>}
            <p className="mt-3 text-xs text-muted">Consent recorded {dateTimeLabel(lead.consentAt)}</p>
          </section>

          <section className="card p-5">
            <h2 className="font-semibold">Status</h2>
            <form action={setStatus} className="mt-3 flex gap-2">
              <input type="hidden" name="leadId" value={lead.id} />
              <label htmlFor="status" className="sr-only">Status</label>
              <select key={lead.status} id="status" name="status" defaultValue={lead.status} className="field capitalize">
                {s.LEAD_STATUSES.map((st) => <option key={st} value={st}>{st.replace("_", " ")}</option>)}
              </select>
              <PendingButton className="btn btn-ghost px-4" pending="...">Save</PendingButton>
            </form>
          </section>

          <section className="card p-5">
            <h2 className="font-semibold">Assigned to</h2>
            <form action={reassign} className="mt-3 flex gap-2">
              <input type="hidden" name="leadId" value={lead.id} />
              <label htmlFor="consultantId" className="sr-only">Consultant</label>
              <select key={lead.assignedTo ?? "none"} id="consultantId" name="consultantId" defaultValue={lead.assignedTo ?? ""} className="field">
                {!lead.assignedTo && <option value="" disabled>Unassigned</option>}
                {consultants.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <PendingButton className="btn btn-ghost px-4" pending="...">Move</PendingButton>
            </form>
          </section>
        </aside>
      </div>
    </div>
  );
}

function Item({ k, v }: { k: string; v: string }) {
  return (
    <div>
      <dt className="text-xs text-muted">{k}</dt>
      <dd>{v}</dd>
    </div>
  );
}

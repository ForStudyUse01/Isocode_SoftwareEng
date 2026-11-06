import { asc } from "drizzle-orm";
import { requireRole } from "@/lib/auth";
import { db, schema as s } from "@/db";
import { createPromo, togglePromo } from "@/app/actions/admin";
import { SaveForm } from "@/components/SaveForm";

export const metadata = { title: "Banners and offers" };

export default async function AdminPromos() {
  await requireRole(["admin"], "/admin/promos");
  const promos = await db.select().from(s.promos).orderBy(asc(s.promos.id));
  return (
    <div className="grid gap-10">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Banners and offers</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted">Offers appear on the home page. They are announcements only and never change an on-road price.</p>
      </div>
      <ul className="grid gap-3">
        {promos.map((p) => (
          <li key={p.id} className="card p-4 sm:p-5">
            <SaveForm action={togglePromo} compact className="flex flex-wrap items-center justify-between gap-3">
              <input type="hidden" name="id" value={p.id} />
              <div className="text-sm"><p className="font-medium">{p.title} <span className="ml-2 rounded-full bg-surface px-2 py-0.5 text-xs text-muted">{p.kind}</span></p><p className="text-muted">{p.body}</p></div>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="active" defaultChecked={p.active} className="size-5 accent-[var(--color-accent)]" /> Active</label>
            </SaveForm>
          </li>
        ))}
      </ul>
      <section className="card p-5 sm:p-6">
        <h2 className="font-semibold">Add one</h2>
        <SaveForm action={createPromo} label="Add" className="mt-4 grid gap-3 sm:grid-cols-2">
          <div><label className="label text-xs" htmlFor="pk">Type</label><select id="pk" name="kind" className="field"><option>offer</option><option>banner</option></select></div>
          <div><label className="label text-xs" htmlFor="pt">Title</label><input id="pt" name="title" className="field" required /></div>
          <div className="sm:col-span-2"><label className="label text-xs" htmlFor="pb">Text</label><input id="pb" name="body" className="field" required /></div>
          <div><label className="label text-xs" htmlFor="pl">Button label</label><input id="pl" name="ctaLabel" className="field" /></div>
          <div><label className="label text-xs" htmlFor="ph">Button link (starts with /)</label><input id="ph" name="ctaHref" placeholder="/test-drive" className="field" /></div>
        </SaveForm>
      </section>
    </div>
  );
}

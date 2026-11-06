import { asc } from "drizzle-orm";
import { requireRole } from "@/lib/auth";
import { db, schema as s } from "@/db";
import { createModel, createVariant, updateModel, updateVariant } from "@/app/actions/admin";
import { NumberInput, SaveForm } from "@/components/SaveForm";
import { rupees } from "@/lib/format";

export const metadata = { title: "Models" };

export default async function AdminModels() {
  await requireRole(["admin"], "/admin/models");
  const [models, variants] = await Promise.all([db.select().from(s.carModels).orderBy(asc(s.carModels.id)), db.select().from(s.variants).orderBy(asc(s.variants.exShowroom))]);

  return (
    <div className="grid gap-10">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Models and variants</h1>
        <p className="mt-2 text-sm text-muted">Ex-showroom price and accessories feed the on-road price. Unpublished items disappear from the site immediately.</p>
      </div>

      {models.map((m) => (
        <section key={m.id} className="card p-5 sm:p-6">
          <SaveForm action={updateModel} className="grid gap-3">
            <input type="hidden" name="id" value={m.id} />
            <div className="grid gap-3 sm:grid-cols-2">
              <div><label className="label text-xs" htmlFor={`n${m.id}`}>Name</label><input id={`n${m.id}`} name="name" defaultValue={m.name} className="field" required /></div>
              <div><label className="label text-xs" htmlFor={`t${m.id}`}>Tagline</label><input id={`t${m.id}`} name="tagline" defaultValue={m.tagline} className="field" required /></div>
            </div>
            <div><label className="label text-xs" htmlFor={`d${m.id}`}>Description</label><textarea id={`d${m.id}`} name="description" defaultValue={m.description} rows={2} className="field py-2" required /></div>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="published" defaultChecked={m.published} className="size-5 accent-[var(--color-accent)]" /> Published</label>
          </SaveForm>

          <h3 className="mt-6 text-sm font-semibold">Variants</h3>
          <ul className="mt-3 divide-y divide-line">
            {variants.filter((v) => v.modelId === m.id).map((v) => (
              <li key={v.id} className="py-4">
                <SaveForm action={updateVariant} className="grid items-end gap-3 sm:grid-cols-[1fr_1fr_1fr_auto]" compact>
                  <input type="hidden" name="id" value={v.id} />
                  <div className="text-sm"><p className="font-medium">{v.name} · {v.fuel}</p><p className="text-muted">{v.transmission} · now {rupees(v.exShowroom)}</p></div>
                  <NumberInput name="exShowroom" label="Ex-showroom (₹)" defaultValue={v.exShowroom} step={1000} />
                  <NumberInput name="accessories" label="Accessories (₹)" defaultValue={v.accessories} step={500} />
                  <label className="flex items-center gap-2 pb-2.5 text-sm"><input type="checkbox" name="published" defaultChecked={v.published} className="size-5 accent-[var(--color-accent)]" /> Live</label>
                </SaveForm>
              </li>
            ))}
          </ul>

          <details className="mt-4">
            <summary className="cursor-pointer text-sm font-medium text-accent">Add a variant</summary>
            <SaveForm action={createVariant} label="Add variant" className="mt-4 grid gap-3 sm:grid-cols-3">
              <input type="hidden" name="modelId" value={m.id} />
              <div><label className="label text-xs" htmlFor={`vn${m.id}`}>Name</label><input id={`vn${m.id}`} name="name" className="field" required /></div>
              <div><label className="label text-xs" htmlFor={`vf${m.id}`}>Fuel</label><select id={`vf${m.id}`} name="fuel" className="field">{s.FUELS.map((f) => <option key={f}>{f}</option>)}</select></div>
              <div><label className="label text-xs" htmlFor={`vt${m.id}`}>Transmission</label><select id={`vt${m.id}`} name="transmission" className="field"><option>Manual</option><option>Automatic</option></select></div>
              <NumberInput name="exShowroom" label="Ex-showroom (₹)" defaultValue="" step={1000} min={100000} />
              <NumberInput name="accessories" label="Accessories (₹)" defaultValue={0} step={500} />
              <div><label className="label text-xs" htmlFor={`vm${m.id}`}>Mileage / range</label><input id={`vm${m.id}`} name="mileage" placeholder="18 km/l" className="field" required /></div>
            </SaveForm>
          </details>
        </section>
      ))}

      <section className="card p-5 sm:p-6">
        <h2 className="font-semibold">Add a model</h2>
        <p className="mt-1 text-sm text-muted">New models start unpublished. Add a variant, then publish.</p>
        <SaveForm action={createModel} label="Add model" className="mt-4 grid gap-3">
          <div className="grid gap-3 sm:grid-cols-3">
            <div><label className="label text-xs" htmlFor="cm-name">Name</label><input id="cm-name" name="name" className="field" required /></div>
            <div><label className="label text-xs" htmlFor="cm-body">Body type</label><select id="cm-body" name="bodyType" className="field"><option>Hatchback</option><option>Sedan</option><option>SUV</option></select></div>
            <div><label className="label text-xs" htmlFor="cm-tag">Tagline</label><input id="cm-tag" name="tagline" className="field" required /></div>
          </div>
          <div><label className="label text-xs" htmlFor="cm-desc">Description</label><textarea id="cm-desc" name="description" rows={2} className="field py-2" required /></div>
        </SaveForm>
      </section>
    </div>
  );
}

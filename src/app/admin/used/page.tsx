import { asc, eq } from "drizzle-orm";
import { requireRole } from "@/lib/auth";
import { db, schema as s } from "@/db";
import { createUsedCar, updateUsedCar } from "@/app/actions/admin";
import { NumberInput, SaveForm } from "@/components/SaveForm";
import { suggestPriceBand } from "@/lib/priceBand";
import { km, rupees } from "@/lib/format";
import { maskRegistration } from "@/lib/mask";

export const metadata = { title: "Used stock" };

export default async function AdminUsed() {
  await requireRole(["admin"], "/admin/used");
  const [cars, sales, showrooms] = await Promise.all([
    db.select().from(s.usedCars).orderBy(asc(s.usedCars.stockId)),
    db.select().from(s.pastSales),
    db.select().from(s.showrooms),
  ]);

  return (
    <div className="grid gap-10">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Used-car stock</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted">You set every final price. The suggested band comes from past sales of the same model within one year of age, adjusted for age and kilometres. Only admins see it. Buyers and consultants never do.</p>
      </div>

      <ul className="grid gap-4">
        {cars.map((c) => {
          const band = suggestPriceBand(sales, c);
          return (
            <li key={c.id} className="card p-5 sm:p-6">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="font-semibold">{c.stockId} · {c.year} {c.model} {c.variant} · {c.fuel}</h2>
                <p className="text-sm text-muted">{km(c.km)} · {c.owners} owner · {maskRegistration(c.regNo)}</p>
              </div>

              <div className="mt-3 rounded-xl bg-surface p-3 text-sm">
                {band ? (
                  <p>Suggested band <strong>{rupees(band.low)} to {rupees(band.high)}</strong> (middle {rupees(band.mid)}), from {band.comparables} comparable sales, {band.confidence} confidence. {c.price < band.low ? <span className="text-warn">Listed below the band.</span> : c.price > band.high ? <span className="text-warn">Listed above the band.</span> : <span className="text-ok">Listed within the band.</span>}</p>
                ) : <p className="text-muted">Not enough comparable sales to suggest a band. Set the price from your own judgement.</p>}
              </div>

              <SaveForm action={updateUsedCar} compact className="mt-4 grid items-end gap-3 sm:grid-cols-[1fr_1fr_auto_auto]">
                <input type="hidden" name="id" value={c.id} />
                <NumberInput name="price" label="Price (₹)" defaultValue={c.price} step={5000} min={50000} />
                <div><label className="label text-xs" htmlFor={`st${c.id}`}>Status</label><select id={`st${c.id}`} name="status" defaultValue={c.status} className="field capitalize">{["available", "booked", "sold"].map((x) => <option key={x}>{x}</option>)}</select></div>
                <label className="flex items-center gap-2 pb-2.5 text-sm"><input type="checkbox" name="published" defaultChecked={c.published} className="size-5 accent-[var(--color-accent)]" /> Live</label>
              </SaveForm>
            </li>
          );
        })}
      </ul>

      <section className="card p-5 sm:p-6">
        <h2 className="font-semibold">Add a used car</h2>
        <SaveForm action={createUsedCar} label="Add car" className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Text name="stockId" label="Stock ID" placeholder="UC-1300" />
          <Text name="model" label="Model" placeholder="Model C" />
          <Text name="variant" label="Variant" placeholder="VX" />
          <div><label className="label text-xs" htmlFor="u-body">Body</label><select id="u-body" name="bodyType" className="field"><option>Hatchback</option><option>Sedan</option><option>SUV</option></select></div>
          <div><label className="label text-xs" htmlFor="u-fuel">Fuel</label><select id="u-fuel" name="fuel" className="field">{s.FUELS.map((f) => <option key={f}>{f}</option>)}</select></div>
          <NumberInput name="year" label="Year" defaultValue={new Date().getFullYear() - 2} />
          <NumberInput name="km" label="Km driven" defaultValue="" step={100} />
          <NumberInput name="owners" label="Owners" defaultValue={1} min={1} />
          <Text name="regNo" label="Registration no." placeholder="UP32AB1234" />
          <Text name="colour" label="Colour" placeholder="Pearl White" />
          <Text name="colourHex" label="Colour hex" placeholder="#f4f4f1" />
          <NumberInput name="price" label="Price (₹)" defaultValue="" step={5000} min={50000} />
          <div><label className="label text-xs" htmlFor="u-sr">Showroom</label><select id="u-sr" name="showroomId" className="field">{showrooms.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select></div>
        </SaveForm>
      </section>
    </div>
  );
}

function Text({ name, label, placeholder }: { name: string; label: string; placeholder?: string }) {
  return <div><label className="label text-xs" htmlFor={`u-${name}`}>{label}</label><input id={`u-${name}`} name={name} placeholder={placeholder} className="field" required /></div>;
}

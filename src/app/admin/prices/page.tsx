import { asc, eq } from "drizzle-orm";
import { db, schema as s } from "@/db";
import { extendValidity, updatePriceRule, updateSettings } from "@/app/actions/admin";
import { NumberInput, SaveForm } from "@/components/SaveForm";
import { computeOnRoad } from "@/lib/pricing";
import { getPriceRules, getSettings } from "@/lib/queries";
import { dateLabel, rupees } from "@/lib/format";

export const metadata = { title: "Prices" };

const LABEL: Record<string, string> = { exShowroom: "Ex-showroom", roadTax: "Road tax", registration: "Registration and HSRP", insurance: "Insurance", tcs: "TCS", accessories: "Accessories" };

export default async function AdminPrices({ searchParams }: { searchParams: Promise<{ variant?: string; city?: string }> }) {
  const sp = await searchParams;
  const [rules, settings, rows, variants] = await Promise.all([
    db.select().from(s.priceRules).orderBy(asc(s.priceRules.city), asc(s.priceRules.fuel)),
    getSettings(),
    getPriceRules(),
    db.select({ v: s.variants, model: s.carModels.name }).from(s.variants).innerJoin(s.carModels, eq(s.variants.modelId, s.carModels.id)).orderBy(asc(s.carModels.id), asc(s.variants.exShowroom)),
  ]);

  const cities = [...new Set(rules.map((r) => r.city))];
  const chosen = variants.find((x) => String(x.v.id) === sp.variant) ?? variants[0];
  const city = cities.includes(sp.city ?? "") ? sp.city! : cities[0];
  const preview = chosen ? computeOnRoad(chosen.v, rows.byKey.get(`${city}|${chosen.v.fuel}`), settings) : null;

  return (
    <div className="grid gap-10">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">On-road price tables</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted">Every on-road price on the site is computed from these tables. Road tax is a percentage of ex-showroom. Luxury tax is added on top when ex-showroom exceeds the threshold. The site never shows a price past its validity date.</p>
      </div>

      <section className="card p-5 sm:p-6">
        <h2 className="font-semibold">Preview a price</h2>
        <form method="get" className="mt-4 grid items-end gap-3 sm:grid-cols-[2fr_1fr_auto]">
          <div><label className="label text-xs" htmlFor="pv">Variant</label><select id="pv" name="variant" defaultValue={chosen?.v.id} className="field">{variants.map((x) => <option key={x.v.id} value={x.v.id}>{x.model} {x.v.name} · {x.v.fuel}</option>)}</select></div>
          <div><label className="label text-xs" htmlFor="pc">City</label><select id="pc" name="city" defaultValue={city} className="field">{cities.map((c) => <option key={c}>{c}</option>)}</select></div>
          <button className="btn btn-primary">Preview</button>
        </form>
        {preview ? (
          <div className="mt-5 max-w-md">
            <dl className="grid gap-2 text-sm">
              {preview.lines.map((l) => <div key={l.key} className="flex justify-between"><dt className="text-muted">{LABEL[l.key]}</dt><dd className="tabular-nums">{rupees(l.amount)}</dd></div>)}
            </dl>
            <p className="mt-3 flex justify-between border-t border-line pt-3 font-semibold"><span>On-road total</span><span className="tabular-nums">{rupees(preview.total)}</span></p>
            <p className={`mt-2 text-xs ${preview.expired ? "text-danger" : "text-muted"}`}>{preview.expired ? "Lapsed" : "Valid till"} {dateLabel(preview.validTill)}</p>
          </div>
        ) : <p className="mt-4 text-sm text-muted">No rule for this city and fuel.</p>}
      </section>

      <section className="card p-5 sm:p-6">
        <h2 className="font-semibold">National settings</h2>
        <SaveForm action={updateSettings} className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <NumberInput name="luxuryThreshold" label="Luxury tax above (₹)" defaultValue={settings.luxuryThreshold} step={10000} />
          <NumberInput name="tcsThreshold" label="TCS above (₹)" defaultValue={settings.tcsThreshold} step={10000} />
          <NumberInput name="tcsPct" label="TCS (%)" defaultValue={settings.tcsPct} step={0.1} />
          <NumberInput name="defaultLoanRate" label="Default loan rate (%)" defaultValue={settings.defaultLoanRate} step={0.1} />
          <div className="sm:col-span-2 lg:col-span-4"><label className="label text-xs" htmlFor="note">Price disclaimer</label><input id="note" name="priceNote" defaultValue={settings.priceNote} className="field" required /></div>
        </SaveForm>
      </section>

      <section className="card p-5 sm:p-6">
        <h2 className="font-semibold">Renew all prices</h2>
        <SaveForm action={extendValidity} label="Set validity" className="mt-3 flex flex-wrap items-end gap-3">
          <div><label className="label text-xs" htmlFor="vt">Valid till</label><input id="vt" name="validTill" type="date" className="field" required /></div>
        </SaveForm>
      </section>

      {cities.map((c) => (
        <section key={c} className="card p-5 sm:p-6">
          <h2 className="font-semibold">{c}</h2>
          <ul className="mt-3 divide-y divide-line">
            {rules.filter((r) => r.city === c).map((r) => (
              <li key={r.id} className="py-4">
                <SaveForm action={updatePriceRule} compact className="grid items-end gap-3 sm:grid-cols-3 lg:grid-cols-[0.7fr_repeat(4,1fr)_1.2fr_auto]">
                  <input type="hidden" name="id" value={r.id} />
                  <p className="pb-2.5 text-sm font-medium">{r.fuel}</p>
                  <NumberInput name="roadTaxPct" label="Road tax %" defaultValue={r.roadTaxPct} step={0.25} />
                  <NumberInput name="luxuryTaxPct" label="Luxury tax %" defaultValue={r.luxuryTaxPct} step={0.25} />
                  <NumberInput name="registrationFee" label="Registration (₹)" defaultValue={r.registrationFee} step={100} />
                  <NumberInput name="insurancePct" label="Insurance %" defaultValue={r.insurancePct} step={0.05} />
                  <div><label className="label text-xs" htmlFor={`vt${r.id}`}>Valid till</label><input id={`vt${r.id}`} name="validTill" type="date" defaultValue={r.validTill} className="field" required /></div>
                </SaveForm>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

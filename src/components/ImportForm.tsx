"use client";

import Link from "next/link";
import { useActionState } from "react";
import { importLeads, type ActionState } from "@/app/actions/inbox";

export function ImportForm() {
  const [state, action, pending] = useActionState<ActionState, FormData>(importLeads, {});
  return (
    <form action={action} className="grid gap-4" aria-busy={pending}>
      <div>
        <label htmlFor="file" className="label">CSV file</label>
        <input id="file" name="file" type="file" accept=".csv,text/csv" required className="field py-2 file:mr-4 file:rounded-full file:border-0 file:bg-surface file:px-4 file:py-1.5 file:text-sm" />
      </div>
      {state.error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-danger">{state.error}</p>}
      {state.ok && (
        <div role="status" className="rounded-xl bg-accent-soft p-4 text-sm">
          <ul className="grid gap-1">{state.detail?.map((d, i) => <li key={i}>{d}</li>)}</ul>
          <Link href="/inbox" className="mt-3 inline-block font-medium text-accent-dark">Go to inbox →</Link>
        </div>
      )}
      <button className="btn btn-primary w-fit" disabled={pending}>{pending ? "Importing..." : "Import leads"}</button>
    </form>
  );
}

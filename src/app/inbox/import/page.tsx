import type { Metadata } from "next";
import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { ImportForm } from "@/components/ImportForm";

export const metadata: Metadata = { title: "Import leads", robots: { index: false } };

export default async function ImportPage() {
  await requireRole(["consultant", "admin"], "/inbox/import");
  return (
    <div className="container-page max-w-2xl py-10 sm:py-14">
      <Link href="/inbox" className="text-sm text-muted hover:text-ink">← Lead inbox</Link>
      <h1 className="mt-4 text-3xl font-semibold tracking-tight">Import portal leads</h1>
      <p className="mt-3 text-muted">Upload a CSV exported from a car portal. Each row is validated, de-duplicated against the last 24 hours, and auto-assigned by showroom and model.</p>
      <p className="mt-4 text-sm">Columns: <code className="rounded bg-surface px-1.5 py-0.5">name, phone, email, model, showroom, city, message, budget, source</code>. Only name and phone are required.</p>
      <p className="mt-2 text-sm"><a href="/sample-portal-leads.csv" download className="font-medium text-accent">Download a sample file</a></p>
      <div className="mt-8"><ImportForm /></div>
    </div>
  );
}

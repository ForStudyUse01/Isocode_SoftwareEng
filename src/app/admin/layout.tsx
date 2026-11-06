import type { Metadata } from "next";
import Link from "next/link";
import { requireRole } from "@/lib/auth";

export const metadata: Metadata = { title: { default: "Admin", template: "%s | Admin" }, robots: { index: false } };
export const dynamic = "force-dynamic";

const TABS = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/models", label: "Models" },
  { href: "/admin/prices", label: "Prices" },
  { href: "/admin/used", label: "Used stock" },
  { href: "/admin/promos", label: "Banners and offers" },
  { href: "/admin/users", label: "Users" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireRole(["admin"], "/admin");
  return (
    <div className="container-page py-8 sm:py-12">
      <nav aria-label="Admin" className="-mx-4 flex gap-1 overflow-x-auto border-b border-line px-4 sm:mx-0 sm:px-0">
        {TABS.map((t) => (
          <Link key={t.href} href={t.href} className="shrink-0 border-b-2 border-transparent px-3 py-3 text-sm text-muted hover:text-ink">{t.label}</Link>
        ))}
      </nav>
      <div className="pt-8">{children}</div>
    </div>
  );
}

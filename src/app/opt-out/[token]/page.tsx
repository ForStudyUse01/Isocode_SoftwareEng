import type { Metadata } from "next";
import { eq } from "drizzle-orm";
import { db, schema as s } from "@/db";
import { getT } from "@/lib/i18n";
import { closeOptOut } from "@/lib/leads";

export const metadata: Metadata = { title: "Opt out", robots: { index: false } };

export default async function OptOut({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const { t } = await getT();
  const [lead] = /^[a-f0-9]{32}$/.test(token) ? await db.select({ id: s.leads.id, optedOut: s.leads.optedOut }).from(s.leads).where(eq(s.leads.optOutToken, token)) : [];

  async function confirm() {
    "use server";
    if (lead) await closeOptOut(lead.id);
  }

  return (
    <div className="container-page max-w-md py-20 text-center">
      {!lead ? (
        <p>{t("optOutLinkInvalid")}</p>
      ) : lead.optedOut ? (
        <>
          <h1 className="text-2xl font-semibold tracking-tight">{t("optedOutTitle")}</h1>
          <p className="mt-3 text-muted">{t("optedOutBody")}</p>
        </>
      ) : (
        <form action={confirm}>
          <h1 className="text-2xl font-semibold tracking-tight">{t("optOut")}</h1>
          <p className="mt-3 text-muted">{t("optOutConfirm")}</p>
          <button className="btn btn-primary mt-6">{t("optOut")}</button>
        </form>
      )}
    </div>
  );
}

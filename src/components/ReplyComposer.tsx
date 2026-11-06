"use client";

import { useActionState, useState } from "react";
import { sendReply, type ActionState } from "@/app/actions/inbox";
import { sanitizeDraft } from "@/lib/guardrails";

export function ReplyComposer({ leadId, draft, disabled }: { leadId: number; draft: string; disabled: boolean }) {
  const [text, setText] = useState(draft);
  const [state, action, pending] = useActionState<ActionState, FormData>(sendReply, {});
  const flagged = sanitizeDraft(text).removed > 0;

  return (
    <form action={action} className="grid gap-3">
      <input type="hidden" name="leadId" value={leadId} />
      <label htmlFor="body" className="sr-only">First reply</label>
      <textarea id="body" name="body" rows={6} value={text} onChange={(e) => setText(e.target.value)} disabled={disabled || state.ok} className="field py-3 leading-relaxed" />
      {flagged && <p role="alert" className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-warn">This reads like a discount or price quote. The first reply must not include one.</p>}
      {state.error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-danger">{state.error}</p>}
      {state.ok ? (
        <p role="status" className="rounded-lg bg-green-50 px-3 py-2 text-sm text-ok">Sent on WhatsApp (mock) and the response timer is stopped.</p>
      ) : (
        <button className="btn btn-primary w-fit" disabled={pending || disabled || flagged || text.trim().length < 10}>{pending ? "Sending..." : "Send on WhatsApp"}</button>
      )}
    </form>
  );
}

const STYLE: Record<string, string> = {
  new: "bg-accent-soft text-accent-dark",
  contacted: "bg-surface text-ink",
  test_drive: "bg-blue-50 text-blue-800",
  negotiation: "bg-amber-50 text-warn",
  won: "bg-green-50 text-ok",
  lost: "bg-surface text-muted",
};

export function StatusChip({ status }: { status: string }) {
  return <span className={`inline-flex w-fit rounded-full px-2.5 py-1 text-xs font-medium capitalize ${STYLE[status] ?? STYLE.contacted}`}>{status.replace("_", " ")}</span>;
}

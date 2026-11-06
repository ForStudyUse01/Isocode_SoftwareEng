const BLOCKED = [
  /discount/i,
  /\d+\s?%\s?off/i,
  /cash\s?back/i,
  /waiver/i,
  /best price|lowest price|special price|final price/i,
  /free (insurance|accessories|service)/i,
  /(₹|rs\.?|inr)\s?[\d,.]+\s?(lakh|k)?\s?(off|less|cheaper)/i,
  /exchange bonus/i,
  /छूट|डिस्काउंट|कैशबैक|सबसे सस्ता/,
];

export type SanitizedDraft = { text: string; removed: number };

export function sanitizeDraft(draft: string): SanitizedDraft {
  const sentences = draft.split(/(?<=[.!?।\n])\s+/);
  const kept = sentences.filter((s) => !BLOCKED.some((re) => re.test(s)));
  return { text: kept.join(" ").trim(), removed: sentences.length - kept.length };
}

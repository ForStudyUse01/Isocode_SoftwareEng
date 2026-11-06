import { sanitizeDraft } from "./guardrails";

export type LeadContext = {
  firstName: string;
  locale: "en" | "hi";
  interest: "new" | "used" | "test_drive" | "trade_in";
  vehicle: string | null;
  budget: number | null;
  message: string | null;
  tradeIn: string | null;
  testDrive: string | null;
  showroom: string | null;
  consultant: string;
};

export type AiOutput = { summary: string; draft: string; source: "ai" | "rules"; removed: number };

const lakh = (n: number) => `₹${(n / 100000).toFixed(n % 100000 === 0 ? 0 : 1)} lakh`;

export function rulesSummary(c: LeadContext): string {
  const v = c.vehicle;
  const headline = {
    new: `${c.firstName} wants to buy ${v ? `a new ${v}` : "a new car"}.`,
    used: `${c.firstName} is interested in ${v ? `the ${v}` : "a certified used car"}.`,
    test_drive: `${c.firstName} booked a test drive${v ? ` of the ${v}` : ""}${c.testDrive ? ` for ${c.testDrive}` : ""}.`,
    trade_in: `${c.firstName} wants a trade-in valuation${v ? ` and is considering the ${v}` : ""}.`,
  }[c.interest];

  const facts: string[] = [];
  if (c.budget) facts.push(`Budget about ${lakh(c.budget)}.`);
  if (c.tradeIn && c.interest !== "trade_in") facts.push(`Trade-in: ${c.tradeIn}.`);
  if (c.tradeIn && c.interest === "trade_in") facts.push(`Current car: ${c.tradeIn}.`);
  if (c.showroom) facts.push(`Prefers ${c.showroom}.`);
  if (c.message) facts.push(`In their words: "${c.message.slice(0, 160)}"`);
  return [headline, ...facts].join(" ");
}

export function rulesDraft(c: LeadContext): string {
  const vehicle = c.vehicle ?? "our cars";
  if (c.locale === "hi") {
    const next = c.testDrive
      ? `आपकी टेस्ट ड्राइव (${c.testDrive}) की पुष्टि हो गई है।`
      : "क्या आप शोरूम आकर टेस्ट ड्राइव लेना चाहेंगे? आप अपना पसंदीदा दिन और समय बता दें।";
    return `नमस्ते ${c.firstName}, ${vehicle} में रुचि दिखाने के लिए धन्यवाद। मैं ${c.consultant} हूँ और आपकी हर जानकारी में मदद करूँगा। ${next} आज कब बात करना सुविधाजनक रहेगा?`;
  }
  const next = c.testDrive
    ? `Your test drive (${c.testDrive}) is confirmed, and I will be at the showroom to receive you.`
    : "Would you like to visit the showroom for a test drive? Tell me a day and time that suits you.";
  return `Hello ${c.firstName}, thank you for your interest in ${vehicle}. I am ${c.consultant} from Brand X and I will be your point of contact. ${next} When is a good time to call you today?`;
}

async function callModel(c: LeadContext): Promise<{ summary: string; draft: string } | null> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return null;

  const prompt = `You help a car dealership sales consultant. Reply with JSON only: {"summary": string, "draft": string}.
summary: two sentences max, English, what the buyer needs.
draft: a short, warm first reply the consultant can edit, written in ${c.locale === "hi" ? "Hindi (Devanagari)" : "English"}, signed by ${c.consultant}.
Hard rules for the draft: never mention discounts, offers, cashback, free items or any price figure; only invite the buyer to talk or visit.
Buyer details (no contact data is shared): ${JSON.stringify({
    firstName: c.firstName,
    interest: c.interest,
    vehicle: c.vehicle,
    budgetInr: c.budget,
    message: c.message,
    tradeIn: c.tradeIn,
    testDrive: c.testDrive,
    showroom: c.showroom,
  })}`;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "content-type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({
      model: process.env.ANTHROPIC_MODEL || "claude-haiku-4-5",
      max_tokens: 600,
      messages: [{ role: "user", content: prompt }],
    }),
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) return null;

  const data = (await res.json()) as { content?: { type: string; text?: string }[] };
  const text = data.content?.find((b) => b.type === "text")?.text ?? "";
  const json = text.match(/\{[\s\S]*\}/)?.[0];
  if (!json) return null;
  const parsed = JSON.parse(json) as { summary?: unknown; draft?: unknown };
  if (typeof parsed.summary !== "string" || typeof parsed.draft !== "string") return null;
  return { summary: parsed.summary, draft: parsed.draft };
}

export async function generateLeadAssist(c: LeadContext): Promise<AiOutput> {
  let model: { summary: string; draft: string } | null = null;
  try {
    model = await callModel(c);
  } catch {
    model = null;
  }

  const raw = model ?? { summary: rulesSummary(c), draft: rulesDraft(c) };
  let { text, removed } = sanitizeDraft(raw.draft);
  let source: AiOutput["source"] = model ? "ai" : "rules";

  if (text.length < 20) {
    text = rulesDraft(c);
    removed = 0;
    source = "rules";
  }
  return { summary: raw.summary, draft: text, source, removed };
}

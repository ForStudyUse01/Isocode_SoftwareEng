import { describe, expect, it } from "vitest";
import { assignLead, type Consultant } from "@/lib/assign";
import { suggestPriceBand } from "@/lib/priceBand";
import { sanitizeDraft } from "@/lib/guardrails";
import { rulesDraft, rulesSummary } from "@/lib/ai";
import { maskRegistration } from "@/lib/mask";
import { slaState } from "@/lib/sla";
import { bookableDates, generateSlots, isValidSlot } from "@/lib/slots";

const c = (id: number, showroomId: number | null, modelIds: number[], openLeads = 0, lastAssignedAt: string | null = null): Consultant => ({
  id,
  showroomId,
  modelIds,
  openLeads,
  lastAssignedAt,
});

describe("assignLead", () => {
  it("prefers showroom and model match over a lighter load elsewhere", () => {
    const r = assignLead({ showroomId: 1, modelId: 7 }, [c(1, 2, [7], 0), c(2, 1, [7], 5), c(3, 1, [9], 0)]);
    expect(r).toEqual({ consultantId: 2, reason: "showroom+model" });
  });

  it("falls back to showroom, then model, then load", () => {
    expect(assignLead({ showroomId: 1, modelId: 7 }, [c(1, 1, [9]), c(2, 2, [7])])?.reason).toBe("showroom");
    expect(assignLead({ showroomId: 3, modelId: 7 }, [c(1, 1, [9]), c(2, 2, [7])])?.reason).toBe("model");
    expect(assignLead({ showroomId: 3, modelId: 8 }, [c(1, 1, [9], 4), c(2, 2, [7], 1)])).toEqual({ consultantId: 2, reason: "load" });
  });

  it("balances by open leads, then by least recently assigned", () => {
    expect(assignLead({ showroomId: 1, modelId: 7 }, [c(1, 1, [7], 3), c(2, 1, [7], 1)])?.consultantId).toBe(2);
    expect(assignLead({ showroomId: 1, modelId: 7 }, [c(1, 1, [7], 1, "2026-11-06T10:00"), c(2, 1, [7], 1, "2026-11-06T09:00")])?.consultantId).toBe(2);
  });

  it("returns null with no consultants", () => {
    expect(assignLead({ showroomId: 1, modelId: 1 }, [])).toBeNull();
  });
});

describe("suggestPriceBand", () => {
  const sales = [
    { model: "Model C", year: 2022, km: 40_000, price: 850_000 },
    { model: "Model C", year: 2022, km: 45_000, price: 830_000 },
    { model: "Model C", year: 2021, km: 52_000, price: 760_000 },
    { model: "Model C", year: 2023, km: 20_000, price: 960_000 },
    { model: "Model S", year: 2022, km: 40_000, price: 500_000 },
  ];

  it("returns a band around the adjusted median using only the same model", () => {
    const band = suggestPriceBand(sales, { model: "Model C", year: 2022, km: 41_200 })!;
    expect(band.comparables).toBe(4);
    expect(band.low).toBeLessThan(band.mid);
    expect(band.mid).toBeLessThan(band.high);
    expect(band.mid).toBeGreaterThan(780_000);
    expect(band.mid).toBeLessThan(900_000);
  });

  it("returns null when there are too few comparables", () => {
    expect(suggestPriceBand(sales, { model: "Model S", year: 2022, km: 40_000 })).toBeNull();
    expect(suggestPriceBand(sales, { model: "Model C", year: 2015, km: 40_000 })).toBeNull();
  });

  it("prices a lower-km car higher than a higher-km one", () => {
    const low = suggestPriceBand(sales, { model: "Model C", year: 2022, km: 20_000 })!;
    const high = suggestPriceBand(sales, { model: "Model C", year: 2022, km: 80_000 })!;
    expect(low.mid).toBeGreaterThan(high.mid);
  });
});

describe("sanitizeDraft", () => {
  it("removes sentences that quote discounts or prices", () => {
    const r = sanitizeDraft("Hello Asha, thanks for your interest. We can give you a 5% discount today. Shall we plan a test drive?");
    expect(r.text).toBe("Hello Asha, thanks for your interest. Shall we plan a test drive?");
    expect(r.removed).toBe(1);
  });

  it("catches Hindi discount wording and cashback", () => {
    expect(sanitizeDraft("नमस्ते। आज ₹20,000 की छूट मिलेगी। टेस्ट ड्राइव बुक करें।").removed).toBe(1);
    expect(sanitizeDraft("Get cashback of 10000 this week.").text).toBe("");
  });

  it("leaves a clean draft untouched", () => {
    const text = "Hello Ravi, thanks for enquiring. When would you like to visit?";
    expect(sanitizeDraft(text)).toEqual({ text, removed: 0 });
  });
});

describe("maskRegistration", () => {
  it("hides the middle of the registration number", () => {
    expect(maskRegistration("UP32 AB 1234")).toBe("UP32 •• ••34");
    expect(maskRegistration("up32ab1234")).toBe("UP32 •• ••34");
  });
});

describe("slots", () => {
  const now = new Date("2026-11-06T09:00:00+05:30");

  it("offers 14 days starting today in IST", () => {
    const dates = bookableDates(now);
    expect(dates).toHaveLength(14);
    expect(dates[0]).toBe("2026-11-06");
  });

  it("blocks past slots, slots inside the 2-hour lead time and booked slots", () => {
    const booked = new Set([new Date("2026-11-06T15:00:00+05:30").toISOString()]);
    const slots = generateSlots("2026-11-06", booked, now);
    const state = Object.fromEntries(slots.map((s) => [s.label, s.available]));
    expect(state["10:00 AM"]).toBe(false);
    expect(state["12:00 PM"]).toBe(true);
    expect(state["3:00 PM"]).toBe(false);
    expect(state["4:00 PM"]).toBe(true);
  });

  it("rejects dates outside the booking window", () => {
    expect(generateSlots("2026-12-30", new Set(), now)).toEqual([]);
    expect(isValidSlot(new Date("2026-12-30T10:00:00+05:30").toISOString(), now)).toBe(false);
  });
});

describe("slaState", () => {
  const created = "2026-11-06T10:00:00.000Z";
  const due = "2026-11-06T10:05:00.000Z";

  it("counts down while unanswered and flags a breach after the due time", () => {
    expect(slaState(due, created, null, Date.parse("2026-11-06T10:02:00Z"))).toMatchObject({ kind: "running", ms: 180000 });
    expect(slaState(due, created, null, Date.parse("2026-11-06T10:09:00Z"))).toMatchObject({ kind: "breached", ms: -240000 });
  });

  it("marks replies within five minutes as met and later ones as late", () => {
    expect(slaState(due, created, "2026-11-06T10:04:00Z", 0)).toMatchObject({ kind: "met", mins: 4 });
    expect(slaState(due, created, "2026-11-06T10:05:00Z", 0).kind).toBe("met");
    expect(slaState(due, created, "2026-11-06T10:20:00Z", 0)).toMatchObject({ kind: "late", mins: 20 });
  });
});

describe("rules-based lead assist", () => {
  const ctx = {
    firstName: "Asha", locale: "en" as const, interest: "test_drive" as const, vehicle: "Model H", budget: 1400000,
    message: null, tradeIn: null, testDrive: "Fri, 7 Nov, 2:00 pm", showroom: "Gomti Nagar Showroom", consultant: "Priya Sharma",
  };

  it("summarises the buyer in plain sentences", () => {
    expect(rulesSummary(ctx)).toBe("Asha booked a test drive of the Model H for Fri, 7 Nov, 2:00 pm. Budget about ₹14 lakh. Prefers Gomti Nagar Showroom.");
  });

  it("writes drafts that already pass the discount guardrail, in both languages", () => {
    for (const locale of ["en", "hi"] as const) {
      const draft = rulesDraft({ ...ctx, locale });
      expect(sanitizeDraft(draft).removed).toBe(0);
      expect(draft).toContain("Asha");
    }
  });
});

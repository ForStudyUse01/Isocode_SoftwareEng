import { describe, expect, it } from "vitest";
import { computeOnRoad, type PriceRule, type TaxSettings } from "@/lib/pricing";
import { computeEmi } from "@/lib/emi";

const rule: PriceRule = { roadTaxPct: 8, luxuryTaxPct: 2, registrationFee: 2500, insurancePct: 3.5, validTill: "2026-12-31" };
const settings: TaxSettings = { luxuryThreshold: 1_000_000, tcsThreshold: 1_000_000, tcsPct: 1 };
const today = new Date("2026-11-06T10:00:00+05:30");

const amount = (p: ReturnType<typeof computeOnRoad>, key: string) => p!.lines.find((l) => l.key === key)?.amount;

describe("computeOnRoad", () => {
  it("builds the full breakup above the luxury and TCS thresholds", () => {
    const p = computeOnRoad({ exShowroom: 1_245_000, accessories: 25_000 }, rule, settings, true, today);
    expect(amount(p, "roadTax")).toBe(124_500);
    expect(amount(p, "insurance")).toBe(43_575);
    expect(amount(p, "tcs")).toBe(12_450);
    expect(p!.total).toBe(1_453_025);
    expect(p!.expired).toBe(false);
  });

  it("skips luxury tax and TCS at or below the thresholds", () => {
    const p = computeOnRoad({ exShowroom: 700_000, accessories: 0 }, rule, settings, true, today);
    expect(amount(p, "roadTax")).toBe(56_000);
    expect(amount(p, "tcs")).toBeUndefined();
    expect(amount(p, "accessories")).toBeUndefined();
  });

  it("treats the threshold itself as not luxury", () => {
    const p = computeOnRoad({ exShowroom: 1_000_000, accessories: 0 }, rule, settings, true, today);
    expect(amount(p, "roadTax")).toBe(80_000);
    expect(amount(p, "tcs")).toBeUndefined();
  });

  it("excludes accessories when the buyer opts out", () => {
    const p = computeOnRoad({ exShowroom: 700_000, accessories: 20_000 }, rule, settings, false, today);
    expect(amount(p, "accessories")).toBeUndefined();
  });

  it("returns null when no rule exists for the city and fuel", () => {
    expect(computeOnRoad({ exShowroom: 700_000, accessories: 0 }, undefined, settings)).toBeNull();
  });

  it("flags prices past their validity date", () => {
    const p = computeOnRoad({ exShowroom: 700_000, accessories: 0 }, { ...rule, validTill: "2026-11-05" }, settings, true, today);
    expect(p!.expired).toBe(true);
  });

  it("stays valid through the end of the validity day in IST", () => {
    const p = computeOnRoad({ exShowroom: 700_000, accessories: 0 }, { ...rule, validTill: "2026-11-06" }, settings, true, new Date("2026-11-06T23:30:00+05:30"));
    expect(p!.expired).toBe(false);
  });
});

describe("computeEmi", () => {
  it("matches the standard reducing-balance formula", () => {
    const r = computeEmi({ price: 1_000_000, downPayment: 200_000, annualRatePct: 9, months: 60 });
    expect(r.loan).toBe(800_000);
    expect(r.emi).toBe(16_607);
  });

  it("handles a zero interest rate", () => {
    expect(computeEmi({ price: 600_000, downPayment: 0, annualRatePct: 0, months: 60 }).emi).toBe(10_000);
  });

  it("returns zeros when the down payment covers the price", () => {
    expect(computeEmi({ price: 500_000, downPayment: 500_000, annualRatePct: 9, months: 60 }).emi).toBe(0);
  });
});

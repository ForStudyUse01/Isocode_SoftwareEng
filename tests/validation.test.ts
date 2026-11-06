import { describe, expect, it } from "vitest";
import { leadInput, normalisePhone } from "@/lib/validation";
import { rateLimited, resetRateLimits } from "@/lib/rateLimit";

describe("normalisePhone", () => {
  it("accepts common Indian mobile formats", () => {
    expect(normalisePhone("98765 43210")).toBe("9876543210");
    expect(normalisePhone("+91 98765-43210")).toBe("9876543210");
    expect(normalisePhone("09876543210")).toBe("9876543210");
  });

  it("rejects landlines, short numbers and junk", () => {
    expect(normalisePhone("0522400101")).toBeNull();
    expect(normalisePhone("12345")).toBeNull();
    expect(normalisePhone("5876543210")).toBeNull();
    expect(normalisePhone("abcdefghij")).toBeNull();
  });
});

describe("leadInput", () => {
  const base = { name: "Asha Verma", phone: "9876543210", consent: true };

  it("accepts a minimal valid lead and applies defaults", () => {
    const r = leadInput.parse(base);
    expect(r).toMatchObject({ phone: "9876543210", locale: "en", source: "web", interest: "new" });
  });

  it("requires consent", () => {
    expect(leadInput.safeParse({ ...base, consent: false }).success).toBe(false);
  });

  it("turns empty optional strings and numbers into undefined", () => {
    const r = leadInput.parse({ ...base, email: "", modelId: "", message: "  ", budget: "" });
    expect(r.email).toBeUndefined();
    expect(r.modelId).toBeUndefined();
    expect(r.message).toBeUndefined();
  });

  it("rejects bad email, bad phone and out-of-range numbers", () => {
    expect(leadInput.safeParse({ ...base, email: "nope" }).success).toBe(false);
    expect(leadInput.safeParse({ ...base, phone: "123" }).success).toBe(false);
    expect(leadInput.safeParse({ ...base, budget: "-5" }).success).toBe(false);
    expect(leadInput.safeParse({ ...base, source: "hacker" }).success).toBe(false);
  });
});

describe("rateLimited", () => {
  it("blocks after the limit within the window and recovers after it", () => {
    resetRateLimits();
    const t0 = 1_000_000;
    expect(rateLimited("k", 2, 1000, t0)).toBe(false);
    expect(rateLimited("k", 2, 1000, t0 + 10)).toBe(false);
    expect(rateLimited("k", 2, 1000, t0 + 20)).toBe(true);
    expect(rateLimited("k", 2, 1000, t0 + 1500)).toBe(false);
  });
});

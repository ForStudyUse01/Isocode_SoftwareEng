export type PastSale = { model: string; year: number; km: number; price: number };
export type PriceBand = { low: number; mid: number; high: number; comparables: number; confidence: "medium" | "high" };

const YEAR_STEP = 0.08;
const PER_1000_KM = 0.004;
const MIN_COMPARABLES = 3;

const roundTo = (n: number, step: number) => Math.round(n / step) * step;

function median(values: number[]) {
  const s = [...values].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

export function suggestPriceBand(sales: PastSale[], target: { model: string; year: number; km: number }): PriceBand | null {
  const comps = sales.filter((s) => s.model === target.model && Math.abs(s.year - target.year) <= 1);
  if (comps.length < MIN_COMPARABLES) return null;

  const adjusted = comps.map((s) => {
    const factor = 1 + YEAR_STEP * (target.year - s.year) + (PER_1000_KM * (s.km - target.km)) / 1000;
    return s.price * Math.min(1.3, Math.max(0.7, factor));
  });
  const mid = median(adjusted);

  return {
    low: roundTo(mid * 0.95, 5000),
    mid: roundTo(mid, 5000),
    high: roundTo(mid * 1.05, 5000),
    comparables: comps.length,
    confidence: comps.length >= 6 ? "high" : "medium",
  };
}

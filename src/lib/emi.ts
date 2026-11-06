export type EmiInput = { price: number; downPayment: number; annualRatePct: number; months: number };
export type EmiResult = { loan: number; emi: number; totalPayable: number; totalInterest: number };

export function computeEmi({ price, downPayment, annualRatePct, months }: EmiInput): EmiResult {
  const loan = Math.max(0, price - downPayment);
  if (loan === 0 || months <= 0) return { loan, emi: 0, totalPayable: 0, totalInterest: 0 };

  const r = annualRatePct / 12 / 100;
  const emi = r === 0 ? loan / months : (loan * r * (1 + r) ** months) / ((1 + r) ** months - 1);
  const rounded = Math.round(emi);
  const totalPayable = rounded * months;
  return { loan, emi: rounded, totalPayable, totalInterest: totalPayable - loan };
}

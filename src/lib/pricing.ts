export type PriceRule = {
  roadTaxPct: number;
  luxuryTaxPct: number;
  registrationFee: number;
  insurancePct: number;
  validTill: string;
};

export type TaxSettings = {
  luxuryThreshold: number;
  tcsThreshold: number;
  tcsPct: number;
};

export type OnRoadLine = { key: "exShowroom" | "roadTax" | "registration" | "insurance" | "tcs" | "accessories"; amount: number };

export type OnRoadPrice = {
  lines: OnRoadLine[];
  total: number;
  validTill: string;
  expired: boolean;
};

const pct = (base: number, rate: number) => Math.round((base * rate) / 100);

export function computeOnRoad(
  car: { exShowroom: number; accessories: number },
  rule: PriceRule | null | undefined,
  settings: TaxSettings,
  includeAccessories = true,
  today = new Date(),
): OnRoadPrice | null {
  if (!rule) return null;

  const taxRate = rule.roadTaxPct + (car.exShowroom > settings.luxuryThreshold ? rule.luxuryTaxPct : 0);
  const lines: OnRoadLine[] = [
    { key: "exShowroom", amount: car.exShowroom },
    { key: "roadTax", amount: pct(car.exShowroom, taxRate) },
    { key: "registration", amount: rule.registrationFee },
    { key: "insurance", amount: pct(car.exShowroom, rule.insurancePct) },
  ];
  if (car.exShowroom > settings.tcsThreshold) lines.push({ key: "tcs", amount: pct(car.exShowroom, settings.tcsPct) });
  if (includeAccessories && car.accessories > 0) lines.push({ key: "accessories", amount: car.accessories });

  return {
    lines,
    total: lines.reduce((sum, l) => sum + l.amount, 0),
    validTill: rule.validTill,
    expired: new Date(`${rule.validTill}T23:59:59+05:30`) < today,
  };
}

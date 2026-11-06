const inr = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 });

export const rupees = (n: number) => `₹${inr.format(n)}`;

export function lakh(n: number) {
  const v = n / 100000;
  return `₹${Number.isInteger(v) ? v : v.toFixed(2).replace(/0$/, "")} lakh`;
}

export const km = (n: number) => `${inr.format(n)} km`;

const asDate = (value: string) => new Date(value.length === 10 ? `${value}T00:00:00+05:30` : value);

export function dateLabel(value: string, locale = "en-IN") {
  return asDate(value).toLocaleDateString(locale, { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" });
}

export function dateTimeLabel(value: string, locale = "en-IN") {
  return asDate(value).toLocaleString(locale, { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" });
}

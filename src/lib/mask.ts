export function maskRegistration(reg: string): string {
  const clean = reg.replace(/[\s-]/g, "").toUpperCase();
  if (clean.length < 8) return "•••• •• ••••";
  return `${clean.slice(0, 4)} •• ••${clean.slice(-2)}`;
}

export function maskPhone(phone: string): string {
  return phone.length < 6 ? "••••" : `${phone.slice(0, 2)}•••••${phone.slice(-3)}`;
}

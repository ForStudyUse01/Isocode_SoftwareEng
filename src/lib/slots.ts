const OPEN_HOURS = [10, 11, 12, 14, 15, 16, 17];
const MIN_LEAD_MS = 2 * 60 * 60 * 1000;
export const BOOKING_WINDOW_DAYS = 14;

export type Slot = { startsAt: string; label: string; available: boolean };

const toIso = (date: string, hour: number) => new Date(`${date}T${String(hour).padStart(2, "0")}:00:00+05:30`).toISOString();

export function slotLabel(hour: number) {
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${h12}:00 ${hour < 12 ? "AM" : "PM"}`;
}

export function istDate(d: Date): string {
  return new Date(d.getTime() + 5.5 * 3600_000).toISOString().slice(0, 10);
}

export function bookableDates(now = new Date()): string[] {
  const start = new Date(istDate(now) + "T00:00:00Z").getTime();
  return Array.from({ length: BOOKING_WINDOW_DAYS }, (_, i) => new Date(start + i * 86_400_000).toISOString().slice(0, 10));
}

export function generateSlots(date: string, booked: Set<string>, now = new Date()): Slot[] {
  if (!bookableDates(now).includes(date)) return [];
  return OPEN_HOURS.map((hour) => {
    const startsAt = toIso(date, hour);
    const tooSoon = new Date(startsAt).getTime() - now.getTime() < MIN_LEAD_MS;
    return { startsAt, label: slotLabel(hour), available: !tooSoon && !booked.has(startsAt) };
  });
}

export function isValidSlot(startsAt: string, now = new Date()): boolean {
  const date = istDate(new Date(startsAt));
  return generateSlots(date, new Set(), now).some((s) => s.startsAt === startsAt && s.available);
}

import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db, schema as s } from "@/db";
import { generateSlots } from "@/lib/slots";

const query = z.object({ demoCarId: z.coerce.number().int().positive(), date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) });

export async function GET(req: Request) {
  const parsed = query.safeParse(Object.fromEntries(new URL(req.url).searchParams));
  if (!parsed.success) return NextResponse.json({ error: "invalid query" }, { status: 400 });

  const rows = await db
    .select({ startsAt: s.testDrives.startsAt })
    .from(s.testDrives)
    .where(and(eq(s.testDrives.demoCarId, parsed.data.demoCarId), eq(s.testDrives.status, "booked")));
  const slots = generateSlots(parsed.data.date, new Set(rows.map((r) => r.startsAt)));
  return NextResponse.json({ slots }, { headers: { "Cache-Control": "no-store" } });
}

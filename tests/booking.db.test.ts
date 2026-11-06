import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createClient, type Client } from "@libsql/client";

// Builds a throwaway database from src/db/schema.ts so the test exercises the real unique index.
const root = join(import.meta.dirname, "..");
let dir: string;
let db: Client;

const SLOT = "2026-11-10T08:30:00.000Z";
const book = (demoCarId: number, leadId: number, status = "booked", startsAt = SLOT) =>
  db.execute({ sql: "insert into test_drives (demo_car_id, starts_at, lead_id, status, created_at) values (?, ?, ?, ?, ?)", args: [demoCarId, startsAt, leadId, status, "now"] });

beforeAll(async () => {
  dir = mkdtempSync(join(tmpdir(), "booking-"));
  const url = `file:${join(dir, "test.db").replace(/\\/g, "/")}`;
  execFileSync(process.execPath, [join(root, "node_modules", "drizzle-kit", "bin.cjs"), "push", "--force"], {
    env: { ...process.env, DATABASE_URL: url },
    stdio: "pipe",
    cwd: root,
  });
  db = createClient({ url });

  await db.execute("insert into showrooms (slug, name, city, address, phone) values ('s', 'S', 'Lucknow', 'a', 'p')");
  await db.execute("insert into car_models (slug, name, body_type, tagline, description) values ('m', 'M', 'SUV', 't', 'd')");
  await db.execute("insert into variants (model_id, name, fuel, transmission, ex_showroom, mileage) values (1, 'v', 'Petrol', 'Manual', 1000000, '10')");
  await db.execute("insert into demo_cars (showroom_id, variant_id, label) values (1, 1, 'A'), (1, 1, 'B')");
  for (const n of [1, 2, 3]) {
    await db.execute({ sql: "insert into leads (name, phone, consent_at, opt_out_token, sla_due_at, created_at) values (?, '9876543210', 'x', ?, 'x', 'x')", args: [`L${n}`, `t${n}`] });
  }
}, 60_000);

afterAll(() => {
  db?.close();
  try {
    rmSync(dir, { recursive: true, force: true });
  } catch {
    // Windows may still hold the file; the OS temp folder is cleaned up later.
  }
});

describe("test-drive slot uniqueness", () => {
  it("rejects a second active booking of the same car and time", async () => {
    await book(1, 1);
    await expect(book(1, 2)).rejects.toThrow(/UNIQUE/i);
  });

  it("allows the same time on a different demo car", async () => {
    await expect(book(2, 2)).resolves.toBeDefined();
  });

  it("frees the slot again once the booking is cancelled", async () => {
    await db.execute("update test_drives set status = 'cancelled' where demo_car_id = 1");
    await expect(book(1, 3)).resolves.toBeDefined();
  });
});

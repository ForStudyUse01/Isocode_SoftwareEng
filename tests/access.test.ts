import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const root = join(import.meta.dirname, "..", "src", "app");

function pages(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) return pages(p);
    return name === "page.tsx" ? [p] : [];
  });
}

// A layout redirect does not stop a sibling page from rendering, so every protected page must authorise itself.
describe("protected pages authorise inside the page", () => {
  const protectedPages = ["admin", "inbox", "account"].flatMap((d) => pages(join(root, d)));

  it("finds the protected pages", () => {
    expect(protectedPages.length).toBeGreaterThanOrEqual(9);
  });

  it.each(protectedPages)("%s calls requireRole", (file) => {
    expect(readFileSync(file, "utf8")).toContain("requireRole(");
  });
});

describe("server actions authorise before touching data", () => {
  it.each(["admin.ts", "inbox.ts"])("%s checks the role", (name) => {
    expect(readFileSync(join(root, "actions", name), "utf8")).toContain("requireRole(");
  });
});

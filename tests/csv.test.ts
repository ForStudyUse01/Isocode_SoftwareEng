import { describe, expect, it } from "vitest";
import { csvToObjects, parseCsv } from "@/lib/csv";

describe("parseCsv", () => {
  it("handles quoted commas, escaped quotes and CRLF", () => {
    const rows = parseCsv('name,message\r\n"Asha, V","says ""hi"""\r\nRavi,ok\r\n');
    expect(rows).toEqual([["name", "message"], ["Asha, V", 'says "hi"'], ["Ravi", "ok"]]);
  });

  it("skips blank lines and strips a BOM", () => {
    expect(parseCsv("﻿a,b\n\n1,2\n")).toEqual([["a", "b"], ["1", "2"]]);
  });
});

describe("csvToObjects", () => {
  it("normalises headers and pads short rows", () => {
    const rows = csvToObjects("Name, Phone Number ,Model\nAsha,9876543210");
    expect(rows).toEqual([{ name: "Asha", phone_number: "9876543210", model: "" }]);
  });

  it("returns an empty list for empty input", () => {
    expect(csvToObjects("")).toEqual([]);
  });
});

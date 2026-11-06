import { z } from "zod";

export function normalisePhone(raw: string): string | null {
  const digits = raw.replace(/[\s\-().]/g, "").replace(/^(\+91|91|0)(?=\d{10}$)/, "");
  return /^[6-9]\d{9}$/.test(digits) ? digits : null;
}

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((v) => (v === "" ? undefined : v))
    .optional();

const optionalInt = z
  .union([z.string(), z.number()])
  .optional()
  .transform((v) => (v === "" || v === undefined ? undefined : Number(v)))
  .pipe(z.number().int().positive().max(1_000_000_000).optional());

export const leadInput = z.object({
  name: z.string().trim().min(2).max(80),
  phone: z.string().transform((v, ctx) => {
    const p = normalisePhone(v);
    if (!p) ctx.addIssue({ code: "custom", message: "invalid phone" });
    return p ?? "";
  }),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .max(120)
    .transform((v) => (v === "" ? undefined : v))
    .pipe(z.string().email().optional())
    .optional(),
  locale: z.enum(["en", "hi"]).default("en"),
  source: z.enum(["web", "portal", "social", "walkin"]).default("web"),
  interest: z.enum(["new", "used", "test_drive", "trade_in"]).default("new"),
  modelId: optionalInt,
  usedCarId: optionalInt,
  showroomId: optionalInt,
  city: optionalText(60),
  message: optionalText(600),
  budget: optionalInt,
  tradeIn: optionalText(200),
  consent: z.literal(true, { error: "consent required" }),
});

export type LeadInput = z.infer<typeof leadInput>;

export function fieldErrors(error: z.ZodError): Record<string, string> {
  return Object.fromEntries(error.issues.map((i) => [String(i.path[0] ?? "form"), i.message]));
}

export function formToObject(formData: FormData) {
  const obj: Record<string, unknown> = Object.fromEntries(formData);
  obj.consent = formData.get("consent") === "on" || formData.get("consent") === "true";
  return obj;
}

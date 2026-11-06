"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { createSession, destroySession } from "@/lib/auth";
import { rateLimited } from "@/lib/rateLimit";

export async function setLocale(formData: FormData) {
  const next = formData.get("lang") === "hi" ? "hi" : "en";
  (await cookies()).set("lang", next, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
  revalidatePath("/", "layout");
}

export async function logout() {
  await destroySession();
  redirect("/");
}

export type AuthState = { error?: "badLogin" | "emailTaken" | "fixFields" | "tooManyRequests"; fields?: Record<string, string> };

const safeNext = (value: FormDataEntryValue | null) => {
  const next = typeof value === "string" ? value : "/";
  return next.startsWith("/") && !next.startsWith("//") ? next : "/";
};

const clientIp = async () => (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";

const loginSchema = z.object({ email: z.string().trim().toLowerCase().email().max(120), password: z.string().min(1).max(200) });

export async function login(_: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = loginSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "badLogin" };
  if (rateLimited(`login:${await clientIp()}:${parsed.data.email}`, 6, 15 * 60_000)) return { error: "tooManyRequests" };

  const [user] = await db.select().from(schema.users).where(eq(schema.users.email, parsed.data.email));
  const ok = user ? await bcrypt.compare(parsed.data.password, user.passwordHash) : await bcrypt.compare(parsed.data.password, "$2b$10$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvalidi");
  if (!user || !ok) return { error: "badLogin" };

  await createSession(user.id);
  const fallback = user.role === "buyer" ? "/account" : user.role === "admin" ? "/admin" : "/inbox";
  const requested = safeNext(formData.get("next"));
  redirect(requested === "/" ? fallback : requested);
}

const registerSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().toLowerCase().email().max(120),
  password: z.string().min(8).max(200),
});

export async function register(_: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = registerSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "fixFields", fields: Object.fromEntries(parsed.error.issues.map((i) => [String(i.path[0]), i.message])) };
  if (rateLimited(`register:${await clientIp()}`, 5, 60 * 60_000)) return { error: "tooManyRequests" };

  const [existing] = await db.select({ id: schema.users.id }).from(schema.users).where(eq(schema.users.email, parsed.data.email));
  if (existing) return { error: "emailTaken" };

  const [user] = await db
    .insert(schema.users)
    .values({ name: parsed.data.name, email: parsed.data.email, passwordHash: await bcrypt.hash(parsed.data.password, 10), role: "buyer" })
    .returning({ id: schema.users.id });
  await createSession(user.id);
  redirect(safeNext(formData.get("next")) === "/" ? "/account" : safeNext(formData.get("next")));
}

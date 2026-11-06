import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { SignJWT, jwtVerify } from "jose";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";

type Role = (typeof schema.ROLES)[number];

const COOKIE = "session";
const MAX_AGE = 60 * 60 * 24 * 7;

function secret() {
  const value = process.env.SESSION_SECRET;
  if (value && value.length >= 32) return new TextEncoder().encode(value);
  if (process.env.NODE_ENV === "production") throw new Error("SESSION_SECRET must be set (32+ characters)");
  return new TextEncoder().encode("dev-only-session-secret-do-not-use-in-prod");
}

export async function createSession(userId: number) {
  const token = await new SignJWT({}).setProtectedHeader({ alg: "HS256" }).setSubject(String(userId)).setIssuedAt().setExpirationTime(`${MAX_AGE}s`).sign(secret());
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function destroySession() {
  (await cookies()).delete(COOKIE);
}

export type SessionUser = { id: number; name: string; email: string; role: Role; showroomId: number | null };

export const getUser = cache(async (): Promise<SessionUser | null> => {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret(), { algorithms: ["HS256"] });
    const [user] = await db.select().from(schema.users).where(eq(schema.users.id, Number(payload.sub)));
    if (!user) return null;
    return { id: user.id, name: user.name, email: user.email, role: user.role, showroomId: user.showroomId };
  } catch {
    return null;
  }
});

export async function requireRole(roles: Role[], next = "/") {
  const user = await getUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(next)}`);
  if (!roles.includes(user.role)) redirect("/forbidden");
  return user;
}

export const isStaff = (user: SessionUser | null) => user?.role === "admin" || user?.role === "consultant";

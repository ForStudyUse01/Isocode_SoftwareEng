import "server-only";
import { cookies } from "next/headers";
import { makeT, type Locale } from "./dict";

export type { Locale, T } from "./dict";

export async function getLocale(): Promise<Locale> {
  const value = (await cookies()).get("lang")?.value;
  return value === "hi" ? "hi" : "en";
}

export async function getT() {
  const locale = await getLocale();
  return { t: makeT(locale), locale };
}

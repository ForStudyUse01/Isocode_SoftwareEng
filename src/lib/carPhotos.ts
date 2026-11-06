import meta from "../../public/cars/meta.json";
import type { PhotoMeta } from "@/lib/recolor";

type Body = "Hatchback" | "Sedan" | "SUV";

const photos = meta as unknown as Record<string, PhotoMeta>;

export function photoFor(body: Body, fuel?: string): PhotoMeta | null {
  const key = fuel === "Electric" ? "ev" : body === "SUV" ? "suv" : body === "Sedan" ? "sedan" : "hatchback";
  return photos[key] ?? photos.hatchback ?? Object.values(photos)[0] ?? null;
}

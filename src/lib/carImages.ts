type Body = "Hatchback" | "Sedan" | "SUV";

const KEY = { Hatchback: "hatchback", Sedan: "sedan", SUV: "suv" } as const;
const DEFAULT_HEX = { hatchback: "f4f4f1", sedan: "c3c6ca", suv: "f4f4f1", ev: "f1f3f4" } as const;

export function carKey(body: Body, fuel?: string) {
  return fuel === "Electric" ? "ev" : KEY[body];
}

// Pre-rendered from the 3D models for each catalogue colour; unknown colours use the key's default.
export function carImage(body: Body, fuel: string | undefined, hex: string) {
  const key = carKey(body, fuel);
  return { src: `/cars/render/${key}-${hex.replace("#", "").toLowerCase()}.webp`, fallback: `/cars/render/${key}-${DEFAULT_HEX[key]}.webp` };
}

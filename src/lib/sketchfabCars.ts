type Body = "Hatchback" | "Sedan" | "SUV";

export type SketchfabModel = { uid: string; name: string; author: string; paint: RegExp; plate?: RegExp; wheels?: RegExp; native: string };

// Unbadged CC BY 4.0 models from Sketchfab, embedded through the official viewer.
// paint picks the body-colour materials, plate the number-plate ones, wheels the rim finish.
const models: Record<"hatchback" | "sedan" | "suv" | "ev", SketchfabModel> = {
  hatchback: { uid: "cfaabdec76a74b68a48ba5657b6d9aee", name: "SHC MC Free Promotion Car", author: "denniswoo1993", paint: /^grey_car_paint$/, wheels: /^Alloy_Wheel$/, native: "#c8c8c8" },
  sedan: { uid: "58c33766470d46e7b2aed542650494e5", name: "Generic Sedan Car", author: "MMC Works", paint: /^Car Paint - All Colors$/, native: "#c8c8c8" },
  suv: { uid: "5db696c6ed5d4bdc87905c1040fa072a", name: "MMC Generic Small SUV Car", author: "MMC Works", paint: /^body$/, native: "#c8c8c8" },
  ev: { uid: "95f32d0d23bf4db48b1b28843385685f", name: "Generic Electric sedan", author: "Antonis_zks", paint: /^Material\.018$/, plate: /^Material\.07[23]$/, native: "#c8c8c8" },
};

export function sketchfabFor(body: Body, fuel?: string): SketchfabModel {
  if (fuel === "Electric") return models.ev;
  return body === "SUV" ? models.suv : body === "Sedan" ? models.sedan : models.hatchback;
}

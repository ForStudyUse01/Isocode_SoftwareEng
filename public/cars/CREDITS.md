# Car images

The four car images (`suv.jpg`, `sedan.jpg`, `hatchback.jpg`, `ev.jpg`) were generated with Figma AI
(model gpt-image-2.5-sunburst) for this demo project. They show invented, unbranded cars with blank
bumper areas, so they carry no maker badges and no licence plates. They are not photographs of real cars.

Prompt pattern: "Photorealistic automotive studio photograph of a modern <body type>, three-quarter front
view facing right ... plain seamless light grey studio background ... no license plates, no brand logos,
no badges, no text, no people."

`*-mask.png` and `meta.json` are produced from the images by `scripts/paint-mask.py`.

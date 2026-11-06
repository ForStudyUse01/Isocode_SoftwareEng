import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";
import { db, schema as s } from "./index";
import { assignLead } from "../lib/assign";
import { rulesDraft, rulesSummary, type LeadContext } from "../lib/ai";

const DEMO_PASSWORD = "Demo@1234";
const NOW = new Date();
const iso = (offsetMin: number) => new Date(NOW.getTime() + offsetMin * 60_000).toISOString();
const dateIn = (days: number) => new Date(NOW.getTime() + days * 86_400_000).toISOString().slice(0, 10);

function rng(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = rng(2026);

const SHOWROOMS = [
  { slug: "gomti-nagar", name: "Gomti Nagar Showroom", city: "Lucknow", address: "Vibhuti Khand, Gomti Nagar, Lucknow", phone: "+91 522 400 0101" },
  { slug: "alambagh", name: "Alambagh Showroom", city: "Lucknow", address: "Kanpur Road Crossing, Alambagh, Lucknow", phone: "+91 522 400 0102" },
  { slug: "sultanpur-road", name: "Sultanpur Road Showroom", city: "Lucknow", address: "Sultanpur Road, near Shaheed Path, Lucknow", phone: "+91 522 400 0103" },
];

type Spec = [string, string];
const specsFor = (engine: string, power: string, torque: string, boot: string, clearance: string, safety: string): Spec[] => [
  ["Engine", engine],
  ["Power", power],
  ["Torque", torque],
  ["Boot space", boot],
  ["Ground clearance", clearance],
  ["Airbags", safety],
  ["Infotainment", "10.25-inch touchscreen, wireless smartphone mirroring"],
  ["Warranty", "3 years / 1,00,000 km standard"],
];

const MODELS = [
  {
    slug: "model-s", name: "Model S", bodyType: "Hatchback" as const,
    tagline: "The easy city car.",
    description: "Compact, light to drive and easy on the wallet. Model S is built for tight city lanes and weekend family trips.",
    colours: [["Pearl White", "#f4f4f1"], ["Graphite Grey", "#4b4f55"], ["Ruby Red", "#9b1c2c"], ["Azure Blue", "#2f5d8a"]],
    variants: [
      { name: "LX", fuel: "Petrol", transmission: "Manual", exShowroom: 620000, accessories: 18000, mileage: "22.4 km/l", specs: specsFor("1.2 L petrol", "83 PS", "113 Nm", "313 L", "165 mm", "2 airbags (6 on VX)") },
      { name: "VX", fuel: "Petrol", transmission: "Manual", exShowroom: 695000, accessories: 21000, mileage: "22.4 km/l", specs: specsFor("1.2 L petrol", "83 PS", "113 Nm", "313 L", "165 mm", "6 airbags") },
      { name: "VX AMT", fuel: "Petrol", transmission: "Automatic", exShowroom: 745000, accessories: 21000, mileage: "21.1 km/l", specs: specsFor("1.2 L petrol", "83 PS", "113 Nm", "313 L", "165 mm", "6 airbags") },
      { name: "VX CNG", fuel: "CNG", transmission: "Manual", exShowroom: 765000, accessories: 21000, mileage: "31 km/kg", specs: specsFor("1.2 L bi-fuel", "76 PS", "98 Nm", "210 L", "165 mm", "6 airbags") },
    ],
  },
  {
    slug: "model-c", name: "Model C", bodyType: "Sedan" as const,
    tagline: "Quiet, composed, effortless.",
    description: "A refined sedan with a calm cabin and a long-legged diesel. Model C is made for highway miles and family comfort.",
    colours: [["Silver Mist", "#c3c6ca"], ["Obsidian Black", "#17181b"], ["Pearl White", "#f4f4f1"], ["Midnight Blue", "#1d2b4a"]],
    variants: [
      { name: "LX", fuel: "Petrol", transmission: "Manual", exShowroom: 940000, accessories: 24000, mileage: "18.6 km/l", specs: specsFor("1.5 L petrol", "121 PS", "145 Nm", "506 L", "165 mm", "4 airbags") },
      { name: "VX", fuel: "Petrol", transmission: "Manual", exShowroom: 1040000, accessories: 26000, mileage: "18.6 km/l", specs: specsFor("1.5 L petrol", "121 PS", "145 Nm", "506 L", "165 mm", "6 airbags") },
      { name: "VX", fuel: "Diesel", transmission: "Manual", exShowroom: 1160000, accessories: 26000, mileage: "24.1 km/l", specs: specsFor("1.5 L diesel", "100 PS", "200 Nm", "506 L", "165 mm", "6 airbags") },
      { name: "ZX", fuel: "Diesel", transmission: "Automatic", exShowroom: 1320000, accessories: 28000, mileage: "22.7 km/l", specs: specsFor("1.5 L diesel", "100 PS", "200 Nm", "506 L", "165 mm", "6 airbags") },
    ],
  },
  {
    slug: "model-h", name: "Model H", bodyType: "SUV" as const,
    tagline: "Command the road.",
    description: "A compact SUV with a high seating position, strong safety kit and a cabin that feels a class above. Model H handles city and highway equally well.",
    colours: [["Pearl White", "#f4f4f1"], ["Titan Grey", "#5a5e63"], ["Forest Green", "#2c4a3a"], ["Sunset Copper", "#a4623a"], ["Obsidian Black", "#17181b"]],
    variants: [
      { name: "LX", fuel: "Petrol", transmission: "Manual", exShowroom: 1090000, accessories: 25000, mileage: "17.8 km/l", specs: specsFor("1.5 L turbo petrol", "140 PS", "240 Nm", "433 L", "190 mm", "6 airbags") },
      { name: "VX", fuel: "Petrol", transmission: "Manual", exShowroom: 1170000, accessories: 27000, mileage: "17.8 km/l", specs: specsFor("1.5 L turbo petrol", "140 PS", "240 Nm", "433 L", "190 mm", "6 airbags") },
      { name: "ZX automatic", fuel: "Petrol", transmission: "Automatic", exShowroom: 1245000, accessories: 25000, mileage: "16.9 km/l", specs: specsFor("1.5 L turbo petrol", "140 PS", "240 Nm", "433 L", "190 mm", "6 airbags, ADAS level 1") },
      { name: "ZX automatic", fuel: "Diesel", transmission: "Automatic", exShowroom: 1390000, accessories: 28000, mileage: "19.4 km/l", specs: specsFor("1.5 L diesel", "116 PS", "250 Nm", "433 L", "190 mm", "6 airbags, ADAS level 1") },
    ],
  },
  {
    slug: "model-e", name: "Model E", bodyType: "Hatchback" as const,
    tagline: "Silent. Instant. Zero tailpipe.",
    description: "Our all-electric hatchback with instant torque and a quiet cabin. Model E is built for daily city use with confident range.",
    colours: [["Glacier White", "#f1f3f4"], ["Teal Wave", "#1f6f78"], ["Graphite Grey", "#4b4f55"]],
    variants: [
      { name: "Standard", fuel: "Electric", transmission: "Automatic", exShowroom: 1190000, accessories: 15000, mileage: "315 km range", specs: specsFor("Permanent magnet motor, 30 kWh", "95 PS", "215 Nm", "320 L", "165 mm", "6 airbags") },
      { name: "Long Range", fuel: "Electric", transmission: "Automatic", exShowroom: 1340000, accessories: 15000, mileage: "430 km range", specs: specsFor("Permanent magnet motor, 40 kWh", "143 PS", "250 Nm", "320 L", "165 mm", "6 airbags, ADAS level 1") },
    ],
  },
];

const CITIES = [
  { city: "Lucknow", road: 8, lux: 2, reg: 2500, ins: 3.4 },
  { city: "Kanpur", road: 8, lux: 2, reg: 2600, ins: 3.5 },
  { city: "Varanasi", road: 8, lux: 2, reg: 2800, ins: 3.6 },
  { city: "Prayagraj", road: 8, lux: 2, reg: 2700, ins: 3.5 },
  { city: "Ayodhya", road: 8, lux: 2, reg: 3100, ins: 3.7 },
];
const FUEL_ROAD_TAX: Record<string, number> = { Petrol: 1, Diesel: 1, CNG: 0.75, Electric: 0 };

const INSPECTION_ITEMS = ["Engine and gearbox", "Suspension and steering", "Brakes", "Tyres", "Electricals and infotainment", "Interior condition", "Exterior and paint", "Accident history", "Flood damage check", "Service history"];

function inspection(attention: string[] = []) {
  return JSON.stringify(
    INSPECTION_ITEMS.map((item) => ({
      item,
      result: attention.includes(item) ? "attention" : "ok",
      note: attention.includes(item) ? "Minor wear noted, rectified before sale" : "Passed",
    })),
  );
}

const USED = [
  { stockId: "UC-1182", model: "Model C", variant: "VX", bodyType: "Sedan", fuel: "Diesel", year: 2022, km: 41200, owners: 1, reg: "UP32KM4471", colour: ["Silver Mist", "#c3c6ca"], price: 845000, status: "available", showroom: 0, attention: ["Tyres"] },
  { stockId: "UC-1190", model: "Model S", variant: "LX", bodyType: "Hatchback", fuel: "Petrol", year: 2021, km: 58600, owners: 1, reg: "UP32JB2290", colour: ["Pearl White", "#f4f4f1"], price: 512000, status: "booked", showroom: 1, attention: [] },
  { stockId: "UC-1176", model: "Model H", variant: "VX", bodyType: "SUV", fuel: "Petrol", year: 2023, km: 18400, owners: 1, reg: "UP32NA8815", colour: ["Titan Grey", "#5a5e63"], price: 1045000, status: "available", showroom: 0, attention: [] },
  { stockId: "UC-1183", model: "Model S", variant: "VX AMT", bodyType: "Hatchback", fuel: "Petrol", year: 2022, km: 27900, owners: 1, reg: "UP32LC3302", colour: ["Ruby Red", "#9b1c2c"], price: 585000, status: "available", showroom: 2, attention: [] },
  { stockId: "UC-1185", model: "Model C", variant: "LX", bodyType: "Sedan", fuel: "Petrol", year: 2020, km: 63200, owners: 2, reg: "UP78AX5546", colour: ["Obsidian Black", "#17181b"], price: 615000, status: "available", showroom: 1, attention: ["Suspension and steering", "Tyres"] },
  { stockId: "UC-1187", model: "Model H", variant: "ZX automatic", bodyType: "SUV", fuel: "Diesel", year: 2022, km: 36100, owners: 1, reg: "UP32KT7710", colour: ["Pearl White", "#f4f4f1"], price: 1125000, status: "available", showroom: 0, attention: [] },
  { stockId: "UC-1191", model: "Model S", variant: "VX CNG", bodyType: "Hatchback", fuel: "CNG", year: 2021, km: 71800, owners: 2, reg: "UP32HD1923", colour: ["Azure Blue", "#2f5d8a"], price: 455000, status: "available", showroom: 2, attention: ["Interior condition"] },
  { stockId: "UC-1193", model: "Model C", variant: "ZX", bodyType: "Sedan", fuel: "Diesel", year: 2021, km: 52400, owners: 1, reg: "UP32GF6608", colour: ["Midnight Blue", "#1d2b4a"], price: 905000, status: "available", showroom: 1, attention: [] },
  { stockId: "UC-1196", model: "Model E", variant: "Standard", bodyType: "Hatchback", fuel: "Electric", year: 2023, km: 14200, owners: 1, reg: "UP32PQ2085", colour: ["Teal Wave", "#1f6f78"], price: 965000, status: "available", showroom: 0, attention: [] },
  { stockId: "UC-1198", model: "Model H", variant: "LX", bodyType: "SUV", fuel: "Petrol", year: 2021, km: 49800, owners: 1, reg: "UP32LM9961", colour: ["Forest Green", "#2c4a3a"], price: 845000, status: "available", showroom: 2, attention: ["Exterior and paint"] },
  { stockId: "UC-1201", model: "Model S", variant: "LX", bodyType: "Hatchback", fuel: "Petrol", year: 2019, km: 84300, owners: 2, reg: "UP32EB4417", colour: ["Graphite Grey", "#4b4f55"], price: 365000, status: "sold", showroom: 1, attention: ["Engine and gearbox"] },
  { stockId: "UC-1204", model: "Model C", variant: "VX", bodyType: "Sedan", fuel: "Petrol", year: 2023, km: 21500, owners: 1, reg: "UP32PA7734", colour: ["Pearl White", "#f4f4f1"], price: 985000, status: "available", showroom: 0, attention: [] },
];

const BASE_NEW: Record<string, number> = { "Model S": 700000, "Model C": 1100000, "Model H": 1200000, "Model E": 1100000 };

function pastSales() {
  const rows: { model: string; year: number; km: number; price: number; soldOn: string }[] = [];
  for (const [model, base] of Object.entries(BASE_NEW)) {
    for (let i = 0; i < 12; i++) {
      const year = 2019 + Math.floor(rand() * 6);
      const age = 2026 - year;
      const km = Math.round((age * 11000 + (rand() - 0.5) * 12000) / 100) * 100;
      const price = Math.round((base * (1 - 0.06 * age - 0.004 * (km / 1000 - age * 11) + (rand() - 0.5) * 0.05)) / 5000) * 5000;
      rows.push({ model, year, km: Math.max(3000, km), price, soldOn: dateIn(-Math.floor(rand() * 400) - 10) });
    }
  }
  return rows;
}

const FIRST = ["Aarav", "Ananya", "Vikram", "Meera", "Rohan", "Sana", "Kabir", "Isha", "Arjun", "Pooja", "Imran", "Divya", "Harsh", "Nidhi", "Sameer", "Tanvi"];
const LAST = ["Mishra", "Khan", "Tiwari", "Gupta", "Srivastava", "Pandey", "Saxena", "Rastogi", "Dubey", "Agarwal"];

async function main() {
  const tables = [s.messages, s.leadEvents, s.testDrives, s.leads, s.demoCars, s.consultantModels, s.usedCars, s.pastSales, s.modelColours, s.variants, s.carModels, s.priceRules, s.settings, s.promos, s.users, s.showrooms];
  for (const t of tables) await db.delete(t);

  const showroomRows = await db.insert(s.showrooms).values(SHOWROOMS).returning();

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
  const staff = await db
    .insert(s.users)
    .values([
      { name: "Meenal Kapoor", email: "admin@brandx-demo.test", passwordHash, role: "admin", showroomId: null },
      { name: "Priya Sharma", email: "priya@brandx-demo.test", passwordHash, role: "consultant", showroomId: showroomRows[0].id },
      { name: "Rahul Verma", email: "rahul@brandx-demo.test", passwordHash, role: "consultant", showroomId: showroomRows[0].id },
      { name: "Neha Singh", email: "neha@brandx-demo.test", passwordHash, role: "consultant", showroomId: showroomRows[1].id },
      { name: "Amit Yadav", email: "amit@brandx-demo.test", passwordHash, role: "consultant", showroomId: showroomRows[2].id },
      { name: "Demo Buyer", email: "buyer@brandx-demo.test", passwordHash, role: "buyer", showroomId: null },
    ])
    .returning();
  const [admin, priya, rahul, neha, amit, buyer] = staff;

  const modelRows: (typeof s.carModels.$inferSelect)[] = [];
  const variantRows: (typeof s.variants.$inferSelect & { modelName: string })[] = [];
  for (const m of MODELS) {
    const [row] = await db.insert(s.carModels).values({ slug: m.slug, name: m.name, bodyType: m.bodyType, tagline: m.tagline, description: m.description }).returning();
    modelRows.push(row);
    await db.insert(s.modelColours).values(m.colours.map(([name, hex]) => ({ modelId: row.id, name, hex })));
    const vs = await db
      .insert(s.variants)
      .values(m.variants.map((v) => ({ ...v, modelId: row.id, fuel: v.fuel as (typeof s.FUELS)[number], transmission: v.transmission as "Manual" | "Automatic", specs: JSON.stringify(v.specs), seats: 5 })))
      .returning();
    variantRows.push(...vs.map((v) => ({ ...v, modelName: m.name })));
  }
  const modelId = (name: string) => modelRows.find((m) => m.name === name)!.id;

  await db.insert(s.priceRules).values(
    CITIES.flatMap((c) =>
      s.FUELS.map((fuel) => ({
        city: c.city,
        fuel,
        roadTaxPct: c.road * FUEL_ROAD_TAX[fuel],
        luxuryTaxPct: fuel === "Electric" ? 0 : c.lux,
        registrationFee: c.reg,
        insurancePct: c.ins,
        validTill: c.city === "Ayodhya" ? dateIn(-3) : dateIn(60),
      })),
    ),
  );

  await db.insert(s.settings).values([
    { key: "luxuryThreshold", value: "1000000" },
    { key: "tcsThreshold", value: "1000000" },
    { key: "tcsPct", value: "1" },
    { key: "defaultLoanRate", value: "9.5" },
    { key: "priceNote", value: "Prices are indicative and may change without notice. Final on-road price is confirmed in the dealer's quotation." },
  ]);

  await db.insert(s.consultantModels).values([
    ...["Model H", "Model E"].map((m) => ({ userId: priya.id, modelId: modelId(m) })),
    ...["Model S", "Model C"].map((m) => ({ userId: rahul.id, modelId: modelId(m) })),
    ...["Model C", "Model H"].map((m) => ({ userId: neha.id, modelId: modelId(m) })),
    ...["Model S", "Model E", "Model H"].map((m) => ({ userId: amit.id, modelId: modelId(m) })),
  ]);

  const pick = (model: string, fuel: string, name?: string) =>
    variantRows.find((v) => v.modelName === model && v.fuel === fuel && (!name || v.name === name))!;
  const demo = [
    [0, pick("Model H", "Petrol", "ZX automatic"), "Model H ZX automatic (petrol)"],
    [0, pick("Model C", "Diesel", "VX"), "Model C VX (diesel)"],
    [0, pick("Model S", "Petrol", "VX"), "Model S VX"],
    [1, pick("Model H", "Petrol", "VX"), "Model H VX (petrol)"],
    [1, pick("Model E", "Electric", "Long Range"), "Model E Long Range"],
    [1, pick("Model S", "Petrol", "VX AMT"), "Model S VX AMT"],
    [2, pick("Model C", "Diesel", "ZX"), "Model C ZX automatic (diesel)"],
    [2, pick("Model H", "Diesel"), "Model H ZX automatic (diesel)"],
    [2, pick("Model E", "Electric", "Standard"), "Model E Standard"],
  ] as const;
  const demoRows = await db
    .insert(s.demoCars)
    .values(demo.map(([sr, v, label]) => ({ showroomId: showroomRows[sr].id, variantId: v.id, label })))
    .returning();

  await db.insert(s.usedCars).values(
    USED.map((u) => ({
      stockId: u.stockId, model: u.model, variant: u.variant, bodyType: u.bodyType as "Hatchback" | "Sedan" | "SUV",
      fuel: u.fuel as (typeof s.FUELS)[number], year: u.year, km: u.km, owners: u.owners, regNo: u.reg,
      colour: u.colour[0], colourHex: u.colour[1], price: u.price, status: u.status as "available" | "booked" | "sold",
      showroomId: showroomRows[u.showroom].id, inspection: inspection(u.attention),
    })),
  );
  await db.insert(s.pastSales).values(pastSales());

  await db.insert(s.promos).values([
    { kind: "banner", title: "Book a test drive in under a minute", body: "Pick your showroom, car and slot. No phone calls.", ctaLabel: "Book now", ctaHref: "/test-drive", active: true },
    { kind: "offer", title: "Year-end exchange camp", body: "Free doorstep valuation of your current car at all three showrooms.", ctaLabel: "Request valuation", ctaHref: "/trade-in", validTill: dateIn(45), active: true },
    { kind: "offer", title: "Certified used cars: 10-point inspection", body: "Every car comes with a published inspection report and a 6-month warranty.", ctaLabel: "Browse used cars", ctaHref: "/used-cars", active: true },
  ]);

  const consultants = [
    { user: priya, models: [modelId("Model H"), modelId("Model E")] },
    { user: rahul, models: [modelId("Model S"), modelId("Model C")] },
    { user: neha, models: [modelId("Model C"), modelId("Model H")] },
    { user: amit, models: [modelId("Model S"), modelId("Model E"), modelId("Model H")] },
  ];
  const load = new Map(consultants.map((c) => [c.user.id, 0]));
  const lastAt = new Map<number, string>();

  const SAMPLE = [
    { interest: "new", model: "Model H", src: "web", status: "new", ageMin: 2, msg: "Looking for an automatic SUV for family use, mostly city driving." },
    { interest: "test_drive", model: "Model H", src: "web", status: "new", ageMin: 9, msg: "", td: "Saturday 11:00 AM" },
    { interest: "new", model: "Model C", src: "portal", status: "new", ageMin: 38, msg: "Need a diesel sedan, 20k km a month running." },
    { interest: "used", model: "Model C", src: "web", status: "contacted", ageMin: 130, msg: "Is UC-1182 still available? Can I see the inspection report?" },
    { interest: "new", model: "Model S", src: "social", status: "contacted", ageMin: 260, msg: "First car for my daughter. Budget is tight." },
    { interest: "trade_in", model: "Model H", src: "web", status: "contacted", ageMin: 520, msg: "Want to exchange my 2017 hatchback.", trade: "2017 hatchback, 82,000 km, petrol" },
    { interest: "new", model: "Model E", src: "web", status: "test_drive", ageMin: 900, msg: "Do you have a home charger installation service?" },
    { interest: "new", model: "Model H", src: "portal", status: "negotiation", ageMin: 1500, msg: "Comparing with two other SUVs, want the ZX diesel." },
    { interest: "used", model: "Model S", src: "walkin", status: "won", ageMin: 2600, msg: "Walk-in. Wants a CNG hatchback." },
    { interest: "new", model: "Model C", src: "social", status: "lost", ageMin: 3100, msg: "Bought elsewhere." },
    { interest: "new", model: "Model S", src: "web", status: "contacted", ageMin: 1800, msg: "Need EMI details for VX automatic." },
    { interest: "new", model: "Model E", src: "portal", status: "contacted", ageMin: 700, msg: "Range in winter? Parking in apartment, no charger." },
  ] as const;

  for (let i = 0; i < SAMPLE.length; i++) {
    const smp = SAMPLE[i];
    const name = `${FIRST[(i * 5) % FIRST.length]} ${LAST[(i * 3) % LAST.length]}`;
    const showroom = showroomRows[i % showroomRows.length];
    const mId = modelId(smp.model);
    const created = iso(-smp.ageMin);
    const open = consultants.map((c) => ({
      id: c.user.id, showroomId: c.user.showroomId, modelIds: c.models, openLeads: load.get(c.user.id) ?? 0, lastAssignedAt: lastAt.get(c.user.id) ?? null,
    }));
    const assign = assignLead({ showroomId: showroom.id, modelId: mId }, open)!;
    load.set(assign.consultantId, (load.get(assign.consultantId) ?? 0) + (["won", "lost"].includes(smp.status) ? 0 : 1));
    lastAt.set(assign.consultantId, created);
    const consultant = consultants.find((c) => c.user.id === assign.consultantId)!.user;

    const slaDueAt = new Date(new Date(created).getTime() + 5 * 60_000).toISOString();
    const responded = smp.status !== "new";
    const ctx: LeadContext = {
      firstName: name.split(" ")[0], locale: "en", interest: smp.interest, vehicle: smp.model, budget: null,
      message: smp.msg || null, tradeIn: "trade" in smp ? smp.trade : null, testDrive: "td" in smp ? smp.td : null,
      showroom: showroom.name, consultant: consultant.name,
    };

    const [lead] = await db
      .insert(s.leads)
      .values({
        name, phone: `98${String(10000000 + i * 1371937).slice(0, 8)}`, email: null, source: smp.src, interest: smp.interest,
        modelId: mId, showroomId: showroom.id, city: "Lucknow", message: smp.msg || null, tradeIn: "trade" in smp ? smp.trade : null,
        status: smp.status, assignedTo: assign.consultantId, consentAt: created, optOutToken: randomBytes(16).toString("hex"),
        aiSummary: rulesSummary(ctx), aiDraft: rulesDraft(ctx), aiSource: "rules", slaDueAt,
        firstResponseAt: responded ? new Date(new Date(created).getTime() + [2, 3, 4, 8, 3, 2, 12, 4, 3, 6, 2, 3][i] * 60_000).toISOString() : null,
        createdAt: created,
      })
      .returning();
    await db.insert(s.leadEvents).values([
      { leadId: lead.id, type: "created", note: `Lead received from ${smp.src}`, createdAt: created },
      { leadId: lead.id, type: "assigned", note: `Auto-assigned to ${consultant.name} (${assign.reason})`, createdAt: created },
    ]);
    await db.insert(s.messages).values({
      leadId: lead.id, channel: "whatsapp", kind: "acknowledgement", createdAt: created,
      body: `Hello ${ctx.firstName}, thanks for contacting Brand X Lucknow. ${consultant.name} will be in touch shortly.`,
    });
  }

  console.log(`Seeded. Staff password for all demo users: ${DEMO_PASSWORD} (buyer: ${buyer.email}, admin: ${admin.email}, demo cars: ${demoRows.length})`);
}

main().then(() => process.exit(0), (e) => { console.error(e); process.exit(1); });

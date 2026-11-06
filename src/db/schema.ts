import { sql } from "drizzle-orm";
import { sqliteTable, text, integer, real, unique, uniqueIndex } from "drizzle-orm/sqlite-core";

export const ROLES = ["buyer", "consultant", "admin"] as const;
export const FUELS = ["Petrol", "Diesel", "CNG", "Electric"] as const;
export const LEAD_STATUSES = ["new", "contacted", "test_drive", "negotiation", "won", "lost"] as const;
export const LEAD_SOURCES = ["web", "portal", "social", "walkin"] as const;
export const LEAD_INTERESTS = ["new", "used", "test_drive", "trade_in"] as const;

const id = () => integer("id").primaryKey({ autoIncrement: true });
const createdAt = () => text("created_at").notNull().$defaultFn(() => new Date().toISOString());

export const showrooms = sqliteTable("showrooms", {
  id: id(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  city: text("city").notNull(),
  address: text("address").notNull(),
  phone: text("phone").notNull(),
});

export const users = sqliteTable("users", {
  id: id(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: text("role", { enum: ROLES }).notNull().default("buyer"),
  showroomId: integer("showroom_id").references(() => showrooms.id),
  createdAt: createdAt(),
});

export const carModels = sqliteTable("car_models", {
  id: id(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  bodyType: text("body_type", { enum: ["Hatchback", "Sedan", "SUV"] }).notNull(),
  tagline: text("tagline").notNull(),
  description: text("description").notNull(),
  published: integer("published", { mode: "boolean" }).notNull().default(true),
});

export const variants = sqliteTable("variants", {
  id: id(),
  modelId: integer("model_id").notNull().references(() => carModels.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  fuel: text("fuel", { enum: FUELS }).notNull(),
  transmission: text("transmission", { enum: ["Manual", "Automatic"] }).notNull(),
  exShowroom: integer("ex_showroom").notNull(),
  accessories: integer("accessories").notNull().default(0),
  mileage: text("mileage").notNull(),
  seats: integer("seats").notNull().default(5),
  specs: text("specs").notNull().default("[]"),
  published: integer("published", { mode: "boolean" }).notNull().default(true),
});

export const modelColours = sqliteTable("model_colours", {
  id: id(),
  modelId: integer("model_id").notNull().references(() => carModels.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  hex: text("hex").notNull(),
});

export const priceRules = sqliteTable(
  "price_rules",
  {
    id: id(),
    city: text("city").notNull(),
    fuel: text("fuel", { enum: FUELS }).notNull(),
    roadTaxPct: real("road_tax_pct").notNull(),
    luxuryTaxPct: real("luxury_tax_pct").notNull().default(0),
    registrationFee: integer("registration_fee").notNull(),
    insurancePct: real("insurance_pct").notNull(),
    validTill: text("valid_till").notNull(),
  },
  (t) => [unique().on(t.city, t.fuel)],
);

export const settings = sqliteTable("settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
});

export const usedCars = sqliteTable("used_cars", {
  id: id(),
  stockId: text("stock_id").notNull().unique(),
  model: text("model").notNull(),
  variant: text("variant").notNull(),
  bodyType: text("body_type", { enum: ["Hatchback", "Sedan", "SUV"] }).notNull(),
  fuel: text("fuel", { enum: FUELS }).notNull(),
  year: integer("year").notNull(),
  km: integer("km").notNull(),
  owners: integer("owners").notNull(),
  regNo: text("reg_no").notNull(),
  colour: text("colour").notNull(),
  colourHex: text("colour_hex").notNull(),
  price: integer("price").notNull(),
  status: text("status", { enum: ["available", "booked", "sold"] }).notNull().default("available"),
  showroomId: integer("showroom_id").notNull().references(() => showrooms.id),
  inspection: text("inspection").notNull().default("[]"),
  published: integer("published", { mode: "boolean" }).notNull().default(true),
  createdAt: createdAt(),
});

export const pastSales = sqliteTable("past_sales", {
  id: id(),
  model: text("model").notNull(),
  year: integer("year").notNull(),
  km: integer("km").notNull(),
  price: integer("price").notNull(),
  soldOn: text("sold_on").notNull(),
});

export const demoCars = sqliteTable("demo_cars", {
  id: id(),
  showroomId: integer("showroom_id").notNull().references(() => showrooms.id),
  variantId: integer("variant_id").notNull().references(() => variants.id),
  label: text("label").notNull(),
});

export const leads = sqliteTable("leads", {
  id: id(),
  name: text("name").notNull(),
  phone: text("phone").notNull(),
  email: text("email"),
  locale: text("locale", { enum: ["en", "hi"] }).notNull().default("en"),
  source: text("source", { enum: LEAD_SOURCES }).notNull().default("web"),
  interest: text("interest", { enum: LEAD_INTERESTS }).notNull().default("new"),
  modelId: integer("model_id").references(() => carModels.id),
  usedCarId: integer("used_car_id").references(() => usedCars.id),
  showroomId: integer("showroom_id").references(() => showrooms.id),
  city: text("city"),
  message: text("message"),
  budget: integer("budget"),
  tradeIn: text("trade_in"),
  status: text("status", { enum: LEAD_STATUSES }).notNull().default("new"),
  assignedTo: integer("assigned_to").references(() => users.id),
  consentAt: text("consent_at").notNull(),
  optedOut: integer("opted_out", { mode: "boolean" }).notNull().default(false),
  optOutToken: text("opt_out_token").notNull(),
  aiSummary: text("ai_summary"),
  aiDraft: text("ai_draft"),
  aiSource: text("ai_source", { enum: ["ai", "rules"] }),
  slaDueAt: text("sla_due_at").notNull(),
  firstResponseAt: text("first_response_at"),
  userId: integer("user_id").references(() => users.id),
  createdAt: createdAt(),
});

export const leadEvents = sqliteTable("lead_events", {
  id: id(),
  leadId: integer("lead_id").notNull().references(() => leads.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  note: text("note").notNull(),
  actorId: integer("actor_id").references(() => users.id),
  createdAt: createdAt(),
});

export const messages = sqliteTable("messages", {
  id: id(),
  leadId: integer("lead_id").notNull().references(() => leads.id, { onDelete: "cascade" }),
  channel: text("channel", { enum: ["whatsapp", "sms"] }).notNull(),
  kind: text("kind", { enum: ["acknowledgement", "reply", "confirmation"] }).notNull(),
  body: text("body").notNull(),
  createdAt: createdAt(),
});

export const consultantModels = sqliteTable(
  "consultant_models",
  {
    userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    modelId: integer("model_id").notNull().references(() => carModels.id, { onDelete: "cascade" }),
  },
  (t) => [unique().on(t.userId, t.modelId)],
);

export const testDrives = sqliteTable(
  "test_drives",
  {
    id: id(),
    demoCarId: integer("demo_car_id").notNull().references(() => demoCars.id),
    startsAt: text("starts_at").notNull(),
    leadId: integer("lead_id").notNull().references(() => leads.id),
    status: text("status", { enum: ["booked", "completed", "cancelled"] }).notNull().default("booked"),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("test_drives_active_slot").on(t.demoCarId, t.startsAt).where(sql`status = 'booked'`)],
);

export const promos = sqliteTable("promos", {
  id: id(),
  kind: text("kind", { enum: ["banner", "offer"] }).notNull(),
  title: text("title").notNull(),
  body: text("body").notNull(),
  ctaLabel: text("cta_label"),
  ctaHref: text("cta_href"),
  validTill: text("valid_till"),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
});

# Decisions

Every decision taken in this project, newest first within each group. "Assumption" means the brief did not say, so it is labelled and admin-editable where it matters.

## Scope

| Decision | Reason |
|----------|--------|
| Ship the brief's core slice end to end, then add depth where it serves the client's three success metrics | The brief asks for a small part done really well. Depth added: EMI calculator, trade-in form, portal CSV import, Hindi/English, banners and offers, user roles screen |
| Cut service booking, online payments, DMS integration, real WhatsApp/SMS | Service booking is outside the core build. Payments and DMS are out of scope in the brief. Messaging is mocked as allowed |

## Architecture

| Decision | Reason |
|----------|--------|
| Next.js 16 App Router, TypeScript, server components and server actions in one deployable | Model and used-car pages must be server-rendered and indexable. One app means one deploy and no API layer to keep in sync |
| SQLite through libSQL with Drizzle ORM. A file locally, Turso in production | A reviewer runs it with two commands and no database server. The same code talks to Turso, so production is not a rewrite |
| Plain CSS tokens in Tailwind v4, no component library | The client wants minimal and premium. A few owned components keep the look specific and the JavaScript small |
| Car previews are interactive 3D models from Sketchfab (CC BY 4.0), unbranded generic cars with number plates hidden. Cards use renders of the same models per colour | Real 3D gives drag-to-rotate and a true colour change. Branded models could not have their badges removed, so generic ones were chosen. Cards use pre-rendered images because loading a 3D model per card would be far too heavy |
| Colour change fades the body paint over 2.8 seconds through Sketchfab's viewer API. Each variant also changes paint finish (solid, metallic, pearl clear-coat), glass tint and wheel finish | The brief asks for variants to look different. One downloaded model cannot change its body shape, so finish is the lever |
| Every page is dynamic | The layout reads the session and language cookies. Data is small and SQLite is fast. Edge caching of public pages is a next step |

## Pricing

| Decision | Reason |
|----------|--------|
| On-road price is one pure function, `computeOnRoad`, fed only by admin tables | The brief's hard part. A pure function is easy to test and the price can never come from anywhere else |
| Road tax and insurance are percentages of ex-showroom. Registration is a fixed fee. Accessories come from the variant. All per city and fuel | Matches how a dealer quotes. Admin edits one row per city and fuel |
| Luxury tax is added on top of road tax above a threshold. TCS applies above a threshold. Both thresholds are settings | Assumption: ₹10 lakh for both. Values are illustrative, not official, and must be confirmed by the dealer |
| Every price carries a validity date. A lapsed price shows a message and no total | The brief requires a validity date. Showing a stale total is worse than showing none |
| Cities served: Lucknow, Kanpur, Varanasi, Prayagraj, Ayodhya | Assumption. The brief says "by city" without a list. Ayodhya is seeded as lapsed to demonstrate the state |
| Prices for all cities are computed on the server and sent to the page | The browser only chooses which result to show. The tax tables are never shipped |

## Leads

| Decision | Reason |
|----------|--------|
| Assignment order: showroom and model match, then showroom, then model, then least loaded. Ties go to the least recently assigned | A buyer should meet someone at their showroom who knows the car. Load balancing stops one consultant being swamped |
| Response timer is 5 minutes from lead creation to the first reply sent or the first status change | Matches the success metric. Replying through the inbox is the expected path |
| A repeat enquiry from the same phone, interest and model within 24 hours merges into the existing lead | Stops portal and web duplicates from making a buyer's phone ring twice |
| Consultants see their own leads and unassigned leads at their showroom. Admins see all | Least privilege. Consultants can still re-assign |
| Acknowledgement messages are logged to the database as mock WhatsApp or SMS | Allowed by the brief. The log is the evidence that a message would have gone out |

## AI

| Decision | Reason |
|----------|--------|
| Buyer summary and first-reply draft come from Claude when `ANTHROPIC_API_KEY` is set, otherwise from a rule-based generator | The feature must work with no key and when the model is down. The fallback is also what runs for portal imports |
| The model never receives phone number or email | Buyer data is personal data under DPDP. The model only needs first name and needs |
| Three guardrails on drafts: prompt rule, output filter that deletes any sentence quoting discounts or prices, and a server block when a consultant tries to send one | The brief says drafts never quote discounts. One layer is not enough, so the rule holds even if the model or a human slips |
| Used-car price band is statistics, not a language model: median of same-model sales within one year of age, adjusted for age and km, plus or minus 5% | A price should be explainable and repeatable. Fewer than three comparables returns no band |
| Only admins see the band. The admin sets every price | Required by the brief. Consultants and buyers never see it |

## Safety and privacy

| Decision | Reason |
|----------|--------|
| Every protected page calls `requireRole` itself. A test fails if one does not | Found during testing: a layout redirect does not stop a sibling page rendering, so admin data was in the response to a signed-out request. Fixed and covered |
| Every server action checks the role before reading or writing | Pages are not the only way in |
| Double booking is prevented by a partial unique index on demo car and time for active bookings, inside a transaction | Checking first and inserting later races. The database is the only reliable referee |
| Consent checkbox is required. Consent time is stored. Every acknowledgement carries a personal opt-out link | DPDP Act 2023. The opt-out page confirms before acting so link prefetching cannot opt anyone out |
| Registration number is masked everywhere on the public site | Required by the brief. Only the admin list shows the stored value, masked as well |
| In-memory rate limits on login, sign-up and lead forms, plus a honeypot field | Cheap and effective for a single instance. A shared store is needed when running several instances |
| Session is a signed HttpOnly cookie. The user is re-read from the database on every request | A role change or deletion takes effect at once |

## Interface

| Decision | Reason |
|----------|--------|
| White, near-black text, one teal accent, generous spacing, one typeface family | The client asked for a restrained palette and nothing without a purpose |
| Price and the next step sit directly under the car photo on phones | Most buyers are on mobile. The specifications table moved below the price |
| Hindi and English through a small dictionary and a cookie | Required by the brief. Database content such as specification labels stays in English for now |
| Loading skeletons, empty states, error pages and inline form errors on every flow | A product a client could try today must not look broken when something is slow or empty |

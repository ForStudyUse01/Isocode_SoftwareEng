# Features

Status: Built, Partly built, Cut.

## Buyers

| Feature | Status | Notes |
|---------|--------|-------|
| Model pages with variants, colours, specifications | Built | Colour dots recolour the car. Price and next step sit under the photo on phones |
| On-road price breakup by city | Built | Ex-showroom, road tax, registration, insurance, TCS, accessories. Validity date and disclaimer on every price. Lapsed or missing prices handled |
| Certified used-car list with filters | Built | Model, fuel, maximum price, maximum km. Booked cars stay visible, sold cars are hidden |
| Used-car detail | Built | Year, owners, km, masked registration, 10-point inspection report, EMI, enquiry, trade-in link |
| EMI calculator | Built | Price, down payment, rate, tenure. Prefilled from the car or the on-road total |
| Test-drive booking | Built | Showroom, demo car, date, slot. Double booking impossible. Works without an account |
| Trade-in valuation request | Built | Creates a lead for the consultant |
| Enquiry forms with consent | Built | Consent required, opt-out link in every message |
| Buyer account and bookings | Built | Sign up, sign in, see test drives |
| Hindi and English | Built | Interface text. Catalogue text from the database stays English |
| Indexable pages | Built | Own URL per model and used car, canonical links, JSON-LD, sitemap, robots |
| Service booking by workshop bay | Cut | Next step, see the design document |

## Sales consultants

| Feature | Status | Notes |
|---------|--------|-------|
| Lead inbox | Built | Open, awaiting reply, won or lost, all. Counters for open leads, breaches and replies inside five minutes |
| Response timer | Built | Live countdown, overdue time, or time taken to reply |
| Auto-assignment | Built | Showroom and model first, then load |
| Lead detail | Built | Contact, summary, activity trail, status, re-assign |
| AI buyer summary and first-reply draft | Built | Claude when a key is set, rule-based otherwise. Labelled so the consultant knows which |
| Discount guardrail | Built | Draft filter, live warning while typing, server block on send |
| Portal CSV import | Built | Validates, merges duplicates, assigns, reports problems by row |
| Mock WhatsApp and SMS | Built | Acknowledgement, reply and test-drive confirmation are logged |

## Admin and used-car manager

| Feature | Status | Notes |
|---------|--------|-------|
| Models and variants | Built | Edit, publish, add. New models start unpublished |
| Price tables | Built | Per city and fuel, national settings, renew all, live preview of any variant and city |
| Used stock | Built | Edit price, status, visibility, add cars. Suggested price band visible only here |
| Banners and offers | Built | Offers appear on the home page and never change a price |
| Users and roles | Built | Cannot remove the last admin |
| Overview with lapsed-price warning | Built | Warns before and after prices expire |
| Image upload, inspection report editor | Cut | Photos are generated art and inspection items are seeded |

# Architecture

## Overview

One Next.js application. Server components render the public site. Server actions handle every write. SQLite (libSQL) stores everything. An optional call to the Anthropic API writes lead summaries and reply drafts.

```
Browser
  |  HTML (server rendered) + small client components
  v
Next.js 16 (App Router)
  |-- pages (server components)          read data, check role, render
  |-- server actions                     validate (zod), check role, write
  |-- /api/slots                         free slots for a demo car and day
  |
  |-- src/lib   pure logic: pricing, EMI, slots, assign, price band, guardrails, SLA, CSV
  |-- src/db    Drizzle schema, client, seed
  |
  +--> libSQL  (file locally, Turso in production)
  +--> Anthropic API (optional, 8 s timeout, falls back to rules)
```

## Folder structure

```
src/
  app/                 routes
    page.tsx           home
    new-cars/          list and [slug] model page
    used-cars/         list with filters and [stockId] detail
    test-drive/        booking
    emi/ trade-in/     calculator and valuation request
    login/ register/ account/ opt-out/[token]/
    inbox/             lead list, [id] detail, import
    admin/             overview, models, prices, used, promos, users
    actions/           server actions: session, leads, inbox, admin
    api/slots/         slot availability
  components/          UI building blocks
  lib/                 business logic, one concern per file
  db/                  schema.ts, index.ts, seed.ts
tests/                 vitest suites
docs/screens/          screenshots used in the design document
```

## Core flows

### On-road price

1. The model page loads variants, colours and the settings row.
2. For every city and every variant, the server calls `computeOnRoad(variant, rule(city, fuel), settings)` twice: with and without accessories.
3. The page receives ready-made breakups. The browser only picks which one to show when the buyer changes variant, city or the accessories switch.
4. A missing rule shows "not available for this city". A lapsed rule shows the validity message and no total.

### Enquiry and assignment

1. The buyer submits a form. Zod validates, a honeypot and a rate limit filter bots, and consent must be ticked.
2. `createLead` runs in a transaction: duplicate check, assignment, lead row, events, a rule-based summary and draft, and a mock acknowledgement message.
3. After the response is sent, `after()` asks the model for a better summary and draft. If it fails or times out, the rule-based text stays.
4. The consultant sees the lead in the inbox with a five-minute countdown.

### Test drive booking

1. The page asks `/api/slots` for the chosen demo car and date. Slots inside two hours, outside 14 days or already booked come back unavailable.
2. On submit, the action re-validates the slot, then in one transaction creates or merges the lead and inserts the booking.
3. The partial unique index rejects a second active booking for the same car and time. The action turns that error into "slot just taken" and the page refreshes the slots.

### First reply

1. The consultant opens the lead, edits the draft and sends.
2. The server blocks the send if the text quotes a discount or price, or if the buyer opted out.
3. A sent reply stores the message, stops the timer and moves the lead to Contacted.

### Used-car price band

`suggestPriceBand(pastSales, car)` filters sales of the same model within one year of age, adjusts each for age (6% a year) and distance (0.4% per 1,000 km), takes the median and returns that plus or minus 5%, rounded to ₹5,000. Fewer than three comparables returns nothing. Only `/admin/used` calls it.

## Data model

| Table | Purpose |
|-------|---------|
| users, showrooms | Staff and buyers. Consultants belong to a showroom |
| car_models, variants, model_colours | Catalogue. Variants hold ex-showroom price and accessories |
| price_rules, settings | City and fuel tax rows with validity date. National thresholds and the disclaimer |
| used_cars, past_sales | Certified stock with inspection checklist as JSON. Historical sales for the band |
| demo_cars, test_drives | Cars per showroom and bookings. Unique active slot index |
| leads, lead_events, messages | Enquiries, activity trail and mock outbound messages |
| consultant_models | Which models a consultant knows, for assignment |
| promos | Banners and offers |

## Security summary

- Signed HttpOnly session cookie, SameSite Lax, Secure in production. `SESSION_SECRET` is required in production.
- Role is re-read from the database per request. Pages and server actions each check it.
- All input is validated with zod at the boundary. Queries go through Drizzle, so values are bound, not concatenated.
- Security headers: nosniff, frame deny, strict referrer policy, permissions policy.
- Secrets live only in environment variables. `.env` is git-ignored and `.env.example` lists names only.

## Rendering and performance

Pages are server rendered, so the first byte is HTML with content. Client JavaScript is limited to the model explorer, EMI calculator, test-drive wizard, forms and the countdown. The art is inline SVG, so a car page loads no image files. Fonts are self-hosted by `next/font`. Not yet measured on a real 4G profile, see the design document.

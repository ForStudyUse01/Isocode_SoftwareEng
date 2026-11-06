# Brand X Lucknow: dealership website

An end-to-end website for a car dealership with 3 showrooms and a used-car yard. Buyers browse new and certified used cars with a real on-road price breakup for their city, work out EMI and book a test drive in a live slot. Enquiries reach a named consultant, who sees a five-minute response timer, an AI-written buyer summary and a first-reply draft. Admins manage cars, prices and stock.

Built for the brief "Car dealership's end-to-end website with stock, test-drive and service booking". All names, prices and people are invented sample data. See [Decision.md](Decision.md) for every assumption.

## Run it

```bash
npm install
cp .env.example .env
npm run db:setup
npm run dev
```

Open http://localhost:3000. `db:setup` creates the SQLite file and loads the sample data. Run it again any time to reset the data.

`ANTHROPIC_API_KEY` is optional. Without it, summaries and drafts come from a built-in rule-based generator.

Full run and deploy steps are in [deployment.md](deployment.md).

## Demo logins

Password for every demo account: `Demo@1234`

| Role | Email | What to see |
|------|-------|-------------|
| Admin and used-car manager | admin@brandx-demo.test | Cars, price tables, used stock with suggested price band, users |
| Sales consultant | priya@brandx-demo.test | Her leads and unassigned leads at Gomti Nagar |
| Buyer | buyer@brandx-demo.test | Account and bookings |

## Scripts

| Command | Does |
|---------|------|
| `npm run dev` | Development server |
| `npm run build` then `npm start` | Production build and server. Needs `SESSION_SECRET` |
| `npm test` | 58 tests: pricing, EMI, slots, assignment, price band, guardrails, validation, CSV, access rules, double-booking index |
| `npm run typecheck` | TypeScript check |
| `npm run db:setup` | Create tables and load sample data |

## Documents

- [Decision.md](Decision.md): every decision and why
- [architecture.md](architecture.md): code flow, data model, security
- [Features.md](Features.md): what is built and what is cut
- [Websites.md](Websites.md): websites and services used
- [docs/screens](docs/screens): screenshots

## Stack

Next.js 16, React 19, TypeScript, Tailwind CSS 4, Drizzle ORM, libSQL (SQLite locally, Turso in production), Zod, Vitest.

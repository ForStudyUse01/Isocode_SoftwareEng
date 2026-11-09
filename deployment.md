# Deployment

Live app: see the top of the Technical Design Document.

## Run locally

Needs Node.js 20 or newer (built and tested on Node 24) and npm.

1. Install packages.
   ```bash
   npm install
   ```
2. Create the environment file.
   ```bash
   cp .env.example .env
   ```
   For local development nothing in it has to change. To also try the production build, put a random string of 32 or more characters in `SESSION_SECRET`.
3. Create the database and load the sample data.
   ```bash
   npm run db:setup
   ```
   This writes `local.db` in the project folder. Running it again resets everything to the sample data.
4. Start the app.
   ```bash
   npm run dev
   ```
   Open http://localhost:3000.
5. Optional checks.
   ```bash
   npm test
   npm run typecheck
   npm run build && npm start
   ```

## Environment variables

Names only. Never commit values.

| Name | Required | Purpose |
|------|----------|---------|
| `DATABASE_URL` | Yes | `file:./local.db` locally, a `libsql://...` URL in production |
| `DATABASE_AUTH_TOKEN` | Production | Token for the Turso database. Leave empty for a local file |
| `SESSION_SECRET` | Production | 32 or more random characters. Signs the login cookie. The app refuses to start without it in production |
| `NEXT_PUBLIC_SITE_URL` | Yes | Public address of the site. Used for the sitemap, canonical links and the opt-out links in messages |
| `ANTHROPIC_API_KEY` | No | Turns on model-written summaries and drafts. Without it a rule-based generator is used |
| `ANTHROPIC_MODEL` | No | Defaults to `claude-haiku-4-5` |

## How it is deployed

Recommended: Vercel for the app and Turso for the database. Both have free tiers. The same code runs against a local file or Turso because both speak libSQL.

1. Create a Turso database and note its URL and token.
   ```bash
   turso db create brandx-dealership
   turso db show brandx-dealership --url
   turso db tokens create brandx-dealership
   ```
2. Create the tables and load the sample data from your computer, pointing at Turso. In PowerShell:
   ```powershell
   $env:DATABASE_URL = "libsql://<your-database>.turso.io"
   $env:DATABASE_AUTH_TOKEN = "<token>"
   npm run db:setup
   ```
3. Import the GitHub repository into Vercel. The framework is detected as Next.js. No build settings need changing.
4. Add the environment variables above in the Vercel project settings, then deploy.
5. Open the deployed address, sign in with a demo account below and run through the checks.

Any Node host also works: run `npm run build` then `npm start`, set the same variables, and either use Turso or mount a persistent disk and set `DATABASE_URL=file:/data/local.db`.

The sample data seeds price validity 60 days ahead of the day you run `db:setup`. Renew it under Admin, Prices, "Renew all prices", or run `db:setup` again.

## Demo login details

Password for every account: `Demo@1234`

| Role | Email |
|------|-------|
| Admin and used-car manager | admin@brandx-demo.test |
| Sales consultant, Gomti Nagar (Models H and E) | priya@brandx-demo.test |
| Sales consultant, Gomti Nagar (Models S and C) | rahul@brandx-demo.test |
| Sales consultant, Alambagh | neha@brandx-demo.test |
| Sales consultant, Sultanpur Road | amit@brandx-demo.test |
| Buyer | buyer@brandx-demo.test |

These are throw-away accounts for review. Change or remove them before real use. The email domain is reserved for tests and cannot receive mail.

## Five-minute tour for the reviewer

1. Home, then New cars, Model H. Switch variant, colour and city. The breakup and total change. Choose Ayodhya to see a lapsed price handled.
2. Used cars. Filter by fuel. Open UC-1182: registration is masked and the inspection report is published. UC-1190 shows as booked.
3. Book a test drive. Pick a showroom, car and slot, fill in details, tick consent. Book the same car and time again from a private window to see the slot taken.
4. Sign in as priya@brandx-demo.test, open Lead inbox. The new lead has a five-minute countdown, a summary and a draft. Add "5% discount" to the draft: the warning appears and Send is disabled. Remove it and send: the timer stops.
5. Sign in as the admin. Admin, Used stock shows the suggested price band that only admins see. Admin, Prices has a live preview. Change a road tax percentage and reload the model page.
6. Lead inbox, Import portal CSV, upload `public/sample-portal-leads.csv`. One row is a duplicate and one has a bad phone number. Both are reported.
7. Switch to Hindi with the language button in the header.

## Known limits for reviewers

- WhatsApp and SMS are mocked. Messages appear in the lead's activity trail.
- Car previews are third-party 3D models embedded from Sketchfab, so the 3D view needs internet access. The card images are renders of those models.
- Rate limiting is per server instance. Use a shared store if you run several instances.
- Reseeding the database signs everyone out, because user ids change.

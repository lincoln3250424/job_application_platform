# The Desk — Job Application Review Platform

A working Next.js app implementing the three-agent review pipeline (Analyst → Editor →
Reviewer) from the system design doc, running on Gemini instead of Claude, built to deploy
on the accounts you already have: **GitHub, Vercel, Neon, Resend**, plus your **Gemini API
key** (billed AI Studio project).

This is the **Phase 1 core loop**: auth, paste a job post + resume, run the pipeline
synchronously, view results, revise, email yourself the final resume. URL scraping, the
browser extension, PDF/DOCX export, Stripe billing, and OAuth are *not* built yet — see
"What's next" at the bottom. They were deliberately deferred so this ships as something
real rather than half-wired everywhere at once (see the system design doc's build-order
section for the reasoning).

## What's actually in here

- **Auth**: email + password, bcrypt hashing, JWT session in an httpOnly cookie (no
  NextAuth/Auth.js — a lighter hand-rolled version since OAuth isn't wired up yet; adding
  Google OAuth later means swapping this for Auth.js, not a full rewrite)
- **Database**: PostgreSQL via Prisma, schema at `prisma/schema.prisma` (trimmed from the
  full system design — no OAuth/billing tables yet)
- **LLM**: Gemini via `@google/genai` — Flash for the Analyst and Fetcher's extraction
  step (cheap), Pro for the Editor and Reviewer (judgment-heavy stages) — see
  `lib/gemini.ts` to change models
- **URL scraping (Agent 0 / Fetcher)**: paste a URL instead of pasting text — see
  "URL scraping" below for exactly what it does and doesn't handle
- **PDF/DOCX export**: download the final resume as a real Word or PDF document, not a
  markdown dump — see "PDF/DOCX export" below
- **Stripe billing**: Checkout + Customer Portal + webhooks, gating the monthly run
  quota — see "Payments (Stripe)" below
- **Pipeline**: runs **synchronously inside the API request** (no job queue yet) — see
  "Why synchronous" below
- **Email**: Resend, sends the final resume + job post to the logged-in user's own address
- **UI**: carries forward the "dossier" visual language from the earlier prototype

## Setup

### 1. Install dependencies

```bash
npm install
```

This also runs `npx prisma generate` automatically (via the `postinstall` script), which
needs real network access to `binaries.prisma.sh` — fine on your machine or in CI, just
flagging it in case you're in a restricted sandbox somewhere.

### 2. Environment variables

Copy `.env.example` to `.env` and fill in:

```bash
cp .env.example .env
```

- **`DATABASE_URL`** — from Neon: your project's Connection Details, **use the pooled
  connection string** (hostname contains `-pooler`). This matters — see the system design
  doc's section on why pooling isn't optional with serverless functions.
- **`AUTH_SECRET`** — generate with `openssl rand -base64 32`.
- **`GEMINI_API_KEY`** — from Google AI Studio, the billed project you already set up.
- **`RESEND_API_KEY`** — from your Resend account.
- **`RESEND_FROM_EMAIL`** — must be an address on a domain you've verified in Resend (see
  step 4).

### 3. Push the schema to Neon

```bash
npx prisma db push
```

This creates all the tables directly from `prisma/schema.prisma` — no migration files
needed for a fresh project. (Once you have real data you care about, switch to
`prisma migrate dev` / `prisma migrate deploy` instead of `db push`, so schema changes are
tracked as reviewable migrations rather than applied ad hoc.)

> **Already set this up before?** The schema now includes a `structuredJson` column on
> `resume_drafts` (used by PDF/DOCX export), plus `plan`/`stripeCustomerId` on `users` and
> new `subscriptions`/`webhook_events` tables (used by Stripe billing). Run
> `npx prisma db push` again against your existing database to add them — all additive,
> nullable-or-defaulted columns, so this is safe to run against a database that already
> has real data in it.

### 4. Verify your Resend sending domain

In the Resend dashboard: Domains → Add Domain → add the SPF/DKIM/DMARC DNS records it
gives you to whatever DNS host manages your domain. Until this is verified, Resend will
reject sends from that domain — use a subdomain (e.g. `mail.yourdomain.com`) rather than
your root domain, so a deliverability problem never touches your main domain's reputation.

### 5. Run it locally

```bash
npm run dev
```

Visit `http://localhost:3000`, register an account, and try the full flow end to end
**before** deploying — cheaper and faster to debug locally than through a Vercel
deploy-and-check loop.

### 6. Deploy to Vercel

1. Push this repo to GitHub (you already have a GitHub account set up).
2. In Vercel: New Project → import the GitHub repo.
3. Add all five environment variables from your `.env` in Project Settings → Environment
   Variables (Production **and** Preview, so PR previews work too).
4. Deploy. Vercel auto-builds with `npm run build` (Next.js detected automatically).
5. After the first deploy, run `npx prisma db push` once against production if you didn't
   already (or push from local pointed at the same Neon database — it's the same
   database either way, so you only need to do this once, not per-environment, unless you
   set up separate Neon branches for preview vs. production).

## URL scraping

Toggle "From a URL" on the new-application form instead of pasting text. Under the hood
(`lib/fetcher.ts`):

1. **Validates the URL** — rejects non-http(s) schemes and obvious private/internal
   addresses (basic SSRF protection — see the code comments for what a hardened version
   would add on top: DNS resolution checks and re-validating on every redirect hop).
2. **Fetches it directly** with a real `fetch()` call, a real User-Agent, and a 15s
   timeout. No headless-browser fallback is wired up — that's a deliberate scope cut, not
   an oversight. Many ATS-hosted postings (Greenhouse, Lever, etc.) render fine without
   JavaScript; sites that require JS to show the posting will fail here with a clear error
   telling the user to paste the text instead.
3. **Strips boilerplate** with `@mozilla/readability` (the same library Firefox's reader
   mode uses) to cut navigation, ads, and related-postings widgets down to the main
   content.
4. **Extracts the actual posting** with one cheap Gemini Flash call, discarding whatever
   readability noise made it through (cookie notices, "related jobs" text, etc.). If the
   page doesn't look like a job posting at all, this step says so and the request fails
   cleanly rather than feeding garbage into the Analyst.

**No new environment variables or accounts needed** — this runs entirely on your existing
Gemini key. If a URL fails (blocked, needs JavaScript, isn't a job posting), the user just
never gets an application created — no half-empty record left behind — and the form is
still sitting there ready to accept pasted text instead.

**A real legal note, not just a technical one:** some job sites (LinkedIn being the
clearest example) prohibit scraping in their Terms of Service. This fetcher doesn't
special-case any site — it'll simply fail on ones that block automated requests, which
LinkedIn generally does. That's the correct behavior for now. The system design doc's
browser-extension section describes the actual right way to support LinkedIn: through
the user's own authenticated browser session, not server-side scraping. That's still on
the roadmap, not built here.

## PDF/DOCX export

Two "Download PDF" / "Download DOCX" links appear on the application page once a resume
draft exists. The key design decision (`lib/resumeStructure.ts`): **the markdown resume is
never fed directly into a document generator.** Markdown-to-document conversion produces
generic, un-resume-like formatting. Instead:

1. The first time a draft is exported, its markdown gets converted into a structured JSON
   shape (name, contact info, work experience, education, skills) via one Gemini call
   using **structured JSON output mode** (`responseMimeType: "application/json"` +
   `responseJsonSchema`) — this is much more reliable than asking the model to "please
   output valid JSON" in plain text and hoping.
2. That structured result is cached on `ResumeDraft.structuredJson` — a re-download of the
   same draft doesn't re-call Gemini.
3. `lib/documents/docx.ts` and `lib/documents/pdf.tsx` both render from that same
   structured data — one real Word document (via the `docx` package), one real PDF (via
   `@react-pdf/renderer`) — so the two formats can never drift out of sync with each
   other.

**No file storage needed.** Files are generated on the fly and streamed straight back as
the HTTP response (`Content-Disposition: attachment`) — no Vercel Blob, no S3, nothing to
provision. This is a deliberate MVP simplification: regeneration is fast enough (well under
a second once the structured JSON is cached) that caching the actual file bytes isn't worth
the added complexity yet. Add Blob storage later specifically if you want to skip even the
structuring step on repeat downloads, or want export history/audit trail.

**Only one template for now.** The design doc suggested offering 2-3 visually distinct
templates from the start since resumes are personal documents — that's a real product
opinion worth revisiting, just cut here to keep this shippable. Both generators are
structured so adding a second template is "add a new file that takes the same
`StructuredResume` input," not a rewrite.

## Payments (Stripe)

A free/Pro/Premium tier structure, gated by `users.monthlyRunQuota` — the same field
`checkQuota()` was already reading, so no changes were needed to how quota enforcement
works, only to what sets that number.

### Setup

1. **Create a Stripe account** (or use an existing one) and stay in **test mode** while
   you set this up — everything below works identically in test and live mode, you just
   flip which API keys you use.
2. **Create two Products**, one per paid tier (e.g. "Pro" and "Premium"), each with one
   recurring monthly **Price**. Dashboard → Product catalog → Add product.
3. Copy each Price's ID (starts with `price_`, **not** the Product ID which starts with
   `prod_`) into `STRIPE_PRICE_PRO` / `STRIPE_PRICE_PREMIUM` in your `.env`. Adjust the
   quota numbers for each tier in `lib/plans.ts` if the defaults (60/month Pro, 200/month
   Premium, vs. 10/month Free) don't match what you want to sell.
4. Copy your **API key** (Dashboard → Developers → API keys → Secret key, test mode) into
   `STRIPE_SECRET_KEY`.
5. **Set up the webhook.** This is the piece that actually keeps a user's plan in sync —
   without it, a successful Checkout would take their money and never grant the quota.
   - **Locally**: install the [Stripe CLI](https://stripe.com/docs/stripe-cli), run
     `stripe login`, then `stripe listen --forward-to localhost:3000/api/webhooks/stripe`.
     It prints a webhook signing secret (`whsec_...`) — put that in `STRIPE_WEBHOOK_SECRET`
     for local dev. Leave this command running while you test checkout locally.
   - **In production**: Dashboard → Developers → Webhooks → Add endpoint → URL =
     `https://yourdomain.com/api/webhooks/stripe`. Select these events: `checkout.session.
     completed`, `customer.subscription.created`, `customer.subscription.updated`,
     `customer.subscription.deleted`, `invoice.payment_failed`. Copy the endpoint's signing
     secret into `STRIPE_WEBHOOK_SECRET` in your Vercel environment variables (this will be
     a **different** secret than the CLI one you used locally).
6. Push the updated schema (`Subscription`, `WebhookEvent` tables, plus `plan` /
   `stripeCustomerId` on `User`) — see the schema-push note in step 3 above.

### How it works

- **"Upgrade" buttons** on the dashboard hit `/api/billing/checkout`, which creates (or
  reuses) a Stripe Customer for the user and redirects to Stripe Checkout.
- **The webhook is the only thing that ever writes `users.plan` / `monthlyRunQuota`.** The
  checkout success redirect just shows a "thanks" banner — it does **not** grant the plan
  itself, on purpose. Relying on the redirect would mean a user closing the tab right after
  paying (before the redirect fires) never gets their quota, and it would mean trusting a
  URL parameter the browser controls to grant paid access. The webhook is the only source
  Stripe itself guarantees will fire, so it's the only thing this app trusts.
- **Idempotency**: Stripe redelivers webhook events on any timeout or non-2xx response.
  Every processed event's ID is recorded in `webhook_events` before returning success, and
  checked before doing any work — so a redelivered event is a no-op, not a double-charge
  of quota or a duplicate database write.
- **A canceled or past-due subscription reverts the user to the free quota**, not just
  a "canceled" label — `customer.subscription.deleted` and a non-active status on
  `customer.subscription.updated` both call the same downgrade path.
- **"Manage billing"** (shown once a user has any paid history) opens the Stripe Customer
  Portal — Stripe's own hosted page for updating payment methods, viewing invoices, and
  canceling, so none of that had to be built here.

### What I could not verify here

This sandbox has no Stripe account and no network access to `api.stripe.com`, so — same
caveat as the Gemini integration — this is verified by careful matching against the
installed SDK's actual type definitions (I specifically checked where `current_period_end`
lives in this API version, since Stripe moved it from the Subscription object onto each
Subscription Item in a recent API version — using the old location would have been a
real, silent bug), not by an actual successful checkout. **Test the full loop yourself
before trusting it**: run `stripe listen` locally, subscribe to a test-mode plan using
[Stripe's test card `4242 4242 4242 4242`](https://stripe.com/docs/testing), and confirm
your quota actually changes on the dashboard afterward.

## Why synchronous (no job queue yet)

The Analyst → Editor → Reviewer pipeline is 3 sequential Gemini calls. With Gemini Flash
for the Analyst and Pro for the other two, a full run typically lands somewhere in the
10-40 second range depending on resume/job-post length — under Vercel's function timeout
if you set `maxDuration` (already set to 60 in the relevant routes), but slower than a
snappy page load.

This matches the "what to build first" order from the system design doc: **prove the
pipeline logic works and persists correctly before adding async complexity.** The
`/api/applications/[id]/run` route exists specifically to handle a mid-pipeline failure —
if the Analyst succeeds but the Editor's call times out or errors, calling `run` again
resumes from wherever it left off instead of redoing the whole thing or duplicating a step.

**When to graduate to a background queue (Inngest, as designed):** once you notice real
users hitting timeouts, or you want the live-updating "watch it think" UX from the
original artifact prototype instead of a single loading spinner. The database schema
doesn't need to change for this — job-tracking is additive, not a redesign.

## Project structure

```
app/
  api/                    All routes — see below
  login/, register/       Auth pages
  dashboard/              Create + list applications
  applications/[id]/      Detail: job post, analysis, drafts, reviews, actions
lib/
  db.ts                   Prisma client singleton
  auth.ts                 Password hashing + JWT session cookies
  gemini.ts               Gemini API wrapper (model selection lives here)
  agents.ts               The 3 system prompts + per-agent call functions
  pipeline.ts             Orchestration: runs agents, persists results, handles resume-after-failure
  email.ts                Resend wrapper
  quota.ts                Monthly run quota check
prisma/schema.prisma      Database schema
proxy.ts                  Route protection (Next.js 16's replacement for middleware.ts)
```

### API routes

| Route | Purpose |
|---|---|
| `POST /api/auth/register` | Create account |
| `POST /api/auth/login` | Log in |
| `POST /api/auth/logout` | Log out |
| `GET/POST /api/resumes` | List / save base resumes |
| `PATCH/DELETE /api/resumes/:id` | Edit / delete a base resume |
| `GET/POST /api/applications` | List applications / create one + run the pipeline |
| `GET/DELETE /api/applications/:id` | Full detail / delete |
| `POST /api/applications/:id/run` | Resume a partially-failed pipeline run |
| `POST /api/applications/:id/revise` | Editor↔Reviewer revision loop, using the latest punch list |
| `GET /api/applications/:id/export?format=pdf\|docx` | Download the final resume as a real document |
| `POST /api/applications/:id/email` | Email the final resume + job post to yourself |
| `POST /api/billing/checkout` | Start a Stripe Checkout session for a plan upgrade |
| `POST /api/billing/portal` | Open the Stripe Customer Portal for self-serve billing management |
| `POST /api/webhooks/stripe` | Stripe webhook receiver — the only thing that updates a user's plan/quota |

## A note on how this was verified

This sandbox couldn't reach `binaries.prisma.sh` (needed for `prisma generate`),
`fonts.googleapis.com` (needed for the `next/font/google` imports), or Google's Gemini API
itself, so I couldn't run a literal `npm install && npm run build` and click through the
app exactly as you will. To still verify the code is sound, I:

- Hand-wrote a temporary, throwaway type stub matching the real Prisma schema (updated
  again when `structuredJson` was added), ran the actual `tsc --noEmit` compiler against
  the real application code with it, fixed the real issues it found (a missing type
  annotation, and a Buffer/BodyInit type mismatch in the export route), and deleted the
  stub before packaging this up — it was never shipped.
- Temporarily swapped the Google Font imports for plain strings, ran a full
  `next build` (Turbopack), and confirmed all 16 routes — including the new
  `/api/applications/:id/export` — compiled and bundled cleanly, then reverted to the real
  font imports for delivery.
- **Independently smoke-tested the two document generators** with realistic sample data,
  outside of Next.js entirely: confirmed `docx`'s `Packer.toBuffer()` produces a valid ZIP
  (DOCX files are ZIP archives — I checked the file's magic bytes), and confirmed
  `@react-pdf/renderer`'s `renderToBuffer()` produces a buffer starting with `%PDF`, using
  the same component/style patterns (flexbox rows, nested views, mapped bullet lists) the
  real resume template uses.
- **Checked the Stripe SDK's actual type definitions** rather than assuming API shape from
  memory — this caught a real, non-obvious issue: `current_period_end` moved from the
  Subscription object onto each Subscription Item in a recent Stripe API version. Using
  the old location would have compiled fine (with `any`-typed data) but silently stored
  the wrong value in the database.
- Ran ESLint across the whole project — zero errors.

**What I could not verify here**, and what you should check first: an actual Gemini API
call (network to `generativelanguage.googleapis.com` isn't available in this sandbox), so
the exact shape of Gemini's structured JSON output for a real resume, and the Fetcher's
behavior against a real job-posting URL, are both unverified beyond matching the SDK's
type definitions carefully. Test both early — paste a URL from a Greenhouse-hosted posting
first (most likely to work without the headless-browser fallback), and try exporting a
resume as both formats.

## Known low-priority items

- `npm audit` flags a high-severity advisory in a transitive dependency of the Prisma
  CLI's config parser (`deepmerge-ts`, via `@prisma/config`). It's a build-tool-only
  dependency (not shipped in the deployed app) and the fix requires downgrading Prisma by
  a major version, so it's left as-is here — worth revisiting next time you update
  dependencies, not urgent.
- Quota checking (`lib/quota.ts`) counts applications created this calendar month — simple
  and good enough for now. The full system design doc's usage-tracking table is a more
  precise, cost-based version to grow into once you care about actual token spend per user.

## What's next (from the full system design doc, not built here yet)

In roughly the order the design doc recommends:

1. **Headless-browser fallback for URL scraping** — the current Fetcher only does a direct
   `fetch()`; sites that require JavaScript to render the posting (some corporate career
   pages, likely most of LinkedIn even setting the ToS question aside) will fail and need
   a managed service like Browserless.io or ScrapingBee as a fallback, per the design doc.
2. **A second (and third) export template** — see "PDF/DOCX export" above.
3. **Browser extension** — captures job posts (including LinkedIn, where server-side
   scraping isn't appropriate) via a personal access token, not a session cookie.
4. **Google OAuth** — at that point, worth migrating auth to Auth.js rather than extending
   the hand-rolled version further, since Auth.js handles multi-provider account linking
   for you.

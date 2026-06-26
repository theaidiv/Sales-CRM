# AI Sales OS

AI-powered sales planning, forecasting, customer intelligence & lead management for an
industrial manufacturing/export company. Built with **Next.js + Supabase + Groq (gpt-oss)**.

> Demo build. Seeded with **500 customers** plus correlated orders, opportunities, activities,
> quotations and targets so every feature has live-looking data.

---

## What's inside

- **Customer Intelligence** — 500-customer repository, health scoring, auto Regular/Detached/New
  categorization (6-month detach rule).
- **Leads & Pipeline** — opportunity stages New → Won, weighted pipeline value.
- **Activity Tracking** — calls, meetings, visits, follow-ups, quotations, orders, emails.
- **Targets** — company / team / user, annual / quarterly / monthly.
- **Projection Engine** — automated monthly projection sheet with revenue-source breakdown,
  target gap & confidence.
- **Forecasting Engine** — monthly / quarterly / annual best / expected / worst scenarios.
- **AI Copilot** — conversational assistant grounded in your sales data (Groq `gpt-oss`).
- **AI Action Engine** — daily priority actions, target advisor, detached recovery, risk alerts.
- **Dashboards** — role-aware executive & salesperson views.

AI runs on Groq with a **deterministic fallback** on every call, so the demo never hard-fails if
the network or API is unavailable.

---

## Quick start (local)

```bash
npm install
cp .env.local.example .env.local   # then fill in the values (see below)
# 1. Apply the schema (Supabase SQL Editor) — see step 2 below
# 2. Seed the data:
npm run seed
# 3. Run:
npm run dev      # http://localhost:3000
```

**Demo logins** (all password `Demo@1234`):

| Email | Role |
|-------|------|
| `head@salesos.demo` | Sales Head (sees everything) |
| `admin@salesos.demo` | Admin |
| `priya@salesos.demo` | Sales Executive (sees own data) |
| `rahul@salesos.demo` / `anita@salesos.demo` / `vikram@salesos.demo` | Sales Executives |

---

## Setup — step by step

### 1. Supabase project
1. Create a project at [supabase.com](https://supabase.com) (free tier).
2. **Settings → API** — copy:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY` (keep secret; seed only)

### 2. Apply the schema
Open **SQL Editor** in Supabase, paste the contents of [`supabase/schema.sql`](supabase/schema.sql),
and **Run**. This creates all tables and permissive RLS policies for authenticated users.

### 3. Groq API
1. Get a key at [console.groq.com/keys](https://console.groq.com/keys).
2. Set `GROQ_API_KEY`. Confirm the model id in your Groq dashboard and set `GROQ_MODEL`
   (default `openai/gpt-oss-120b`; use `openai/gpt-oss-20b` if that's what your account exposes).

### 4. Fill `.env.local`
```
NEXT_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
GROQ_API_KEY=...
GROQ_MODEL=openai/gpt-oss-120b
GROQ_BASE_URL=https://api.groq.com/openai/v1
```

### 5. Seed
```bash
npm run seed
```
Creates the demo users and 500 customers with related data. Safe to re-run (re-apply the schema
first for a clean reset). Takes ~1–2 minutes.

---

## Deploy to Vercel

1. Push this repo to GitHub.
2. [vercel.com/new](https://vercel.com/new) → import the repo.
3. **Environment Variables** — add all of the variables above
   (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`,
   `GROQ_API_KEY`, `GROQ_MODEL`, `GROQ_BASE_URL`).
4. **Deploy.** Vercel gives you a public URL to open at the customer's office.

> Seeding is done **once from your machine** (`npm run seed`) against the same Supabase project —
> you do not need to seed from Vercel. The deployed app reads the already-seeded database.

### Supabase Auth note
In Supabase **Authentication → Providers → Email**, ensure email/password is enabled and
"Confirm email" is **off** (the seed creates pre-confirmed users, so logins work immediately).

---

## Architecture

```
Browser ── Next.js (Vercel) ──┬── Supabase Postgres (data + auth)
                              └── Groq API (gpt-oss)  ←fallback→ deterministic engine
```

- **Engines** (`lib/engines/`) — pure functions: health, detach, projection, forecast, recovery,
  risk, daily actions. No AI required; fully deterministic and testable.
- **AI layer** (`lib/ai/`) — Groq client + grounded prompts for copilot, summaries, explanations,
  each with a deterministic fallback.
- **Data access** (`lib/data.ts`) — role-scoped: executives see only their assigned records;
  Admin / Sales Head see everything.

See [`docs/superpowers/specs/2026-06-26-ai-sales-os-demo-design.md`](docs/superpowers/specs/2026-06-26-ai-sales-os-demo-design.md)
for the full design.

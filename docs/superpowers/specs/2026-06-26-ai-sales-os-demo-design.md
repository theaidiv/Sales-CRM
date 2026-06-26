# AI Sales OS — Demo Build Design Spec

**Date:** 2026-06-26
**Status:** Approved — building
**Context:** Hostable demo for a customer pitch (next day). Long-term goal is the full 15-module
"AI Sales Operating System"; this spec covers the deployable demo slice.

## Goal

A polished, deployable web app demonstrating AI-powered sales planning, forecasting, customer
intelligence, and lead management for an industrial manufacturing/export company. Backed by 500
realistic seeded customers so every feature has live-looking data.

## Constraints

- **Deadline:** demo next day. Breadth + polish over exhaustive depth.
- **Hosting:** user's own Vercel + Supabase accounts (free tier).
- **AI:** Groq API (OpenAI-compatible), `gpt-oss` model. Every AI call has a deterministic
  fallback so a live demo never hard-fails on missing key / flaky network.

## Stack

- Next.js (App Router, TypeScript), Tailwind CSS, shadcn/ui, Recharts.
- Supabase Postgres + Supabase Auth (email/password).
- Roles: Admin, Sales Head, Sales Executive (gated in-app).
- All AI/engine logic server-side (route handlers / server actions). Keys never reach the browser.
- Deploy target: Vercel. DB: Supabase.

## Architecture

```
Browser ── Next.js (Vercel) ──┬── Supabase Postgres (data + auth)
                              └── Groq API (gpt-oss)  ←fallback→ deterministic engine
```

## Data model (Postgres)

- `profiles` — id, name, email, role, team, created_at
- `customers` — company_name, contact_person, phone, email, country, industry, assigned_to,
  category (Regular/Detached/New), last_contact_date, last_order_date, total_revenue, status,
  health_score, health_band, notes, created_at
- `opportunities` — customer_id, title, assigned_to, stage (New/Contacted/Meeting Scheduled/
  Quotation Shared/Negotiation/Won/Lost/On Hold), value, probability, expected_close_date, notes
- `activities` — type (call/meeting/visit/followup/quotation/order/email), user_id, customer_id,
  opportunity_id, date, notes, outcome
- `orders` — customer_id, amount, order_date
- `quotations` — customer_id, opportunity_id, amount, status, quote_date
- `targets` — scope (company/team/user), period_type (annual/quarterly/monthly), period,
  owner_id (nullable), target_amount, achieved_amount
- `comments` — entity_type, entity_id, user_id, body, created_at (collaboration timeline)

## Deterministic engines (pure functions, no AI required)

- **Auto-detach:** last_order_date older than 6 months → category = Detached.
- **Health score:** weighted blend of recency, order frequency, revenue trend, engagement →
  band Healthy / Stable / At Risk / Detached Risk.
- **Projection:** Σ regular run-rate + (detached recovery-prob × potential) +
  (opportunity value × stage probability) + pending quotations + new-customer estimate →
  Projected Revenue, Target Gap, Confidence Score.
- **Forecast:** Best / Expected / Worst bands + confidence + revenue gap (monthly/quarterly/annual).
- **Recovery probability & priority**, **risk alerts** — rule-based.

## AI layer (Groq `gpt-oss`)

- **Copilot:** intent → pull relevant DB rows → compact context → Groq → answer.
- **Summarization:** condense a customer's comment/activity timeline.
- **Explanations:** narrate projection/forecast and daily-action recommendations.
- Each AI call wrapped with a templated deterministic fallback.

## Pages

`/login` · `/dashboard` (Exec vs Head) · `/customers` (list + detail: timeline, comments, AI
summary) · `/leads` (kanban pipeline) · `/activities` · `/targets` · `/projections` ·
`/forecasts` · `/copilot` (chat) · `/recommendations` (daily actions, target advisor, detached
recovery, risk alerts).

## Seed data

Script generates 500 customers across realistic industrial/export industries & countries,
assigned to seeded salespeople, spread across Regular/Detached/New, with correlated orders,
opportunities, activities, quotations, and targets.

## Depth priority (one-night trade-off)

All 10 pages present and demo-able. Headline depth concentrated in Customers, Dashboards,
Projection/Forecast, and Copilot (the pitch path). Secondary screens (activities, targets admin)
functional but lighter.

## Deployment deliverable

Step-by-step instructions for the user to connect their Supabase project, run schema + seed, set
env vars (Supabase URL/keys, GROQ_API_KEY, GROQ_MODEL), and deploy to Vercel.

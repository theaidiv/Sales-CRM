/**
 * Seed script — tuned to the customer's real figures.
 *
 *  Scale: small business, ~₹40L/month (~₹4.8Cr/year).
 *  Parties: 76 (51 Regular, 12 Detached, 13 New).
 *  Team:   Sales Head (Sandeep) is the lead seller (₹29L/mo) + 3 executives (₹11L/mo split).
 *  Geo:    ~50% local (India), ~50% export.
 *  Targets: monthly with backlog rollover across all 3 FYs (Jun'25 ₹30L, Jun'26 ₹40L).
 *  May'26 leads: Regular 51 (30 won), Detached 22 (0 won), New 3 (0 won).
 *
 * Re-runnable (clears existing data). Run after schema.sql:  npm run seed
 */
import "dotenv/config";
import { config } from "dotenv";
config({ path: ".env.local" });

import { faker } from "@faker-js/faker";
import { createClient } from "@supabase/supabase-js";
import { healthScore } from "../lib/engines/health";
import { projectMonth } from "../lib/engines/projection";
import { fiscalStartYear, fiscalYearKeyFromStart, fiscalQuarterKey, currentMonthKey } from "../lib/utils";

faker.seed(20260626);

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}
const db = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });

const PASSWORD = "Demo@1234";
const L = 100000;      // 1 lakh
const CR = 10000000;   // 1 crore

const INDUSTRIES = [
  "Automotive Components", "Steel & Metal Fabrication", "Industrial Machinery",
  "Textile Manufacturing", "Chemical Processing", "Plastics & Polymers",
  "Electrical Equipment", "Pumps & Valves", "Packaging Materials", "Agro Equipment",
  "Pharmaceutical Machinery", "Food Processing Equipment", "Construction Materials", "Heavy Engineering",
];
const EXPORT_COUNTRIES = [
  "UAE", "Saudi Arabia", "USA", "Germany", "United Kingdom", "Nigeria",
  "Kenya", "Bangladesh", "Vietnam", "Brazil", "South Africa", "Australia", "Indonesia", "Egypt",
];
const ACTIVITY_TYPES = ["Call", "Meeting", "Visit", "Follow-Up", "Quotation", "Order", "Email"] as const;

// Sales Head is a producer (lead seller). 3 executives under her.
const USERS = [
  { name: "Admin User", email: "admin@salesos.demo", role: "Admin", team: "Management" },
  { name: "Sandeep Mehra", email: "head@salesos.demo", role: "Sales Head", team: "Sales" },
  { name: "Priya Sharma", email: "priya@salesos.demo", role: "Sales Executive", team: "Sales" },
  { name: "Rahul Verma", email: "rahul@salesos.demo", role: "Sales Executive", team: "Sales" },
  { name: "Anita Desai", email: "anita@salesos.demo", role: "Sales Executive", team: "Sales" },
] as const;

// Seasonality by calendar month (0=Jan). Stronger at FY-end (Mar) and quarter-ends.
const SEASON = [0.95, 0.9, 1.2, 0.85, 0.9, 1.0, 1.0, 0.95, 1.15, 1.05, 1.1, 1.15];
// YoY growth keyed by FY start year so Jun'25 ≈ ₹30L and Jun'26 ≈ ₹40L company-wide.
const FY_GROWTH: Record<number, number> = { 2024: 1.0, 2025: 1.25, 2026: 1.67 };

const rnd = () => faker.number.float();
const pick = <T>(arr: readonly T[]): T => arr[Math.floor(rnd() * arr.length)];
const dayInMonth = (year: number, month0: number): string => {
  const day = 3 + Math.floor(rnd() * 24);
  return new Date(year, month0, day).toISOString().slice(0, 10);
};

interface MonthCell { year: number; month0: number; fyStart: number; }
function buildMonths(): MonthCell[] {
  const out: MonthCell[] = [];
  const now = new Date();
  const cur = new Date(now.getFullYear(), now.getMonth(), 1);
  let d = new Date(2024, 3, 1); // Apr 2024
  while (d <= cur) {
    out.push({ year: d.getFullYear(), month0: d.getMonth(), fyStart: fiscalStartYear(d) });
    d = new Date(d.getFullYear(), d.getMonth() + 1, 1);
  }
  return out;
}

async function getOrCreateUser(email: string): Promise<string> {
  const { data: list } = await db.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const existing = list?.users.find((u) => u.email === email);
  if (existing) return existing.id;
  const { data, error } = await db.auth.admin.createUser({ email, password: PASSWORD, email_confirm: true });
  if (error || !data.user) throw new Error(`createUser ${email}: ${error?.message}`);
  return data.user.id;
}

async function clearAll() {
  const ZERO = "00000000-0000-0000-0000-000000000000";
  await db.from("comments").delete().neq("id", ZERO);
  await db.from("targets").delete().neq("id", ZERO);
  await db.from("customers").delete().neq("id", ZERO); // cascades orders/opps/activities/quotations
}

async function insertBatched(table: string, rows: any[], size = 500) {
  for (let i = 0; i < rows.length; i += size) {
    const { error } = await db.from(table).insert(rows.slice(i, i + size));
    if (error) throw new Error(`insert ${table}: ${error.message}`);
  }
}

// Category plan: 51 Regular, 12 Detached, 13 New = 76 parties.
const CATEGORY_PLAN: ("Regular" | "Detached" | "New")[] = [
  ...Array(51).fill("Regular"),
  ...Array(12).fill("Detached"),
  ...Array(13).fill("New"),
];

async function main() {
  const months = buildMonths();
  const now = new Date();
  console.log(`→ Window ${months[0].year}-${String(months[0].month0 + 1).padStart(2, "0")} … ${currentMonthKey(now)} (${months.length} months) · scale ₹/lakhs`);

  console.log("→ Clearing existing demo data...");
  await clearAll();

  console.log("→ Creating demo users (Head + 3 execs)...");
  const userIds: Record<string, string> = {};
  for (const u of USERS) userIds[u.email] = await getOrCreateUser(u.email);
  await db.from("profiles").upsert(
    USERS.map((u) => ({ id: userIds[u.email], name: u.name, email: u.email, role: u.role, team: u.team }))
  );
  const headId = userIds["head@salesos.demo"];
  const execIds = [userIds["priya@salesos.demo"], userIds["rahul@salesos.demo"], userIds["anita@salesos.demo"]];

  console.log("→ Generating 76 parties with monthly order history...");
  type CustSeed = {
    company_name: string; contact_person: string; phone: string; email: string;
    country: string; industry: string; assigned_to: string; category: string;
    last_contact_date: string; last_order_date: string | null; total_revenue: number;
    status: string; health_score: number; health_band: string; notes: string;
    _orders: { amount: number; order_date: string }[]; _baseMonthly: number; _local: boolean;
  };
  const customers: CustSeed[] = [];

  CATEGORY_PLAN.forEach((category, i) => {
    // Size tiers (lakhs). Company total run-rate ≈ ₹40L/month at current FY.
    const tierRoll = rnd();
    const baseMonthly = tierRoll < 0.20 ? 70000 + rnd() * 50000   // ₹0.7–1.2L
      : tierRoll < 0.65 ? 30000 + rnd() * 30000                    // ₹0.3–0.6L
      : 10000 + rnd() * 20000;                                     // ₹0.1–0.3L
    const custGrowth = 0.9 + rnd() * 0.25;
    const local = i % 2 === 0;                                     // ~50/50 local/export
    const country = local ? "India" : pick(EXPORT_COUNTRIES);

    const orders: { amount: number; order_date: string }[] = [];
    if (category === "New") {
      const n = rnd() < 0.55 ? 1 + Math.floor(rnd() * 2) : 0;
      for (let k = 0; k < n; k++) {
        const m = months[months.length - 1 - k];
        orders.push({ amount: Math.round(baseMonthly * 0.5 * (0.7 + rnd() * 0.6)), order_date: dayInMonth(m.year, m.month0) });
      }
    } else {
      const silenceAgo = category === "Detached" ? 7 + Math.floor(rnd() * 5) : 0; // 7–11 months
      const lastActiveIdx = months.length - 1 - silenceAgo;
      const orderProb = category === "Detached" ? 0.7 : 0.82;
      for (let mi = 0; mi <= lastActiveIdx; mi++) {
        const m = months[mi];
        const forceCurrent = category === "Regular" && mi === months.length - 1;
        if (!forceCurrent && rnd() > orderProb) continue;
        let amt = baseMonthly * (FY_GROWTH[m.fyStart] ?? 1) * SEASON[m.month0] * custGrowth * (0.85 + rnd() * 0.3);
        if (category === "Detached") {
          const dist = lastActiveIdx - mi;
          if (dist < 4) amt *= [0.5, 0.65, 0.8, 0.92][dist];
        }
        orders.push({ amount: Math.round(amt), order_date: dayInMonth(m.year, m.month0) });
      }
    }
    orders.sort((a, b) => (a.order_date < b.order_date ? 1 : -1));

    const total_revenue = orders.reduce((s, o) => s + o.amount, 0);
    const lastOrderDate = orders[0]?.order_date ?? null;
    const nowMs = now.getTime();
    const sixM = 1000 * 60 * 60 * 24 * 182;
    const recent = orders.filter((o) => nowMs - new Date(o.order_date).getTime() <= sixM).reduce((s, o) => s + o.amount, 0);
    const prior = orders.filter((o) => { const a = nowMs - new Date(o.order_date).getTime(); return a > sixM && a <= sixM * 2; }).reduce((s, o) => s + o.amount, 0);
    const revenueTrend = prior > 0 ? Math.max(-1, Math.min(1, (recent - prior) / prior)) : recent > 0 ? 0.5 : -0.4;
    const orderCount12m = orders.filter((o) => nowMs - new Date(o.order_date).getTime() <= sixM * 2).length;
    const last_contact_date = dayInMonth(now.getFullYear(), now.getMonth() - (category === "Detached" ? Math.floor(rnd() * 4) : 0));
    const { score, band } = healthScore({ last_order_date: lastOrderDate, last_contact_date, orderCount12m, revenueTrend });

    customers.push({
      company_name: `${faker.company.name()} ${pick(["Industries", "Exports", "Manufacturing", "Engineering", "Pvt Ltd"])}`,
      contact_person: faker.person.fullName(),
      phone: faker.phone.number({ style: "international" }),
      email: faker.internet.email().toLowerCase(),
      country, industry: pick(INDUSTRIES), assigned_to: "", category,
      last_contact_date, last_order_date: lastOrderDate, total_revenue,
      status: "Active", health_score: score, health_band: band,
      notes: faker.company.catchPhrase(), _orders: orders, _baseMonthly: baseMonthly, _local: local,
    });
  });

  // Assignment: Head owns the larger accounts (~72% of value); 3 execs share the rest.
  const order = [...customers].sort((a, b) => b._baseMonthly - a._baseMonthly);
  const headCount = 45; // of 76 — the bigger accounts
  order.forEach((c, rank) => {
    c.assigned_to = rank < headCount ? headId : execIds[(rank - headCount) % execIds.length];
  });

  // Insert customers
  const insertRows = customers.map(({ _orders, _baseMonthly, _local, ...c }) => c);
  const insertedIds: string[] = [];
  for (let i = 0; i < insertRows.length; i += 200) {
    const { data, error } = await db.from("customers").insert(insertRows.slice(i, i + 200)).select("id");
    if (error) throw new Error(`insert customers: ${error.message}`);
    insertedIds.push(...data!.map((r) => r.id));
  }
  console.log(`  inserted ${insertedIds.length} customers (${customers.filter(c => c.category === "Regular").length} reg, ${customers.filter(c => c.category === "Detached").length} det, ${customers.filter(c => c.category === "New").length} new)`);

  // Orders
  const orderRows: any[] = [];
  customers.forEach((c, idx) => c._orders.forEach((o) => orderRows.push({ customer_id: insertedIds[idx], amount: o.amount, order_date: o.order_date })));
  await insertBatched("orders", orderRows);
  console.log(`  inserted ${orderRows.length} orders`);

  // May 2026 leads: Regular 51 (30 won), Detached 22 (0 won), New 3 (0 won).
  const regularIdx = customers.map((c, i) => c.category === "Regular" ? i : -1).filter((i) => i >= 0);
  const detachedIdx = customers.map((c, i) => c.category === "Detached" ? i : -1).filter((i) => i >= 0);
  const newIdx = customers.map((c, i) => c.category === "New" ? i : -1).filter((i) => i >= 0);
  const mayDate = () => new Date(2026, 4, 3 + Math.floor(rnd() * 25)).toISOString().slice(0, 10);
  const junClose = () => new Date(2026, 5, 5 + Math.floor(rnd() * 24)).toISOString().slice(0, 10);
  const PROB: Record<string, number> = { New: 10, Contacted: 20, "Meeting Scheduled": 35, "Quotation Shared": 55, Negotiation: 75, Won: 100, Lost: 0, "On Hold": 15 };
  const oppRows: any[] = [];
  const addOpp = (custIdx: number, stage: string) => {
    const c = customers[custIdx];
    oppRows.push({
      customer_id: insertedIds[custIdx],
      title: `${pick(["Supply of", "Order for", "Repeat order —", "RFQ for"])} ${pick(["valves", "pumps", "machinery", "steel parts", "components", "spares"])}`,
      assigned_to: c.assigned_to, stage, value: Math.round(40000 + rnd() * 110000), probability: PROB[stage],
      expected_close_date: junClose(), notes: faker.lorem.sentence(), created_at: mayDate() + "T10:00:00Z",
    });
  };
  // Regular: 51 leads — 30 Won, 15 open, 6 Lost
  regularIdx.forEach((ci, k) => {
    const stage = k < 30 ? "Won" : k < 45 ? pick(["Contacted", "Meeting Scheduled", "Quotation Shared", "Negotiation"] as const) : "Lost";
    addOpp(ci, stage);
  });
  // Detached: 22 leads (spread over 12 detached) — 0 Won, mostly open, some Lost
  for (let k = 0; k < 22; k++) {
    const ci = detachedIdx[k % detachedIdx.length];
    addOpp(ci, k < 17 ? pick(["New", "Contacted", "On Hold"] as const) : "Lost");
  }
  // New: 3 leads — 0 Won, open
  for (let k = 0; k < 3; k++) addOpp(newIdx[k % newIdx.length], pick(["New", "Contacted"] as const));
  await insertBatched("opportunities", oppRows);
  console.log(`  inserted ${oppRows.length} opportunities (May'26 leads: 51 reg/30 won, 22 det/0 won, 3 new/0 won)`);

  // Quotations
  const quoteRows: any[] = [];
  customers.forEach((c, idx) => {
    if (rnd() < 0.4) quoteRows.push({
      customer_id: insertedIds[idx], amount: Math.round(30000 + rnd() * 170000),
      status: pick(["Draft", "Sent", "Sent", "Accepted", "Rejected"] as const),
      quote_date: dayInMonth(now.getFullYear(), now.getMonth() - Math.floor(rnd() * 3)),
    });
  });
  await insertBatched("quotations", quoteRows);
  console.log(`  inserted ${quoteRows.length} quotations`);

  // Activities
  const actRows: any[] = [];
  customers.forEach((c, idx) => {
    const n = 2 + Math.floor(rnd() * 6);
    for (let k = 0; k < n; k++) {
      const type = pick(ACTIVITY_TYPES);
      actRows.push({
        type, user_id: c.assigned_to, customer_id: insertedIds[idx],
        activity_date: dayInMonth(now.getFullYear(), now.getMonth() - Math.floor(rnd() * 4)),
        notes: `${type} with ${c.contact_person}: ${faker.lorem.sentence()}`,
        outcome: pick(["Positive", "Neutral", "Needs follow-up", "No response", "Interested"]),
      });
    }
  });
  await insertBatched("activities", actRows);
  console.log(`  inserted ${actRows.length} activities`);

  // Comments
  const commentRows: any[] = [];
  customers.forEach((c, idx) => {
    if (rnd() < 0.35) {
      const k = 1 + Math.floor(rnd() * 3);
      for (let j = 0; j < k; j++) commentRows.push({
        entity_type: "customer", entity_id: insertedIds[idx], user_id: pick([headId, ...execIds]),
        body: pick([
          "Called customer, awaiting confirmation on quantities.",
          "Quotation shared, follow up next week.",
          "Met at trade expo, strong interest in new product line.",
          "Price negotiation ongoing, holding at 5% discount.",
          "Customer requested samples before committing.",
          "Competitor is active here — needs attention.",
        ]),
      });
    }
  });
  await insertBatched("comments", commentRows);
  console.log(`  inserted ${commentRows.length} comments`);

  // ---- Targets: monthly with backlog rollover; achieved = ACTUAL orders ----
  console.log("→ Generating targets (backlog rollover, achieved from actual orders)...");
  const n = months.length;
  const mk = (y: number, m0: number) => `${y}-${String(m0 + 1).padStart(2, "0")}`;

  // Actual company revenue per month from generated orders.
  const monthActual: Record<string, number> = {};
  customers.forEach((c) => c._orders.forEach((o) => {
    const k = o.order_date.slice(0, 7);
    monthActual[k] = (monthActual[k] || 0) + o.amount;
  }));

  // Base target tracks actual revenue with a slight over/under each month, so some
  // months over-achieve (clearing backlog) and some under (carrying it) — backlog
  // stays small and realistic instead of snowballing.
  let backlog = 0;
  const monthly: { m: MonthCell; target: number; achieved: number }[] = [];
  for (let i = 0; i < n; i++) {
    const m = months[i];
    const actual = Math.round(monthActual[mk(m.year, m.month0)] || 0);
    const base = Math.round(actual * (0.98 + rnd() * 0.08)); // ~0.98–1.06× of actual
    let target = base + backlog;
    if (m.year === 2025 && m.month0 === 5) target = 30 * L; // Jun'25 anchor (incl. backlog)
    if (m.year === 2026 && m.month0 === 5) target = 40 * L; // Jun'26 anchor (incl. backlog)
    backlog = Math.min(Math.max(0, target - actual), Math.round(actual * 0.4)); // bounded carry
    monthly.push({ m, target, achieved: actual });
  }

  // Per-seller actual revenue (June, current quarter, current FY) from orders.
  const sellerJun: Record<string, number> = {};
  const sellerQ: Record<string, number> = {};
  const sellerFY: Record<string, number> = {};
  customers.forEach((c) => c._orders.forEach((o) => {
    const d = new Date(o.order_date);
    if (o.order_date >= "2026-06-01") sellerJun[c.assigned_to] = (sellerJun[c.assigned_to] || 0) + o.amount;
    if (o.order_date >= "2026-04-01") sellerQ[c.assigned_to] = (sellerQ[c.assigned_to] || 0) + o.amount;
    if (fiscalStartYear(d) === fiscalStartYear(now)) sellerFY[c.assigned_to] = (sellerFY[c.assigned_to] || 0) + o.amount;
  }));

  const monthKey = currentMonthKey(now);
  const quarterKey = fiscalQuarterKey(now);
  const curFY = fiscalStartYear(now);
  const targetRows: any[] = [];

  // Company monthly (all months) — powers backlog story + monthly trend.
  for (const r of monthly) {
    targetRows.push({
      scope: "company", period_type: "monthly",
      period: `${r.m.year}-${String(r.m.month0 + 1).padStart(2, "0")}`,
      owner_id: null, target_amount: r.target, achieved_amount: r.achieved,
    });
  }
  // Company quarterly + annual derived from monthly sums.
  const byFY: Record<number, { t: number; a: number }> = {};
  const byQ: Record<string, { t: number; a: number }> = {};
  for (const r of monthly) {
    byFY[r.m.fyStart] = byFY[r.m.fyStart] || { t: 0, a: 0 };
    byFY[r.m.fyStart].t += r.target; byFY[r.m.fyStart].a += r.achieved;
    const q = `${fiscalYearKeyFromStart(r.m.fyStart)}-Q${Math.floor(((r.m.month0 - 3 + 12) % 12) / 3) + 1}`;
    byQ[q] = byQ[q] || { t: 0, a: 0 };
    byQ[q].t += r.target; byQ[q].a += r.achieved;
  }
  for (const [fy, v] of Object.entries(byFY)) {
    const isCur = Number(fy) === curFY;
    targetRows.push({
      scope: "company", period_type: "annual", period: fiscalYearKeyFromStart(Number(fy)),
      owner_id: null, target_amount: isCur ? 40 * L * 12 : v.t, achieved_amount: v.a,
    });
  }
  for (const [q, v] of Object.entries(byQ)) {
    targetRows.push({ scope: "company", period_type: "quarterly", period: q, owner_id: null, target_amount: v.t, achieved_amount: v.a });
  }

  // Per-seller — targets fixed (Head ₹29L, execs ₹4L/₹4L/₹3L = ₹11L); achieved = actual orders.
  const sellers = [
    { id: headId, mTarget: 29 * L },
    { id: execIds[0], mTarget: 4 * L },
    { id: execIds[1], mTarget: 4 * L },
    { id: execIds[2], mTarget: 3 * L },
  ];
  for (const s of sellers) {
    targetRows.push({ scope: "user", period_type: "monthly", period: monthKey, owner_id: s.id, team: "Sales", target_amount: s.mTarget, achieved_amount: Math.round(sellerJun[s.id] || 0) });
    targetRows.push({ scope: "user", period_type: "quarterly", period: quarterKey, owner_id: s.id, team: "Sales", target_amount: s.mTarget * 3, achieved_amount: Math.round(sellerQ[s.id] || 0) });
    targetRows.push({ scope: "user", period_type: "annual", period: fiscalYearKeyFromStart(curFY), owner_id: s.id, team: "Sales", target_amount: s.mTarget * 12, achieved_amount: Math.round(sellerFY[s.id] || 0) });
  }

  await insertBatched("targets", targetRows);
  console.log(`  inserted ${targetRows.length} targets`);

  // Calibration check
  const recentByCustomer: Record<string, number> = {};
  const cutoff = new Date(now.getFullYear(), now.getMonth() - 2, 1).getTime();
  customers.forEach((c, idx) => {
    const r = c._orders.filter((o) => new Date(o.order_date).getTime() >= cutoff).reduce((s, o) => s + o.amount, 0);
    recentByCustomer[insertedIds[idx]] = r / 3;
  });
  const customersForCalc = customers.map((c, idx) => ({ ...c, id: insertedIds[idx] })) as any;
  const calProj = projectMonth({ customers: customersForCalc, opportunities: oppRows, quotations: quoteRows, monthlyTarget: 40 * L, recentRevenueByCustomer: recentByCustomer });
  const localJun = customers.filter((c) => c._local).reduce((s, c) => s + c._orders.filter((o) => o.order_date >= "2026-06-01").reduce((x, o) => x + o.amount, 0), 0);
  const exportJun = customers.filter((c) => !c._local).reduce((s, c) => s + c._orders.filter((o) => o.order_date >= "2026-06-01").reduce((x, o) => x + o.amount, 0), 0);
  console.log(`  projection June: ₹${(calProj.projectedRevenue / L).toFixed(1)}L vs target ₹40L`);
  console.log(`  June actual so far — local ₹${(localJun / L).toFixed(1)}L · export ₹${(exportJun / L).toFixed(1)}L`);
  console.log(`  FY actuals: ${[curFY - 2, curFY - 1, curFY].map((fy) => `${fiscalYearKeyFromStart(fy)} ₹${(Object.values(byFY).length ? (monthly.filter(r => r.m.fyStart === fy).reduce((s, r) => s + r.achieved, 0) / L).toFixed(0) : 0)}L-tgt`).join(" · ")}`);

  console.log("\n✓ Seed complete.");
  USERS.forEach((u) => console.log(`    ${u.email}  /  ${PASSWORD}   (${u.role})`));
}

main().catch((e) => { console.error("\n✗ Seed failed:", e); process.exit(1); });

/**
 * Seed script — demo users + 500 customers with a 27-month order history
 * (Apr 2024 → current month) across the last two completed Indian financial
 * years plus the current FY-to-date, with correlated opportunities, activities,
 * quotations, comments and historical/current targets.
 *
 * Re-runnable: it clears existing demo data first (no schema reset needed).
 *
 *   npm run seed
 *
 * Requires in .env.local: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.
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
const CR = 10000000;
const INDUSTRIES = [
  "Automotive Components", "Steel & Metal Fabrication", "Industrial Machinery",
  "Textile Manufacturing", "Chemical Processing", "Plastics & Polymers",
  "Electrical Equipment", "Pumps & Valves", "Packaging Materials", "Agro Equipment",
  "Pharmaceutical Machinery", "Food Processing Equipment", "Construction Materials", "Heavy Engineering",
];
const COUNTRIES = [
  "India", "UAE", "Saudi Arabia", "USA", "Germany", "United Kingdom", "Nigeria",
  "Kenya", "Bangladesh", "Vietnam", "Brazil", "South Africa", "Australia", "Indonesia", "Egypt",
];
const STAGES = ["New", "Contacted", "Meeting Scheduled", "Quotation Shared", "Negotiation", "Won", "Lost", "On Hold"] as const;
const ACTIVITY_TYPES = ["Call", "Meeting", "Visit", "Follow-Up", "Quotation", "Order", "Email"] as const;

const USERS = [
  { name: "Admin User", email: "admin@salesos.demo", role: "Admin", team: "Management" },
  { name: "Sandeep Mehra", email: "head@salesos.demo", role: "Sales Head", team: "Management" },
  { name: "Priya Sharma", email: "priya@salesos.demo", role: "Sales Executive", team: "Export-MEA" },
  { name: "Rahul Verma", email: "rahul@salesos.demo", role: "Sales Executive", team: "Export-APAC" },
  { name: "Anita Desai", email: "anita@salesos.demo", role: "Sales Executive", team: "Export-Americas" },
  { name: "Vikram Singh", email: "vikram@salesos.demo", role: "Sales Executive", team: "Domestic" },
] as const;

// Seasonality by calendar month (0=Jan). Stronger at FY-end (Mar) and quarter-ends.
const SEASON = [0.95, 0.9, 1.2, 0.85, 0.9, 1.0, 1.0, 0.95, 1.15, 1.05, 1.1, 1.15];
// YoY growth multiplier keyed by FY start year (relative to FY2024-25).
const FY_GROWTH: Record<number, number> = { 2024: 1.0, 2025: 1.35, 2026: 1.7 };

const rnd = () => faker.number.float();
const pick = <T>(arr: readonly T[]): T => arr[Math.floor(rnd() * arr.length)];
const dayInMonth = (year: number, month0: number): string => {
  const day = 3 + Math.floor(rnd() * 24);
  return new Date(year, month0, day).toISOString().slice(0, 10);
};

interface MonthCell { year: number; month0: number; fyStart: number; }

/** Enumerate months from Apr 2024 up to and including the current month. */
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
  // comments have no FK to customers, so clear explicitly; customers cascade the rest.
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

async function main() {
  const months = buildMonths();
  const now = new Date();
  console.log(`→ Order window: ${months[0].year}-${String(months[0].month0 + 1).padStart(2, "0")} … ${currentMonthKey(now)} (${months.length} months)`);

  console.log("→ Clearing existing demo data...");
  await clearAll();

  console.log("→ Creating demo users...");
  const userIds: Record<string, string> = {};
  for (const u of USERS) userIds[u.email] = await getOrCreateUser(u.email);
  await db.from("profiles").upsert(
    USERS.map((u) => ({ id: userIds[u.email], name: u.name, email: u.email, role: u.role, team: u.team }))
  );
  const execs = USERS.filter((u) => u.role === "Sales Executive").map((u) => userIds[u.email]);

  console.log("→ Generating 500 customers with 27-month order history...");
  type CustSeed = {
    company_name: string; contact_person: string; phone: string; email: string;
    country: string; industry: string; assigned_to: string; category: string;
    last_contact_date: string; last_order_date: string | null; total_revenue: number;
    status: string; health_score: number; health_band: string; notes: string;
    _orders: { amount: number; order_date: string }[];
  };
  const customers: CustSeed[] = [];

  for (let i = 0; i < 500; i++) {
    const roll = rnd();
    const category = roll < 0.52 ? "Regular" : roll < 0.78 ? "Detached" : "New";
    const assigned_to = execs[i % execs.length];

    // Size tier base monthly revenue (industrial/export scale → ~₹250Cr/yr company).
    const tierRoll = rnd();
    const baseMonthly = tierRoll < 0.25 ? 800000 + rnd() * 1200000
      : tierRoll < 0.70 ? 300000 + rnd() * 500000
      : 100000 + rnd() * 200000;
    const custGrowth = 0.9 + rnd() * 0.25;

    const orders: { amount: number; order_date: string }[] = [];

    if (category === "New") {
      const n = rnd() < 0.55 ? 1 + Math.floor(rnd() * 2) : 0;
      for (let k = 0; k < n; k++) {
        const m = months[months.length - 1 - k];
        orders.push({ amount: Math.round(baseMonthly * 0.5 * (0.7 + rnd() * 0.6)), order_date: dayInMonth(m.year, m.month0) });
      }
    } else {
      // Detached: went silent 7-11 months ago (recent lapse, just past the 6-month
      // rule) so last FY still captured most of their orders. Regular: active to date.
      const silenceAgo = category === "Detached" ? 7 + Math.floor(rnd() * 5) : 0;
      const lastActiveIdx = months.length - 1 - silenceAgo;
      const orderProb = category === "Detached" ? 0.7 : 0.82;
      for (let mi = 0; mi <= lastActiveIdx; mi++) {
        const m = months[mi];
        const forceCurrent = category === "Regular" && mi === months.length - 1;
        if (!forceCurrent && rnd() > orderProb) continue;
        let amt = baseMonthly * (FY_GROWTH[m.fyStart] ?? 1) * SEASON[m.month0] * custGrowth * (0.85 + rnd() * 0.3);
        // Detached accounts decline in their final months before going silent.
        if (category === "Detached") {
          const distToSilence = lastActiveIdx - mi;
          if (distToSilence < 4) amt *= [0.5, 0.65, 0.8, 0.92][distToSilence];
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
      company_name: `${faker.company.name()} ${pick(["Industries", "Exports", "Manufacturing", "Engineering", "Pvt Ltd", "Group"])}`,
      contact_person: faker.person.fullName(),
      phone: faker.phone.number({ style: "international" }),
      email: faker.internet.email().toLowerCase(),
      country: pick(COUNTRIES), industry: pick(INDUSTRIES),
      assigned_to, category, last_contact_date, last_order_date: lastOrderDate,
      total_revenue, status: "Active", health_score: score, health_band: band,
      notes: faker.company.catchPhrase(), _orders: orders,
    });
  }

  // Insert customers, get ids back.
  const insertRows = customers.map(({ _orders, ...c }) => c);
  const insertedIds: string[] = [];
  for (let i = 0; i < insertRows.length; i += 200) {
    const { data, error } = await db.from("customers").insert(insertRows.slice(i, i + 200)).select("id");
    if (error) throw new Error(`insert customers: ${error.message}`);
    insertedIds.push(...data!.map((r) => r.id));
  }
  console.log(`  inserted ${insertedIds.length} customers`);

  // Orders
  const orderRows: any[] = [];
  customers.forEach((c, idx) => c._orders.forEach((o) => orderRows.push({ customer_id: insertedIds[idx], amount: o.amount, order_date: o.order_date })));
  await insertBatched("orders", orderRows);
  console.log(`  inserted ${orderRows.length} orders`);

  // Opportunities (built in-memory so we can calibrate targets before inserting)
  const oppRows: any[] = [];
  customers.forEach((c, idx) => {
    const count = c.category !== "Detached"
      ? (rnd() < 0.6 ? 1 : 0) + (rnd() < 0.3 ? 1 : 0)
      : (rnd() < 0.25 ? 1 : 0);
    for (let k = 0; k < count; k++) {
      const stage = c.category === "Detached" ? pick(["New", "Contacted", "On Hold"] as const) : pick(STAGES);
      const prob = { New: 10, Contacted: 20, "Meeting Scheduled": 35, "Quotation Shared": 55, Negotiation: 75, Won: 100, Lost: 0, "On Hold": 15 }[stage];
      oppRows.push({
        customer_id: insertedIds[idx],
        title: `${pick(["Supply of", "Order for", "Contract:", "Repeat order —", "RFQ for"])} ${pick(["valves", "pumps", "machinery", "steel parts", "components", "equipment", "packaging line", "spares"])}`,
        assigned_to: c.assigned_to, stage, value: Math.round(150000 + rnd() * 1050000), probability: prob,
        expected_close_date: dayInMonth(now.getFullYear(), now.getMonth() + Math.floor(rnd() * 4)),
        notes: faker.lorem.sentence(),
      });
    }
  });
  await insertBatched("opportunities", oppRows);
  console.log(`  inserted ${oppRows.length} opportunities`);

  // Quotations
  const quoteRows: any[] = [];
  customers.forEach((c, idx) => {
    if (rnd() < 0.4) quoteRows.push({
      customer_id: insertedIds[idx], amount: Math.round(100000 + rnd() * 900000),
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
    if (rnd() < 0.3) {
      const k = 1 + Math.floor(rnd() * 3);
      for (let j = 0; j < k; j++) commentRows.push({
        entity_type: "customer", entity_id: insertedIds[idx], user_id: pick(execs),
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

  // ---- Targets: calibrate current FY to the projection, historical from actuals ----
  console.log("→ Generating targets (calibrated + historical)...");

  // Trailing 3-month average monthly revenue per customer id.
  const recentByCustomer: Record<string, number> = {};
  const cutoff = new Date(now.getFullYear(), now.getMonth() - 2, 1).getTime();
  customers.forEach((c, idx) => {
    const recent = c._orders.filter((o) => new Date(o.order_date).getTime() >= cutoff).reduce((s, o) => s + o.amount, 0);
    recentByCustomer[insertedIds[idx]] = recent / 3;
  });
  const customersForCalc = customers.map((c, idx) => ({ ...c, id: insertedIds[idx] })) as any;
  const calProj = projectMonth({ customers: customersForCalc, opportunities: oppRows, quotations: quoteRows, monthlyTarget: 0, recentRevenueByCustomer: recentByCustomer });

  // Round company monthly target so projection ≈ 94% of it.
  const roundTo = (v: number, step: number) => Math.max(step, Math.round(v / step) * step);
  const monthlyCompany = roundTo(calProj.projectedRevenue / 0.94, 5 * CR);
  const quarterlyCompany = roundTo(monthlyCompany * 2.9, 5 * CR);
  const annualCompany = roundTo(monthlyCompany * 11.2, 10 * CR);

  // Actuals by FY (company + per exec) from generated orders.
  const fyCompany: Record<number, number> = {};
  const fyExec: Record<number, Record<string, number>> = {};
  customers.forEach((c) => c._orders.forEach((o) => {
    const fy = fiscalStartYear(new Date(o.order_date));
    fyCompany[fy] = (fyCompany[fy] || 0) + o.amount;
    fyExec[fy] = fyExec[fy] || {};
    fyExec[fy][c.assigned_to] = (fyExec[fy][c.assigned_to] || 0) + o.amount;
  }));

  const monthKey = currentMonthKey(now);
  const quarterKey = fiscalQuarterKey(now);
  const curFY = fiscalStartYear(now); // 2026
  const targetRows: any[] = [];

  // Current FY — calibrated, story-driven (mid-period, slightly behind).
  targetRows.push({ scope: "company", period_type: "monthly", period: monthKey, owner_id: null, target_amount: monthlyCompany, achieved_amount: Math.round(monthlyCompany * 0.61) });
  targetRows.push({ scope: "company", period_type: "quarterly", period: quarterKey, owner_id: null, target_amount: quarterlyCompany, achieved_amount: Math.round(quarterlyCompany * 0.84) });
  targetRows.push({ scope: "company", period_type: "annual", period: fiscalYearKeyFromStart(curFY), owner_id: null, target_amount: annualCompany, achieved_amount: Math.round(quarterlyCompany * 0.84) });

  const execList = USERS.filter((x) => x.role === "Sales Executive");
  const ratios = [0.78, 0.63, 0.55, 0.70];
  const monthlyExec = roundTo(monthlyCompany / 4, CR);
  execList.forEach((u, i) => {
    const id = userIds[u.email];
    const ma = Math.round(monthlyExec * ratios[i % ratios.length]);
    targetRows.push({ scope: "user", period_type: "monthly", period: monthKey, owner_id: id, team: u.team, target_amount: monthlyExec, achieved_amount: ma });
    targetRows.push({ scope: "user", period_type: "quarterly", period: quarterKey, owner_id: id, team: u.team, target_amount: roundTo(monthlyExec * 2.9, CR), achieved_amount: Math.round(ma * 2.45) });
    targetRows.push({ scope: "user", period_type: "annual", period: fiscalYearKeyFromStart(curFY), owner_id: id, team: u.team, target_amount: roundTo(monthlyExec * 11.2, CR), achieved_amount: Math.round(ma * 2.45) });
  });

  // Historical completed FYs — achieved from actuals, target back-derived from ~97-103% attainment.
  for (const fy of [curFY - 2, curFY - 1]) {
    const compActual = Math.round(fyCompany[fy] || 0);
    const attain = 0.97 + rnd() * 0.08;
    targetRows.push({ scope: "company", period_type: "annual", period: fiscalYearKeyFromStart(fy), owner_id: null, target_amount: roundTo(compActual / attain, 10 * CR), achieved_amount: compActual });
    execList.forEach((u) => {
      const id = userIds[u.email];
      const ea = Math.round((fyExec[fy]?.[id]) || 0);
      targetRows.push({ scope: "user", period_type: "annual", period: fiscalYearKeyFromStart(fy), owner_id: id, team: u.team, target_amount: roundTo(ea / (0.97 + rnd() * 0.08), CR), achieved_amount: ea });
    });
  }

  await insertBatched("targets", targetRows);
  console.log(`  inserted ${targetRows.length} targets`);
  console.log(`  calibration: projection ${(calProj.projectedRevenue / CR).toFixed(1)}Cr → monthly target ${(monthlyCompany / CR)}Cr`);
  console.log(`  FY actuals: ${[curFY - 2, curFY - 1, curFY].map((fy) => `${fiscalYearKeyFromStart(fy)} ${((fyCompany[fy] || 0) / CR).toFixed(0)}Cr`).join(" · ")}`);

  console.log("\n✓ Seed complete.");
  USERS.forEach((u) => console.log(`    ${u.email}  /  ${PASSWORD}   (${u.role})`));
}

main().catch((e) => { console.error("\n✗ Seed failed:", e); process.exit(1); });

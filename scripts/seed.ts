/**
 * Seed script — creates demo auth users and 500 customers with correlated
 * orders, opportunities, activities, quotations, and targets.
 *
 * Run AFTER applying supabase/schema.sql:
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

faker.seed(20260626); // deterministic data

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}
const db = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const PASSWORD = "Demo@1234";
const INDUSTRIES = [
  "Automotive Components", "Steel & Metal Fabrication", "Industrial Machinery",
  "Textile Manufacturing", "Chemical Processing", "Plastics & Polymers",
  "Electrical Equipment", "Pumps & Valves", "Packaging Materials", "Agro Equipment",
  "Pharmaceutical Machinery", "Food Processing Equipment", "Construction Materials",
  "Heavy Engineering",
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

function daysAgoDate(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}
function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(faker.number.float() * arr.length)];
}

async function getOrCreateUser(email: string): Promise<string> {
  // Try to find an existing user (auth.users survives schema resets).
  const { data: list } = await db.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const existing = list?.users.find((u) => u.email === email);
  if (existing) return existing.id;
  const { data, error } = await db.auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
  });
  if (error || !data.user) throw new Error(`createUser ${email}: ${error?.message}`);
  return data.user.id;
}

async function main() {
  console.log("→ Creating demo users...");
  const userIds: Record<string, string> = {};
  for (const u of USERS) userIds[u.email] = await getOrCreateUser(u.email);

  // profiles
  await db.from("profiles").upsert(
    USERS.map((u) => ({
      id: userIds[u.email],
      name: u.name,
      email: u.email,
      role: u.role,
      team: u.team,
    }))
  );
  const execs = USERS.filter((u) => u.role === "Sales Executive").map((u) => userIds[u.email]);
  console.log(`  created ${USERS.length} users (${execs.length} executives)`);

  console.log("→ Generating 500 customers...");
  type CustSeed = {
    company_name: string; contact_person: string; phone: string; email: string;
    country: string; industry: string; assigned_to: string; category: string;
    last_contact_date: string; last_order_date: string | null; total_revenue: number;
    status: string; health_score: number; health_band: string; notes: string;
    _orders: { amount: number; order_date: string }[];
  };
  const customers: CustSeed[] = [];

  for (let i = 0; i < 500; i++) {
    const roll = faker.number.float();
    // ~52% Regular, ~26% Detached, ~22% New
    const category = roll < 0.52 ? "Regular" : roll < 0.78 ? "Detached" : "New";
    const company = `${faker.company.name()} ${pick(["Industries", "Exports", "Manufacturing", "Engineering", "Pvt Ltd", "Group"])}`;
    const assigned_to = execs[i % execs.length];

    const orders: { amount: number; order_date: string }[] = [];
    let lastOrderDate: string | null = null;

    if (category === "New") {
      // Maybe one tiny order or none.
      if (faker.number.float() < 0.3) {
        const d = daysAgoDate(Math.floor(faker.number.float() * 60));
        orders.push({ amount: Math.round(20000 + faker.number.float() * 80000), order_date: d });
        lastOrderDate = d;
      }
    } else {
      const orderCount = category === "Regular" ? 4 + Math.floor(faker.number.float() * 10) : 2 + Math.floor(faker.number.float() * 6);
      // Regular: last order 0-5 months ago. Detached: 6-22 months ago.
      const lastGapDays = category === "Regular"
        ? Math.floor(faker.number.float() * 150)
        : 185 + Math.floor(faker.number.float() * 480);
      for (let o = 0; o < orderCount; o++) {
        const gap = lastGapDays + o * (30 + Math.floor(faker.number.float() * 60));
        orders.push({
          amount: Math.round(80000 + faker.number.float() * 1200000),
          order_date: daysAgoDate(gap),
        });
      }
      orders.sort((a, b) => (a.order_date < b.order_date ? 1 : -1));
      lastOrderDate = orders[0].order_date;
    }

    const total_revenue = orders.reduce((s, o) => s + o.amount, 0);

    // revenue trend: last 6 months vs prior 6 months
    const now = Date.now();
    const sixM = 1000 * 60 * 60 * 24 * 182;
    const recent = orders.filter((o) => now - new Date(o.order_date).getTime() <= sixM).reduce((s, o) => s + o.amount, 0);
    const prior = orders.filter((o) => {
      const age = now - new Date(o.order_date).getTime();
      return age > sixM && age <= sixM * 2;
    }).reduce((s, o) => s + o.amount, 0);
    const revenueTrend = prior > 0 ? Math.max(-1, Math.min(1, (recent - prior) / prior)) : recent > 0 ? 0.5 : -0.3;
    const orderCount12m = orders.filter((o) => now - new Date(o.order_date).getTime() <= sixM * 2).length;

    const last_contact_date = daysAgoDate(Math.floor(faker.number.float() * (category === "Detached" ? 120 : 40)));
    const { score, band } = healthScore({
      last_order_date: lastOrderDate,
      last_contact_date,
      orderCount12m,
      revenueTrend,
    });

    customers.push({
      company_name: company,
      contact_person: faker.person.fullName(),
      phone: faker.phone.number({ style: "international" }),
      email: faker.internet.email().toLowerCase(),
      country: pick(COUNTRIES),
      industry: pick(INDUSTRIES),
      assigned_to,
      category,
      last_contact_date,
      last_order_date: lastOrderDate,
      total_revenue,
      status: "Active",
      health_score: score,
      health_band: band,
      notes: faker.company.catchPhrase(),
      _orders: orders,
    });
  }

  // Insert customers (strip _orders), get ids back.
  const insertRows = customers.map(({ _orders, ...c }) => c);
  const insertedIds: string[] = [];
  for (let i = 0; i < insertRows.length; i += 200) {
    const batch = insertRows.slice(i, i + 200);
    const { data, error } = await db.from("customers").insert(batch).select("id");
    if (error) throw new Error(`insert customers: ${error.message}`);
    insertedIds.push(...data!.map((r) => r.id));
  }
  console.log(`  inserted ${insertedIds.length} customers`);

  // Orders
  console.log("→ Generating orders...");
  const orderRows: any[] = [];
  customers.forEach((c, idx) => {
    for (const o of c._orders) orderRows.push({ customer_id: insertedIds[idx], amount: o.amount, order_date: o.order_date });
  });
  for (let i = 0; i < orderRows.length; i += 500) await db.from("orders").insert(orderRows.slice(i, i + 500));
  console.log(`  inserted ${orderRows.length} orders`);

  // Opportunities
  console.log("→ Generating opportunities...");
  const oppRows: any[] = [];
  customers.forEach((c, idx) => {
    const openish = c.category !== "Detached";
    const count = openish ? (faker.number.float() < 0.6 ? 1 : 0) + (faker.number.float() < 0.3 ? 1 : 0) : faker.number.float() < 0.25 ? 1 : 0;
    for (let k = 0; k < count; k++) {
      const stage = c.category === "Detached" ? pick(["New", "Contacted", "On Hold"] as const) : pick(STAGES);
      const value = Math.round(150000 + faker.number.float() * 3000000);
      const prob = { New: 10, Contacted: 20, "Meeting Scheduled": 35, "Quotation Shared": 55, Negotiation: 75, Won: 100, Lost: 0, "On Hold": 15 }[stage];
      oppRows.push({
        customer_id: insertedIds[idx],
        title: `${pick(["Supply of", "Order for", "Contract:", "Repeat order —", "RFQ for"])} ${pick(["valves", "pumps", "machinery", "steel parts", "components", "equipment", "packaging line", "spares"])}`,
        assigned_to: c.assigned_to,
        stage,
        value,
        probability: prob,
        expected_close_date: daysAgoDate(-Math.floor(faker.number.float() * 120)),
        notes: faker.lorem.sentence(),
      });
    }
  });
  for (let i = 0; i < oppRows.length; i += 500) await db.from("opportunities").insert(oppRows.slice(i, i + 500));
  console.log(`  inserted ${oppRows.length} opportunities`);

  // Activities
  console.log("→ Generating activities...");
  const actRows: any[] = [];
  customers.forEach((c, idx) => {
    const n = 2 + Math.floor(faker.number.float() * 6);
    for (let k = 0; k < n; k++) {
      const type = pick(ACTIVITY_TYPES);
      actRows.push({
        type,
        user_id: c.assigned_to,
        customer_id: insertedIds[idx],
        activity_date: daysAgoDate(Math.floor(faker.number.float() * 120)),
        notes: `${type} with ${c.contact_person}: ${faker.lorem.sentence()}`,
        outcome: pick(["Positive", "Neutral", "Needs follow-up", "No response", "Interested"]),
      });
    }
  });
  for (let i = 0; i < actRows.length; i += 500) await db.from("activities").insert(actRows.slice(i, i + 500));
  console.log(`  inserted ${actRows.length} activities`);

  // Quotations
  console.log("→ Generating quotations...");
  const quoteRows: any[] = [];
  customers.forEach((c, idx) => {
    if (faker.number.float() < 0.4) {
      quoteRows.push({
        customer_id: insertedIds[idx],
        amount: Math.round(100000 + faker.number.float() * 2000000),
        status: pick(["Draft", "Sent", "Sent", "Accepted", "Rejected"] as const),
        quote_date: daysAgoDate(Math.floor(faker.number.float() * 90)),
      });
    }
  });
  for (let i = 0; i < quoteRows.length; i += 500) await db.from("quotations").insert(quoteRows.slice(i, i + 500));
  console.log(`  inserted ${quoteRows.length} quotations`);

  // Comments (collaboration timeline on a sample of customers)
  console.log("→ Generating comments...");
  const commentRows: any[] = [];
  customers.forEach((c, idx) => {
    if (faker.number.float() < 0.3) {
      const k = 1 + Math.floor(faker.number.float() * 3);
      for (let j = 0; j < k; j++) {
        commentRows.push({
          entity_type: "customer",
          entity_id: insertedIds[idx],
          user_id: pick(execs),
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
    }
  });
  for (let i = 0; i < commentRows.length; i += 500) await db.from("comments").insert(commentRows.slice(i, i + 500));
  console.log(`  inserted ${commentRows.length} comments`);

  // Targets — company + per-exec, monthly/quarterly/annual for current period
  console.log("→ Generating targets...");
  const now = new Date();
  const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const quarterKey = `${now.getFullYear()}-Q${Math.floor(now.getMonth() / 3) + 1}`;
  const yearKey = String(now.getFullYear());

  // Targets are scaled to the seeded data (~₹23-24Cr/month projected company-wide)
  // so the demo tells a coherent story: mid-period, behind pace, small closeable gap.
  const CR = 10000000; // 1 crore in rupees
  const targetRows: any[] = [];
  // Company — monthly ₹25Cr (≈61% achieved), quarterly ₹70Cr (≈86%), annual ₹280Cr (≈49%)
  targetRows.push({ scope: "company", period_type: "monthly", period: monthKey, owner_id: null, target_amount: 25 * CR, achieved_amount: Math.round(15.2 * CR) });
  targetRows.push({ scope: "company", period_type: "quarterly", period: quarterKey, owner_id: null, target_amount: 70 * CR, achieved_amount: Math.round(60.4 * CR) });
  targetRows.push({ scope: "company", period_type: "annual", period: yearKey, owner_id: null, target_amount: 280 * CR, achieved_amount: Math.round(138 * CR) });

  // Per exec — monthly ₹6Cr each, with varied achievement for a realistic team chart.
  const execList = USERS.filter((x) => x.role === "Sales Executive");
  const ratios = [0.78, 0.63, 0.55, 0.70]; // achievement vs monthly target
  execList.forEach((u, i) => {
    const id = userIds[u.email];
    const monthlyTarget = 6 * CR;
    const monthlyAch = Math.round(monthlyTarget * ratios[i % ratios.length]);
    targetRows.push({ scope: "user", period_type: "monthly", period: monthKey, owner_id: id, team: u.team, target_amount: monthlyTarget, achieved_amount: monthlyAch });
    targetRows.push({ scope: "user", period_type: "quarterly", period: quarterKey, owner_id: id, team: u.team, target_amount: 17 * CR, achieved_amount: Math.round(monthlyAch * 4.0) });
    targetRows.push({ scope: "user", period_type: "annual", period: yearKey, owner_id: id, team: u.team, target_amount: 70 * CR, achieved_amount: Math.round(monthlyAch * 9.0) });
  });
  await db.from("targets").insert(targetRows);
  console.log(`  inserted ${targetRows.length} targets`);

  console.log("\n✓ Seed complete.");
  console.log("  Login with any of:");
  USERS.forEach((u) => console.log(`    ${u.email}  /  ${PASSWORD}   (${u.role})`));
}

main().catch((e) => {
  console.error("\n✗ Seed failed:", e);
  process.exit(1);
});

import type { Profile, Customer, Opportunity, Quotation, Target, OrderRow } from "@/lib/types";
import { isManager } from "@/lib/auth";
import { projectMonth, type ProjectionResult } from "@/lib/engines/projection";
import { forecastFromProjection, type ForecastResult } from "@/lib/engines/forecast";
import { detectRisks, type RiskAlert } from "@/lib/engines/risk";
import {
  currentMonthKey, fiscalQuarterKey, fiscalYearKey, fiscalYearKeyFromStart,
  fiscalStartYear, lastNMonths, shortMonthLabel, nextMonthKey, nextMonthDate,
} from "@/lib/utils";
import { STAGE_PROBABILITY } from "@/lib/types";
import { recoveryScore } from "@/lib/engines/recovery";

export interface PeriodTargets {
  monthly: Target | null;
  quarterly: Target | null;
  annual: Target | null;
}

/** Find the right targets for this user/scope for the current period (Indian FY). */
export function selectTargets(profile: Profile, targets: Target[]): PeriodTargets {
  const month = currentMonthKey();
  const quarter = fiscalQuarterKey();
  const year = fiscalYearKey();
  const manager = isManager(profile.role);

  const find = (pt: string, period: string) =>
    targets.find((t) =>
      t.period_type === pt &&
      t.period === period &&
      (manager ? t.scope === "company" : t.scope === "user" && t.owner_id === profile.id)
    ) ?? null;

  return {
    monthly: find("monthly", month),
    quarterly: find("quarterly", quarter),
    annual: find("annual", year),
  };
}

/** Trailing 3-month average monthly revenue per customer id, from order history. */
export function recentRevenueMap(orders: OrderRow[]): Record<string, number> {
  const now = new Date();
  const cutoff = new Date(now.getFullYear(), now.getMonth() - 2, 1).getTime();
  const sums: Record<string, number> = {};
  for (const o of orders) {
    if (!o.customer_id) continue;
    if (new Date(o.order_date).getTime() >= cutoff) {
      sums[o.customer_id] = (sums[o.customer_id] ?? 0) + o.amount;
    }
  }
  for (const k of Object.keys(sums)) sums[k] = sums[k] / 3;
  return sums;
}

export interface MonthPoint { month: string; revenue: number; }

/** Company revenue per month for the last `count` months (for the trend chart). */
export function monthlyRevenueSeries(orders: OrderRow[], count = 24): MonthPoint[] {
  const buckets = new Map<string, number>();
  for (const o of orders) {
    const d = new Date(o.order_date);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    buckets.set(key, (buckets.get(key) ?? 0) + o.amount);
  }
  return lastNMonths(count).map((m) => ({
    month: shortMonthLabel(m.year, m.month0),
    revenue: Math.round(buckets.get(m.key) ?? 0),
  }));
}

/** Raw monthly revenue (chronological) with calendar month index — for ML fitting. */
export function monthlyRevenueRaw(orders: OrderRow[], count = 24): { year: number; month0: number; revenue: number }[] {
  const buckets = new Map<string, number>();
  for (const o of orders) {
    const d = new Date(o.order_date);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    buckets.set(key, (buckets.get(key) ?? 0) + o.amount);
  }
  return lastNMonths(count).map((m) => ({ year: m.year, month0: m.month0, revenue: Math.round(buckets.get(m.key) ?? 0) }));
}

export interface YoYPoint { fy: string; revenue: number; }

/** Revenue by financial year for the last `years` completed/started FYs. */
export function revenueByFiscalYear(orders: OrderRow[], years = 3): YoYPoint[] {
  const sums = new Map<number, number>();
  for (const o of orders) {
    const fy = fiscalStartYear(new Date(o.order_date));
    sums.set(fy, (sums.get(fy) ?? 0) + o.amount);
  }
  const cur = fiscalStartYear(new Date());
  const out: YoYPoint[] = [];
  for (let i = years - 1; i >= 0; i--) {
    const fy = cur - i;
    out.push({ fy: fiscalYearKeyFromStart(fy), revenue: Math.round(sums.get(fy) ?? 0) });
  }
  return out;
}

// ---- Next-month projection (per-user planning sheet) ----

export interface ProjectionRow {
  id: string;
  company: string;
  category: string;
  owner: string;
  ownerId: string;
  country: string;
  expected: number;
  basis: string;
}

/** Per-customer expected revenue for the month at `refDate` (run-rate + recovery + weighted pipeline). */
export function projectionRows(
  customers: Customer[],
  opportunities: Opportunity[],
  recent: Record<string, number>,
  refDate: Date,
  nameById: Map<string, string>
): ProjectionRow[] {
  const refTime = refDate.getTime();
  const oppByCust = new Map<string, Opportunity[]>();
  for (const o of opportunities) {
    if (!o.customer_id) continue;
    const arr = oppByCust.get(o.customer_id) ?? [];
    arr.push(o);
    oppByCust.set(o.customer_id, arr);
  }
  return customers.map((c) => {
    let expected = 0;
    const basis: string[] = [];
    if (c.category === "Regular") {
      const v = (recent[c.id] ?? 0) * (0.6 + (c.health_score / 100) * 0.4);
      if (v > 0) { expected += v; basis.push("run-rate"); }
    } else if (c.category === "Detached") {
      const r = recoveryScore(c);
      const v = (r.potentialRevenue / 12) * r.probability;
      if (v > 0) { expected += v; basis.push("recovery"); }
    } else {
      expected += 40000 * (c.health_score / 100);
      basis.push("new");
    }
    for (const o of oppByCust.get(c.id) ?? []) {
      if (o.stage === "Won" || o.stage === "Lost") continue;
      const monthsOut = (new Date(o.expected_close_date ?? "").getTime() - refTime) / (1000 * 60 * 60 * 24 * 30.44);
      const cf = isNaN(monthsOut) ? 0.4 : monthsOut <= 1 ? 0.9 : monthsOut <= 2 ? 0.5 : monthsOut <= 3 ? 0.3 : 0.15;
      const v = o.value * STAGE_PROBABILITY[o.stage] * cf;
      if (v > 0) { expected += v; if (!basis.includes("pipeline")) basis.push("pipeline"); }
    }
    return {
      id: c.id, company: c.company_name, category: c.category,
      owner: nameById.get(c.assigned_to ?? "") ?? "—", ownerId: c.assigned_to ?? "",
      country: c.country ?? "—", expected: Math.round(expected), basis: basis.join(", ") || "—",
    };
  }).filter((r) => r.expected > 0).sort((a, b) => b.expected - a.expected);
}

export interface NextMonthPlan {
  monthKey: string;
  projection: ProjectionResult;
  target: number;
  rows: ProjectionRow[];
}

function nextMonthTarget(profile: Profile, targets: Target[], monthKey: string): number {
  const manager = isManager(profile.role);
  const t = targets.find((x) =>
    x.period_type === "monthly" && x.period === monthKey &&
    (manager ? x.scope === "company" : x.scope === "user" && x.owner_id === profile.id)
  );
  if (t) return t.target_amount;
  // Fallback: grow this month's target ~5% if next month isn't seeded yet.
  const cur = selectTargets(profile, targets).monthly?.target_amount ?? 0;
  return Math.round(cur * 1.05);
}

export function buildNextMonthPlan(
  profile: Profile,
  customers: Customer[],
  opportunities: Opportunity[],
  quotations: Quotation[],
  recent: Record<string, number>,
  allTargets: Target[],
  nameById: Map<string, string>
): NextMonthPlan {
  const refDate = nextMonthDate();
  const monthKey = nextMonthKey();
  const target = nextMonthTarget(profile, allTargets, monthKey);
  const projection = projectMonth({
    customers, opportunities, quotations, monthlyTarget: target,
    recentRevenueByCustomer: recent, referenceDate: refDate,
  });
  const rows = projectionRows(customers, opportunities, recent, refDate, nameById);
  return { monthKey, projection, target, rows };
}

export interface DashboardData {
  projection: ProjectionResult;
  forecastQuarter: ForecastResult;
  targets: PeriodTargets;
  risks: RiskAlert[];
  customers: Customer[];
  opportunities: Opportunity[];
}

export function buildAnalytics(
  profile: Profile,
  customers: Customer[],
  opportunities: Opportunity[],
  quotations: Quotation[],
  allTargets: Target[],
  recentRevenueByCustomer?: Record<string, number>
): DashboardData {
  const targets = selectTargets(profile, allTargets);
  const monthlyTarget = targets.monthly?.target_amount ?? 0;

  const projection = projectMonth({ customers, opportunities, quotations, monthlyTarget, recentRevenueByCustomer });

  const quarterlyTarget = targets.quarterly?.target_amount ?? monthlyTarget * 3;
  // Forecast is a run-rate projection over the horizon, compared to target.
  const forecastQuarter = forecastFromProjection(projection, "Quarterly", quarterlyTarget, 0);

  const risks = detectRisks(customers, opportunities, { targetGap: projection.targetGap });

  return { projection, forecastQuarter, targets, risks, customers, opportunities };
}

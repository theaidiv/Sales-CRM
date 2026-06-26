import type { Profile, Customer, Opportunity, Quotation, Target, OrderRow } from "@/lib/types";
import { isManager } from "@/lib/auth";
import { projectMonth, type ProjectionResult } from "@/lib/engines/projection";
import { forecastFromProjection, type ForecastResult } from "@/lib/engines/forecast";
import { detectRisks, type RiskAlert } from "@/lib/engines/risk";
import {
  currentMonthKey, fiscalQuarterKey, fiscalYearKey, fiscalYearKeyFromStart,
  fiscalStartYear, lastNMonths, shortMonthLabel,
} from "@/lib/utils";

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

import type { Profile, Customer, Opportunity, Quotation, Target } from "@/lib/types";
import { isManager } from "@/lib/auth";
import { projectMonth, type ProjectionResult } from "@/lib/engines/projection";
import { forecastFromProjection, type ForecastResult } from "@/lib/engines/forecast";
import { detectRisks, type RiskAlert } from "@/lib/engines/risk";
import { currentMonthKey, currentQuarterKey, currentYearKey } from "@/lib/utils";

export interface PeriodTargets {
  monthly: Target | null;
  quarterly: Target | null;
  annual: Target | null;
}

/** Find the right targets for this user/scope for the current period. */
export function selectTargets(profile: Profile, targets: Target[]): PeriodTargets {
  const month = currentMonthKey();
  const quarter = currentQuarterKey();
  const year = currentYearKey();
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
  allTargets: Target[]
): DashboardData {
  const targets = selectTargets(profile, allTargets);
  const monthlyTarget = targets.monthly?.target_amount ?? 0;

  const projection = projectMonth({ customers, opportunities, quotations, monthlyTarget });

  const quarterlyTarget = targets.quarterly?.target_amount ?? monthlyTarget * 3;
  const quarterlyAchieved = targets.quarterly?.achieved_amount ?? 0;
  const forecastQuarter = forecastFromProjection(projection, "Quarterly", quarterlyTarget, quarterlyAchieved);

  const risks = detectRisks(customers, opportunities, { targetGap: projection.targetGap });

  return { projection, forecastQuarter, targets, risks, customers, opportunities };
}

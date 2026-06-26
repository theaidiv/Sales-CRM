import type { Customer, Opportunity, Quotation } from "@/lib/types";
import { STAGE_PROBABILITY } from "@/lib/types";
import { recoveryScore } from "@/lib/engines/recovery";
import { monthsAgo } from "@/lib/utils";

export interface ProjectionBreakdown {
  regular: number;
  detached: number;
  opportunities: number;
  quotations: number;
  newCustomers: number;
}

export interface ProjectionResult {
  projectedRevenue: number;
  breakdown: ProjectionBreakdown;
  target: number;
  targetGap: number;
  confidence: number; // 0..100
  achievementPct: number;
}

export interface ProjectionInput {
  customers: Customer[];
  opportunities: Opportunity[];
  quotations: Quotation[];
  monthlyTarget: number;
  /** Trailing ~3-month average monthly revenue per customer id (from real order history). */
  recentRevenueByCustomer?: Record<string, number>;
}

/**
 * Monthly projection: expected revenue from regular run-rate, detached recovery,
 * weighted open opportunities, pending quotations, and new-customer estimate.
 */
export function projectMonth(input: ProjectionInput): ProjectionResult {
  const { customers, opportunities, quotations, monthlyTarget, recentRevenueByCustomer } = input;

  // Regular customers: monthly run-rate from real trailing order history when
  // available, otherwise a smoothed estimate from lifetime revenue.
  let regular = 0;
  let newCustomers = 0;
  let detached = 0;
  for (const c of customers) {
    if (c.category === "Regular") {
      const trailing = recentRevenueByCustomer?.[c.id];
      const runRate =
        trailing !== undefined && trailing > 0
          ? trailing
          : c.total_revenue / Math.min(Math.max(monthsAgo(c.last_order_date), 1) + 12, 24);
      regular += runRate * (0.6 + (c.health_score / 100) * 0.4);
    } else if (c.category === "New") {
      // New customers: small expected conversion contribution.
      newCustomers += 40000 * (c.health_score / 100);
    } else if (c.category === "Detached") {
      const r = recoveryScore(c);
      // Conservative: you only re-activate a small, probability-weighted slice of
      // detached customers in any given month — not the full quarterly potential.
      detached += (r.potentialRevenue / 12) * r.probability;
    }
  }

  // Open opportunities expected to close: value * stage probability * close-window factor.
  let oppRevenue = 0;
  for (const o of opportunities) {
    if (o.stage === "Won" || o.stage === "Lost") continue;
    const closeFactor = closeWindowFactor(o.expected_close_date);
    oppRevenue += o.value * STAGE_PROBABILITY[o.stage] * closeFactor;
  }

  // Pending (sent) quotations: moderate conversion expectation.
  let quoteRevenue = 0;
  for (const q of quotations) {
    if (q.status === "Sent") quoteRevenue += q.amount * 0.4;
  }

  const breakdown: ProjectionBreakdown = {
    regular: Math.round(regular),
    detached: Math.round(detached),
    opportunities: Math.round(oppRevenue),
    quotations: Math.round(quoteRevenue),
    newCustomers: Math.round(newCustomers),
  };

  const projectedRevenue =
    breakdown.regular +
    breakdown.detached +
    breakdown.opportunities +
    breakdown.quotations +
    breakdown.newCustomers;

  const targetGap = monthlyTarget - projectedRevenue;
  const achievementPct = monthlyTarget > 0 ? (projectedRevenue / monthlyTarget) * 100 : 0;

  // Confidence: higher when the bulk of projection comes from stable sources.
  const stableShare =
    projectedRevenue > 0
      ? (breakdown.regular + breakdown.quotations) / projectedRevenue
      : 0;
  const coverage = monthlyTarget > 0 ? Math.min(projectedRevenue / monthlyTarget, 1) : 0.5;
  const confidence = Math.round(45 + stableShare * 35 + coverage * 20);

  return {
    projectedRevenue: Math.round(projectedRevenue),
    breakdown,
    target: monthlyTarget,
    targetGap: Math.round(targetGap),
    confidence: Math.max(0, Math.min(100, confidence)),
    achievementPct: Math.round(achievementPct),
  };
}

/** Opportunities closing this month count fully; further out are discounted. */
function closeWindowFactor(expected: string | null): number {
  if (!expected) return 0.4;
  const m = monthsAgo(expected); // negative if in the future
  if (m >= 0) return 0.9; // overdue but still open
  const monthsOut = -m;
  if (monthsOut <= 1) return 0.9;
  if (monthsOut <= 2) return 0.5;
  if (monthsOut <= 3) return 0.3;
  return 0.15;
}

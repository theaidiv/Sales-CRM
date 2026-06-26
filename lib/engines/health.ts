import type { Customer, HealthBand } from "@/lib/types";
import { monthsAgo } from "@/lib/utils";

export interface HealthInput {
  last_order_date: string | null;
  last_contact_date: string | null;
  orderCount12m: number;
  revenueTrend: number; // -1..1, recent vs prior period
}

/**
 * Customer health score 0-100 from recency, frequency, revenue trend, engagement.
 * Pure + deterministic so it can run client- or server-side and be unit tested.
 */
export function healthScore(input: HealthInput): { score: number; band: HealthBand } {
  const orderRecency = monthsAgo(input.last_order_date);
  const contactRecency = monthsAgo(input.last_contact_date);

  // Recency: full marks if ordered within 1 month, decaying to 0 by 9 months.
  const recencyScore = clamp(1 - (orderRecency - 1) / 8) * 35;

  // Frequency: 6+ orders in 12m is excellent.
  const frequencyScore = clamp(input.orderCount12m / 6) * 25;

  // Revenue trend: -1..1 mapped to 0..20.
  const trendScore = ((clamp(input.revenueTrend, -1, 1) + 1) / 2) * 20;

  // Engagement: contacted within 1 month is best, decaying by 4 months.
  const engagementScore = clamp(1 - (contactRecency - 0.5) / 3.5) * 20;

  const score = Math.round(recencyScore + frequencyScore + trendScore + engagementScore);

  let band: HealthBand;
  if (orderRecency > 6) band = "Detached Risk";
  else if (score >= 70) band = "Healthy";
  else if (score >= 45) band = "Stable";
  else band = "At Risk";

  return { score: clampInt(score, 0, 100), band };
}

function clamp(n: number, lo = 0, hi = 1): number {
  return Math.max(lo, Math.min(hi, n));
}
function clampInt(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, Math.round(n)));
}

/** The 6-month detach rule. */
export function deriveCategory(
  current: Customer["category"],
  last_order_date: string | null
): Customer["category"] {
  if (last_order_date === null) return current === "Regular" ? "Detached" : "New";
  return monthsAgo(last_order_date) > 6 ? "Detached" : "Regular";
}

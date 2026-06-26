import type { Customer } from "@/lib/types";
import { monthsAgo } from "@/lib/utils";

export interface RecoveryResult {
  probability: number; // 0..1
  potentialRevenue: number;
  priority: "High" | "Medium" | "Low";
  priorityScore: number;
}

/**
 * Detached-customer recovery scoring. Higher historical revenue + more recent
 * lapse + healthier prior engagement => higher recovery probability.
 */
export function recoveryScore(c: Customer): RecoveryResult {
  const lapse = monthsAgo(c.last_order_date); // months since last order
  // Recovery probability decays the longer they've been gone.
  const recencyFactor = clamp(1 - (lapse - 6) / 18); // 6m => 1.0, 24m => ~0.0
  const valueFactor = clamp(c.total_revenue / 5000000); // ₹50L caps the value weight
  const engagementFactor = clamp(c.health_score / 100);

  const probability = clamp(
    0.15 + recencyFactor * 0.45 + valueFactor * 0.25 + engagementFactor * 0.15
  );

  // Potential = a fraction of historical annualised revenue.
  const monthlyHistorical = c.total_revenue / Math.max(lapse, 6);
  const potentialRevenue = Math.round(monthlyHistorical * 3); // next-quarter potential

  const priorityScore = Math.round(probability * potentialRevenue);
  let priority: RecoveryResult["priority"] = "Low";
  if (priorityScore > 600000) priority = "High";
  else if (priorityScore > 200000) priority = "Medium";

  return { probability, potentialRevenue, priority, priorityScore };
}

function clamp(n: number, lo = 0, hi = 1): number {
  return Math.max(lo, Math.min(hi, n));
}

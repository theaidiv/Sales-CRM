import type { Customer, Opportunity } from "@/lib/types";
import { monthsAgo, daysAgo } from "@/lib/utils";

export interface RiskAlert {
  id: string;
  severity: "High" | "Medium" | "Low";
  type: "Inactive Customer" | "Stalled Opportunity" | "Health Decline" | "Target Risk";
  title: string;
  detail: string;
  entityId: string;
  entityType: "customer" | "opportunity";
  revenueAtRisk: number;
}

/** Detect revenue risk across customers and opportunities. */
export function detectRisks(
  customers: Customer[],
  opportunities: Opportunity[],
  opts: { targetGap?: number } = {}
): RiskAlert[] {
  const alerts: RiskAlert[] = [];

  for (const c of customers) {
    const orderLapse = monthsAgo(c.last_order_date);

    // Customers sliding toward detachment (4-6 months, not yet detached).
    if (c.category === "Regular" && orderLapse >= 4 && orderLapse <= 6) {
      alerts.push({
        id: `risk-inactive-${c.id}`,
        severity: orderLapse >= 5.5 ? "High" : "Medium",
        type: "Inactive Customer",
        title: `${c.company_name} going quiet`,
        detail: `No order in ${orderLapse.toFixed(1)} months. Will auto-detach at 6 months.`,
        entityId: c.id,
        entityType: "customer",
        revenueAtRisk: Math.round(c.total_revenue * 0.3),
      });
    }

    if (c.health_band === "At Risk") {
      alerts.push({
        id: `risk-health-${c.id}`,
        severity: "Medium",
        type: "Health Decline",
        title: `${c.company_name} health declining`,
        detail: `Health score ${c.health_score}/100 — engagement and order cadence slipping.`,
        entityId: c.id,
        entityType: "customer",
        revenueAtRisk: Math.round(c.total_revenue * 0.2),
      });
    }
  }

  for (const o of opportunities) {
    if (o.stage === "Won" || o.stage === "Lost") continue;
    const ageDays = daysAgo(o.created_at);
    const stale = ageDays > 45 && o.value > 100000;
    if (stale) {
      alerts.push({
        id: `risk-stalled-${o.id}`,
        severity: o.value > 1000000 ? "High" : "Medium",
        type: "Stalled Opportunity",
        title: `"${o.title}" stalled`,
        detail: `${Math.round(ageDays)} days in ${o.stage} with no progression.`,
        entityId: o.id,
        entityType: "opportunity",
        revenueAtRisk: Math.round(o.value),
      });
    }
  }

  if (opts.targetGap && opts.targetGap > 0) {
    alerts.push({
      id: "risk-target-gap",
      severity: "High",
      type: "Target Risk",
      title: "Projected revenue below target",
      detail: `Current projection leaves a gap to this month's target.`,
      entityId: "target",
      entityType: "customer",
      revenueAtRisk: Math.round(opts.targetGap),
    });
  }

  const order = { High: 0, Medium: 1, Low: 2 };
  return alerts.sort(
    (a, b) => order[a.severity] - order[b.severity] || b.revenueAtRisk - a.revenueAtRisk
  );
}

import type { Customer, Opportunity } from "@/lib/types";
import { STAGE_PROBABILITY } from "@/lib/types";
import { recoveryScore } from "@/lib/engines/recovery";
import { monthsAgo, daysAgo } from "@/lib/utils";

export interface ActionItem {
  id: string;
  kind: "Call" | "Meeting" | "Follow-Up" | "Visit";
  title: string;
  reason: string;
  customerId: string | null;
  opportunityId: string | null;
  potentialRevenue: number;
  priorityScore: number;
}

/**
 * Daily action engine: rank recommended calls/meetings/follow-ups/visits by a
 * blend of revenue potential, risk, and recency.
 */
export function dailyActions(
  customers: Customer[],
  opportunities: Opportunity[],
  limit = 12
): ActionItem[] {
  const items: ActionItem[] = [];
  const custById = new Map(customers.map((c) => [c.id, c]));

  // Hot opportunities — advance the ones most likely to close for the most money.
  for (const o of opportunities) {
    if (o.stage === "Won" || o.stage === "Lost") continue;
    const prob = STAGE_PROBABILITY[o.stage];
    const expected = o.value * prob;
    const kind =
      o.stage === "Negotiation" || o.stage === "Quotation Shared"
        ? "Follow-Up"
        : o.stage === "Meeting Scheduled"
        ? "Meeting"
        : "Call";
    items.push({
      id: `act-opp-${o.id}`,
      kind,
      title: `${kind} on "${o.title}"`,
      reason: `${o.stage} · ${Math.round(prob * 100)}% close likelihood`,
      customerId: o.customer_id,
      opportunityId: o.id,
      potentialRevenue: Math.round(expected),
      priorityScore: Math.round(expected * (1 + (daysAgo(o.created_at) > 30 ? 0.3 : 0))),
    });
  }

  // Detached customers worth recovering.
  for (const c of customers) {
    if (c.category !== "Detached") continue;
    const r = recoveryScore(c);
    if (r.priority === "Low") continue;
    items.push({
      id: `act-recover-${c.id}`,
      kind: r.priorityScore > 600000 ? "Visit" : "Call",
      title: `Reactivate ${c.company_name}`,
      reason: `Detached ${monthsAgo(c.last_order_date).toFixed(0)}m · ${Math.round(
        r.probability * 100
      )}% recovery`,
      customerId: c.id,
      opportunityId: null,
      potentialRevenue: r.potentialRevenue,
      priorityScore: r.priorityScore,
    });
  }

  // At-risk regular customers needing a touch.
  for (const c of customers) {
    if (c.category === "Regular" && (c.health_band === "At Risk" || monthsAgo(c.last_order_date) >= 4)) {
      items.push({
        id: `act-retain-${c.id}`,
        kind: "Follow-Up",
        title: `Check in with ${c.company_name}`,
        reason: `Health ${c.health_score}/100 · ${monthsAgo(c.last_order_date).toFixed(0)}m since order`,
        customerId: c.id,
        opportunityId: null,
        potentialRevenue: Math.round(c.total_revenue * 0.25),
        priorityScore: Math.round(c.total_revenue * 0.25),
      });
    }
  }

  return items.sort((a, b) => b.priorityScore - a.priorityScore).slice(0, limit);
}

export interface TargetAdvice {
  gap: number;
  achievementPct: number;
  recommendations: string[];
}

/**
 * Target Achievement Advisor: given a salesperson's gap and their pipeline,
 * recommend concrete actions to close it.
 */
export function targetAdvisor(
  gap: number,
  achievementPct: number,
  customers: Customer[],
  opportunities: Opportunity[]
): TargetAdvice {
  const recs: string[] = [];

  const closable = opportunities
    .filter((o) => o.stage === "Negotiation" || o.stage === "Quotation Shared")
    .sort((a, b) => b.value * STAGE_PROBABILITY[b.stage] - a.value * STAGE_PROBABILITY[a.stage])
    .slice(0, 3);
  for (const o of closable) {
    recs.push(`Close "${o.title}" (${o.stage}) — worth ${Math.round(o.value).toLocaleString("en-IN")}.`);
  }

  const recover = customers
    .filter((c) => c.category === "Detached")
    .map((c) => ({ c, r: recoveryScore(c) }))
    .filter((x) => x.r.priority !== "Low")
    .sort((a, b) => b.r.priorityScore - a.r.priorityScore)
    .slice(0, 2);
  for (const { c, r } of recover) {
    recs.push(`Reactivate ${c.company_name} — ${Math.round(r.probability * 100)}% recovery, ~${r.potentialRevenue.toLocaleString("en-IN")} potential.`);
  }

  if (recs.length === 0) {
    recs.push("Pipeline looks healthy — keep advancing meeting-stage opportunities and log activity daily.");
  }

  return { gap, achievementPct, recommendations: recs };
}

import type { Customer, Opportunity } from "@/lib/types";
import { STAGE_PROBABILITY } from "@/lib/types";
import { daysAgo, monthsAgo } from "@/lib/utils";

export interface LeadScore {
  score: number; // 0-100 predicted win likelihood
  band: "Hot" | "Warm" | "Cold";
  factors: { label: string; impact: "up" | "down" }[];
}

const sigmoid = (z: number) => 1 / (1 + Math.exp(-z));

/**
 * Logistic-style conversion model. Blends pipeline stage, account health,
 * order recency, deal age and value-fit into a calibrated win probability.
 */
export function scoreLead(o: Opportunity, customer?: Customer): LeadScore {
  if (o.stage === "Won") return { score: 100, band: "Hot", factors: [{ label: "Already won", impact: "up" }] };
  if (o.stage === "Lost") return { score: 0, band: "Cold", factors: [{ label: "Marked lost", impact: "down" }] };

  const stageP = STAGE_PROBABILITY[o.stage]; // 0..1
  const health = (customer?.health_score ?? 50) / 100; // 0..1
  const recency = customer ? Math.max(0, 1 - monthsAgo(customer.last_order_date) / 9) : 0.4; // recent order => warm
  const age = daysAgo(o.created_at); // open deal age
  const ageFactor = Math.min(1, age / 60); // older than ~60d => stale
  const valueFit = 1 - Math.min(1, o.value / 1500000) * 0.4; // very large deals slightly harder

  // Logistic combination (weights hand-calibrated for sensible spread).
  const z = -1.2 + 3.4 * stageP + 1.3 * health + 1.1 * recency - 1.4 * ageFactor + 0.6 * valueFit;
  const score = Math.round(sigmoid(z) * 100);

  const factors: { label: string; impact: "up" | "down" }[] = [];
  if (stageP >= 0.55) factors.push({ label: "Advanced stage", impact: "up" });
  if (health >= 0.7) factors.push({ label: "Healthy account", impact: "up" });
  else if (health < 0.45) factors.push({ label: "Weak account health", impact: "down" });
  if (recency >= 0.6) factors.push({ label: "Recent orders", impact: "up" });
  if (ageFactor > 0.7) factors.push({ label: "Deal going stale", impact: "down" });
  if (o.value > 1200000) factors.push({ label: "Large deal size", impact: "down" });
  if (factors.length === 0) factors.push({ label: "Mid-funnel momentum", impact: "up" });

  const band: LeadScore["band"] = score >= 65 ? "Hot" : score >= 40 ? "Warm" : "Cold";
  return { score, band, factors: factors.slice(0, 4) };
}

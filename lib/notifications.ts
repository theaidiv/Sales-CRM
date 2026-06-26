import type { Customer, Opportunity } from "@/lib/types";
import { detectRisks } from "@/lib/engines/risk";
import { recoveryScore } from "@/lib/engines/recovery";
import { daysAgo } from "@/lib/utils";

export type NotifIcon = "risk" | "recover" | "stall" | "health" | "followup";

export interface AppNotification {
  id: string;
  icon: NotifIcon;
  severity: "High" | "Medium" | "Low";
  title: string;
  detail: string;
  href: string;
}

/** Build a relevant, prioritized notification feed from the user's scoped data. */
export function buildNotifications(customers: Customer[], opportunities: Opportunity[]): AppNotification[] {
  const out: AppNotification[] = [];

  // Revenue risks (inactive customers, stalled opps, health decline).
  for (const r of detectRisks(customers, opportunities).slice(0, 8)) {
    out.push({
      id: r.id,
      icon: r.type === "Stalled Opportunity" ? "stall" : r.type === "Health Decline" ? "health" : "risk",
      severity: r.severity,
      title: r.title,
      detail: r.detail,
      href: r.entityType === "customer" ? `/customers/${r.entityId}` : "/leads",
    });
  }

  // Top detached customers to recover.
  const recover = customers
    .filter((c) => c.category === "Detached")
    .map((c) => ({ c, r: recoveryScore(c) }))
    .filter((x) => x.r.priority !== "Low")
    .sort((a, b) => b.r.priorityScore - a.r.priorityScore)
    .slice(0, 4);
  for (const { c, r } of recover) {
    out.push({
      id: `recover-${c.id}`,
      icon: "recover",
      severity: r.priority,
      title: `Recover ${c.company_name}`,
      detail: `${Math.round(r.probability * 100)}% recovery chance · potential revenue ${Math.round(r.potentialRevenue / 100000)}L`,
      href: `/customers/${c.id}`,
    });
  }

  const order = { High: 0, Medium: 1, Low: 2 };
  return out.sort((a, b) => order[a.severity] - order[b.severity]).slice(0, 12);
}

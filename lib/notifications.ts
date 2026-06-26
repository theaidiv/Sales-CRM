import type { Customer, Opportunity, Activity, Profile } from "@/lib/types";
import { detectRisks } from "@/lib/engines/risk";
import { recoveryScore } from "@/lib/engines/recovery";
import { dailyActions } from "@/lib/engines/actions";
import { inr, fmtDate } from "@/lib/utils";

export type NotifIcon = "risk" | "recover" | "stall" | "health" | "followup" | "won" | "summary" | "team";

export interface AppNotification {
  id: string;
  icon: NotifIcon;
  severity: "High" | "Medium" | "Low";
  title: string;
  detail: string;
  href: string;
}

export interface NotifInput {
  profile: Profile;
  customers: Customer[];
  opportunities: Opportunity[];
  activities: Activity[];
  profiles: Profile[];
}

/** Role-aware notification feed: Admin / Sales Head / Sales Executive each get
 *  the alerts that matter to them. */
export function buildNotifications({ profile, customers, opportunities, activities, profiles }: NotifInput): AppNotification[] {
  const role = profile.role;
  const nameById = new Map(profiles.map((p) => [p.id, p.name]));
  const custName = new Map(customers.map((c) => [c.id, c.company_name]));
  const out: AppNotification[] = [];

  if (role === "Admin") {
    // Deals won
    const won = opportunities.filter((o) => o.stage === "Won").sort((a, b) => b.value - a.value).slice(0, 4);
    for (const o of won) {
      out.push({ id: `won-${o.id}`, icon: "won", severity: "Low", title: `Deal won — ${custName.get(o.customer_id ?? "") ?? "account"}`, detail: `${o.title} · ${inr(o.value)} closed`, href: `/leads/${o.id}` });
    }
    // Daily/operational summary
    const newLeads = opportunities.filter((o) => o.stage === "New" || o.stage === "Contacted").length;
    out.push({ id: "summary", icon: "summary", severity: "Medium", title: "Operations summary", detail: `${activities.length} recent activities · ${newLeads} new/active leads · ${customers.length} accounts`, href: "/dashboard" });
    out.push({ id: "newcust", icon: "team", severity: "Low", title: "New customers added", detail: `${customers.filter((c) => c.category === "New").length} new accounts in the system`, href: "/customers" });
    // System-wide risks
    for (const r of detectRisks(customers, opportunities).filter((r) => r.severity === "High").slice(0, 3)) {
      out.push({ id: r.id, icon: "risk", severity: "High", title: r.title, detail: r.detail, href: r.entityType === "customer" ? `/customers/${r.entityId}` : "/leads" });
    }
  } else if (role === "Sales Head") {
    // What the team is doing
    for (const a of activities.slice(0, 6)) {
      out.push({ id: `act-${a.id}`, icon: "team", severity: "Low", title: `${nameById.get(a.user_id ?? "") ?? "Team"} · ${a.type}`, detail: `${custName.get(a.customer_id ?? "") ?? ""} — ${(a.notes ?? "").slice(0, 60)} (${fmtDate(a.activity_date)})`, href: a.customer_id ? `/customers/${a.customer_id}` : "/activities" });
    }
    // Team risks + recovery
    for (const r of detectRisks(customers, opportunities).slice(0, 4)) {
      out.push({ id: r.id, icon: r.type === "Stalled Opportunity" ? "stall" : "risk", severity: r.severity, title: r.title, detail: r.detail, href: r.entityType === "customer" ? `/customers/${r.entityId}` : "/leads" });
    }
  } else {
    // Sales Executive — things that help them act
    for (const a of dailyActions(customers, opportunities, 5)) {
      out.push({ id: a.id, icon: "followup", severity: "Medium", title: a.title, detail: a.reason, href: a.customerId ? `/customers/${a.customerId}` : "/recommendations" });
    }
    const recover = customers.filter((c) => c.category === "Detached").map((c) => ({ c, r: recoveryScore(c) })).filter((x) => x.r.priority !== "Low").sort((a, b) => b.r.priorityScore - a.r.priorityScore).slice(0, 3);
    for (const { c, r } of recover) {
      out.push({ id: `recover-${c.id}`, icon: "recover", severity: r.priority, title: `Recover ${c.company_name}`, detail: `${Math.round(r.probability * 100)}% recovery · potential ${inr(r.potentialRevenue)}`, href: `/customers/${c.id}` });
    }
    for (const r of detectRisks(customers, opportunities).filter((r) => r.type === "Stalled Opportunity").slice(0, 2)) {
      out.push({ id: r.id, icon: "stall", severity: r.severity, title: r.title, detail: r.detail, href: "/leads" });
    }
  }

  const order = { High: 0, Medium: 1, Low: 2 };
  return out.sort((a, b) => order[a.severity] - order[b.severity]).slice(0, 14);
}

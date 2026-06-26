import { requireProfile } from "@/lib/auth";
import { getAnalyticsBundle } from "@/lib/data";
import { dailyActions, targetAdvisor } from "@/lib/engines/actions";
import { recoveryScore } from "@/lib/engines/recovery";
import { PageHeader, Card, CardHeader, Badge, AiCard, Stat } from "@/components/ui";
import { AiInsight } from "@/components/AiInsight";
import { inr, pct } from "@/lib/utils";
import { Phone, Users, CheckCircle2, MapPin, AlertTriangle } from "lucide-react";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const KIND_ICON: Record<string, any> = {
  Call: Phone, Meeting: Users, "Follow-Up": CheckCircle2, Visit: MapPin,
};

export default async function RecommendationsPage() {
  const profile = await requireProfile();
  const { projection, risks, customers, opportunities, targets: periodT } = await getAnalyticsBundle(profile);
  const monthlyTarget = periodT.monthly?.target_amount ?? 0;
  const achieved = periodT.monthly?.achieved_amount ?? 0;
  const gap = Math.max(0, monthlyTarget - achieved);
  const achievementPct = monthlyTarget > 0 ? (achieved / monthlyTarget) * 100 : 0;

  const actions = dailyActions(customers, opportunities, 12);
  const advice = targetAdvisor(gap, achievementPct, customers, opportunities);

  const detached = customers
    .filter((c) => c.category === "Detached")
    .map((c) => ({ c, r: recoveryScore(c) }))
    .sort((a, b) => b.r.priorityScore - a.r.priorityScore)
    .slice(0, 8);

  return (
    <div className="animate-fade-in">
      <PageHeader title="AI Daily Action Engine" subtitle="Prioritized actions, target advice & customer recovery" />

      <div className="mb-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Priority Actions" value={String(actions.length)} />
        <Stat label="Target Gap" value={inr(gap)} tone={gap > 0 ? "bad" : "good"} />
        <Stat label="Detached to Recover" value={String(detached.length)} tone="warn" />
        <Stat label="Active Risks" value={String(risks.length)} tone="bad" />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Today's Priority Actions" subtitle="Ranked by revenue potential & risk" />
          <div className="divide-y divide-slate-100">
            {actions.map((a) => {
              const Icon = KIND_ICON[a.kind] ?? CheckCircle2;
              return (
                <div key={a.id} className="flex items-center gap-3 px-5 py-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                    <Icon size={16} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-800">{a.title}</p>
                    <p className="truncate text-xs text-slate-500">{a.reason}</p>
                  </div>
                  <Badge>{a.kind}</Badge>
                  <span className="hidden text-sm font-medium text-slate-600 sm:block">{inr(a.potentialRevenue)}</span>
                </div>
              );
            })}
          </div>
        </Card>

        <AiInsight
          title="Target Achievement Advisor"
          text={`Gap to target: ${inr(advice.gap)} (${pct(advice.achievementPct)} achieved).\n\nSuggested actions:\n${advice.recommendations.map((r) => `• ${r}`).join("\n")}`}
        />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Detached Customer Recovery" subtitle="Highest recovery priority first" />
          <div className="divide-y divide-slate-100">
            {detached.map(({ c, r }) => (
              <div key={c.id} className="flex items-center gap-3 px-5 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-800">{c.company_name}</p>
                  <p className="text-xs text-slate-500">{Math.round(r.probability * 100)}% recovery · potential {inr(r.potentialRevenue)}</p>
                </div>
                <Badge>{r.priority}</Badge>
              </div>
            ))}
            {detached.length === 0 && <p className="px-5 py-6 text-center text-sm text-slate-400">No detached customers.</p>}
          </div>
        </Card>

        <Card>
          <CardHeader title="Revenue Risk Detection" subtitle={`${risks.length} alerts`} />
          <div className="divide-y divide-slate-100">
            {risks.slice(0, 8).map((r) => (
              <div key={r.id} className="flex items-center gap-3 px-5 py-3">
                <AlertTriangle size={16} className={r.severity === "High" ? "text-rose-500" : r.severity === "Medium" ? "text-amber-500" : "text-slate-400"} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-800">{r.title}</p>
                  <p className="truncate text-xs text-slate-500">{r.detail}</p>
                </div>
                <Badge>{r.severity}</Badge>
              </div>
            ))}
            {risks.length === 0 && <p className="px-5 py-6 text-center text-sm text-slate-400">No active risks.</p>}
          </div>
        </Card>
      </div>
    </div>
  );
}

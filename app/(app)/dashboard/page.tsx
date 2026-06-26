import { requireProfile, isManager } from "@/lib/auth";
import { getAnalyticsBundle, getProfiles } from "@/lib/data";
import { explainProjection } from "@/lib/ai/insights";
import { Card, CardHeader, Stat, Badge, ProgressBar, PageHeader, AiCard } from "@/components/ui";
import { CategoryPie, PipelineBar, TeamBar, RevenueTrend, YoYBar } from "@/components/Charts";
import { inr, pct } from "@/lib/utils";
import { STAGE_PROBABILITY } from "@/lib/types";
import { AlertTriangle } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export default async function DashboardPage() {
  const profile = await requireProfile();
  const manager = isManager(profile.role);

  const [bundle, profiles] = await Promise.all([
    getAnalyticsBundle(profile),
    getProfiles(),
  ]);
  const { projection, forecastQuarter, targets: periodT, risks, customers, opportunities, monthlySeries, yoy } = bundle;
  const targets = bundle.allTargets;
  const aiExplain = await explainProjection(projection);

  const monthlyTarget = periodT.monthly?.target_amount ?? 0;
  const achieved = periodT.monthly?.achieved_amount ?? 0;
  const gap = Math.max(0, monthlyTarget - achieved);
  const achievementPct = monthlyTarget > 0 ? (achieved / monthlyTarget) * 100 : 0;

  // Category distribution
  const catCount = { Regular: 0, Detached: 0, New: 0 };
  customers.forEach((c) => (catCount[c.category]++));
  const catData = [
    { name: "Regular", value: catCount.Regular },
    { name: "Detached", value: catCount.Detached },
    { name: "New", value: catCount.New },
  ];

  // Pipeline by stage
  const stageMap = new Map<string, { value: number; count: number }>();
  opportunities.forEach((o) => {
    if (o.stage === "Won" || o.stage === "Lost") return;
    const cur = stageMap.get(o.stage) ?? { value: 0, count: 0 };
    cur.value += o.value * STAGE_PROBABILITY[o.stage];
    cur.count += 1;
    stageMap.set(o.stage, cur);
  });
  const pipelineData = ["New", "Contacted", "Meeting Scheduled", "Quotation Shared", "Negotiation", "On Hold"]
    .map((s) => ({ stage: s, value: Math.round(stageMap.get(s)?.value ?? 0), count: stageMap.get(s)?.count ?? 0 }));

  // Team performance (managers only)
  const execProfiles = profiles.filter((p) => p.role === "Sales Executive");
  const teamData = manager
    ? execProfiles.map((e) => {
        const t = targets.find((x) => x.scope === "user" && x.period_type === "monthly" && x.owner_id === e.id);
        return { name: e.name.split(" ")[0], achieved: t?.achieved_amount ?? 0, target: t?.target_amount ?? 0 };
      })
    : [];

  const detachedPotential = customers
    .filter((c) => c.category === "Detached")
    .reduce((s, c) => s + c.total_revenue * 0.3, 0);

  return (
    <div>
      <PageHeader
        title={manager ? "Executive Dashboard" : `Welcome, ${profile.name.split(" ")[0]}`}
        subtitle={manager ? "Company-wide performance, projection & risk" : "Your targets, pipeline & AI recommendations"}
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Monthly Target" value={inr(monthlyTarget)} sub={periodT.monthly?.period} />
        <Stat label="Achieved" value={inr(achieved)} sub={pct(achievementPct) + " of target"} tone="good" />
        <Stat label="Gap" value={inr(gap)} sub="remaining this month" tone={gap > 0 ? "bad" : "good"} />
        <Stat label="AI Projection" value={inr(projection.projectedRevenue)} sub={`${projection.confidence}% confidence`} tone="warn" />
      </div>

      <div className="mt-4">
        <Card className="p-5">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-700">Month progress</p>
            <p className="text-sm text-slate-500">{inr(achieved)} / {inr(monthlyTarget)}</p>
          </div>
          <ProgressBar value={achievementPct} tone={achievementPct >= 80 ? "good" : achievementPct >= 50 ? "brand" : "bad"} />
        </Card>
      </div>

      <div className="mt-4">
        <AiCard title="AI Projection Insight">{aiExplain}</AiCard>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Revenue Trend" subtitle="Monthly revenue, last 24 months" />
          <div className="p-2"><RevenueTrend data={monthlySeries} /></div>
        </Card>
        <Card>
          <CardHeader title="Year-on-Year" subtitle="Revenue by financial year" />
          <div className="p-2"><YoYBar data={yoy} /></div>
          <div className="border-t border-slate-100 px-5 py-3 text-xs text-slate-500">
            {yoy.length >= 2 && yoy[yoy.length - 2].revenue > 0 && (
              <span>
                Latest FY tracking at{" "}
                <strong className="text-slate-700">
                  {pct((yoy[yoy.length - 1].revenue / yoy[yoy.length - 2].revenue) * 100)}
                </strong>{" "}
                of last FY (in progress).
              </span>
            )}
          </div>
        </Card>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader title="Customer Mix" subtitle={`${customers.length} customers`} />
          <div className="p-2"><CategoryPie data={catData} /></div>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader title="Weighted Pipeline" subtitle="Expected value by stage" />
          <div className="p-2"><PipelineBar data={pipelineData} /></div>
        </Card>
      </div>

      {manager && (
        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader title="Team Performance" subtitle="Achieved vs target (this month)" />
            <div className="p-2"><TeamBar data={teamData} /></div>
          </Card>
          <div className="space-y-4">
            <Stat label="Quarterly Forecast (Expected)" value={inr(forecastQuarter.scenarios.expected)} sub={`Best ${inr(forecastQuarter.scenarios.best)} · Worst ${inr(forecastQuarter.scenarios.worst)}`} />
            <Stat label="Detached Recovery Potential" value={inr(detachedPotential)} sub={`${catCount.Detached} detached customers`} tone="warn" />
          </div>
        </div>
      )}

      <div className="mt-4">
        <Card>
          <CardHeader
            title="Revenue Risk Alerts"
            subtitle={`${risks.length} active`}
            action={<Link href="/recommendations" className="text-xs font-medium text-brand-600 hover:underline">View all →</Link>}
          />
          <div className="divide-y divide-slate-100">
            {risks.slice(0, 6).map((r) => (
              <div key={r.id} className="flex items-center gap-3 px-5 py-3">
                <AlertTriangle size={16} className={r.severity === "High" ? "text-rose-500" : r.severity === "Medium" ? "text-amber-500" : "text-slate-400"} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-800">{r.title}</p>
                  <p className="truncate text-xs text-slate-500">{r.detail}</p>
                </div>
                <Badge>{r.severity}</Badge>
                <span className="hidden text-xs font-medium text-slate-500 sm:block">{inr(r.revenueAtRisk)}</span>
              </div>
            ))}
            {risks.length === 0 && <p className="px-5 py-6 text-center text-sm text-slate-400">No active risks 🎉</p>}
          </div>
        </Card>
      </div>
    </div>
  );
}

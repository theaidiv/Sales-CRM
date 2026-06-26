import { requireProfile, isManager } from "@/lib/auth";
import { getAnalyticsBundle, getProfiles } from "@/lib/data";
import { buildNextMonthPlan } from "@/lib/analytics";
import { explainProjection } from "@/lib/ai/insights";
import { PageHeader, Card, CardHeader, Stat, AiCard, ProgressBar, Badge } from "@/components/ui";
import { AiInsight } from "@/components/AiInsight";
import { ProjectionBreakdownBar } from "@/components/Charts";
import { NextMonthExport } from "@/components/NextMonthExport";
import { inr, pct, currentMonthKey, monthName } from "@/lib/utils";
import Link from "next/link";
import { CalendarClock } from "lucide-react";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const SOURCE_LABEL: Record<string, string> = {
  regular: "Regular customer run-rate", opportunities: "Active opportunities (weighted)",
  quotations: "Pending quotations", detached: "Detached recovery", newCustomers: "New customers",
};

export default async function ProjectionsPage({ searchParams }: { searchParams: { view?: string } }) {
  const profile = await requireProfile();
  const manager = isManager(profile.role);
  const view = searchParams.view === "next" ? "next" : "this";

  const [bundle, profiles] = await Promise.all([getAnalyticsBundle(profile), getProfiles()]);
  const nameById = new Map(profiles.map((p) => [p.id, p.name]));
  const scopeLabel = manager ? "Company-wide" : `${profile.name} (personal)`;

  const tab = (key: string, label: string) => (
    <Link href={`/projections?view=${key}`}
      className={`rounded-lg px-4 py-2 text-sm font-medium transition ${view === key ? "bg-brand-600 text-white" : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"}`}>
      {label}
    </Link>
  );

  // ---------- NEXT MONTH (planning) ----------
  if (view === "next") {
    const plan = buildNextMonthPlan(profile, bundle.customers, bundle.opportunities, bundle.quotations, bundle.recent, bundle.allTargets, nameById);
    const ai = await explainProjection(plan.projection);
    const label = monthName(plan.monthKey);
    const b = plan.projection.breakdown;
    const breakdownData = Object.entries(b).map(([k, v]) => ({ name: SOURCE_LABEL[k] ?? k, value: v as number })).sort((a, c) => c.value - a.value);
    const summary = {
      monthLabel: label, scopeLabel, target: plan.target, projected: plan.projection.projectedRevenue,
      gap: plan.projection.targetGap, confidence: plan.projection.confidence, breakdown: breakdownData,
    };

    return (
      <div>
        <PageHeader title="Projection Engine" subtitle={`Plan ahead — ${scopeLabel}`}
          action={<NextMonthExport summary={summary} rows={plan.rows} monthKey={plan.monthKey} />} />
        <div className="mb-4 flex gap-2">{tab("this", "This Month")}{tab("next", `Next Month (${label})`)}</div>

        <div className="mb-4 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-800">
          <CalendarClock size={16} /> Prepare next month's plan before the 25th so the team can act in advance.
        </div>

        <div className="mb-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Stat label={`${label} Target`} value={inr(plan.target)} />
          <Stat label="Projected Revenue" value={inr(plan.projection.projectedRevenue)} tone="good" />
          <Stat label="Gap to Target" value={inr(plan.projection.targetGap)} tone={plan.projection.targetGap > 0 ? "bad" : "good"} />
          <Stat label="Confidence" value={pct(plan.projection.confidence)} tone="warn" />
        </div>

        <div className="mb-4"><AiInsight title={`Why this ${label} projection`} text={ai} /></div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader title="Revenue Sources" subtitle="Expected contribution next month" />
            <div className="p-3"><ProjectionBreakdownBar data={breakdownData} /></div>
          </Card>
          <Card>
            <CardHeader title="Projection Sheet — by Customer" subtitle={`${plan.rows.length} contributing accounts`}
              action={<span className="text-xs text-slate-400">top 200 shown · full list in Excel</span>} />
            <div className="max-h-[420px] overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-slate-50">
                  <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-500">
                    <th className="px-4 py-2 font-medium">Customer</th>
                    <th className="px-4 py-2 font-medium">Cat</th>
                    <th className="px-4 py-2 text-right font-medium">Expected</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {plan.rows.slice(0, 200).map((r, i) => (
                    <tr key={i} className="hover:bg-slate-50">
                      <td className="px-4 py-2"><span className="font-medium text-slate-700">{r.company}</span><span className="block text-xs text-slate-400">{r.basis}</span></td>
                      <td className="px-4 py-2"><Badge>{r.category}</Badge></td>
                      <td className="px-4 py-2 text-right font-medium text-slate-800">{inr(r.expected)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  // ---------- THIS MONTH ----------
  const { projection } = bundle;
  const ai = await explainProjection(projection);
  const b = projection.breakdown;
  const breakdownData = Object.entries(b).map(([k, v]) => ({ name: SOURCE_LABEL[k] ?? k, value: v as number })).sort((a, c) => c.value - a.value);
  const rows = [
    { label: "Regular customer run-rate", value: b.regular },
    { label: "Active opportunities (weighted)", value: b.opportunities },
    { label: "Pending quotations", value: b.quotations },
    { label: "Detached recovery", value: b.detached },
    { label: "New customers", value: b.newCustomers },
  ];

  return (
    <div>
      <PageHeader title="Projection Engine" subtitle={`Monthly projection sheet — ${monthName(currentMonthKey())} · ${scopeLabel}`} />
      <div className="mb-4 flex gap-2">{tab("this", "This Month")}{tab("next", "Next Month")}</div>

      <div className="mb-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Projected Revenue" value={inr(projection.projectedRevenue)} tone="good" />
        <Stat label="Monthly Target" value={inr(projection.target)} />
        <Stat label="Target Gap" value={inr(projection.targetGap)} tone={projection.targetGap > 0 ? "bad" : "good"} />
        <Stat label="Confidence" value={pct(projection.confidence)} tone="warn" />
      </div>

      <div className="mb-4">
        <Card className="p-5">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-700">Projection vs Target</p>
            <p className="text-sm text-slate-500">{pct(projection.achievementPct)} of target</p>
          </div>
          <ProgressBar value={projection.achievementPct} tone={projection.achievementPct >= 100 ? "good" : projection.achievementPct >= 70 ? "brand" : "bad"} />
        </Card>
      </div>

      <div className="mb-4"><AiInsight title="Forecast Explanation" text={ai} /></div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Revenue Sources" subtitle="What makes up the projection" />
          <div className="p-3"><ProjectionBreakdownBar data={breakdownData} /></div>
        </Card>
        <Card>
          <CardHeader title="Projection Sheet" subtitle="Line-by-line breakdown" />
          <table className="w-full text-sm">
            <tbody className="divide-y divide-slate-100">
              {rows.map((r) => (
                <tr key={r.label}>
                  <td className="px-5 py-3 text-slate-600">{r.label}</td>
                  <td className="px-5 py-3 text-right font-medium text-slate-800">{inr(r.value)}</td>
                </tr>
              ))}
              <tr className="bg-slate-50">
                <td className="px-5 py-3 font-semibold text-slate-800">Projected Revenue</td>
                <td className="px-5 py-3 text-right font-bold text-brand-700">{inr(projection.projectedRevenue)}</td>
              </tr>
              <tr>
                <td className="px-5 py-3 font-semibold text-slate-800">Target Gap</td>
                <td className={`px-5 py-3 text-right font-bold ${projection.targetGap > 0 ? "text-rose-600" : "text-emerald-600"}`}>{inr(projection.targetGap)}</td>
              </tr>
            </tbody>
          </table>
        </Card>
      </div>
    </div>
  );
}

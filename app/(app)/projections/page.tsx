import { requireProfile, isManager } from "@/lib/auth";
import { getAnalyticsBundle } from "@/lib/data";
import { explainProjection } from "@/lib/ai/insights";
import { PageHeader, Card, CardHeader, Stat, AiCard, ProgressBar } from "@/components/ui";
import { ProjectionBreakdownBar } from "@/components/Charts";
import { inr, pct, currentMonthKey } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export default async function ProjectionsPage() {
  const profile = await requireProfile();
  const manager = isManager(profile.role);
  const { projection } = await getAnalyticsBundle(profile);
  const ai = await explainProjection(projection);

  const b = projection.breakdown;
  const breakdownData = [
    { name: "Regular", value: b.regular },
    { name: "Opportunities", value: b.opportunities },
    { name: "Quotations", value: b.quotations },
    { name: "Detached", value: b.detached },
    { name: "New Customers", value: b.newCustomers },
  ].sort((a, c) => c.value - a.value);

  const rows = [
    { label: "Regular customer run-rate", value: b.regular },
    { label: "Active opportunities (weighted)", value: b.opportunities },
    { label: "Pending quotations", value: b.quotations },
    { label: "Detached recovery", value: b.detached },
    { label: "New customers", value: b.newCustomers },
  ];

  return (
    <div>
      <PageHeader
        title="Projection Engine"
        subtitle={`Automated monthly projection sheet — ${currentMonthKey()} · ${manager ? "Management view" : "My view"}`}
      />

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

      <div className="mb-4">
        <AiCard title="Forecast Explanation">{ai}</AiCard>
      </div>

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

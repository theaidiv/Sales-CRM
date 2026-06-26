import { requireProfile, isManager } from "@/lib/auth";
import { getCustomers, getOpportunities, getQuotations, getTargets } from "@/lib/data";
import { buildAnalytics, selectTargets } from "@/lib/analytics";
import { projectMonth } from "@/lib/engines/projection";
import { forecastFromProjection } from "@/lib/engines/forecast";
import { explainForecast } from "@/lib/ai/insights";
import { PageHeader, Card, CardHeader, Stat, AiCard } from "@/components/ui";
import { ForecastArea } from "@/components/Charts";
import { inr, pct } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function ForecastsPage() {
  const profile = await requireProfile();
  const manager = isManager(profile.role);
  const [customers, opportunities, quotations, targets] = await Promise.all([
    getCustomers(profile), getOpportunities(profile), getQuotations(profile), getTargets(),
  ]);

  const periodT = selectTargets(profile, targets);
  const projection = projectMonth({
    customers, opportunities, quotations,
    monthlyTarget: periodT.monthly?.target_amount ?? 0,
  });

  const monthly = forecastFromProjection(projection, "Monthly", periodT.monthly?.target_amount ?? 0, 0);
  const quarterly = forecastFromProjection(projection, "Quarterly", periodT.quarterly?.target_amount ?? 0, periodT.quarterly?.achieved_amount ?? 0);
  const annual = forecastFromProjection(projection, "Annual", periodT.annual?.target_amount ?? 0, periodT.annual?.achieved_amount ?? 0);

  const ai = await explainForecast(quarterly);

  const chartData = [monthly, quarterly, annual].map((f) => ({
    name: f.period,
    worst: f.scenarios.worst,
    expected: f.scenarios.expected,
    best: f.scenarios.best,
    target: f.target,
  }));

  const cards = [
    { f: monthly, title: "Monthly Forecast" },
    { f: quarterly, title: "Quarterly Forecast" },
    { f: annual, title: "Annual Forecast" },
  ];

  return (
    <div>
      <PageHeader title="Forecasting Engine" subtitle={`Best / Expected / Worst case scenarios · ${manager ? "Company" : "Personal"}`} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {cards.map(({ f, title }) => (
          <Card key={title}>
            <CardHeader title={title} subtitle={`${f.confidence}% confidence`} />
            <div className="space-y-2 p-5">
              <div className="flex items-center justify-between rounded-lg bg-emerald-50 px-3 py-2">
                <span className="text-sm text-emerald-700">Best case</span>
                <span className="font-semibold text-emerald-700">{inr(f.scenarios.best)}</span>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-brand-50 px-3 py-2">
                <span className="text-sm text-brand-700">Expected</span>
                <span className="font-bold text-brand-700">{inr(f.scenarios.expected)}</span>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-rose-50 px-3 py-2">
                <span className="text-sm text-rose-700">Worst case</span>
                <span className="font-semibold text-rose-700">{inr(f.scenarios.worst)}</span>
              </div>
              <div className="flex items-center justify-between border-t border-slate-100 px-1 pt-2 text-sm">
                <span className="text-slate-500">Target</span>
                <span className="font-medium text-slate-700">{inr(f.target)}</span>
              </div>
              <div className="flex items-center justify-between px-1 text-sm">
                <span className="text-slate-500">Revenue gap</span>
                <span className={`font-medium ${f.revenueGap > 0 ? "text-rose-600" : "text-emerald-600"}`}>{inr(f.revenueGap)}</span>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="mt-4">
        <AiCard title="AI Forecast Explanation">{ai}</AiCard>
      </div>

      <div className="mt-4">
        <Card>
          <CardHeader title="Scenario Comparison" subtitle="Forecast bands vs target across horizons" />
          <div className="p-3"><ForecastArea data={chartData} /></div>
        </Card>
      </div>
    </div>
  );
}

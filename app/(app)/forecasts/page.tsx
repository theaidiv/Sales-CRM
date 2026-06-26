import { requireProfile, isManager } from "@/lib/auth";
import { getAnalyticsBundle } from "@/lib/data";
import { monthlyRevenueRaw } from "@/lib/analytics";
import { mlForecast, aggregateForecast } from "@/lib/engines/mlForecast";
import { explainForecast } from "@/lib/ai/insights";
import { PageHeader, Card, CardHeader, Stat } from "@/components/ui";
import { AiInsight } from "@/components/AiInsight";
import { ForecastArea } from "@/components/Charts";
import { inr, pct } from "@/lib/utils";
import { BrainCircuit, TrendingUp, Sigma } from "lucide-react";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export default async function ForecastsPage() {
  const profile = await requireProfile();
  const manager = isManager(profile.role);
  const { orders, targets: periodT } = await getAnalyticsBundle(profile);

  // ML model: OLS trend + seasonal indices fit on 24 months of revenue history.
  const obs = monthlyRevenueRaw(orders, 24);
  const ml = mlForecast(obs, 12);

  const m = ml.predictions[0] ?? { expected: 0, low: 0, high: 0 };
  const q = aggregateForecast(ml, 3);
  const a = aggregateForecast(ml, 12);

  const mt = periodT.monthly?.target_amount ?? 0;
  const qt = periodT.quarterly?.target_amount ?? 0;
  const at = periodT.annual?.target_amount ?? 0;

  const cards = [
    { title: "Monthly Forecast", f: m, target: mt },
    { title: "Quarterly Forecast", f: q, target: qt },
    { title: "Annual Forecast", f: a, target: at },
  ];

  const aiText = await explainForecast({
    period: "Quarterly",
    scenarios: { best: q.high, expected: q.expected, worst: q.low },
    confidence: ml.confidence, target: qt, revenueGap: qt - q.expected,
  });

  const chartData = cards.map((c) => ({ name: c.title.split(" ")[0], worst: c.f.low, expected: c.f.expected, best: c.f.high, target: c.target }));

  return (
    <div className="animate-fade-in">
      <PageHeader title="Forecasting Engine" subtitle={`ML-based — trend + seasonality on 24 months of history · ${manager ? "Company" : "Personal"}`} />

      {/* Model summary — shows it's a real fitted model */}
      <Card className="mb-4 overflow-hidden">
        <div className="flex items-center gap-2.5 border-b border-brand-100 bg-gradient-to-r from-brand-50 to-accent-50 px-5 py-3">
          <BrainCircuit size={17} className="text-brand-600" />
          <h3 className="font-display text-sm font-semibold text-brand-900">Forecast Model — Linear Regression × Seasonality</h3>
        </div>
        <div className="grid grid-cols-2 gap-px bg-ink-100 md:grid-cols-4">
          <div className="bg-white p-4"><p className="text-xs text-ink-500">Model fit (R²)</p><p className="mt-1 font-display text-xl font-bold text-ink-900">{(ml.reg.r2).toFixed(2)}</p></div>
          <div className="bg-white p-4"><p className="text-xs text-ink-500">Confidence</p><p className="mt-1 font-display text-xl font-bold text-brand-700">{pct(ml.confidence)}</p></div>
          <div className="bg-white p-4"><p className="flex items-center gap-1 text-xs text-ink-500"><TrendingUp size={12} /> Monthly trend</p><p className={`mt-1 font-display text-xl font-bold ${ml.growthRatePct >= 0 ? "text-emerald-600" : "text-rose-600"}`}>{ml.growthRatePct >= 0 ? "+" : ""}{ml.growthRatePct.toFixed(1)}%</p></div>
          <div className="bg-white p-4"><p className="flex items-center gap-1 text-xs text-ink-500"><Sigma size={12} /> Seasonal swing</p><p className="mt-1 font-display text-xl font-bold text-ink-900">±{Math.round((Math.max(...ml.seasonal) - 1) * 100)}%</p></div>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {cards.map(({ title, f, target }) => {
          const gap = target - f.expected;
          return (
            <Card key={title}>
              <CardHeader title={title} subtitle={`${pct(ml.confidence)} confidence · 80% interval`} />
              <div className="space-y-2 p-5">
                <div className="flex items-center justify-between rounded-lg bg-emerald-50 px-3 py-2"><span className="text-sm text-emerald-700">Best case</span><span className="font-semibold text-emerald-700 tnum">{inr(f.high)}</span></div>
                <div className="flex items-center justify-between rounded-lg bg-brand-50 px-3 py-2"><span className="text-sm text-brand-700">Expected</span><span className="font-bold text-brand-700 tnum">{inr(f.expected)}</span></div>
                <div className="flex items-center justify-between rounded-lg bg-rose-50 px-3 py-2"><span className="text-sm text-rose-700">Worst case</span><span className="font-semibold text-rose-700 tnum">{inr(f.low)}</span></div>
                <div className="flex items-center justify-between border-t border-ink-100 px-1 pt-2 text-sm"><span className="text-ink-500">Target</span><span className="font-medium text-ink-700 tnum">{inr(target)}</span></div>
                <div className="flex items-center justify-between px-1 text-sm"><span className="text-ink-500">Revenue gap</span><span className={`font-medium tnum ${gap > 0 ? "text-rose-600" : "text-emerald-600"}`}>{inr(gap)}</span></div>
              </div>
            </Card>
          );
        })}
      </div>

      <div className="mt-4"><AiInsight title="AI Forecast Explanation" text={aiText} /></div>

      <div className="mt-4">
        <Card>
          <CardHeader title="Scenario Comparison" subtitle="ML forecast bands vs target across horizons" />
          <div className="p-3"><ForecastArea data={chartData} /></div>
        </Card>
      </div>
    </div>
  );
}

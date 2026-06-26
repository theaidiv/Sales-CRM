import { requireProfile, isManager } from "@/lib/auth";
import { getAnalyticsBundle } from "@/lib/data";
import { monthlyRevenueRaw } from "@/lib/analytics";
import { mlForecast, aggregateForecast } from "@/lib/engines/mlForecast";
import { explainForecast } from "@/lib/ai/insights";
import { PageHeader, Card, CardHeader, Stat, InfoTip } from "@/components/ui";
import { AiInsight } from "@/components/AiInsight";
import { ForecastArea, HistoryForecastChart, SeasonalityBar, RadialGauge } from "@/components/Charts";
import { inr, pct, shortMonthLabel } from "@/lib/utils";
import { BrainCircuit, TrendingUp, Sigma } from "lucide-react";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export default async function ForecastsPage() {
  const profile = await requireProfile();
  const manager = isManager(profile.role);
  const { orders, targets: periodT } = await getAnalyticsBundle(profile);

  const obs = monthlyRevenueRaw(orders, 24);
  const ml = mlForecast(obs, 12);
  const last = obs[obs.length - 1] ?? { year: new Date().getFullYear(), month0: new Date().getMonth(), revenue: 0 };

  const m = ml.predictions[0] ?? { expected: 0, low: 0, high: 0 };
  const q = aggregateForecast(ml, 3);
  const a = aggregateForecast(ml, 12);
  const mt = periodT.monthly?.target_amount ?? 0;
  const qt = periodT.quarterly?.target_amount ?? 0;
  const at = periodT.annual?.target_amount ?? 0;

  // history + forecast continuation series
  const hist = obs.slice(-18).map((o) => ({ name: shortMonthLabel(o.year, o.month0), actual: o.revenue, forecast: null as number | null, low: null as number | null, high: null as number | null }));
  if (hist.length) { hist[hist.length - 1].forecast = last.revenue; hist[hist.length - 1].low = last.revenue; hist[hist.length - 1].high = last.revenue; }
  const fc = ml.predictions.slice(0, 6).map((p, i) => {
    const d = new Date(last.year, last.month0 + i + 1, 1);
    return { name: shortMonthLabel(d.getFullYear(), d.getMonth()), actual: null as number | null, forecast: p.expected, low: p.low, high: p.high };
  });
  const histForecast = [...hist, ...fc];

  const seasonalData = ml.seasonal.map((v, i) => ({ month: MONTHS[i], index: v }));
  const annualAttain = at > 0 ? (a.expected / at) * 100 : 0;

  const aiText = await explainForecast({ period: "Quarterly", scenarios: { best: q.high, expected: q.expected, worst: q.low }, confidence: ml.confidence, target: qt, revenueGap: qt - q.expected });

  const cards = [
    { title: "Monthly", f: m, target: mt, info: "Next-month forecast = trend line × this month's seasonal index, with an 80% prediction interval." },
    { title: "Quarterly", f: q, target: qt, info: "Sum of the next 3 monthly forecasts. Bands widen with the horizon." },
    { title: "Annual", f: a, target: at, info: "Next 12 months projected forward from the fitted trend & seasonality." },
  ];
  const chartData = cards.map((c) => ({ name: c.title, worst: c.f.low, expected: c.f.expected, best: c.f.high, target: c.target }));

  return (
    <div className="animate-fade-in">
      <PageHeader title="Forecasting Engine" subtitle={`Machine-learning forecast — trend × seasonality on 24 months · ${manager ? "Company" : "Personal"}`} />

      {/* Hero model card */}
      <Card className="mb-5 overflow-hidden">
        <div className="flex items-center gap-2.5 border-b border-brand-100 bg-gradient-to-r from-brand-700 via-secondary-600 to-accent-500 px-5 py-3.5 text-white">
          <BrainCircuit size={18} />
          <h3 className="font-display text-sm font-semibold">Forecast Model — Linear Regression × Seasonal Decomposition</h3>
          <span className="ml-auto text-xs text-white/80">trained on 24 months</span>
        </div>
        <div className="grid grid-cols-2 divide-ink-100 md:grid-cols-4 md:divide-x">
          <div className="p-5"><p className="flex items-center gap-1 text-xs text-ink-500">Model fit (R²) <InfoTip text="Share of revenue variation explained by the trend line. Closer to 1 = a stronger, more reliable fit." /></p><p className="mt-1 font-display text-2xl font-bold text-ink-900">{ml.reg.r2.toFixed(2)}</p></div>
          <div className="p-5"><p className="flex items-center gap-1 text-xs text-ink-500">Confidence <InfoTip text="Derived from model fit. Higher = tighter, more trustworthy forecast bands." /></p><p className="mt-1 font-display text-2xl font-bold text-brand-700">{pct(ml.confidence)}</p></div>
          <div className="p-5"><p className="flex items-center gap-1 text-xs text-ink-500"><TrendingUp size={12} /> Monthly trend</p><p className={`mt-1 font-display text-2xl font-bold ${ml.growthRatePct >= 0 ? "text-emerald-600" : "text-rose-600"}`}>{ml.growthRatePct >= 0 ? "+" : ""}{ml.growthRatePct.toFixed(1)}%</p></div>
          <div className="p-5"><p className="flex items-center gap-1 text-xs text-ink-500"><Sigma size={12} /> Seasonal swing</p><p className="mt-1 font-display text-2xl font-bold text-secondary-600">±{Math.round((Math.max(...ml.seasonal) - 1) * 100)}%</p></div>
        </div>
      </Card>

      {/* Forecast cards */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {cards.map(({ title, f, target, info }) => {
          const gap = target - f.expected;
          return (
            <Card key={title} interactive className="p-5">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="flex items-center gap-1.5 font-display text-sm font-semibold text-ink-800">{title} Forecast <InfoTip text={info} /></h3>
                <span className="rounded-full bg-brand-50 px-2 py-0.5 text-[11px] font-medium text-brand-600">{pct(ml.confidence)} conf</span>
              </div>
              <p className="font-display text-3xl font-bold text-ink-900 tnum">{inr(f.expected)}</p>
              <div className="mt-3 flex items-center gap-2 text-xs">
                <span className="rounded-md bg-emerald-50 px-2 py-1 font-medium text-emerald-700 tnum">▲ {inr(f.high)}</span>
                <span className="rounded-md bg-rose-50 px-2 py-1 font-medium text-rose-700 tnum">▼ {inr(f.low)}</span>
              </div>
              <div className="mt-3 border-t border-ink-100 pt-3 text-sm">
                <div className="flex justify-between"><span className="text-ink-500">Target</span><span className="font-medium text-ink-700 tnum">{inr(target)}</span></div>
                <div className="flex justify-between"><span className="text-ink-500">Gap</span><span className={`font-medium tnum ${gap > 0 ? "text-rose-600" : "text-emerald-600"}`}>{inr(gap)}</span></div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* History + forecast band — the headline chart */}
      <div className="mt-4">
        <Card>
          <CardHeader title="Revenue — History & Forecast" subtitle="Solid = actual · dashed = ML forecast · shaded = 80% interval"
            info="The model is fit on the solid history line, then projected forward (dashed). The shaded band shows the 80% prediction interval — actuals should land inside it ~80% of the time." />
          <div className="p-3"><HistoryForecastChart data={histForecast} /></div>
        </Card>
      </div>

      {/* Seasonality + gauge + AI */}
      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Seasonality Pattern" subtitle="Multiplicative index by month (1.0× = average)"
            info="How each calendar month typically compares to the yearly average. Bars above 1.0× are seasonally strong months; below are softer." />
          <div className="p-3"><SeasonalityBar data={seasonalData} /></div>
        </Card>
        <Card>
          <CardHeader title="Annual Attainment" subtitle="Forecast vs target" info="Projected next-12-month revenue as a percentage of the annual target." />
          <div className="p-3"><RadialGauge value={annualAttain} label="of annual target" /></div>
        </Card>
      </div>

      <div className="mt-4"><AiInsight title="AI Forecast Explanation" text={aiText} /></div>

      <div className="mt-4">
        <Card>
          <CardHeader title="Scenario Comparison" subtitle="ML forecast bands vs target across horizons"
            info="Best / expected / worst forecast for each horizon plotted against the target line." />
          <div className="p-3"><ForecastArea data={chartData} /></div>
        </Card>
      </div>
    </div>
  );
}

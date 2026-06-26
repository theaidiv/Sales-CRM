import { requireProfile, isManager } from "@/lib/auth";
import { getAnalyticsBundle, getProfiles } from "@/lib/data";
import { buildNextMonthPlan, projectionRows } from "@/lib/analytics";
import { explainProjection } from "@/lib/ai/insights";
import { PageHeader, Card, CardHeader, Stat, ProgressBar, Badge, InfoTip } from "@/components/ui";
import { AiInsight } from "@/components/AiInsight";
import { ProjectionBreakdownBar, DonutChart, RankedBar } from "@/components/Charts";
import { NextMonthExport } from "@/components/NextMonthExport";
import type { DrillDetail } from "@/components/DrillDown";
import type { ProjectionRow } from "@/lib/analytics";
import { inr, pct, currentMonthKey, monthName, nextMonthDate } from "@/lib/utils";
import Link from "next/link";
import { CalendarClock, Wallet, Target as TargetIcon, AlertTriangle, Sparkles } from "lucide-react";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const SOURCE_LABEL: Record<string, string> = {
  regular: "Regular run-rate", opportunities: "Open opportunities",
  quotations: "Pending quotations", detached: "Detached recovery", newCustomers: "New customers",
};

function buildChartData(rows: ProjectionRow[], manager: boolean) {
  // By category
  const cat = new Map<string, ProjectionRow[]>();
  const own = new Map<string, ProjectionRow[]>();
  for (const r of rows) {
    (cat.get(r.category) ?? cat.set(r.category, []).get(r.category)!).push(r);
    (own.get(r.owner) ?? own.set(r.owner, []).get(r.owner)!).push(r);
  }
  const sum = (rs: ProjectionRow[]) => rs.reduce((s, r) => s + r.expected, 0);
  const toDetail = (title: string, rs: ProjectionRow[]): DrillDetail => ({
    title, subtitle: `${rs.length} accounts · ${inr(sum(rs))} expected`,
    columns: [{ key: "company", label: "Customer" }, { key: "cat", label: "Cat" }, { key: "expected", label: "Expected", align: "right" }],
    rows: rs.slice(0, 200).map((r) => ({ company: r.company, cat: r.category, expected: inr(r.expected), _href: `/customers/${r.id}` })),
    footer: `Total: ${inr(sum(rs))}`,
  });

  const catData = [...cat.entries()].map(([name, rs]) => ({ name, value: sum(rs) })).sort((a, b) => b.value - a.value);
  const catDetails: Record<string, DrillDetail> = {};
  for (const [name, rs] of cat) catDetails[name] = toDetail(`${name} — projected contribution`, rs);

  const ownerData = manager ? [...own.entries()].map(([name, rs]) => ({ name: name.split(" ")[0], value: sum(rs) })).sort((a, b) => b.value - a.value) : [];
  const ownerDetails: Record<string, DrillDetail> = {};
  for (const [name, rs] of own) ownerDetails[name.split(" ")[0]] = toDetail(`${name} — projected accounts`, rs);

  return { catData, catDetails, ownerData, ownerDetails };
}

export default async function ProjectionsPage({ searchParams }: { searchParams: { view?: string } }) {
  const profile = await requireProfile();
  const manager = isManager(profile.role);
  const view = searchParams.view === "next" ? "next" : "this";

  const [bundle, profiles] = await Promise.all([getAnalyticsBundle(profile), getProfiles()]);
  const nameById = new Map(profiles.map((p) => [p.id, p.name]));
  const scopeLabel = manager ? "Company-wide" : `${profile.name} (personal)`;

  const tab = (key: string, label: string) => (
    <Link href={`/projections?view=${key}`}
      className={`rounded-xl px-4 py-2 text-sm font-medium transition ${view === key ? "bg-gradient-to-r from-brand-700 to-accent-500 text-white shadow-sm" : "bg-white text-ink-600 ring-1 ring-ink-200 hover:bg-ink-50"}`}>
      {label}
    </Link>
  );

  const isNext = view === "next";
  const refDate = isNext ? nextMonthDate() : new Date();
  const monthKey = isNext ? monthName(buildNextMonthPlan(profile, bundle.customers, bundle.opportunities, bundle.quotations, bundle.recent, bundle.allTargets, nameById).monthKey) : monthName(currentMonthKey());

  const plan = isNext ? buildNextMonthPlan(profile, bundle.customers, bundle.opportunities, bundle.quotations, bundle.recent, bundle.allTargets, nameById) : null;
  const projection = isNext ? plan!.projection : bundle.projection;
  const target = isNext ? plan!.target : (bundle.targets.monthly?.target_amount ?? 0);
  const rows: ProjectionRow[] = isNext ? plan!.rows : projectionRows(bundle.customers, bundle.opportunities, bundle.recent, refDate, nameById);

  const ai = await explainProjection(projection);
  const { catData, catDetails, ownerData, ownerDetails } = buildChartData(rows, manager);

  const b = projection.breakdown;
  const breakdownData = Object.entries(b).map(([k, v]) => ({ name: SOURCE_LABEL[k] ?? k, value: v as number })).sort((a, c) => c.value - a.value);
  const achievementPct = target > 0 ? (projection.projectedRevenue / target) * 100 : 0;
  const topRows = rows.slice(0, 10);

  const summary = {
    monthLabel: monthKey, scopeLabel, target, projected: projection.projectedRevenue,
    gap: projection.targetGap, confidence: projection.confidence, breakdown: breakdownData,
  };

  return (
    <div className="animate-fade-in">
      <PageHeader title="Projection Engine" subtitle={`${isNext ? "Plan ahead" : "Monthly projection sheet"} · ${monthKey} · ${scopeLabel}`}
        action={<NextMonthExport summary={summary} rows={(isNext ? plan!.rows : rows) as any} monthKey={isNext ? plan!.monthKey : currentMonthKey()} />} />

      <div className="mb-4 flex gap-2">{tab("this", "This Month")}{tab("next", `Next Month`)}</div>

      {isNext && (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-accent-200 bg-accent-50 px-4 py-2.5 text-sm text-secondary-800">
          <CalendarClock size={16} /> Prepare next month's plan before the 25th so the team can act in advance.
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Projected Revenue" animate={projection.projectedRevenue} valueKind="inr" tone="good" icon={<Wallet size={16} />} info="Sum of expected revenue from run-rate, weighted pipeline, pending quotations, detached recovery and new customers." />
        <Stat label="Target" animate={target} valueKind="inr" icon={<TargetIcon size={16} />} info="The revenue goal for this period (includes any rolled-over backlog)." />
        <Stat label="Gap to Target" animate={projection.targetGap} valueKind="inr" tone={projection.targetGap > 0 ? "bad" : "good"} icon={<AlertTriangle size={16} />} info="Target minus projected revenue. Positive = shortfall to close." />
        <Stat label="Confidence" value={pct(projection.confidence)} tone="warn" icon={<Sparkles size={16} />} info="How much of the projection comes from stable sources (run-rate, quotations) vs speculative pipeline." />
      </div>

      <Card className="mt-4 p-5">
        <div className="mb-2 flex items-center justify-between">
          <p className="font-display text-sm font-semibold text-ink-700">Projection vs Target</p>
          <p className="text-sm text-ink-500">{pct(achievementPct)} of target</p>
        </div>
        <ProgressBar value={achievementPct} tone={achievementPct >= 100 ? "good" : achievementPct >= 70 ? "brand" : "bad"} />
      </Card>

      <div className="mt-4"><AiInsight title={`AI Projection Insight — ${monthKey}`} text={ai} /></div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Projected Revenue Sources" subtitle="What makes up the projection" info="Breakdown of the projection by revenue source. Regular run-rate is the most stable; opportunities are probability-weighted." />
          <div className="p-3"><ProjectionBreakdownBar data={breakdownData} /></div>
        </Card>
        <Card>
          <CardHeader title="Contribution by Category" subtitle="Click a segment to drill in" info="How much each customer category is expected to contribute. Click a slice to see the underlying accounts." />
          <div className="p-3"><DonutChart data={catData} details={catDetails} /></div>
        </Card>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        {manager && (
          <Card>
            <CardHeader title="Projection by Owner" subtitle="Click a bar to drill in" info="Expected revenue grouped by the salesperson who owns each account. Click to see their accounts." />
            <div className="p-3"><RankedBar data={ownerData} details={ownerDetails} /></div>
          </Card>
        )}
        <Card className={manager ? "" : "lg:col-span-2"}>
          <CardHeader title="Top Contributing Customers" subtitle={`${rows.length} accounts contributing`} info="The accounts expected to deliver the most revenue this period. Click to open the customer." />
          <div className="divide-y divide-ink-50">
            {topRows.map((r, i) => (
              <Link key={r.id || i} href={`/customers/${r.id}`} className="flex items-center gap-3 px-5 py-2.5 transition hover:bg-ink-50/60">
                <span className="flex h-6 w-6 items-center justify-center rounded-md bg-brand-50 text-xs font-bold text-brand-600">{i + 1}</span>
                <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium text-ink-800">{r.company}</p><p className="text-xs text-ink-400">{r.basis}</p></div>
                <Badge>{r.category}</Badge>
                <span className="text-sm font-medium text-ink-700 tnum">{inr(r.expected)}</span>
              </Link>
            ))}
          </div>
        </Card>
      </div>

      <div className="mt-4">
        <Card>
          <CardHeader title="Projection Sheet — by Customer" subtitle={`${rows.length} accounts · top 200 shown · full list in Excel`}
            info="Line-by-line expected contribution per customer for the month. Download the full sheet as Excel from the top-right." />
          <div className="max-h-[460px] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-ink-50">
                <tr className="border-b border-ink-100 text-left text-xs uppercase tracking-wide text-ink-500">
                  <th className="px-5 py-2.5 font-medium">Customer</th>
                  <th className="px-5 py-2.5 font-medium">Owner</th>
                  <th className="px-5 py-2.5 font-medium">Category</th>
                  <th className="px-5 py-2.5 text-right font-medium">Expected</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-50">
                {rows.slice(0, 200).map((r, i) => (
                  <tr key={r.id || i} className="transition hover:bg-ink-50/60">
                    <td className="px-5 py-2.5"><Link href={`/customers/${r.id}`} className="font-medium text-ink-800 hover:text-brand-600">{r.company}</Link><span className="block text-xs text-ink-400">{r.basis}</span></td>
                    <td className="px-5 py-2.5 text-ink-600">{r.owner}</td>
                    <td className="px-5 py-2.5"><Badge>{r.category}</Badge></td>
                    <td className="px-5 py-2.5 text-right font-medium text-ink-800 tnum">{inr(r.expected)}</td>
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

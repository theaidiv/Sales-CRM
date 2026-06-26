import { requireProfile, isManager } from "@/lib/auth";
import { getAnalyticsBundle, getProfiles } from "@/lib/data";
import { explainProjection } from "@/lib/ai/insights";
import { Card, CardHeader, Stat, Badge, ProgressBar, PageHeader, AiCard, SectionTitle } from "@/components/ui";
import { AiInsight } from "@/components/AiInsight";
import { CategoryPie, PipelineBar, TeamBar, RevenueTrend, YoYBar } from "@/components/Charts";
import { Drillable, type DrillDetail } from "@/components/DrillDown";
import { inr, pct, lastNMonths, shortMonthLabel } from "@/lib/utils";
import { STAGE_PROBABILITY, type OppStage } from "@/lib/types";
import { AlertTriangle, Target, TrendingUp, Wallet, Sparkles } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export default async function DashboardPage() {
  const profile = await requireProfile();
  const manager = isManager(profile.role);

  const [bundle, profiles] = await Promise.all([getAnalyticsBundle(profile), getProfiles()]);
  const { projection, forecastQuarter, targets: periodT, risks, customers, opportunities, orders, monthlySeries, yoy } = bundle;
  const targets = bundle.allTargets;
  const aiExplain = await explainProjection(projection);
  const nameById = new Map(profiles.map((p) => [p.id, p.name]));
  const custName = new Map(customers.map((c) => [c.id, c.company_name]));

  const monthlyTarget = periodT.monthly?.target_amount ?? 0;
  const achieved = periodT.monthly?.achieved_amount ?? 0;
  const gap = Math.max(0, monthlyTarget - achieved);
  const achievementPct = monthlyTarget > 0 ? (achieved / monthlyTarget) * 100 : 0;

  // ---------- Drill-down detail payloads ----------
  const C = (label: string, align?: "right") => ({ key: label.toLowerCase().replace(/\s/g, ""), label, align });

  const catDetails: Record<string, DrillDetail> = {};
  (["Regular", "Detached", "New"] as const).forEach((cat) => {
    const list = customers.filter((c) => c.category === cat).sort((a, b) => b.total_revenue - a.total_revenue).slice(0, 150);
    catDetails[cat] = {
      title: `${cat} customers`, subtitle: `${customers.filter((c) => c.category === cat).length} accounts`,
      columns: [{ key: "company", label: "Company" }, { key: "owner", label: "Owner" }, { key: "revenue", label: "Revenue", align: "right" }],
      rows: list.map((c) => ({ company: c.company_name, owner: nameById.get(c.assigned_to ?? "") ?? "—", revenue: inr(c.total_revenue) })),
      footer: `Total lifetime revenue: ${inr(list.reduce((s, c) => s + c.total_revenue, 0))}`,
    };
  });

  const STAGES: OppStage[] = ["New", "Contacted", "Meeting Scheduled", "Quotation Shared", "Negotiation", "On Hold"];
  const pipeDetails: Record<string, DrillDetail> = {};
  STAGES.forEach((stage) => {
    const list = opportunities.filter((o) => o.stage === stage).sort((a, b) => b.value - a.value).slice(0, 150);
    pipeDetails[stage] = {
      title: `${stage} — opportunities`, subtitle: `${list.length} open`,
      columns: [{ key: "lead", label: "Lead" }, { key: "customer", label: "Customer" }, { key: "value", label: "Value", align: "right" }],
      rows: list.map((o) => ({ lead: o.title, customer: custName.get(o.customer_id ?? "") ?? "—", value: inr(o.value) })),
      footer: `Weighted: ${inr(list.reduce((s, o) => s + o.value * STAGE_PROBABILITY[o.stage], 0))}`,
    };
  });

  // Revenue-trend month drill → top contributing customers that month.
  const monthDetails: Record<string, DrillDetail> = {};
  lastNMonths(24).forEach((m) => {
    const label = shortMonthLabel(m.year, m.month0);
    const byCust = new Map<string, number>();
    orders.filter((o) => o.order_date.startsWith(m.key)).forEach((o) => o.customer_id && byCust.set(o.customer_id, (byCust.get(o.customer_id) ?? 0) + o.amount));
    const rows = [...byCust.entries()].sort((a, b) => b[1] - a[1]).slice(0, 60).map(([id, amt]) => ({ customer: custName.get(id) ?? "—", amount: inr(amt) }));
    monthDetails[label] = {
      title: `Revenue — ${label}`, subtitle: `${rows.length} customers ordered`,
      columns: [{ key: "customer", label: "Customer" }, { key: "amount", label: "Revenue", align: "right" }],
      rows, footer: `Month total: ${inr([...byCust.values()].reduce((a, b) => a + b, 0))}`,
    };
  });

  // KPI drill-downs
  const projectionDetail: DrillDetail = {
    title: "AI Projection — sources", subtitle: `Projected ${inr(projection.projectedRevenue)} · ${projection.confidence}% confidence`,
    columns: [{ key: "source", label: "Revenue source" }, { key: "expected", label: "Expected", align: "right" }],
    rows: [
      { source: "Regular customer run-rate", expected: inr(projection.breakdown.regular) },
      { source: "Active opportunities (weighted)", expected: inr(projection.breakdown.opportunities) },
      { source: "Pending quotations", expected: inr(projection.breakdown.quotations) },
      { source: "Detached recovery", expected: inr(projection.breakdown.detached) },
      { source: "New customers", expected: inr(projection.breakdown.newCustomers) },
    ],
    footer: `Projected revenue: ${inr(projection.projectedRevenue)}`,
  };
  const topOpen = opportunities.filter((o) => o.stage !== "Won" && o.stage !== "Lost")
    .sort((a, b) => b.value * STAGE_PROBABILITY[b.stage] - a.value * STAGE_PROBABILITY[a.stage]).slice(0, 50);
  const gapDetail: DrillDetail = {
    title: "Closing the gap", subtitle: `${inr(gap)} to this month's target — best opportunities to close`,
    columns: [{ key: "lead", label: "Lead" }, { key: "stage", label: "Stage" }, { key: "value", label: "Value", align: "right" }],
    rows: topOpen.map((o) => ({ lead: o.title, stage: o.stage, value: inr(o.value) })),
  };

  // ---------- Chart data ----------
  const catCount = { Regular: 0, Detached: 0, New: 0 };
  customers.forEach((c) => catCount[c.category]++);
  const catData = [
    { name: "Regular", value: catCount.Regular },
    { name: "Detached", value: catCount.Detached },
    { name: "New", value: catCount.New },
  ];

  const stageMap = new Map<string, { value: number; count: number }>();
  opportunities.forEach((o) => {
    if (o.stage === "Won" || o.stage === "Lost") return;
    const cur = stageMap.get(o.stage) ?? { value: 0, count: 0 };
    cur.value += o.value * STAGE_PROBABILITY[o.stage]; cur.count += 1;
    stageMap.set(o.stage, cur);
  });
  const pipelineData = STAGES.map((s) => ({ stage: s, value: Math.round(stageMap.get(s)?.value ?? 0), count: stageMap.get(s)?.count ?? 0 }));

  const sellerProfiles = profiles.filter((p) => p.role === "Sales Head" || p.role === "Sales Executive");
  const teamData = manager
    ? sellerProfiles.map((e) => {
        const t = targets.find((x) => x.scope === "user" && x.period_type === "monthly" && x.owner_id === e.id);
        return { name: e.name.split(" ")[0], achieved: t?.achieved_amount ?? 0, target: t?.target_amount ?? 0 };
      }).filter((d) => d.target > 0).sort((a, b) => b.target - a.target)
    : [];
  const teamDetails: Record<string, DrillDetail> = {};
  sellerProfiles.forEach((e) => {
    const list = customers.filter((c) => c.assigned_to === e.id).sort((a, b) => b.total_revenue - a.total_revenue).slice(0, 80);
    teamDetails[e.name.split(" ")[0]] = {
      title: `${e.name} — accounts`, subtitle: `${list.length} customers`,
      columns: [{ key: "company", label: "Company" }, { key: "cat", label: "Category" }, { key: "revenue", label: "Revenue", align: "right" }],
      rows: list.map((c) => ({ company: c.company_name, cat: c.category, revenue: inr(c.total_revenue) })),
    };
  });

  const detachedPotential = customers.filter((c) => c.category === "Detached").reduce((s, c) => s + c.total_revenue * 0.3, 0);
  const yoyTrend = yoy.length >= 2 && yoy[yoy.length - 2].revenue > 0
    ? { dir: "up" as const, text: `+${Math.round((yoy[yoy.length - 1].revenue / yoy[yoy.length - 2].revenue) * 100 - 0)}%` } : undefined;

  return (
    <div className="animate-fade-in">
      <PageHeader
        title={manager ? "Executive Dashboard" : `Welcome back, ${profile.name.split(" ")[0]}`}
        subtitle={manager ? "Company-wide performance, projection & risk — click any metric to drill in" : "Your targets, pipeline & AI recommendations"}
      />

      <div className="stagger grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Monthly Target" animate={monthlyTarget} valueKind="inr" sub={periodT.monthly?.period} icon={<Target size={16} />} />
        <Stat label="Achieved" animate={achieved} valueKind="inr" tone="good" sub={pct(achievementPct) + " of target"} icon={<Wallet size={16} />}
          detail={{ title: "Achieved — by seller", subtitle: "Current month", columns: [{ key: "seller", label: "Seller" }, { key: "target", label: "Target", align: "right" }, { key: "ach", label: "Achieved", align: "right" }],
            rows: sellerProfiles.map((e) => { const t = targets.find((x) => x.scope === "user" && x.period_type === "monthly" && x.owner_id === e.id); return { seller: e.name, target: inr(t?.target_amount ?? 0), ach: inr(t?.achieved_amount ?? 0) }; }) }} />
        <Stat label="Gap" animate={gap} valueKind="inr" tone={gap > 0 ? "bad" : "good"} sub="remaining this month" icon={<AlertTriangle size={16} />} detail={gapDetail} />
        <Stat label="AI Projection" animate={projection.projectedRevenue} valueKind="inr" tone="warn" sub={`${projection.confidence}% confidence`} icon={<Sparkles size={16} />} detail={projectionDetail} />
      </div>

      <Card className="mt-4 p-5">
        <div className="mb-2 flex items-center justify-between">
          <p className="font-display text-sm font-semibold text-ink-700">Month progress</p>
          <p className="text-sm text-ink-500"><span className="tnum font-medium text-ink-700">{inr(achieved)}</span> / {inr(monthlyTarget)}</p>
        </div>
        <ProgressBar value={achievementPct} tone={achievementPct >= 80 ? "good" : achievementPct >= 50 ? "brand" : "bad"} />
      </Card>

      <div className="mt-4"><AiInsight title="AI Projection Insight" text={aiExplain} /></div>

      <div className="mt-6"><SectionTitle>Performance</SectionTitle></div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Revenue Trend" subtitle="Monthly revenue, last 24 months — click a month" />
          <div className="p-2"><RevenueTrend data={monthlySeries} details={monthDetails} /></div>
        </Card>
        <Card>
          <CardHeader title="Year-on-Year" subtitle="Revenue by financial year" />
          <div className="p-2"><YoYBar data={yoy} /></div>
          {yoyTrend && <div className="border-t border-ink-100 px-5 py-3 text-xs text-ink-500">Latest FY tracking at <strong className="text-ink-700">{pct((yoy[yoy.length - 1].revenue / yoy[yoy.length - 2].revenue) * 100)}</strong> of last FY (in progress).</div>}
        </Card>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader title="Customer Mix" subtitle={`${customers.length} customers — click a segment`} />
          <div className="p-2"><CategoryPie data={catData} details={catDetails} /></div>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader title="Weighted Pipeline" subtitle="Expected value by stage — click a bar" />
          <div className="p-2"><PipelineBar data={pipelineData} details={pipeDetails} /></div>
        </Card>
      </div>

      {manager && (
        <>
          <div className="mt-6"><SectionTitle>Team</SectionTitle></div>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader title="Seller Performance" subtitle="Achieved vs target — click a seller" />
              <div className="p-2"><TeamBar data={teamData} details={teamDetails} /></div>
            </Card>
            <div className="grid grid-cols-1 gap-4">
              <Stat label="Quarterly Forecast (Expected)" animate={forecastQuarter.scenarios.expected} valueKind="inr" sub={`Best ${inr(forecastQuarter.scenarios.best)} · Worst ${inr(forecastQuarter.scenarios.worst)}`} icon={<TrendingUp size={16} />} />
              <Stat label="Detached Recovery Potential" animate={detachedPotential} valueKind="inr" tone="warn" sub={`${catCount.Detached} detached customers`} detail={catDetails.Detached} />
            </div>
          </div>
        </>
      )}

      <div className="mt-6"><SectionTitle>Risk</SectionTitle></div>
      <Card>
        <CardHeader title="Revenue Risk Alerts" subtitle={`${risks.length} active`}
          action={<Link href="/recommendations" className="text-xs font-medium text-brand-600 hover:underline">View all →</Link>} />
        <div className="divide-y divide-ink-50">
          {risks.slice(0, 6).map((r) => (
            <div key={r.id} className="flex items-center gap-3 px-5 py-3 transition hover:bg-ink-50/50">
              <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${r.severity === "High" ? "bg-rose-50 text-rose-500" : r.severity === "Medium" ? "bg-amber-50 text-amber-500" : "bg-ink-100 text-ink-400"}`}>
                <AlertTriangle size={15} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-ink-800">{r.title}</p>
                <p className="truncate text-xs text-ink-500">{r.detail}</p>
              </div>
              <Badge>{r.severity}</Badge>
              <span className="hidden text-xs font-medium text-ink-500 tnum sm:block">{inr(r.revenueAtRisk)}</span>
            </div>
          ))}
          {risks.length === 0 && <p className="px-5 py-6 text-center text-sm text-ink-400">No active risks 🎉</p>}
        </div>
      </Card>
    </div>
  );
}

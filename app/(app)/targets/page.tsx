import { requireProfile, isManager } from "@/lib/auth";
import { getTargets, getProfiles } from "@/lib/data";
import { selectTargets } from "@/lib/analytics";
import { PageHeader, Card, CardHeader, Stat, ProgressBar, InfoTip } from "@/components/ui";
import { RadialGauge } from "@/components/Charts";
import { inr, pct } from "@/lib/utils";
import type { Target } from "@/lib/types";
import { Trophy, CalendarRange, CalendarDays } from "lucide-react";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

function PeriodCard({ label, icon, t, info }: { label: string; icon: React.ReactNode; t: Target | null; info: string }) {
  const target = t?.target_amount ?? 0;
  const achieved = t?.achieved_amount ?? 0;
  const p = target > 0 ? (achieved / target) * 100 : 0;
  return (
    <Card interactive className="p-5">
      <div className="mb-3 flex items-center justify-between">
        <span className="flex items-center gap-2 font-display text-sm font-semibold text-ink-700">{icon} {label} <InfoTip text={info} /></span>
        <span className="text-xs text-ink-400">{t?.period}</span>
      </div>
      <div className="flex items-end gap-2">
        <p className="font-display text-2xl font-bold text-ink-900 tnum">{inr(achieved)}</p>
        <p className="mb-1 text-sm text-ink-400">/ {inr(target)}</p>
      </div>
      <div className="mt-3"><ProgressBar value={p} tone={p >= 80 ? "good" : p >= 50 ? "brand" : "bad"} /></div>
      <p className="mt-1.5 text-xs font-medium text-ink-500">{pct(p)} achieved · {inr(Math.max(0, target - achieved))} to go</p>
    </Card>
  );
}

export default async function TargetsPage() {
  const profile = await requireProfile();
  const manager = isManager(profile.role);
  const [targets, profiles] = await Promise.all([getTargets(), getProfiles()]);
  const mine = selectTargets(profile, targets);

  const annual = mine.annual;
  const annualPct = annual && annual.target_amount > 0 ? (annual.achieved_amount / annual.target_amount) * 100 : 0;
  const monthlyPct = mine.monthly && mine.monthly.target_amount > 0 ? (mine.monthly.achieved_amount / mine.monthly.target_amount) * 100 : 0;

  const sellers = profiles.filter((p) => p.role === "Sales Head" || p.role === "Sales Executive");
  const team = manager
    ? sellers.map((e) => {
        const t = targets.find((x) => x.scope === "user" && x.period_type === "monthly" && x.owner_id === e.id);
        const target = t?.target_amount ?? 0, achieved = t?.achieved_amount ?? 0;
        return { name: e.name, role: e.role, target, achieved, p: target > 0 ? (achieved / target) * 100 : 0 };
      }).filter((d) => d.target > 0).sort((a, b) => b.target - a.target)
    : [];

  return (
    <div className="animate-fade-in">
      <PageHeader title="Target Management" subtitle={manager ? "Company & team targets across all periods" : "Your personal targets & progress"} />

      {/* Hero */}
      <Card className="mb-5 overflow-hidden">
        <div className="grid grid-cols-1 md:grid-cols-3">
          <div className="flex flex-col justify-center gap-2 bg-gradient-to-br from-brand-700 via-secondary-600 to-accent-500 p-6 text-white">
            <p className="flex items-center gap-2 text-sm font-medium text-white/80"><Trophy size={16} /> {annual?.period} {manager ? "Company" : "Personal"} Target</p>
            <p className="font-display text-3xl font-bold tnum">{inr(annual?.target_amount ?? 0)}</p>
            <p className="text-sm text-white/80">{inr(annual?.achieved_amount ?? 0)} achieved · {inr(Math.max(0, (annual?.target_amount ?? 0) - (annual?.achieved_amount ?? 0)))} remaining</p>
            <div className="mt-2"><div className="h-2 w-full overflow-hidden rounded-full bg-white/20"><div className="h-full rounded-full bg-white/90" style={{ width: `${Math.min(100, annualPct)}%` }} /></div></div>
          </div>
          <div className="flex items-center justify-center p-4"><RadialGauge value={annualPct} label="annual attainment" /></div>
          <div className="flex items-center justify-center p-4"><RadialGauge value={monthlyPct} label="this month" /></div>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <PeriodCard label="Annual" icon={<Trophy size={15} className="text-brand-600" />} t={mine.annual} info="Full financial-year target and achievement to date (April–March)." />
        <PeriodCard label="Quarterly" icon={<CalendarRange size={15} className="text-secondary-600" />} t={mine.quarterly} info="Current fiscal-quarter target. Q1 = Apr–Jun." />
        <PeriodCard label="Monthly" icon={<CalendarDays size={15} className="text-accent-600" />} t={mine.monthly} info="This month's target, including any backlog rolled over from last month." />
      </div>

      {manager && (
        <Card className="mt-5">
          <CardHeader title="Team — Monthly Targets" subtitle="Per salesperson, this month" info="Each seller's monthly target vs achieved. The Sales Head carries their own quota as a producer." />
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-ink-100 bg-ink-50 text-left text-xs uppercase tracking-wide text-ink-500">
                  <th className="px-5 py-3 font-medium">Salesperson</th>
                  <th className="px-5 py-3 font-medium">Role</th>
                  <th className="px-5 py-3 text-right font-medium">Target</th>
                  <th className="px-5 py-3 text-right font-medium">Achieved</th>
                  <th className="w-48 px-5 py-3 font-medium">Progress</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-50">
                {team.map((d) => (
                  <tr key={d.name} className="transition hover:bg-ink-50/60">
                    <td className="px-5 py-3 font-medium text-ink-800">{d.name}</td>
                    <td className="px-5 py-3 text-ink-500">{d.role}</td>
                    <td className="px-5 py-3 text-right text-ink-700 tnum">{inr(d.target)}</td>
                    <td className="px-5 py-3 text-right font-medium text-ink-800 tnum">{inr(d.achieved)}</td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex-1"><ProgressBar value={d.p} tone={d.p >= 80 ? "good" : d.p >= 50 ? "brand" : "bad"} /></div>
                        <span className="w-10 text-right text-xs font-medium text-ink-500">{pct(d.p)}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}

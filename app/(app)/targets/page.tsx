import { requireProfile, isManager } from "@/lib/auth";
import { getTargets, getProfiles } from "@/lib/data";
import { selectTargets } from "@/lib/analytics";
import { PageHeader, Card, CardHeader, Stat, ProgressBar } from "@/components/ui";
import { inr, pct } from "@/lib/utils";
import type { Target } from "@/lib/types";

export const dynamic = "force-dynamic";

function TargetRow({ label, t }: { label: string; t: Target | null }) {
  const target = t?.target_amount ?? 0;
  const achieved = t?.achieved_amount ?? 0;
  const p = target > 0 ? (achieved / target) * 100 : 0;
  return (
    <div className="px-5 py-4">
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-sm font-medium text-slate-700">{label} <span className="text-xs text-slate-400">({t?.period})</span></span>
        <span className="text-sm text-slate-500">{inr(achieved)} / {inr(target)} · {pct(p)}</span>
      </div>
      <ProgressBar value={p} tone={p >= 80 ? "good" : p >= 50 ? "brand" : "bad"} />
    </div>
  );
}

export default async function TargetsPage() {
  const profile = await requireProfile();
  const manager = isManager(profile.role);
  const [targets, profiles] = await Promise.all([getTargets(), getProfiles()]);
  const mine = selectTargets(profile, targets);

  const annual = mine.annual;
  const annualPct = annual && annual.target_amount > 0 ? (annual.achieved_amount / annual.target_amount) * 100 : 0;

  const execs = profiles.filter((p) => p.role === "Sales Executive");

  return (
    <div>
      <PageHeader title="Target Management" subtitle={manager ? "Company & team targets" : "Your personal targets"} />

      <div className="mb-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Annual Target" value={inr(annual?.target_amount ?? 0)} sub={annual?.period} />
        <Stat label="Annual Achieved" value={inr(annual?.achieved_amount ?? 0)} tone="good" sub={pct(annualPct)} />
        <Stat label="Monthly Target" value={inr(mine.monthly?.target_amount ?? 0)} />
        <Stat label="Quarterly Target" value={inr(mine.quarterly?.target_amount ?? 0)} />
      </div>

      <Card>
        <CardHeader title={manager ? "Company Targets" : "My Targets"} subtitle="Annual / Quarterly / Monthly" />
        <div className="divide-y divide-slate-100">
          <TargetRow label="Annual" t={mine.annual} />
          <TargetRow label="Quarterly" t={mine.quarterly} />
          <TargetRow label="Monthly" t={mine.monthly} />
        </div>
      </Card>

      {manager && (
        <Card className="mt-4">
          <CardHeader title="Team — Monthly Targets" subtitle="Per salesperson" />
          <div className="divide-y divide-slate-100">
            {execs.map((e) => {
              const t = targets.find((x) => x.scope === "user" && x.period_type === "monthly" && x.owner_id === e.id) ?? null;
              return <TargetRow key={e.id} label={e.name} t={t} />;
            })}
          </div>
        </Card>
      )}
    </div>
  );
}

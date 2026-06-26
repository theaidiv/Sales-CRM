import { requireProfile } from "@/lib/auth";
import { getOpportunities, getCustomers } from "@/lib/data";
import { PageHeader, Stat, Badge } from "@/components/ui";
import { inr } from "@/lib/utils";
import { STAGE_PROBABILITY, type OppStage } from "@/lib/types";

export const dynamic = "force-dynamic";

const COLUMNS: OppStage[] = [
  "New", "Contacted", "Meeting Scheduled", "Quotation Shared", "Negotiation", "On Hold",
];

export default async function LeadsPage() {
  const profile = await requireProfile();
  const [opportunities, customers] = await Promise.all([getOpportunities(profile), getCustomers(profile)]);
  const custName = new Map(customers.map((c) => [c.id, c.company_name]));

  const open = opportunities.filter((o) => o.stage !== "Won" && o.stage !== "Lost");
  const won = opportunities.filter((o) => o.stage === "Won");
  const weighted = open.reduce((s, o) => s + o.value * STAGE_PROBABILITY[o.stage], 0);
  const totalValue = open.reduce((s, o) => s + o.value, 0);

  const byStage = (stage: OppStage) =>
    open.filter((o) => o.stage === stage).sort((a, b) => b.value - a.value);

  return (
    <div>
      <PageHeader title="Leads & Pipeline" subtitle="Opportunity stages from New to Won" />

      <div className="mb-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Open Opportunities" value={String(open.length)} />
        <Stat label="Pipeline Value" value={inr(totalValue)} />
        <Stat label="Weighted Value" value={inr(weighted)} tone="warn" sub="probability-adjusted" />
        <Stat label="Won (all time)" value={String(won.length)} tone="good" />
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {COLUMNS.map((stage) => {
          const cards = byStage(stage);
          const colValue = cards.reduce((s, o) => s + o.value, 0);
          return (
            <div key={stage} className="rounded-xl border border-slate-200 bg-slate-50/60">
              <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
                <div className="flex items-center gap-2">
                  <Badge>{stage}</Badge>
                  <span className="text-xs text-slate-400">{cards.length}</span>
                </div>
                <span className="text-xs font-medium text-slate-500">{inr(colValue)}</span>
              </div>
              <div className="max-h-[480px] space-y-2 overflow-y-auto p-3">
                {cards.slice(0, 25).map((o) => (
                  <div key={o.id} className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
                    <p className="text-sm font-medium text-slate-800">{o.title}</p>
                    <p className="mt-0.5 text-xs text-slate-400">{custName.get(o.customer_id ?? "") ?? "—"}</p>
                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-sm font-semibold text-slate-700">{inr(o.value)}</span>
                      <span className="text-xs text-slate-400">{o.probability}%</span>
                    </div>
                  </div>
                ))}
                {cards.length === 0 && <p className="py-4 text-center text-xs text-slate-400">Empty</p>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

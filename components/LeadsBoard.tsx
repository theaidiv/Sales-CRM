"use client";

import { useState, useMemo } from "react";
import type { Opportunity, Customer, Profile, OppStage } from "@/lib/types";
import { STAGE_PROBABILITY } from "@/lib/types";
import { Badge, Stat } from "@/components/ui";
import { NewLeadModal } from "@/components/NewLeadModal";
import { inr } from "@/lib/utils";
import { Search } from "lucide-react";

const COLUMNS: OppStage[] = ["New", "Contacted", "Meeting Scheduled", "Quotation Shared", "Negotiation", "On Hold"];

export function LeadsBoard({
  opportunities, customers, profiles, currentUserId,
}: { opportunities: Opportunity[]; customers: Customer[]; profiles: Profile[]; currentUserId: string }) {
  const [q, setQ] = useState("");
  const [owner, setOwner] = useState("All");

  const custName = useMemo(() => new Map(customers.map((c) => [c.id, c.company_name])), [customers]);
  const sellers = useMemo(() => profiles.filter((p) => p.role !== "Admin"), [profiles]);

  const filtered = useMemo(() => opportunities.filter((o) => {
    if (owner === "Mine" && o.assigned_to !== currentUserId) return false;
    if (owner !== "All" && owner !== "Mine" && o.assigned_to !== owner) return false;
    if (q) {
      const s = q.toLowerCase();
      return o.title.toLowerCase().includes(s) || (custName.get(o.customer_id ?? "") ?? "").toLowerCase().includes(s);
    }
    return true;
  }), [opportunities, q, owner, currentUserId, custName]);

  const open = filtered.filter((o) => o.stage !== "Won" && o.stage !== "Lost");
  const won = filtered.filter((o) => o.stage === "Won");
  const weighted = open.reduce((s, o) => s + o.value * STAGE_PROBABILITY[o.stage], 0);
  const totalValue = open.reduce((s, o) => s + o.value, 0);
  const byStage = (stage: OppStage) => open.filter((o) => o.stage === stage).sort((a, b) => b.value - a.value);

  const selCls = "rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-sm outline-none focus:border-brand-500";

  return (
    <div>
      <div className="mb-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Open Opportunities" value={String(open.length)} />
        <Stat label="Pipeline Value" value={inr(totalValue)} />
        <Stat label="Weighted Value" value={inr(weighted)} tone="warn" sub="probability-adjusted" />
        <Stat label="Won" value={String(won.length)} tone="good" />
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative grow sm:max-w-xs">
          <Search size={16} className="absolute left-3 top-2.5 text-slate-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search lead or customer…"
            className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100" />
        </div>
        <select value={owner} onChange={(e) => setOwner(e.target.value)} className={selCls}>
          <option value="All">All owners</option>
          <option value="Mine">My leads</option>
          {sellers.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <div className="ml-auto"><NewLeadModal customers={customers} /></div>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {COLUMNS.map((stage) => {
          const cards = byStage(stage);
          const colValue = cards.reduce((s, o) => s + o.value, 0);
          return (
            <div key={stage} className="rounded-xl border border-slate-200 bg-slate-50/60">
              <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
                <div className="flex items-center gap-2"><Badge>{stage}</Badge><span className="text-xs text-slate-400">{cards.length}</span></div>
                <span className="text-xs font-medium text-slate-500">{inr(colValue)}</span>
              </div>
              <div className="max-h-[480px] space-y-2 overflow-y-auto p-3">
                {cards.slice(0, 40).map((o) => (
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

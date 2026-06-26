"use client";

import { useState, useMemo } from "react";
import type { Activity, Customer, Profile } from "@/lib/types";
import { Badge, Card, CardHeader } from "@/components/ui";
import { fmtDate } from "@/lib/utils";
import { Search } from "lucide-react";

const TYPES = ["Call", "Meeting", "Visit", "Follow-Up", "Quotation", "Order", "Email"];

export function ActivitiesTable({
  activities, customers, profiles, currentUserId,
}: { activities: Activity[]; customers: Customer[]; profiles: Profile[]; currentUserId: string }) {
  const [q, setQ] = useState("");
  const [type, setType] = useState("All");
  const [owner, setOwner] = useState("All");
  const [asc, setAsc] = useState(false);

  const custName = useMemo(() => new Map(customers.map((c) => [c.id, c.company_name])), [customers]);
  const userName = useMemo(() => new Map(profiles.map((p) => [p.id, p.name])), [profiles]);
  const sellers = useMemo(() => profiles.filter((p) => p.role !== "Admin"), [profiles]);

  const filtered = useMemo(() => {
    let list = activities.filter((a) => {
      if (type !== "All" && a.type !== type) return false;
      if (owner === "Mine" && a.user_id !== currentUserId) return false;
      if (owner !== "All" && owner !== "Mine" && a.user_id !== owner) return false;
      if (q) {
        const s = q.toLowerCase();
        return (a.notes ?? "").toLowerCase().includes(s) || (custName.get(a.customer_id ?? "") ?? "").toLowerCase().includes(s);
      }
      return true;
    });
    list = [...list].sort((a, b) => (asc ? 1 : -1) * a.activity_date.localeCompare(b.activity_date));
    return list;
  }, [activities, q, type, owner, asc, currentUserId, custName]);

  const selCls = "rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-sm outline-none focus:border-brand-500";

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative grow sm:max-w-xs">
          <Search size={16} className="absolute left-3 top-2.5 text-slate-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search notes or customer…"
            className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100" />
        </div>
        <select value={type} onChange={(e) => setType(e.target.value)} className={selCls}>
          {["All", ...TYPES].map((t) => <option key={t} value={t}>{t === "All" ? "All types" : t}</option>)}
        </select>
        <select value={owner} onChange={(e) => setOwner(e.target.value)} className={selCls}>
          <option value="All">All users</option>
          <option value="Mine">My activity</option>
          {sellers.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <button onClick={() => setAsc(!asc)} className={selCls}>Date {asc ? "↑" : "↓"}</button>
      </div>

      <Card>
        <CardHeader title="Activity Log" subtitle={`${filtered.length} of ${activities.length} activities`} />
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Customer</th>
                <th className="px-4 py-3 font-medium">Notes</th>
                <th className="hidden px-4 py-3 font-medium lg:table-cell">User</th>
                <th className="px-4 py-3 font-medium">Outcome</th>
                <th className="px-4 py-3 font-medium">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.slice(0, 150).map((a) => (
                <tr key={a.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3"><Badge>{a.type}</Badge></td>
                  <td className="px-4 py-3 text-slate-700">{custName.get(a.customer_id ?? "") ?? "—"}</td>
                  <td className="max-w-xs truncate px-4 py-3 text-slate-600">{a.notes}</td>
                  <td className="hidden px-4 py-3 text-slate-500 lg:table-cell">{userName.get(a.user_id ?? "") ?? "—"}</td>
                  <td className="px-4 py-3 text-slate-500">{a.outcome}</td>
                  <td className="px-4 py-3 text-slate-500">{fmtDate(a.activity_date)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && <p className="py-10 text-center text-sm text-slate-400">No activities match.</p>}
      </Card>
    </div>
  );
}

"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import type { Customer, Profile } from "@/lib/types";
import { Badge, ProgressBar } from "@/components/ui";
import { inr, fmtDate } from "@/lib/utils";
import { Search, ArrowUpDown } from "lucide-react";

type SortKey = "revenue" | "health" | "name" | "lastOrder";

export function CustomersTable({
  customers, profiles, currentUserId,
}: { customers: Customer[]; profiles: Profile[]; currentUserId: string }) {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("All");
  const [owner, setOwner] = useState("All");
  const [geo, setGeo] = useState("All");
  const [sort, setSort] = useState<SortKey>("revenue");
  const [asc, setAsc] = useState(false);

  const nameById = useMemo(() => new Map(profiles.map((p) => [p.id, p.name])), [profiles]);
  const sellers = useMemo(() => profiles.filter((p) => p.role !== "Admin"), [profiles]);

  const filtered = useMemo(() => {
    let list = customers.filter((c) => {
      if (cat !== "All" && c.category !== cat) return false;
      if (owner === "Mine" && c.assigned_to !== currentUserId) return false;
      if (owner !== "All" && owner !== "Mine" && c.assigned_to !== owner) return false;
      if (geo === "Local" && c.country !== "India") return false;
      if (geo === "Export" && c.country === "India") return false;
      if (q) {
        const s = q.toLowerCase();
        return (
          c.company_name.toLowerCase().includes(s) ||
          (c.country ?? "").toLowerCase().includes(s) ||
          (c.industry ?? "").toLowerCase().includes(s) ||
          (c.contact_person ?? "").toLowerCase().includes(s)
        );
      }
      return true;
    });
    const dir = asc ? 1 : -1;
    list = [...list].sort((a, b) => {
      switch (sort) {
        case "name": return dir * a.company_name.localeCompare(b.company_name);
        case "health": return dir * (a.health_score - b.health_score);
        case "lastOrder": return dir * ((a.last_order_date ?? "").localeCompare(b.last_order_date ?? ""));
        default: return dir * (a.total_revenue - b.total_revenue);
      }
    });
    return list;
  }, [customers, q, cat, owner, geo, sort, asc, currentUserId]);

  function toggleSort(k: SortKey) {
    if (sort === k) setAsc(!asc);
    else { setSort(k); setAsc(false); }
  }
  const SortTh = ({ k, label, className }: { k: SortKey; label: string; className?: string }) => (
    <th className={className}>
      <button onClick={() => toggleSort(k)} className="inline-flex items-center gap-1 font-medium hover:text-slate-700">
        {label} <ArrowUpDown size={12} className={sort === k ? "text-brand-600" : "text-slate-300"} />
      </button>
    </th>
  );

  const selCls = "rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-sm outline-none focus:border-brand-500";

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative grow sm:max-w-xs">
          <Search size={16} className="absolute left-3 top-2.5 text-slate-400" />
          <input
            value={q} onChange={(e) => setQ(e.target.value)}
            placeholder="Search company, contact, country…"
            className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
          />
        </div>
        <select value={owner} onChange={(e) => setOwner(e.target.value)} className={selCls}>
          <option value="All">All owners</option>
          <option value="Mine">My customers</option>
          {sellers.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <select value={cat} onChange={(e) => setCat(e.target.value)} className={selCls}>
          {["All", "Regular", "Detached", "New"].map((c) => <option key={c} value={c}>{c === "All" ? "All categories" : c}</option>)}
        </select>
        <select value={geo} onChange={(e) => setGeo(e.target.value)} className={selCls}>
          <option value="All">Local + Export</option>
          <option value="Local">Local (India)</option>
          <option value="Export">Export</option>
        </select>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <SortTh k="name" label="Company" className="px-4 py-3" />
                <th className="px-4 py-3 font-medium">Category</th>
                <SortTh k="health" label="Health" className="px-4 py-3" />
                <th className="hidden px-4 py-3 font-medium md:table-cell">Country</th>
                <th className="hidden px-4 py-3 font-medium lg:table-cell">Owner</th>
                <SortTh k="revenue" label="Revenue" className="px-4 py-3 text-right" />
                <SortTh k="lastOrder" label="Last Order" className="hidden px-4 py-3 sm:table-cell" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.slice(0, 300).map((c) => (
                <tr key={c.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <Link href={`/customers/${c.id}`} className="font-medium text-slate-800 hover:text-brand-600">{c.company_name}</Link>
                    <p className="text-xs text-slate-400">{c.industry}</p>
                  </td>
                  <td className="px-4 py-3"><Badge>{c.category}</Badge></td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-16"><ProgressBar value={c.health_score} tone={c.health_score >= 70 ? "good" : c.health_score >= 45 ? "brand" : "bad"} /></div>
                      <span className="text-xs text-slate-500">{c.health_score}</span>
                    </div>
                  </td>
                  <td className="hidden px-4 py-3 text-slate-600 md:table-cell">{c.country}</td>
                  <td className="hidden px-4 py-3 text-slate-600 lg:table-cell">{nameById.get(c.assigned_to ?? "") ?? "—"}</td>
                  <td className="px-4 py-3 text-right font-medium text-slate-800">{inr(c.total_revenue)}</td>
                  <td className="hidden px-4 py-3 text-slate-500 sm:table-cell">{fmtDate(c.last_order_date)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && <p className="py-10 text-center text-sm text-slate-400">No customers match your filters.</p>}
      </div>
      <p className="mt-2 text-xs text-slate-400">Showing {Math.min(filtered.length, 300)} of {filtered.length} (database has {customers.length})</p>
    </div>
  );
}

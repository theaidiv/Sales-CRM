"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import type { Customer, Profile } from "@/lib/types";
import { Badge, ProgressBar } from "@/components/ui";
import { inr, fmtDate } from "@/lib/utils";
import { Search } from "lucide-react";

export function CustomersTable({ customers, profiles }: { customers: Customer[]; profiles: Profile[] }) {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<string>("All");
  const nameById = useMemo(() => new Map(profiles.map((p) => [p.id, p.name])), [profiles]);

  const filtered = useMemo(() => {
    return customers.filter((c) => {
      if (cat !== "All" && c.category !== cat) return false;
      if (q) {
        const s = q.toLowerCase();
        return (
          c.company_name.toLowerCase().includes(s) ||
          (c.country ?? "").toLowerCase().includes(s) ||
          (c.industry ?? "").toLowerCase().includes(s)
        );
      }
      return true;
    });
  }, [customers, q, cat]);

  const cats = ["All", "Regular", "Detached", "New"];

  return (
    <div>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search size={16} className="absolute left-3 top-2.5 text-slate-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search company, country, industry…"
            className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
          />
        </div>
        <div className="flex gap-1.5">
          {cats.map((c) => (
            <button
              key={c}
              onClick={() => setCat(c)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                cat === c ? "bg-brand-600 text-white" : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <th className="px-4 py-3 font-medium">Company</th>
                <th className="px-4 py-3 font-medium">Category</th>
                <th className="px-4 py-3 font-medium">Health</th>
                <th className="hidden px-4 py-3 font-medium md:table-cell">Country</th>
                <th className="hidden px-4 py-3 font-medium lg:table-cell">Owner</th>
                <th className="px-4 py-3 text-right font-medium">Revenue</th>
                <th className="hidden px-4 py-3 font-medium sm:table-cell">Last Order</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.slice(0, 200).map((c) => (
                <tr key={c.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <Link href={`/customers/${c.id}`} className="font-medium text-slate-800 hover:text-brand-600">
                      {c.company_name}
                    </Link>
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
        {filtered.length === 0 && <p className="py-10 text-center text-sm text-slate-400">No customers match.</p>}
      </div>
      <p className="mt-2 text-xs text-slate-400">Showing {Math.min(filtered.length, 200)} of {filtered.length} customers</p>
    </div>
  );
}

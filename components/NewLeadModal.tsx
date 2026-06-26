"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { createLead } from "@/app/(app)/leads/actions";
import type { Customer, OppStage } from "@/lib/types";
import { X, Plus, Search } from "lucide-react";

const STAGES: OppStage[] = ["New", "Contacted", "Meeting Scheduled", "Quotation Shared", "Negotiation"];

export function NewLeadModal({ customers }: { customers: Customer[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"existing" | "new">("existing");

  const [custSearch, setCustSearch] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [newCompany, setNewCompany] = useState("");
  const [contact, setContact] = useState("");
  const [country, setCountry] = useState("");
  const [title, setTitle] = useState("");
  const [value, setValue] = useState("");
  const [stage, setStage] = useState<OppStage>("New");
  const [expectedClose, setExpectedClose] = useState("");
  const [notes, setNotes] = useState("");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const matches = useMemo(() => {
    if (!custSearch) return customers.slice(0, 8);
    const s = custSearch.toLowerCase();
    return customers.filter((c) => c.company_name.toLowerCase().includes(s)).slice(0, 8);
  }, [custSearch, customers]);

  function reset() {
    setMode("existing"); setCustSearch(""); setCustomerId(""); setNewCompany("");
    setContact(""); setCountry(""); setTitle(""); setValue(""); setStage("New");
    setExpectedClose(""); setNotes(""); setError(null);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setError(null);
    const res = await createLead({
      customerId: mode === "existing" ? customerId : undefined,
      newCompany: mode === "new" ? newCompany : undefined,
      contact, country, title,
      value: Number(value) * 100000, // user enters lakhs
      stage, expectedClose, notes,
    });
    setSaving(false);
    if (!res.ok) { setError(res.error ?? "Something went wrong."); return; }
    setOpen(false); reset();
    router.refresh();
  }

  const field = "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100";
  const selectedName = customers.find((c) => c.id === customerId)?.company_name;

  return (
    <>
      <button onClick={() => setOpen(true)} className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-brand-700">
        <Plus size={16} /> New Lead
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/40 p-4 backdrop-blur-sm" onClick={() => setOpen(false)}>
          <div className="mt-10 w-full max-w-lg rounded-2xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <h3 className="text-base font-semibold text-slate-800">Add New Lead</h3>
              <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
            </div>

            <form onSubmit={submit} className="space-y-4 px-5 py-4">
              {/* Customer selector */}
              <div>
                <div className="mb-1.5 flex items-center gap-3 text-xs font-medium text-slate-600">
                  <label>Customer</label>
                  <div className="flex rounded-md bg-slate-100 p-0.5">
                    <button type="button" onClick={() => setMode("existing")} className={`rounded px-2 py-0.5 ${mode === "existing" ? "bg-white shadow-sm text-slate-800" : "text-slate-500"}`}>Existing</button>
                    <button type="button" onClick={() => setMode("new")} className={`rounded px-2 py-0.5 ${mode === "new" ? "bg-white shadow-sm text-slate-800" : "text-slate-500"}`}>New company</button>
                  </div>
                </div>

                {mode === "existing" ? (
                  customerId ? (
                    <div className="flex items-center justify-between rounded-lg border border-brand-200 bg-brand-50 px-3 py-2 text-sm">
                      <span className="font-medium text-brand-800">{selectedName}</span>
                      <button type="button" onClick={() => setCustomerId("")} className="text-xs text-brand-600 hover:underline">Change</button>
                    </div>
                  ) : (
                    <div>
                      <div className="relative">
                        <Search size={15} className="absolute left-3 top-2.5 text-slate-400" />
                        <input value={custSearch} onChange={(e) => setCustSearch(e.target.value)} placeholder="Search customer…" className={field + " pl-9"} />
                      </div>
                      <div className="mt-1 max-h-40 overflow-y-auto rounded-lg border border-slate-100">
                        {matches.map((c) => (
                          <button type="button" key={c.id} onClick={() => setCustomerId(c.id)} className="block w-full px-3 py-2 text-left text-sm hover:bg-slate-50">
                            {c.company_name} <span className="text-xs text-slate-400">· {c.category} · {c.country}</span>
                          </button>
                        ))}
                        {matches.length === 0 && <p className="px-3 py-2 text-xs text-slate-400">No match — switch to “New company”.</p>}
                      </div>
                    </div>
                  )
                ) : (
                  <div className="space-y-2">
                    <input value={newCompany} onChange={(e) => setNewCompany(e.target.value)} placeholder="Company name" className={field} required />
                    <div className="grid grid-cols-2 gap-2">
                      <input value={contact} onChange={(e) => setContact(e.target.value)} placeholder="Contact person" className={field} />
                      <input value={country} onChange={(e) => setCountry(e.target.value)} placeholder="Country" className={field} />
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Opportunity title</label>
                <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Supply of valves" className={field} required />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">Value (₹ lakhs)</label>
                  <input type="number" step="0.1" min="0" value={value} onChange={(e) => setValue(e.target.value)} placeholder="2.5" className={field} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">Stage</label>
                  <select value={stage} onChange={(e) => setStage(e.target.value as OppStage)} className={field}>
                    {STAGES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Expected close date</label>
                <input type="date" value={expectedClose} onChange={(e) => setExpectedClose(e.target.value)} className={field} />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Notes</label>
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Any context…" className={field} />
              </div>

              {error && <p className="text-sm text-rose-600">{error}</p>}

              <div className="flex justify-end gap-2 pt-1">
                <button type="button" onClick={() => setOpen(false)} className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100">Cancel</button>
                <button type="submit" disabled={saving} className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60">
                  {saving ? "Saving…" : "Add Lead"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

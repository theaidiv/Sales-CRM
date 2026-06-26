"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createCustomer } from "@/app/(app)/customers/actions";
import type { Customer, Profile } from "@/lib/types";
import { X, Plus, AlertCircle } from "lucide-react";

export function NewCustomerModal({ customers, sellers }: { customers: Customer[]; sellers: Profile[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({
    company_name: "", contact_person: "", phone: "", email: "",
    country: "", industry: "", category: "New" as "New" | "Regular", assigned_to: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Surface possible duplicates ("existing customer") as the user types.
  const dupes = useMemo(() => {
    const s = f.company_name.trim().toLowerCase();
    if (s.length < 3) return [];
    return customers.filter((c) => c.company_name.toLowerCase().includes(s)).slice(0, 4);
  }, [f.company_name, customers]);

  const set = (k: keyof typeof f) => (e: any) => setF({ ...f, [k]: e.target.value });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setError(null);
    const res = await createCustomer(f);
    setSaving(false);
    if (!res.ok) { setError(res.error ?? "Something went wrong."); return; }
    setOpen(false);
    setF({ company_name: "", contact_person: "", phone: "", email: "", country: "", industry: "", category: "New", assigned_to: "" });
    if (res.id) router.push(`/customers/${res.id}`);
    else router.refresh();
  }

  const field = "w-full rounded-lg border border-ink-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100";

  return (
    <>
      <button onClick={() => setOpen(true)} className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-brand-700 to-accent-500 px-3.5 py-2 text-sm font-semibold text-white shadow-sm transition hover:opacity-90">
        <Plus size={16} /> Add Customer
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink-900/40 p-4 backdrop-blur-sm" onClick={() => setOpen(false)}>
          <div className="mt-10 w-full max-w-lg animate-scale-in rounded-2xl bg-white shadow-elevated" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-ink-100 px-5 py-4">
              <h3 className="font-display text-base font-semibold text-ink-800">Add Customer</h3>
              <button onClick={() => setOpen(false)} className="text-ink-400 hover:text-ink-600"><X size={18} /></button>
            </div>

            <form onSubmit={submit} className="space-y-4 px-5 py-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-ink-600">Company name</label>
                <input value={f.company_name} onChange={set("company_name")} placeholder="e.g. Acme Industries" className={field} required />
                {dupes.length > 0 && (
                  <div className="mt-1.5 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
                    <p className="mb-1 flex items-center gap-1 font-medium"><AlertCircle size={13} /> Similar existing customers:</p>
                    {dupes.map((c) => (
                      <Link key={c.id} href={`/customers/${c.id}`} className="block truncate hover:underline">• {c.company_name} <span className="text-amber-500">({c.category})</span></Link>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div><label className="mb-1 block text-xs font-medium text-ink-600">Contact person</label><input value={f.contact_person} onChange={set("contact_person")} className={field} /></div>
                <div><label className="mb-1 block text-xs font-medium text-ink-600">Phone</label><input value={f.phone} onChange={set("phone")} className={field} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="mb-1 block text-xs font-medium text-ink-600">Email</label><input type="email" value={f.email} onChange={set("email")} className={field} /></div>
                <div><label className="mb-1 block text-xs font-medium text-ink-600">Country</label><input value={f.country} onChange={set("country")} placeholder="India / UAE / …" className={field} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="mb-1 block text-xs font-medium text-ink-600">Industry</label><input value={f.industry} onChange={set("industry")} className={field} /></div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-ink-600">Category</label>
                  <select value={f.category} onChange={set("category")} className={field}><option value="New">New</option><option value="Regular">Regular</option></select>
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-ink-600">Assign to</label>
                <select value={f.assigned_to} onChange={set("assigned_to")} className={field}>
                  <option value="">Me</option>
                  {sellers.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>

              {error && <p className="text-sm text-rose-600">{error}</p>}
              <div className="flex justify-end gap-2 pt-1">
                <button type="button" onClick={() => setOpen(false)} className="rounded-lg px-4 py-2 text-sm font-medium text-ink-600 hover:bg-ink-100">Cancel</button>
                <button type="submit" disabled={saving} className="rounded-lg bg-gradient-to-r from-brand-700 to-accent-500 px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60">{saving ? "Saving…" : "Add Customer"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

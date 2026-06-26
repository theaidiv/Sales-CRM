import { requireProfile } from "@/lib/auth";
import { getCustomerById, getCustomerTimeline, getProfiles } from "@/lib/data";
import { summarizeCustomer } from "@/lib/ai/insights";
import { recoveryScore } from "@/lib/engines/recovery";
import { Card, CardHeader, Stat, Badge, AiCard, PageHeader } from "@/components/ui";
import { inr, fmtDate } from "@/lib/utils";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Phone, Mail, MapPin, Building2, ArrowLeft } from "lucide-react";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export default async function CustomerDetailPage({ params }: { params: { id: string } }) {
  await requireProfile();
  const customer = await getCustomerById(params.id);
  if (!customer) notFound();

  const [{ activities, comments, opportunities }, profiles] = await Promise.all([
    getCustomerTimeline(customer.id),
    getProfiles(),
  ]);
  const nameById = new Map(profiles.map((p) => [p.id, p.name]));

  // Build a unified timeline string for the AI summary.
  const timeline = [
    ...activities.map((a) => `[${fmtDate(a.activity_date)}] ${a.type}: ${a.notes ?? ""} (${a.outcome ?? ""})`),
    ...comments.map((c) => `[${fmtDate(c.created_at)}] Note by ${nameById.get(c.user_id ?? "") ?? "user"}: ${c.body}`),
  ];

  const aiSummary = await summarizeCustomer({
    companyName: customer.company_name,
    category: customer.category,
    healthBand: customer.health_band,
    timeline,
  });

  const recovery = customer.category === "Detached" ? recoveryScore(customer) : null;

  return (
    <div className="animate-fade-in">
      <Link href="/customers" className="mb-3 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-brand-600">
        <ArrowLeft size={15} /> Back to customers
      </Link>
      <PageHeader
        title={customer.company_name}
        subtitle={customer.industry ?? undefined}
        action={<div className="flex gap-2"><Badge>{customer.category}</Badge><Badge>{customer.health_band}</Badge></div>}
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <AiCard title="AI Customer Summary">{aiSummary}</AiCard>

          <Card>
            <CardHeader title="Opportunities" subtitle={`${opportunities.length} linked`} />
            <div className="divide-y divide-slate-100">
              {opportunities.map((o) => (
                <div key={o.id} className="flex items-center justify-between px-5 py-3">
                  <div>
                    <p className="text-sm font-medium text-slate-800">{o.title}</p>
                    <p className="text-xs text-slate-400">Close: {fmtDate(o.expected_close_date)}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge>{o.stage}</Badge>
                    <span className="text-sm font-medium text-slate-700">{inr(o.value)}</span>
                  </div>
                </div>
              ))}
              {opportunities.length === 0 && <p className="px-5 py-5 text-center text-sm text-slate-400">No opportunities.</p>}
            </div>
          </Card>

          <Card>
            <CardHeader title="Activity & Collaboration Timeline" subtitle={`${timeline.length} entries`} />
            <div className="max-h-[420px] divide-y divide-slate-100 overflow-y-auto">
              {activities.map((a) => (
                <div key={a.id} className="flex gap-3 px-5 py-3">
                  <Badge>{a.type}</Badge>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-slate-700">{a.notes}</p>
                    <p className="text-xs text-slate-400">{fmtDate(a.activity_date)} · {nameById.get(a.user_id ?? "") ?? "—"} · {a.outcome}</p>
                  </div>
                </div>
              ))}
              {comments.map((c) => (
                <div key={c.id} className="flex gap-3 bg-amber-50/40 px-5 py-3">
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">Note</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-slate-700">{c.body}</p>
                    <p className="text-xs text-slate-400">{fmtDate(c.created_at)} · {nameById.get(c.user_id ?? "") ?? "—"}</p>
                  </div>
                </div>
              ))}
              {timeline.length === 0 && <p className="px-5 py-5 text-center text-sm text-slate-400">No activity yet.</p>}
            </div>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="p-5">
            <h3 className="mb-3 text-sm font-semibold text-slate-700">Contact</h3>
            <div className="space-y-2 text-sm text-slate-600">
              <p className="flex items-center gap-2"><Building2 size={15} className="text-slate-400" /> {customer.contact_person}</p>
              <p className="flex items-center gap-2"><Phone size={15} className="text-slate-400" /> {customer.phone}</p>
              <p className="flex items-center gap-2 break-all"><Mail size={15} className="text-slate-400" /> {customer.email}</p>
              <p className="flex items-center gap-2"><MapPin size={15} className="text-slate-400" /> {customer.country}</p>
            </div>
          </Card>

          <Stat label="Total Revenue" value={inr(customer.total_revenue)} tone="good" />
          <Stat label="Health Score" value={`${customer.health_score}/100`} sub={customer.health_band} tone={customer.health_score >= 70 ? "good" : customer.health_score >= 45 ? "default" : "bad"} />
          <Card className="p-5 text-sm">
            <div className="flex justify-between py-1"><span className="text-slate-500">Last Order</span><span className="font-medium text-slate-700">{fmtDate(customer.last_order_date)}</span></div>
            <div className="flex justify-between py-1"><span className="text-slate-500">Last Contact</span><span className="font-medium text-slate-700">{fmtDate(customer.last_contact_date)}</span></div>
            <div className="flex justify-between py-1"><span className="text-slate-500">Owner</span><span className="font-medium text-slate-700">{nameById.get(customer.assigned_to ?? "") ?? "—"}</span></div>
          </Card>

          {recovery && (
            <AiCard title="Recovery Analysis">
              <div className="space-y-1">
                <p>Recovery probability: <strong>{Math.round(recovery.probability * 100)}%</strong></p>
                <p>Potential revenue: <strong>{inr(recovery.potentialRevenue)}</strong></p>
                <p>Priority: <Badge>{recovery.priority}</Badge></p>
              </div>
            </AiCard>
          )}
        </div>
      </div>
    </div>
  );
}

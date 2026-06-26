import { requireProfile } from "@/lib/auth";
import { getCustomerById, getCustomerTimeline, getProfiles } from "@/lib/data";
import { summarizeCustomer } from "@/lib/ai/insights";
import { recoveryScore } from "@/lib/engines/recovery";
import { Card, CardHeader, Stat, Badge, AiCard, PageHeader } from "@/components/ui";
import { inr, fmtDate } from "@/lib/utils";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Phone, Mail, MapPin, Building2, ArrowLeft, Package, FileText, MessageSquare } from "lucide-react";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export default async function CustomerDetailPage({ params }: { params: { id: string } }) {
  await requireProfile();
  const customer = await getCustomerById(params.id);
  if (!customer) notFound();

  const [{ activities, comments, opportunities, orders, quotations }, profiles] = await Promise.all([
    getCustomerTimeline(customer.id),
    getProfiles(),
  ]);
  const nameById = new Map(profiles.map((p) => [p.id, p.name]));

  const timeline = [
    ...activities.map((a) => `[${fmtDate(a.activity_date)}] ${a.type}: ${a.notes ?? ""} (${a.outcome ?? ""})`),
    ...comments.map((c) => `[${fmtDate(c.created_at)}] Note by ${nameById.get(c.user_id ?? "") ?? "user"}: ${c.body}`),
  ];
  const aiSummary = await summarizeCustomer({
    companyName: customer.company_name, category: customer.category, healthBand: customer.health_band, timeline,
  });

  const recovery = customer.category === "Detached" ? recoveryScore(customer) : null;
  const openOpps = opportunities.filter((o) => o.stage !== "Won" && o.stage !== "Lost").length;

  return (
    <div className="animate-fade-in">
      <Link href="/customers" className="mb-3 inline-flex items-center gap-1 text-sm text-ink-500 transition hover:text-brand-600">
        <ArrowLeft size={15} /> Back to customers
      </Link>
      <PageHeader
        title={customer.company_name}
        subtitle={`${customer.industry ?? ""}${customer.country ? " · " + customer.country : ""}`}
        action={<div className="flex gap-2"><Badge>{customer.category}</Badge><Badge>{customer.health_band}</Badge></div>}
      />

      <div className="mb-4 grid grid-cols-2 gap-4 lg:grid-cols-5">
        <Stat label="Total Revenue" animate={customer.total_revenue} valueKind="inr" tone="good" />
        <Stat label="Health Score" value={`${customer.health_score}/100`} sub={customer.health_band} tone={customer.health_score >= 70 ? "good" : customer.health_score >= 45 ? "default" : "bad"} />
        <Stat label="Orders" animate={orders.length} sub="lifetime" />
        <Stat label="Open Leads" animate={openOpps} sub={`${opportunities.length} total`} />
        <Stat label="Quotations" animate={quotations.length} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <AiCard title="AI Customer Summary">{aiSummary}</AiCard>

          <Card>
            <CardHeader title="Leads & Opportunities" subtitle={`${opportunities.length} linked`} />
            <div className="divide-y divide-ink-50">
              {opportunities.map((o) => (
                <Link key={o.id} href={`/leads/${o.id}`} className="flex items-center justify-between px-5 py-3 transition hover:bg-ink-50/60">
                  <div>
                    <p className="text-sm font-medium text-ink-800">{o.title}</p>
                    <p className="text-xs text-ink-400">Close: {fmtDate(o.expected_close_date)} · {o.probability}% likely</p>
                  </div>
                  <div className="flex items-center gap-3"><Badge>{o.stage}</Badge><span className="text-sm font-medium text-ink-700 tnum">{inr(o.value)}</span></div>
                </Link>
              ))}
              {opportunities.length === 0 && <p className="px-5 py-5 text-center text-sm text-ink-400">No opportunities.</p>}
            </div>
          </Card>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Card>
              <CardHeader title="Order History" subtitle={`${orders.length} orders`} />
              <div className="max-h-72 divide-y divide-ink-50 overflow-y-auto">
                {orders.map((o) => (
                  <div key={o.id} className="flex items-center justify-between px-5 py-2.5">
                    <span className="flex items-center gap-2 text-sm text-ink-600"><Package size={14} className="text-emerald-500" /> {fmtDate(o.order_date)}</span>
                    <span className="text-sm font-medium text-ink-800 tnum">{inr(o.amount)}</span>
                  </div>
                ))}
                {orders.length === 0 && <p className="px-5 py-5 text-center text-sm text-ink-400">No orders yet.</p>}
              </div>
            </Card>
            <Card>
              <CardHeader title="Quotations" subtitle={`${quotations.length} total`} />
              <div className="max-h-72 divide-y divide-ink-50 overflow-y-auto">
                {quotations.map((q) => (
                  <div key={q.id} className="flex items-center justify-between px-5 py-2.5">
                    <span className="flex items-center gap-2 text-sm text-ink-600"><FileText size={14} className="text-indigo-500" /> {fmtDate(q.quote_date)}</span>
                    <div className="flex items-center gap-2"><Badge>{q.status}</Badge><span className="text-sm font-medium text-ink-800 tnum">{inr(q.amount)}</span></div>
                  </div>
                ))}
                {quotations.length === 0 && <p className="px-5 py-5 text-center text-sm text-ink-400">No quotations.</p>}
              </div>
            </Card>
          </div>

          <Card>
            <CardHeader title="Activity & Conversations" subtitle={`${activities.length} activities · ${comments.length} notes`} />
            <div className="max-h-[460px] divide-y divide-ink-50 overflow-y-auto">
              {activities.map((a) => (
                <div key={a.id} className="flex gap-3 px-5 py-3">
                  <Badge>{a.type}</Badge>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-ink-700">{a.notes}</p>
                    <p className="text-xs text-ink-400">{fmtDate(a.activity_date)} · {nameById.get(a.user_id ?? "") ?? "—"} · {a.outcome}</p>
                  </div>
                </div>
              ))}
              {comments.map((c) => (
                <div key={c.id} className="flex gap-3 bg-amber-50/40 px-5 py-3">
                  <span className="flex h-6 items-center gap-1 self-start rounded-full bg-gradient-to-r from-amber-100 to-orange-100 px-2 text-xs font-medium text-amber-700"><MessageSquare size={11} /> Note</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-ink-700">{c.body}</p>
                    <p className="text-xs text-ink-400">{fmtDate(c.created_at)} · {nameById.get(c.user_id ?? "") ?? "—"}</p>
                  </div>
                </div>
              ))}
              {timeline.length === 0 && <p className="px-5 py-5 text-center text-sm text-ink-400">No activity yet.</p>}
            </div>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="p-5">
            <h3 className="mb-3 font-display text-sm font-semibold text-ink-700">Contact</h3>
            <div className="space-y-2.5 text-sm text-ink-600">
              <p className="flex items-center gap-2.5"><Building2 size={15} className="text-ink-400" /> {customer.contact_person ?? "—"}</p>
              <p className="flex items-center gap-2.5"><Phone size={15} className="text-ink-400" /> {customer.phone ?? "—"}</p>
              <p className="flex items-center gap-2.5 break-all"><Mail size={15} className="text-ink-400" /> {customer.email ?? "—"}</p>
              <p className="flex items-center gap-2.5"><MapPin size={15} className="text-ink-400" /> {customer.country ?? "—"}</p>
            </div>
          </Card>

          <Card className="p-5 text-sm">
            <div className="flex justify-between py-1"><span className="text-ink-500">Last Order</span><span className="font-medium text-ink-700">{fmtDate(customer.last_order_date)}</span></div>
            <div className="flex justify-between py-1"><span className="text-ink-500">Last Contact</span><span className="font-medium text-ink-700">{fmtDate(customer.last_contact_date)}</span></div>
            <div className="flex justify-between py-1"><span className="text-ink-500">Owner</span><span className="font-medium text-ink-700">{nameById.get(customer.assigned_to ?? "") ?? "—"}</span></div>
            <div className="flex justify-between py-1"><span className="text-ink-500">Status</span><span className="font-medium text-ink-700">{customer.status}</span></div>
          </Card>

          {recovery && (
            <AiCard title="Recovery Analysis">
              <div className="space-y-1.5">
                <p>Recovery probability: <strong>{Math.round(recovery.probability * 100)}%</strong></p>
                <p>Potential revenue: <strong>{inr(recovery.potentialRevenue)}</strong></p>
                <p className="flex items-center gap-1.5">Priority: <Badge>{recovery.priority}</Badge></p>
              </div>
            </AiCard>
          )}
        </div>
      </div>
    </div>
  );
}

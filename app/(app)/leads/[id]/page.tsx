import { requireProfile } from "@/lib/auth";
import { getOpportunityById, getOpportunityComments, getCustomerById, getCustomerTimeline, getProfiles } from "@/lib/data";
import { Card, CardHeader, Stat, Badge, AiCard, PageHeader } from "@/components/ui";
import { STAGE_PROBABILITY } from "@/lib/types";
import { scoreLead } from "@/lib/engines/leadScore";
import { inr, fmtDate } from "@/lib/utils";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Building2, MapPin, Phone, MessageSquare, ArrowRight, ArrowUpRight, ArrowDownRight, Gauge } from "lucide-react";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export default async function LeadDetailPage({ params }: { params: { id: string } }) {
  await requireProfile();
  const opp = await getOpportunityById(params.id);
  if (!opp) notFound();

  const [customer, oppComments, profiles] = await Promise.all([
    opp.customer_id ? getCustomerById(opp.customer_id) : Promise.resolve(null),
    getOpportunityComments(opp.id),
    getProfiles(),
  ]);
  const nameById = new Map(profiles.map((p) => [p.id, p.name]));
  const timeline = opp.customer_id ? await getCustomerTimeline(opp.customer_id) : { activities: [], comments: [], orders: [], quotations: [], opportunities: [] };

  const weighted = opp.value * (STAGE_PROBABILITY[opp.stage] ?? 0);
  const lead = scoreLead(opp, customer ?? undefined);
  const scoreColor = lead.band === "Hot" ? "from-emerald-500 to-teal-500" : lead.band === "Warm" ? "from-amber-500 to-orange-500" : "from-ink-400 to-ink-500";

  return (
    <div className="animate-fade-in">
      <Link href="/leads" className="mb-3 inline-flex items-center gap-1 text-sm text-ink-500 transition hover:text-brand-600">
        <ArrowLeft size={15} /> Back to pipeline
      </Link>
      <PageHeader
        title={opp.title}
        subtitle={customer ? customer.company_name : "Unlinked lead"}
        action={<Badge>{opp.stage}</Badge>}
      />

      <div className="mb-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Value" animate={opp.value} valueKind="inr" />
        <Stat label="Win Probability" value={`${opp.probability}%`} tone="warn" />
        <Stat label="Weighted Value" animate={Math.round(weighted)} valueKind="inr" tone="good" />
        <Stat label="Expected Close" value={fmtDate(opp.expected_close_date)} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          {opp.notes && (
            <Card className="p-5">
              <h3 className="mb-2 font-display text-sm font-semibold text-ink-700">Lead notes</h3>
              <p className="text-sm leading-relaxed text-ink-600">{opp.notes}</p>
            </Card>
          )}

          <Card>
            <CardHeader title="Conversations & Notes" subtitle={`${oppComments.length} on this lead · ${timeline.comments.length} on the account`} />
            <div className="max-h-[420px] divide-y divide-ink-50 overflow-y-auto">
              {[...oppComments, ...timeline.comments].map((c) => (
                <div key={c.id} className="flex gap-3 px-5 py-3">
                  <span className="flex h-6 items-center gap-1 self-start rounded-full bg-gradient-to-r from-amber-100 to-orange-100 px-2 text-xs font-medium text-amber-700"><MessageSquare size={11} /> Note</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-ink-700">{c.body}</p>
                    <p className="text-xs text-ink-400">{fmtDate(c.created_at)} · {nameById.get(c.user_id ?? "") ?? "—"}</p>
                  </div>
                </div>
              ))}
              {oppComments.length + timeline.comments.length === 0 && <p className="px-5 py-5 text-center text-sm text-ink-400">No conversations yet.</p>}
            </div>
          </Card>

          <Card>
            <CardHeader title="Account Activity" subtitle={`${timeline.activities.length} activities on ${customer?.company_name ?? "this account"}`} />
            <div className="max-h-80 divide-y divide-ink-50 overflow-y-auto">
              {timeline.activities.map((a) => (
                <div key={a.id} className="flex gap-3 px-5 py-3">
                  <Badge>{a.type}</Badge>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-ink-700">{a.notes}</p>
                    <p className="text-xs text-ink-400">{fmtDate(a.activity_date)} · {nameById.get(a.user_id ?? "") ?? "—"} · {a.outcome}</p>
                  </div>
                </div>
              ))}
              {timeline.activities.length === 0 && <p className="px-5 py-5 text-center text-sm text-ink-400">No activity.</p>}
            </div>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="overflow-hidden">
            <div className="flex items-center gap-2 border-b border-brand-100 bg-gradient-to-r from-brand-50 to-accent-50 px-5 py-3">
              <Gauge size={16} className="text-brand-600" />
              <h3 className="font-display text-sm font-semibold text-brand-900">AI Lead Score</h3>
              <span className="ml-auto"><Badge>{lead.band}</Badge></span>
            </div>
            <div className="p-5">
              <div className="flex items-end gap-3">
                <span className={`bg-gradient-to-br ${scoreColor} bg-clip-text font-display text-4xl font-black text-transparent`}>{lead.score}</span>
                <span className="mb-1 text-sm text-ink-400">/ 100 win likelihood</span>
              </div>
              <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-ink-100">
                <div className={`h-full rounded-full bg-gradient-to-r ${scoreColor}`} style={{ width: `${lead.score}%` }} />
              </div>
              <ul className="mt-4 space-y-1.5">
                {lead.factors.map((f, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm text-ink-600">
                    {f.impact === "up" ? <ArrowUpRight size={14} className="text-emerald-500" /> : <ArrowDownRight size={14} className="text-rose-500" />}
                    {f.label}
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-xs text-ink-400">Logistic model · stage × health × recency × deal age</p>
            </div>
          </Card>

          {customer && (
            <Card className="p-5">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="font-display text-sm font-semibold text-ink-700">Customer</h3>
                <div className="flex gap-1.5"><Badge>{customer.category}</Badge></div>
              </div>
              <p className="font-medium text-ink-800">{customer.company_name}</p>
              <div className="mt-2 space-y-2 text-sm text-ink-600">
                <p className="flex items-center gap-2.5"><Building2 size={15} className="text-ink-400" /> {customer.contact_person ?? "—"}</p>
                <p className="flex items-center gap-2.5"><Phone size={15} className="text-ink-400" /> {customer.phone ?? "—"}</p>
                <p className="flex items-center gap-2.5"><MapPin size={15} className="text-ink-400" /> {customer.country ?? "—"}</p>
              </div>
              <Link href={`/customers/${customer.id}`} className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-brand-600 hover:underline">
                View full profile <ArrowRight size={14} />
              </Link>
            </Card>
          )}

          <Card className="p-5 text-sm">
            <div className="flex justify-between py-1"><span className="text-ink-500">Owner</span><span className="font-medium text-ink-700">{nameById.get(opp.assigned_to ?? "") ?? "—"}</span></div>
            <div className="flex justify-between py-1"><span className="text-ink-500">Created</span><span className="font-medium text-ink-700">{fmtDate(opp.created_at)}</span></div>
            <div className="flex justify-between py-1"><span className="text-ink-500">Stage</span><Badge>{opp.stage}</Badge></div>
          </Card>

          {customer && (
            <AiCard title="Account Snapshot">
              <div className="space-y-1.5">
                <p>Total revenue: <strong>{inr(customer.total_revenue)}</strong></p>
                <p>Health: <strong>{customer.health_score}/100</strong> ({customer.health_band})</p>
                <p>Orders: <strong>{timeline.orders.length}</strong> · Quotations: <strong>{timeline.quotations.length}</strong></p>
              </div>
            </AiCard>
          )}
        </div>
      </div>
    </div>
  );
}

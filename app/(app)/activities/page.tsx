import { requireProfile } from "@/lib/auth";
import { getActivities, getCustomers, getProfiles } from "@/lib/data";
import { PageHeader, Stat, Badge, Card, CardHeader } from "@/components/ui";
import { fmtDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

const TYPES = ["Call", "Meeting", "Visit", "Follow-Up", "Quotation", "Order", "Email"];

export default async function ActivitiesPage() {
  const profile = await requireProfile();
  const [activities, customers, profiles] = await Promise.all([
    getActivities(profile, 300), getCustomers(profile), getProfiles(),
  ]);
  const custName = new Map(customers.map((c) => [c.id, c.company_name]));
  const userName = new Map(profiles.map((p) => [p.id, p.name]));

  const counts = TYPES.map((t) => ({ type: t, n: activities.filter((a) => a.type === t).length }));

  return (
    <div>
      <PageHeader title="Sales Activity Tracking" subtitle="Calls, meetings, visits, follow-ups, quotations & orders" />

      <div className="mb-5 grid grid-cols-3 gap-3 md:grid-cols-7">
        {counts.map((c) => (
          <Stat key={c.type} label={c.type} value={String(c.n)} />
        ))}
      </div>

      <Card>
        <CardHeader title="Recent Activity" subtitle={`${activities.length} logged`} />
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
              {activities.slice(0, 100).map((a) => (
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
      </Card>
    </div>
  );
}

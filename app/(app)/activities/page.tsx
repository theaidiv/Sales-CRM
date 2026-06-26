import { requireProfile } from "@/lib/auth";
import { getAllActivities, getAllCustomers, getProfiles } from "@/lib/data";
import { PageHeader, Stat } from "@/components/ui";
import { ActivitiesTable } from "@/components/ActivitiesTable";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const TYPES = ["Call", "Meeting", "Visit", "Follow-Up", "Quotation", "Order", "Email"];

export default async function ActivitiesPage() {
  const profile = await requireProfile();
  const [activities, customers, profiles] = await Promise.all([
    getAllActivities(500), getAllCustomers(), getProfiles(),
  ]);

  const counts = TYPES.map((t) => ({ type: t, n: activities.filter((a) => a.type === t).length }));

  return (
    <div className="animate-fade-in">
      <PageHeader title="Sales Activity Tracking" subtitle="All calls, meetings, visits, follow-ups, quotations & orders" />
      <div className="mb-5 grid grid-cols-3 gap-3 md:grid-cols-7">
        {counts.map((c) => <Stat key={c.type} label={c.type} value={String(c.n)} />)}
      </div>
      <ActivitiesTable activities={activities} customers={customers} profiles={profiles} currentUserId={profile.id} />
    </div>
  );
}

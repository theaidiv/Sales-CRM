import { requireProfile } from "@/lib/auth";
import { getAllOpportunities, getAllCustomers, getProfiles } from "@/lib/data";
import { PageHeader } from "@/components/ui";
import { LeadsBoard } from "@/components/LeadsBoard";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export default async function LeadsPage() {
  const profile = await requireProfile();
  const [opportunities, customers, profiles] = await Promise.all([
    getAllOpportunities(), getAllCustomers(), getProfiles(),
  ]);

  return (
    <div className="animate-fade-in">
      <PageHeader title="Leads & Pipeline" subtitle="All opportunities — search, filter to yours, or add a new lead" />
      <LeadsBoard opportunities={opportunities} customers={customers} profiles={profiles} currentUserId={profile.id} />
    </div>
  );
}

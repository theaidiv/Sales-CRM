import { requireProfile } from "@/lib/auth";
import { getAllCustomers, getProfiles } from "@/lib/data";
import { PageHeader, Stat } from "@/components/ui";
import { CustomersTable } from "@/components/CustomersTable";
import { NewCustomerModal } from "@/components/NewCustomerModal";
import { inr } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export default async function CustomersPage() {
  const profile = await requireProfile();
  const [customers, profiles] = await Promise.all([getAllCustomers(), getProfiles()]);
  const sellers = profiles.filter((p) => p.role !== "Admin");

  const mine = customers.filter((c) => c.assigned_to === profile.id).length;
  const detached = customers.filter((c) => c.category === "Detached").length;
  const atRisk = customers.filter((c) => c.health_band === "At Risk" || c.health_band === "Detached Risk").length;

  return (
    <div className="animate-fade-in">
      <PageHeader title="Customer Intelligence" subtitle="Full customer database — filter to yours, by category, or by region"
        action={<NewCustomerModal customers={customers} sellers={sellers} />} />
      <div className="mb-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Total Customers" value={String(customers.length)} />
        <Stat label="Assigned to Me" value={String(mine)} tone="good" />
        <Stat label="Detached" value={String(detached)} tone="bad" sub="6+ months no order" />
        <Stat label="At Risk" value={String(atRisk)} tone="warn" />
      </div>
      <CustomersTable customers={customers} profiles={profiles} currentUserId={profile.id} />
    </div>
  );
}

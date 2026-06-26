import { requireProfile } from "@/lib/auth";
import { getCustomers, getProfiles } from "@/lib/data";
import { PageHeader, Stat } from "@/components/ui";
import { CustomersTable } from "@/components/CustomersTable";
import { inr } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function CustomersPage() {
  const profile = await requireProfile();
  const [customers, profiles] = await Promise.all([getCustomers(profile), getProfiles()]);

  const detached = customers.filter((c) => c.category === "Detached").length;
  const atRisk = customers.filter((c) => c.health_band === "At Risk" || c.health_band === "Detached Risk").length;
  const totalRev = customers.reduce((s, c) => s + c.total_revenue, 0);

  return (
    <div>
      <PageHeader title="Customer Intelligence" subtitle="Central repository with health scoring & auto-categorization" />
      <div className="mb-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Total Customers" value={String(customers.length)} />
        <Stat label="Detached" value={String(detached)} tone="bad" sub="6+ months no order" />
        <Stat label="At Risk" value={String(atRisk)} tone="warn" />
        <Stat label="Total Revenue" value={inr(totalRev)} tone="good" />
      </div>
      <CustomersTable customers={customers} profiles={profiles} />
    </div>
  );
}

import { requireProfile } from "@/lib/auth";
import { getCustomers, getOpportunities, getActivities, getProfiles } from "@/lib/data";
import { buildNotifications } from "@/lib/notifications";
import { Sidebar } from "@/components/Sidebar";
import { Topbar } from "@/components/Topbar";
import { DrillProvider } from "@/components/DrillDown";
import { AssistantWidget } from "@/components/AssistantWidget";
import type { SearchItem } from "@/components/SearchCommand";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireProfile();
  const [customers, opportunities, activities, profiles] = await Promise.all([
    getCustomers(profile),
    getOpportunities(profile),
    getActivities(profile, 40),
    getProfiles(),
  ]);
  const notifications = buildNotifications({ profile, customers, opportunities, activities, profiles });

  const custName = new Map(customers.map((c) => [c.id, c.company_name]));
  const searchItems: SearchItem[] = [
    ...customers.map((c) => ({ label: c.company_name, sub: `${c.category} · ${c.country ?? ""} · ${c.industry ?? ""}`, href: `/customers/${c.id}`, type: "customer" as const })),
    ...opportunities.map((o) => ({ label: o.title, sub: `${o.stage} · ${custName.get(o.customer_id ?? "") ?? ""}`, href: `/leads/${o.id}`, type: "lead" as const })),
  ];

  return (
    <DrillProvider>
      <div className="flex h-screen overflow-hidden bg-[var(--bg)]">
        <Sidebar name={profile.name} role={profile.role} />
        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar name={profile.name} notifications={notifications} searchItems={searchItems} />
          <main className="flex-1 overflow-y-auto">
            <div className="mx-auto max-w-7xl px-6 py-7">{children}</div>
          </main>
        </div>
        <AssistantWidget />
      </div>
    </DrillProvider>
  );
}

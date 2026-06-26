import { requireProfile } from "@/lib/auth";
import { getCustomers, getOpportunities } from "@/lib/data";
import { buildNotifications } from "@/lib/notifications";
import { Sidebar } from "@/components/Sidebar";
import { Topbar } from "@/components/Topbar";
import { DrillProvider } from "@/components/DrillDown";
import { AssistantWidget } from "@/components/AssistantWidget";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireProfile();
  const [customers, opportunities] = await Promise.all([getCustomers(profile), getOpportunities(profile)]);
  const notifications = buildNotifications(customers, opportunities);

  return (
    <DrillProvider>
      <div className="flex h-screen overflow-hidden bg-[var(--bg)]">
        <Sidebar name={profile.name} role={profile.role} />
        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar name={profile.name} notifications={notifications} />
          <main className="flex-1 overflow-y-auto">
            <div className="mx-auto max-w-7xl px-6 py-7">{children}</div>
          </main>
        </div>
        <AssistantWidget />
      </div>
    </DrillProvider>
  );
}

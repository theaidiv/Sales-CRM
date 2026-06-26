import { requireProfile, isManager } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/Sidebar";
import { Topbar } from "@/components/Topbar";
import { DrillProvider } from "@/components/DrillDown";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireProfile();

  // Lightweight notification count: detached customers in scope.
  const supabase = createClient();
  let q = supabase.from("customers").select("id", { count: "exact", head: true }).eq("category", "Detached");
  if (!isManager(profile.role)) q = q.eq("assigned_to", profile.id);
  const { count } = await q;

  return (
    <DrillProvider>
      <div className="flex h-screen overflow-hidden bg-[var(--bg)]">
        <Sidebar name={profile.name} role={profile.role} />
        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar name={profile.name} riskCount={count ?? 0} />
          <main className="flex-1 overflow-y-auto">
            <div className="mx-auto max-w-7xl px-6 py-7">{children}</div>
          </main>
        </div>
      </div>
    </DrillProvider>
  );
}

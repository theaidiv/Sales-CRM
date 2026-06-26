"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, Users, Target, TrendingUp, LineChart, Sparkles,
  ListChecks, Activity, Trophy, LogOut, KanbanSquare,
} from "lucide-react";

const NAV = [
  { section: "Overview", items: [{ href: "/dashboard", label: "Dashboard", icon: LayoutDashboard }] },
  {
    section: "Pipeline",
    items: [
      { href: "/customers", label: "Customers", icon: Users },
      { href: "/leads", label: "Leads & Pipeline", icon: KanbanSquare },
      { href: "/activities", label: "Activities", icon: Activity },
      { href: "/targets", label: "Targets", icon: Trophy },
    ],
  },
  {
    section: "Intelligence",
    items: [
      { href: "/projections", label: "Projections", icon: TrendingUp },
      { href: "/forecasts", label: "Forecasts", icon: LineChart },
      { href: "/recommendations", label: "AI Actions", icon: ListChecks },
      { href: "/copilot", label: "AI Copilot", icon: Sparkles },
    ],
  },
];

export function Sidebar({ name, role }: { name: string; role: string }) {
  const pathname = usePathname();
  const router = useRouter();

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const initials = name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();

  return (
    <aside className="flex h-screen w-64 shrink-0 flex-col bg-ink-950 text-ink-300">
      <div className="flex items-center gap-3 px-5 py-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-violet-600 font-display text-lg font-black text-white shadow-glow">S</div>
        <div>
          <p className="font-display text-sm font-bold text-white">AI Sales OS</p>
          <p className="text-[10px] uppercase tracking-widest text-ink-500">Operating System</p>
        </div>
      </div>

      <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-3">
        {NAV.map((group) => (
          <div key={group.section}>
            <p className="px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-widest text-ink-600">{group.section}</p>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const active = pathname.startsWith(item.href);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "group relative flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition",
                      active ? "bg-white/10 text-white" : "text-ink-400 hover:bg-white/5 hover:text-ink-100"
                    )}
                  >
                    {active && <span className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-gradient-to-b from-brand-400 to-violet-500" />}
                    <Icon size={18} className={active ? "text-brand-300" : "text-ink-500 group-hover:text-ink-300"} />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t border-white/5 p-3">
        <div className="mb-1 flex items-center gap-3 rounded-xl px-2 py-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-violet-600 text-xs font-bold text-white">{initials}</div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-white">{name}</p>
            <p className="truncate text-xs text-ink-500">{role}</p>
          </div>
        </div>
        <button onClick={signOut} className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-ink-400 transition hover:bg-white/5 hover:text-rose-400">
          <LogOut size={16} /> Sign out
        </button>
      </div>
    </aside>
  );
}

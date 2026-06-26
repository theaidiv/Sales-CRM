"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, Users, Target, TrendingUp, LineChart, Sparkles,
  ListChecks, Activity, Trophy, LogOut, KanbanSquare, PanelLeftClose, PanelLeftOpen,
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
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem("saaya-sidebar-collapsed") === "1";
  });

  function toggle() {
    setCollapsed((c) => {
      const next = !c;
      try { window.localStorage.setItem("saaya-sidebar-collapsed", next ? "1" : "0"); } catch {}
      return next;
    });
  }

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const initials = name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();

  return (
    <aside className={cn("flex h-screen shrink-0 flex-col border-r border-ink-200/70 bg-white transition-[width] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]", collapsed ? "w-[72px]" : "w-64")}>
      <div className={cn("flex items-center gap-3 px-4 py-5", collapsed && "justify-center px-0")}>
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-accent-500 font-display text-lg font-black text-white shadow-glow">S</div>
        {!collapsed && (
          <div className="min-w-0">
            <p className="truncate font-display text-sm font-bold text-ink-900">Saaya Group</p>
            <p className="text-[10px] uppercase tracking-widest text-brand-500">Sales OS</p>
          </div>
        )}
      </div>

      <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-2">
        {NAV.map((group) => (
          <div key={group.section}>
            {!collapsed && <p className="px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-widest text-ink-400">{group.section}</p>}
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const active = pathname.startsWith(item.href);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    title={collapsed ? item.label : undefined}
                    className={cn(
                      "group relative flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition",
                      collapsed && "justify-center px-0",
                      active ? "bg-gradient-to-r from-brand-50 to-accent-50 text-brand-700" : "text-ink-500 hover:bg-ink-50 hover:text-ink-800"
                    )}
                  >
                    {active && <span className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-gradient-to-b from-brand-500 to-accent-500" />}
                    <Icon size={18} className={active ? "text-brand-600" : "text-ink-400 group-hover:text-ink-600"} />
                    {!collapsed && item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <button
        onClick={toggle}
        className={cn("mx-3 mb-1 flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-ink-400 transition hover:bg-ink-50 hover:text-ink-700", collapsed && "justify-center px-0")}
        title={collapsed ? "Expand" : "Collapse"}
      >
        {collapsed ? <PanelLeftOpen size={18} /> : <><PanelLeftClose size={18} /> Collapse</>}
      </button>

      <div className="border-t border-ink-100 p-3">
        <div className={cn("mb-1 flex items-center gap-3 rounded-xl px-2 py-1.5", collapsed && "justify-center px-0")}>
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-accent-500 text-xs font-bold text-white">{initials}</div>
          {!collapsed && (
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-ink-800">{name}</p>
              <p className="truncate text-xs text-ink-400">{role}</p>
            </div>
          )}
        </div>
        <button onClick={signOut} title="Sign out" className={cn("flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-ink-400 transition hover:bg-rose-50 hover:text-rose-600", collapsed && "justify-center px-0")}>
          <LogOut size={16} /> {!collapsed && "Sign out"}
        </button>
      </div>
    </aside>
  );
}

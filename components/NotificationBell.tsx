"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import type { AppNotification } from "@/lib/notifications";
import { Bell, AlertTriangle, RefreshCw, Clock, HeartPulse, TrendingDown, CheckCheck, Trophy, BarChart3, Users } from "lucide-react";

const ICONS = { risk: AlertTriangle, recover: RefreshCw, stall: Clock, health: HeartPulse, followup: TrendingDown, won: Trophy, summary: BarChart3, team: Users };
const SEV = {
  High: "bg-rose-50 text-rose-500",
  Medium: "bg-amber-50 text-amber-500",
  Low: "bg-ink-100 text-ink-400",
};

export function NotificationBell({ notifications }: { notifications: AppNotification[] }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const count = notifications.length;

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className={cn("relative flex h-10 w-10 items-center justify-center rounded-xl border transition", open ? "border-brand-300 bg-brand-50 text-brand-600" : "border-ink-200 bg-white text-ink-500 hover:bg-ink-50")}
      >
        <Bell size={17} />
        {count > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-gradient-to-br from-rose-500 to-orange-500 px-1 text-[10px] font-bold text-white">
            {count > 9 ? "9+" : count}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-12 z-50 w-[360px] origin-top-right animate-scale-in overflow-hidden rounded-2xl border border-ink-200 bg-white shadow-elevated">
          <div className="flex items-center justify-between border-b border-ink-100 px-4 py-3">
            <p className="font-display text-sm font-semibold text-ink-800">Notifications</p>
            <span className="rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-600">{count} new</span>
          </div>
          <div className="max-h-[420px] overflow-y-auto">
            {notifications.map((n) => {
              const Icon = ICONS[n.icon] ?? AlertTriangle;
              return (
                <Link
                  key={n.id}
                  href={n.href}
                  onClick={() => setOpen(false)}
                  className="flex gap-3 border-b border-ink-50 px-4 py-3 transition last:border-0 hover:bg-ink-50/60"
                >
                  <span className={cn("mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", SEV[n.severity])}>
                    <Icon size={15} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-ink-800">{n.title}</p>
                    <p className="line-clamp-2 text-xs text-ink-500">{n.detail}</p>
                  </div>
                </Link>
              );
            })}
            {count === 0 && (
              <div className="flex flex-col items-center gap-2 px-4 py-10 text-center text-sm text-ink-400">
                <CheckCheck size={28} className="text-emerald-400" /> You're all caught up.
              </div>
            )}
          </div>
          <Link href="/recommendations" onClick={() => setOpen(false)} className="block border-t border-ink-100 bg-ink-50/50 px-4 py-2.5 text-center text-xs font-medium text-brand-600 hover:bg-ink-50">
            View all AI actions →
          </Link>
        </div>
      )}
    </div>
  );
}

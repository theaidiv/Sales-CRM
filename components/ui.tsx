import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div className={cn("rounded-xl border border-slate-200 bg-white shadow-sm", className)}>
      {children}
    </div>
  );
}

export function CardHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="flex items-start justify-between border-b border-slate-100 px-5 py-4">
      <div>
        <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
        {subtitle && <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function Stat({
  label, value, sub, tone = "default", icon,
}: {
  label: string; value: string; sub?: string;
  tone?: "default" | "good" | "bad" | "warn"; icon?: ReactNode;
}) {
  const toneCls = {
    default: "text-slate-900",
    good: "text-emerald-600",
    bad: "text-rose-600",
    warn: "text-amber-600",
  }[tone];
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
        {icon && <span className="text-slate-400">{icon}</span>}
      </div>
      <p className={cn("mt-2 text-2xl font-bold", toneCls)}>{value}</p>
      {sub && <p className="mt-1 text-xs text-slate-500">{sub}</p>}
    </Card>
  );
}

const BADGE_TONES: Record<string, string> = {
  Regular: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  Detached: "bg-rose-50 text-rose-700 ring-rose-200",
  New: "bg-blue-50 text-blue-700 ring-blue-200",
  Healthy: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  Stable: "bg-sky-50 text-sky-700 ring-sky-200",
  "At Risk": "bg-amber-50 text-amber-700 ring-amber-200",
  "Detached Risk": "bg-rose-50 text-rose-700 ring-rose-200",
  High: "bg-rose-50 text-rose-700 ring-rose-200",
  Medium: "bg-amber-50 text-amber-700 ring-amber-200",
  Low: "bg-slate-50 text-slate-600 ring-slate-200",
  Won: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  Lost: "bg-slate-100 text-slate-500 ring-slate-200",
  Negotiation: "bg-violet-50 text-violet-700 ring-violet-200",
  "Quotation Shared": "bg-indigo-50 text-indigo-700 ring-indigo-200",
};

export function Badge({ children }: { children: string }) {
  const tone = BADGE_TONES[children] ?? "bg-slate-50 text-slate-600 ring-slate-200";
  return (
    <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset", tone)}>
      {children}
    </span>
  );
}

export function ProgressBar({ value, tone = "brand" }: { value: number; tone?: "brand" | "good" | "bad" }) {
  const v = Math.max(0, Math.min(100, value));
  const color = tone === "good" ? "bg-emerald-500" : tone === "bad" ? "bg-rose-500" : "bg-brand-500";
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
      <div className={cn("h-full rounded-full", color)} style={{ width: `${v}%` }} />
    </div>
  );
}

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-xl font-bold text-slate-900">{title}</h1>
        {subtitle && <p className="text-sm text-slate-500">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function AiCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card className="overflow-hidden">
      <div className="flex items-center gap-2 border-b border-violet-100 bg-gradient-to-r from-violet-50 to-indigo-50 px-5 py-3">
        <span className="flex h-6 w-6 items-center justify-center rounded-md bg-violet-600 text-xs font-bold text-white">AI</span>
        <h3 className="text-sm font-semibold text-violet-900">{title}</h3>
      </div>
      <div className="px-5 py-4 text-sm leading-relaxed text-slate-700">{children}</div>
    </Card>
  );
}

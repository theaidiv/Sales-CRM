import { cn } from "@/lib/utils";
import type { ReactNode } from "react";
import { Drillable, DrillHint, type DrillDetail } from "@/components/DrillDown";
import { AnimatedNumber, type NumKind } from "@/components/AnimatedNumber";
import { ArrowUpRight, ArrowDownRight, Minus } from "lucide-react";

export function Card({ className, children, interactive }: { className?: string; children: ReactNode; interactive?: boolean }) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-ink-200/70 bg-white shadow-card transition duration-200",
        interactive && "hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-card-hover",
        className
      )}
    >
      {children}
    </div>
  );
}

export function CardHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="flex items-start justify-between border-b border-ink-100 px-5 py-4">
      <div>
        <h3 className="font-display text-sm font-semibold text-ink-800">{title}</h3>
        {subtitle && <p className="mt-0.5 text-xs text-ink-500">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

const TONE_TEXT = {
  default: "text-ink-900",
  good: "text-emerald-600",
  bad: "text-rose-600",
  warn: "text-amber-600",
} as const;
const TONE_ICON_BG = {
  default: "bg-ink-100 text-ink-500",
  good: "bg-emerald-50 text-emerald-600",
  bad: "bg-rose-50 text-rose-600",
  warn: "bg-amber-50 text-amber-600",
} as const;

export interface Trend {
  dir: "up" | "down" | "flat";
  text: string;
}

export function Stat({
  label, value, sub, tone = "default", icon, trend, detail, animate, valueKind = "int",
}: {
  label: string;
  value?: string;
  sub?: string;
  tone?: keyof typeof TONE_TEXT;
  icon?: ReactNode;
  trend?: Trend;
  detail?: DrillDetail;
  animate?: number;
  valueKind?: NumKind;
}) {
  const body = (
    <Card interactive={!!detail} className="relative h-full overflow-hidden p-5">
      <div className="flex items-start justify-between">
        <p className="text-xs font-medium uppercase tracking-wide text-ink-500">{label}</p>
        {icon && <span className={cn("flex h-8 w-8 items-center justify-center rounded-lg", TONE_ICON_BG[tone])}>{icon}</span>}
      </div>
      <p className={cn("mt-2 font-display text-2xl font-bold tracking-tight", TONE_TEXT[tone])}>
        {animate !== undefined ? <AnimatedNumber value={animate} kind={valueKind} /> : value}
      </p>
      <div className="mt-1 flex items-center gap-2">
        {trend && (
          <span
            className={cn(
              "inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[11px] font-semibold",
              trend.dir === "up" ? "bg-emerald-50 text-emerald-600" : trend.dir === "down" ? "bg-rose-50 text-rose-600" : "bg-ink-100 text-ink-500"
            )}
          >
            {trend.dir === "up" ? <ArrowUpRight size={11} /> : trend.dir === "down" ? <ArrowDownRight size={11} /> : <Minus size={11} />}
            {trend.text}
          </span>
        )}
        {sub && <span className="text-xs text-ink-500">{sub}</span>}
        {detail && <span className="ml-auto"><DrillHint /></span>}
      </div>
    </Card>
  );
  return detail ? <Drillable detail={detail} className="h-full">{body}</Drillable> : body;
}

const BADGE_TONES: Record<string, string> = {
  Regular: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  Detached: "bg-rose-50 text-rose-700 ring-rose-200",
  New: "bg-sky-50 text-sky-700 ring-sky-200",
  Healthy: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  Stable: "bg-sky-50 text-sky-700 ring-sky-200",
  "At Risk": "bg-amber-50 text-amber-700 ring-amber-200",
  "Detached Risk": "bg-rose-50 text-rose-700 ring-rose-200",
  High: "bg-rose-50 text-rose-700 ring-rose-200",
  Medium: "bg-amber-50 text-amber-700 ring-amber-200",
  Low: "bg-ink-100 text-ink-600 ring-ink-200",
  Won: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  Lost: "bg-ink-100 text-ink-500 ring-ink-200",
  Negotiation: "bg-violet-50 text-violet-700 ring-violet-200",
  "Quotation Shared": "bg-indigo-50 text-indigo-700 ring-indigo-200",
};

export function Badge({ children }: { children: string }) {
  const tone = BADGE_TONES[children] ?? "bg-ink-100 text-ink-600 ring-ink-200";
  return (
    <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset", tone)}>
      {children}
    </span>
  );
}

export function ProgressBar({ value, tone = "brand" }: { value: number; tone?: "brand" | "good" | "bad" }) {
  const v = Math.max(0, Math.min(100, value));
  const color =
    tone === "good" ? "from-emerald-400 to-emerald-500" : tone === "bad" ? "from-rose-400 to-rose-500" : "from-brand-400 to-brand-600";
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-ink-100">
      <div className={cn("h-full rounded-full bg-gradient-to-r transition-[width] duration-700 ease-out", color)} style={{ width: `${v}%` }} />
    </div>
  );
}

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight text-ink-900">{title}</h1>
        {subtitle && <p className="mt-0.5 text-sm text-ink-500">{subtitle}</p>}
      </div>
      {action && <div className="flex items-center gap-2">{action}</div>}
    </div>
  );
}

export function AiCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card className="overflow-hidden">
      <div className="flex items-center gap-2.5 border-b border-violet-100 bg-gradient-to-r from-violet-50 via-brand-50 to-indigo-50 px-5 py-3">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-brand-500 to-violet-600 text-[11px] font-bold text-white shadow-sm">AI</span>
        <h3 className="font-display text-sm font-semibold text-violet-900">{title}</h3>
        <span className="ml-auto flex items-center gap-1 text-[11px] font-medium text-violet-400">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-violet-400" /> Live
        </span>
      </div>
      <div className="px-5 py-4 text-sm leading-relaxed text-ink-700">{children}</div>
    </Card>
  );
}

export function SectionTitle({ children }: { children: ReactNode }) {
  return <h2 className="mb-3 font-display text-sm font-semibold uppercase tracking-wider text-ink-400">{children}</h2>;
}

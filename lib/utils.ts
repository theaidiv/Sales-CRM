import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Compact INR currency formatting, e.g. ₹4.2L, ₹1.3Cr. */
export function inr(amount: number): string {
  const n = Math.round(amount);
  if (Math.abs(n) >= 10000000) return `₹${(n / 10000000).toFixed(2)}Cr`;
  if (Math.abs(n) >= 100000) return `₹${(n / 100000).toFixed(2)}L`;
  if (Math.abs(n) >= 1000) return `₹${(n / 1000).toFixed(1)}K`;
  return `₹${n.toLocaleString("en-IN")}`;
}

export function inrFull(amount: number): string {
  return `₹${Math.round(amount).toLocaleString("en-IN")}`;
}

export function pct(n: number): string {
  return `${Math.round(n)}%`;
}

export function monthsAgo(dateStr: string | null): number {
  if (!dateStr) return Infinity;
  const d = new Date(dateStr);
  const now = new Date();
  return (now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24 * 30.44);
}

export function daysAgo(dateStr: string | null): number {
  if (!dateStr) return Infinity;
  const d = new Date(dateStr);
  const now = new Date();
  return (now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24);
}

export function fmtDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/** Current month key like '2026-06'. */
export function currentMonthKey(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function monthKeyOf(year: number, monthIndex0: number): string {
  return `${year}-${String(monthIndex0 + 1).padStart(2, "0")}`;
}

// ---- Indian financial year (April–March) ----

/** The starting calendar year of the FY a date falls in. June 2026 -> 2026; Feb 2026 -> 2025. */
export function fiscalStartYear(d = new Date()): number {
  return d.getMonth() >= 3 ? d.getFullYear() : d.getFullYear() - 1;
}

/** FY label like 'FY2026-27'. */
export function fiscalYearKey(d = new Date()): string {
  const s = fiscalStartYear(d);
  return `FY${s}-${String((s + 1) % 100).padStart(2, "0")}`;
}

/** Build an FY key from its start year. */
export function fiscalYearKeyFromStart(startYear: number): string {
  return `FY${startYear}-${String((startYear + 1) % 100).padStart(2, "0")}`;
}

/** FY quarter index 1-4 (Q1 = Apr-Jun). */
export function fiscalQuarter(d = new Date()): number {
  return Math.floor(((d.getMonth() - 3 + 12) % 12) / 3) + 1;
}

/** FY quarter key like 'FY2026-27-Q1'. */
export function fiscalQuarterKey(d = new Date()): string {
  return `${fiscalYearKey(d)}-Q${fiscalQuarter(d)}`;
}

/** Enumerate {year, month0} for the last `count` months ending at `end` (inclusive). */
export function lastNMonths(count: number, end = new Date()): { year: number; month0: number; key: string }[] {
  const out: { year: number; month0: number; key: string }[] = [];
  const d = new Date(end.getFullYear(), end.getMonth(), 1);
  for (let i = count - 1; i >= 0; i--) {
    const m = new Date(d.getFullYear(), d.getMonth() - i, 1);
    out.push({ year: m.getFullYear(), month0: m.getMonth(), key: monthKeyOf(m.getFullYear(), m.getMonth()) });
  }
  return out;
}

/** Short month label like "Apr '25". */
export function shortMonthLabel(year: number, month0: number): string {
  const m = new Date(year, month0, 1).toLocaleDateString("en-IN", { month: "short" });
  return `${m} '${String(year % 100).padStart(2, "0")}`;
}

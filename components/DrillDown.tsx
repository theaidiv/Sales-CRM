"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { X, ChevronRight } from "lucide-react";

export interface DrillColumn {
  key: string;
  label: string;
  align?: "left" | "right";
}

/** A drill-down payload: pre-formatted rows so it's fully serializable server→client. */
export interface DrillDetail {
  title: string;
  subtitle?: string;
  columns: DrillColumn[];
  rows: Record<string, string | number>[];
  footer?: string;
}

const DrillCtx = createContext<{ open: (d: DrillDetail) => void }>({ open: () => {} });
export function useDrill() {
  return useContext(DrillCtx);
}

export function DrillProvider({ children }: { children: ReactNode }) {
  const [detail, setDetail] = useState<DrillDetail | null>(null);
  const [mounted, setMounted] = useState(false);

  const open = useCallback((d: DrillDetail) => {
    setDetail(d);
    requestAnimationFrame(() => setMounted(true));
  }, []);
  const close = useCallback(() => {
    setMounted(false);
    setTimeout(() => setDetail(null), 250);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [close]);

  return (
    <DrillCtx.Provider value={{ open }}>
      {children}
      {detail && (
        <div className="fixed inset-0 z-50">
          <div
            onClick={close}
            className={cn("absolute inset-0 bg-ink-900/40 backdrop-blur-[2px] transition-opacity duration-200", mounted ? "opacity-100" : "opacity-0")}
          />
          <div
            className={cn(
              "absolute right-0 top-0 flex h-full w-full max-w-xl flex-col bg-white shadow-elevated transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
              mounted ? "translate-x-0" : "translate-x-full"
            )}
          >
            <div className="flex items-start justify-between border-b border-ink-100 px-6 py-4">
              <div>
                <h3 className="font-display text-lg font-bold text-ink-900">{detail.title}</h3>
                {detail.subtitle && <p className="mt-0.5 text-sm text-ink-500">{detail.subtitle}</p>}
              </div>
              <button onClick={close} className="rounded-lg p-1.5 text-ink-400 transition hover:bg-ink-100 hover:text-ink-700">
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 z-10 bg-ink-50/90 backdrop-blur">
                  <tr className="text-left text-xs uppercase tracking-wide text-ink-500">
                    {detail.columns.map((c) => (
                      <th key={c.key} className={cn("px-6 py-2.5 font-medium", c.align === "right" && "text-right")}>{c.label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-50">
                  {detail.rows.map((r, i) => (
                    <tr key={i} className="transition hover:bg-brand-50/40">
                      {detail.columns.map((c) => (
                        <td key={c.key} className={cn("px-6 py-2.5 text-ink-700", c.align === "right" && "text-right tnum font-medium")}>
                          {r[c.key] ?? "—"}
                        </td>
                      ))}
                    </tr>
                  ))}
                  {detail.rows.length === 0 && (
                    <tr><td colSpan={detail.columns.length} className="px-6 py-10 text-center text-ink-400">No supporting records.</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            {detail.footer && (
              <div className="border-t border-ink-100 px-6 py-3 text-sm font-medium text-ink-600">{detail.footer}</div>
            )}
          </div>
        </div>
      )}
    </DrillCtx.Provider>
  );
}

/** Wrap any card/chart to make it open a drill-down drawer on click. */
export function Drillable({ detail, children, className }: { detail: DrillDetail; children: ReactNode; className?: string }) {
  const { open } = useDrill();
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => open(detail)}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && open(detail)}
      className={cn("group/drill cursor-pointer outline-none", className)}
    >
      {children}
    </div>
  );
}

/** Small affordance hint shown on drillable cards. */
export function DrillHint() {
  return (
    <span className="inline-flex items-center gap-0.5 text-[11px] font-medium text-brand-500 opacity-0 transition group-hover/drill:opacity-100">
      Details <ChevronRight size={12} />
    </span>
  );
}

"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Search, CornerDownLeft, Users, KanbanSquare } from "lucide-react";

export interface SearchItem {
  label: string;
  sub: string;
  href: string;
  type: "customer" | "lead";
}

export function SearchCommand({ items }: { items: SearchItem[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setOpen(true); }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => { if (open) setTimeout(() => inputRef.current?.focus(), 30); }, [open]);

  const results = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return items.slice(0, 8);
    return items.filter((i) => i.label.toLowerCase().includes(s) || i.sub.toLowerCase().includes(s)).slice(0, 30);
  }, [q, items]);

  function go(item?: SearchItem) {
    const target = item ?? results[active];
    if (!target) return;
    setOpen(false); setQ("");
    router.push(target.href);
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className="hidden items-center gap-2 rounded-xl border border-ink-200 bg-ink-50/60 px-3 py-2 text-sm text-ink-400 transition hover:border-brand-200 hover:bg-white md:flex">
        <Search size={15} />
        <span className="w-40 select-none text-left">Search anything…</span>
        <kbd className="rounded border border-ink-200 bg-white px-1.5 text-[10px] text-ink-400">⌘K</kbd>
      </button>
      <button onClick={() => setOpen(true)} className="flex h-10 w-10 items-center justify-center rounded-xl border border-ink-200 bg-white text-ink-500 md:hidden"><Search size={17} /></button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-ink-900/40 p-4 pt-[12vh] backdrop-blur-sm" onClick={() => setOpen(false)}>
          <div className="w-full max-w-xl animate-scale-in overflow-hidden rounded-2xl border border-ink-200 bg-white shadow-elevated" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 border-b border-ink-100 px-4">
              <Search size={18} className="text-ink-400" />
              <input
                ref={inputRef} value={q}
                onChange={(e) => { setQ(e.target.value); setActive(0); }}
                onKeyDown={(e) => {
                  if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(a + 1, results.length - 1)); }
                  if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
                  if (e.key === "Enter") { e.preventDefault(); go(); }
                }}
                placeholder="Search customers, leads…"
                className="flex-1 bg-transparent py-3.5 text-sm outline-none placeholder:text-ink-400"
              />
              <kbd className="rounded border border-ink-200 bg-ink-50 px-1.5 py-0.5 text-[10px] text-ink-400">ESC</kbd>
            </div>
            <div className="max-h-[360px] overflow-y-auto p-2">
              {results.map((r, i) => (
                <button
                  key={r.href + i}
                  onMouseEnter={() => setActive(i)}
                  onClick={() => go(r)}
                  className={cn("flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition", active === i ? "bg-brand-50" : "hover:bg-ink-50")}
                >
                  <span className={cn("flex h-8 w-8 items-center justify-center rounded-lg", r.type === "customer" ? "bg-brand-50 text-brand-600" : "bg-accent-50 text-accent-600")}>
                    {r.type === "customer" ? <Users size={15} /> : <KanbanSquare size={15} />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-ink-800">{r.label}</p>
                    <p className="truncate text-xs text-ink-400">{r.sub}</p>
                  </div>
                  {active === i && <CornerDownLeft size={14} className="text-ink-300" />}
                </button>
              ))}
              {results.length === 0 && <p className="px-3 py-8 text-center text-sm text-ink-400">No matches for “{q}”.</p>}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

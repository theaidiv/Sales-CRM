import { Bell, Search } from "lucide-react";

export function Topbar({ name, riskCount }: { name: string; riskCount: number }) {
  const today = new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const hour = new Date().getHours();
  const greet = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const first = name.split(" ")[0];

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-ink-200/70 bg-white/80 px-6 backdrop-blur-md">
      <div className="min-w-0">
        <p className="font-display text-sm font-semibold text-ink-800">{greet}, {first}</p>
        <p className="hidden text-xs text-ink-400 sm:block">{today}</p>
      </div>

      <div className="ml-auto hidden items-center gap-2 rounded-xl border border-ink-200 bg-ink-50/60 px-3 py-2 text-sm text-ink-400 md:flex">
        <Search size={15} />
        <span className="w-40 select-none">Search anything…</span>
        <kbd className="rounded border border-ink-200 bg-white px-1.5 text-[10px] text-ink-400">⌘K</kbd>
      </div>

      <button className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-ink-200 bg-white text-ink-500 transition hover:bg-ink-50">
        <Bell size={17} />
        {riskCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">
            {riskCount > 9 ? "9+" : riskCount}
          </span>
        )}
      </button>
    </header>
  );
}

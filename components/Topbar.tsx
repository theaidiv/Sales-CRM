import { NotificationBell } from "@/components/NotificationBell";
import { SearchCommand, type SearchItem } from "@/components/SearchCommand";
import type { AppNotification } from "@/lib/notifications";

export function Topbar({ name, notifications, searchItems }: { name: string; notifications: AppNotification[]; searchItems: SearchItem[] }) {
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
      <div className="ml-auto flex items-center gap-3">
        <SearchCommand items={searchItems} />
        <NotificationBell notifications={notifications} />
      </div>
    </header>
  );
}

// Centralized colour system. Every "type" (category, stage, activity, health,
// severity) gets a distinct gradient so the app reads clearly and looks vibrant.

export interface TypeStyle {
  grad: string; // soft gradient background
  text: string;
  ring: string;
  dot: string; // vivid gradient for the leading dot / accents
}

const DEFAULT: TypeStyle = { grad: "from-ink-50 to-ink-100", text: "text-ink-600", ring: "ring-ink-200", dot: "from-ink-300 to-ink-400" };

export const TYPE_STYLES: Record<string, TypeStyle> = {
  // Customer categories
  Regular: { grad: "from-emerald-50 to-teal-50", text: "text-emerald-700", ring: "ring-emerald-200/70", dot: "from-emerald-400 to-teal-500" },
  Detached: { grad: "from-rose-50 to-orange-50", text: "text-rose-700", ring: "ring-rose-200/70", dot: "from-rose-400 to-orange-500" },
  New: { grad: "from-sky-50 to-cyan-50", text: "text-sky-700", ring: "ring-sky-200/70", dot: "from-sky-400 to-cyan-500" },

  // Health bands
  Healthy: { grad: "from-emerald-50 to-green-50", text: "text-emerald-700", ring: "ring-emerald-200/70", dot: "from-emerald-400 to-green-500" },
  Stable: { grad: "from-sky-50 to-blue-50", text: "text-sky-700", ring: "ring-sky-200/70", dot: "from-sky-400 to-blue-500" },
  "At Risk": { grad: "from-amber-50 to-orange-50", text: "text-amber-700", ring: "ring-amber-200/70", dot: "from-amber-400 to-orange-500" },
  "Detached Risk": { grad: "from-rose-50 to-red-50", text: "text-rose-700", ring: "ring-rose-200/70", dot: "from-rose-400 to-red-500" },

  // Opportunity stages
  Contacted: { grad: "from-blue-50 to-sky-50", text: "text-blue-700", ring: "ring-blue-200/70", dot: "from-blue-400 to-sky-500" },
  "Meeting Scheduled": { grad: "from-indigo-50 to-blue-50", text: "text-indigo-700", ring: "ring-indigo-200/70", dot: "from-indigo-400 to-blue-500" },
  "Quotation Shared": { grad: "from-violet-50 to-purple-50", text: "text-violet-700", ring: "ring-violet-200/70", dot: "from-violet-400 to-purple-500" },
  Negotiation: { grad: "from-amber-50 to-yellow-50", text: "text-amber-700", ring: "ring-amber-200/70", dot: "from-amber-400 to-yellow-500" },
  Won: { grad: "from-emerald-50 to-teal-50", text: "text-emerald-700", ring: "ring-emerald-200/70", dot: "from-emerald-400 to-teal-500" },
  Lost: { grad: "from-ink-50 to-ink-100", text: "text-ink-500", ring: "ring-ink-200", dot: "from-ink-300 to-ink-400" },
  "On Hold": { grad: "from-zinc-50 to-stone-100", text: "text-zinc-600", ring: "ring-zinc-200/70", dot: "from-zinc-300 to-stone-400" },

  // Activity types
  Call: { grad: "from-blue-50 to-sky-50", text: "text-blue-700", ring: "ring-blue-200/70", dot: "from-blue-400 to-sky-500" },
  Meeting: { grad: "from-violet-50 to-fuchsia-50", text: "text-violet-700", ring: "ring-violet-200/70", dot: "from-violet-400 to-fuchsia-500" },
  Visit: { grad: "from-teal-50 to-emerald-50", text: "text-teal-700", ring: "ring-teal-200/70", dot: "from-teal-400 to-emerald-500" },
  "Follow-Up": { grad: "from-amber-50 to-orange-50", text: "text-amber-700", ring: "ring-amber-200/70", dot: "from-amber-400 to-orange-500" },
  Quotation: { grad: "from-indigo-50 to-violet-50", text: "text-indigo-700", ring: "ring-indigo-200/70", dot: "from-indigo-400 to-violet-500" },
  Order: { grad: "from-emerald-50 to-green-50", text: "text-emerald-700", ring: "ring-emerald-200/70", dot: "from-emerald-400 to-green-500" },
  Email: { grad: "from-cyan-50 to-sky-50", text: "text-cyan-700", ring: "ring-cyan-200/70", dot: "from-cyan-400 to-sky-500" },

  // Severity / priority
  High: { grad: "from-rose-50 to-red-50", text: "text-rose-700", ring: "ring-rose-200/70", dot: "from-rose-400 to-red-500" },
  Medium: { grad: "from-amber-50 to-orange-50", text: "text-amber-700", ring: "ring-amber-200/70", dot: "from-amber-400 to-orange-500" },
  Low: { grad: "from-ink-50 to-ink-100", text: "text-ink-600", ring: "ring-ink-200", dot: "from-ink-300 to-ink-400" },
};

export function typeStyle(label: string): TypeStyle {
  return TYPE_STYLES[label] ?? DEFAULT;
}

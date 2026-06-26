"use client";

import { useState } from "react";
import { Card } from "@/components/ui";
import { Languages } from "lucide-react";

type Lang = "en" | "hi" | "gu";
const LABELS: Record<Lang, string> = { en: "English", hi: "हिंदी", gu: "ગુજરાતી" };

/** AI narrative card with one-click translation to Hindi / Gujarati. */
export function AiInsight({ title, text }: { title: string; text: string }) {
  const [lang, setLang] = useState<Lang>("en");
  const [cache, setCache] = useState<Record<Lang, string>>({ en: text, hi: "", gu: "" });
  const [loading, setLoading] = useState(false);

  async function pick(l: Lang) {
    setLang(l);
    if (l === "en" || cache[l]) return;
    setLoading(true);
    try {
      const res = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, lang: l }),
      });
      const data = await res.json();
      setCache((c) => ({ ...c, [l]: data.text ?? text }));
    } catch {
      setCache((c) => ({ ...c, [l]: text }));
    } finally {
      setLoading(false);
    }
  }

  const body = lang === "en" ? text : cache[lang] || text;

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-wrap items-center gap-2.5 border-b border-brand-100 bg-gradient-to-r from-brand-50 via-secondary-50 to-accent-50 px-5 py-3">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-brand-700 to-accent-400 text-[11px] font-bold text-white shadow-sm">AI</span>
        <h3 className="font-display text-sm font-semibold text-brand-900">{title}</h3>
        <div className="ml-auto flex items-center gap-1 rounded-lg bg-white/70 p-0.5 ring-1 ring-brand-100">
          <Languages size={13} className="ml-1 text-brand-400" />
          {(["en", "hi", "gu"] as Lang[]).map((l) => (
            <button
              key={l}
              onClick={() => pick(l)}
              className={`rounded-md px-2 py-0.5 text-xs font-medium transition ${lang === l ? "bg-gradient-to-r from-brand-700 to-accent-500 text-white" : "text-ink-500 hover:text-brand-700"}`}
            >
              {LABELS[l]}
            </button>
          ))}
        </div>
      </div>
      <div className="whitespace-pre-line px-5 py-4 text-sm leading-relaxed text-ink-700">
        {loading ? <span className="inline-flex items-center gap-2 text-ink-400"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-brand-400" /> Translating…</span> : body}
      </div>
    </Card>
  );
}

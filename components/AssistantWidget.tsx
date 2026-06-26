"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Sparkles, Send, X, Paperclip, ArrowUpRight, ImageIcon } from "lucide-react";

interface Msg { role: "user" | "assistant"; content: string; href?: string; image?: string }

const SUGGESTIONS = [
  "What should I focus on today?",
  "Which detached customers should I recover?",
  "Add a lead: 5L valves order for new company Orbit Engineering, negotiation stage",
  "Why am I behind target?",
];

export function AssistantWidget() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([
    { role: "assistant", content: "Hi! I'm your Saaya AI assistant. Ask about your customers, pipeline or targets — or tell me to create a lead/customer, or 📎 upload an image (e.g. a business card) and I'll add it for you." },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, loading, open]);

  async function send(text: string, image?: string) {
    if ((!text.trim() && !image) || loading) return;
    const userMsg: Msg = { role: "user", content: text || "🖼️ (image uploaded)", image };
    const history = [...messages, userMsg];
    setMessages(history);
    setInput("");
    setLoading(true);
    try {
      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history.filter((m) => !m.image || m === userMsg).map((m) => ({ role: m.role, content: m.content })), image }),
      });
      const data = await res.json();
      setMessages((m) => [...m, { role: "assistant", content: data.message ?? "Sorry, I couldn't process that.", href: data.href }]);
      if (data.href) router.refresh();
    } catch {
      setMessages((m) => [...m, { role: "assistant", content: "Something went wrong. Please try again." }]);
    } finally {
      setLoading(false);
    }
  }

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => send("Extract and add this from the image", reader.result as string);
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  return (
    <>
      {/* Launcher */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="group fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-brand-600 to-accent-600 text-white shadow-glow transition hover:scale-105"
          aria-label="Open AI assistant"
        >
          <Sparkles size={24} />
          <span className="absolute -top-1 -right-1 flex h-3 w-3"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent-400 opacity-75" /><span className="relative inline-flex h-3 w-3 rounded-full bg-accent-500" /></span>
        </button>
      )}

      {/* Panel */}
      {open && (
        <div className="fixed bottom-6 right-6 z-40 flex h-[600px] max-h-[85vh] w-[400px] max-w-[calc(100vw-2rem)] animate-scale-in flex-col overflow-hidden rounded-2xl border border-ink-200 bg-white shadow-elevated">
          <div className="flex items-center gap-2.5 bg-gradient-to-r from-brand-600 to-accent-600 px-4 py-3 text-white">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/20"><Sparkles size={17} /></span>
            <div>
              <p className="font-display text-sm font-semibold">Saaya AI Assistant</p>
              <p className="text-[11px] text-white/70">RAG over your sales data · creates records</p>
            </div>
            <button onClick={() => setOpen(false)} className="ml-auto rounded-lg p-1 text-white/80 hover:bg-white/15"><X size={18} /></button>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto bg-ink-50/40 p-4">
            {messages.map((m, i) => (
              <div key={i} className={cn("flex gap-2", m.role === "user" && "flex-row-reverse")}>
                <div className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[10px] font-bold", m.role === "user" ? "bg-brand-600 text-white" : "bg-gradient-to-br from-brand-500 to-accent-500 text-white")}>
                  {m.role === "user" ? "You" : <Sparkles size={14} />}
                </div>
                <div className={cn("max-w-[78%] whitespace-pre-wrap rounded-2xl px-3.5 py-2 text-sm leading-relaxed", m.role === "user" ? "bg-brand-600 text-white" : "border border-ink-100 bg-white text-ink-700")}>
                  {m.image && <span className="mb-1 flex items-center gap-1 text-xs opacity-80"><ImageIcon size={12} /> image</span>}
                  {m.content}
                  {m.href && <a href={m.href} className="mt-1 flex items-center gap-1 text-xs font-medium text-brand-600 hover:underline">Open <ArrowUpRight size={12} /></a>}
                </div>
              </div>
            ))}
            {loading && <div className="flex gap-2"><div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-brand-500 to-accent-500 text-white"><Sparkles size={14} /></div><div className="rounded-2xl border border-ink-100 bg-white px-3.5 py-2.5 text-sm text-ink-400">Thinking…</div></div>}
            <div ref={endRef} />
          </div>

          {messages.length <= 1 && (
            <div className="flex flex-wrap gap-1.5 border-t border-ink-100 px-3 py-2">
              {SUGGESTIONS.map((s) => (
                <button key={s} onClick={() => send(s)} className="rounded-full bg-brand-50 px-2.5 py-1 text-[11px] font-medium text-brand-700 transition hover:bg-brand-100">{s.length > 36 ? s.slice(0, 34) + "…" : s}</button>
              ))}
            </div>
          )}

          <form onSubmit={(e) => { e.preventDefault(); send(input); }} className="flex items-center gap-1.5 border-t border-ink-100 p-2.5">
            <input ref={fileRef} type="file" accept="image/*" onChange={onFile} className="hidden" />
            <button type="button" onClick={() => fileRef.current?.click()} title="Upload image" className="flex h-9 w-9 items-center justify-center rounded-lg text-ink-400 transition hover:bg-ink-100 hover:text-brand-600"><Paperclip size={17} /></button>
            <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask or instruct…" className="flex-1 rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100" />
            <button type="submit" disabled={loading} className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-r from-brand-600 to-accent-600 text-white transition hover:opacity-90 disabled:opacity-50"><Send size={15} /></button>
          </form>
        </div>
      )}
    </>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const DEMO_ACCOUNTS = [
  { email: "head@salesos.demo", label: "Sandeep Mehra — Sales Head" },
  { email: "priya@salesos.demo", label: "Priya Sharma — Sales Executive" },
  { email: "admin@salesos.demo", label: "Admin User — Admin" },
];

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("head@salesos.demo");
  const [password, setPassword] = useState("Demo@1234");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function signIn(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setError(`Sign-in failed: ${(err as Error).message}`);
      setLoading(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-ink-950 p-4">
      {/* ambient glows + grid */}
      <div className="pointer-events-none absolute -left-40 -top-40 h-96 w-96 rounded-full bg-brand-600/30 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-violet-600/30 blur-3xl" />
      <div className="pointer-events-none absolute inset-0 bg-grid-faint [background-size:40px_40px] opacity-[0.07]" />

      <div className="relative w-full max-w-md animate-fade-up">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-emerald-500 font-display text-3xl font-black text-white shadow-glow">
            S
          </div>
          <h1 className="font-display text-3xl font-bold tracking-tight text-white">Saaya Group</h1>
          <p className="mt-1.5 text-sm text-ink-400">
            Sales OS — planning, forecasting & customer intelligence
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white p-7 shadow-elevated">
          <form onSubmit={signIn} className="space-y-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                required
              />
            </div>
            {error && <p className="text-sm text-rose-600">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-brand-600 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60"
            >
              {loading ? "Signing in…" : "Sign in"}
            </button>
          </form>

          <div className="mt-6 border-t border-slate-100 pt-4">
            <p className="mb-2 text-xs font-medium text-slate-500">Demo accounts (password: Demo@1234)</p>
            <div className="space-y-1.5">
              {DEMO_ACCOUNTS.map((a) => (
                <button
                  key={a.email}
                  onClick={() => {
                    setEmail(a.email);
                    setPassword("Demo@1234");
                  }}
                  className="block w-full rounded-md bg-slate-50 px-3 py-1.5 text-left text-xs text-slate-600 transition hover:bg-slate-100"
                >
                  {a.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

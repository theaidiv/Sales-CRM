// Public Supabase config. The URL and anon key are PUBLIC by design — they ship
// in every Supabase client bundle and are safe to expose (data is protected by
// Row Level Security + auth). Env vars take precedence; these are fallback
// defaults so the deployed app works even if NEXT_PUBLIC_* vars aren't wired.
//
// The SECRET service-role key is NOT here — it stays env-only (seed script).

export const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://ofiqehikpztkpdannxtq.supabase.co";

export const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9maXFlaGlrcHp0a3BkYW5ueHRxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI0NTQwMTIsImV4cCI6MjA5ODAzMDAxMn0.zQWa7-9TIhwZ_jHJf0EzEZMU_EKavdpVQoQ_Lg2NTyo";

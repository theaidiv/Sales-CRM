import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import type { Profile } from "@/lib/types";

/** Get the current user's profile, redirecting to /login if unauthenticated. */
export async function requireProfile(): Promise<Profile> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!profile) {
    // Authenticated but no profile row — treat as executive fallback.
    return {
      id: user.id,
      name: user.email?.split("@")[0] ?? "User",
      email: user.email ?? "",
      role: "Sales Executive",
      team: null,
      created_at: new Date().toISOString(),
    };
  }
  return profile as Profile;
}

export function isManager(role: string): boolean {
  return role === "Admin" || role === "Sales Head";
}

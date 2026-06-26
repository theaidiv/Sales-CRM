"use server";

import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export interface NewCustomerInput {
  company_name: string;
  contact_person?: string;
  phone?: string;
  email?: string;
  country?: string;
  industry?: string;
  category?: "Regular" | "New";
  assigned_to?: string;
  notes?: string;
}

export async function createCustomer(input: NewCustomerInput): Promise<{ ok: boolean; error?: string; id?: string }> {
  const profile = await requireProfile();
  const supabase = createClient();
  if (!input.company_name?.trim()) return { ok: false, error: "Company name is required." };

  const category = input.category ?? "New";
  const { data, error } = await supabase
    .from("customers")
    .insert({
      company_name: input.company_name.trim(),
      contact_person: input.contact_person || null,
      phone: input.phone || null,
      email: input.email || null,
      country: input.country || null,
      industry: input.industry || null,
      category,
      assigned_to: input.assigned_to || profile.id,
      status: "Active",
      health_score: category === "Regular" ? 60 : 50,
      health_band: "Stable",
      last_contact_date: new Date().toISOString().slice(0, 10),
      notes: input.notes || null,
    })
    .select("id")
    .single();

  if (error) return { ok: false, error: error.message };
  revalidatePath("/customers");
  return { ok: true, id: data!.id };
}

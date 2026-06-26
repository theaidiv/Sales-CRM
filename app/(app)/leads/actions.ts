"use server";

import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { STAGE_PROBABILITY, type OppStage } from "@/lib/types";

export interface NewLeadInput {
  customerId?: string;       // existing customer
  newCompany?: string;       // or a brand-new company name
  contact?: string;
  country?: string;
  title: string;
  value: number;
  stage: OppStage;
  expectedClose?: string;
  notes?: string;
}

export async function createLead(input: NewLeadInput): Promise<{ ok: boolean; error?: string }> {
  const profile = await requireProfile();
  const supabase = createClient();

  if (!input.title?.trim()) return { ok: false, error: "Title is required." };

  let customerId = input.customerId || null;

  // Brand-new prospect → create a customer (category New) assigned to the current user.
  if (!customerId && input.newCompany?.trim()) {
    const { data, error } = await supabase
      .from("customers")
      .insert({
        company_name: input.newCompany.trim(),
        contact_person: input.contact || null,
        country: input.country || null,
        category: "New",
        assigned_to: profile.id,
        status: "Active",
        health_score: 50,
        health_band: "Stable",
      })
      .select("id")
      .single();
    if (error) return { ok: false, error: error.message };
    customerId = data!.id;
  }

  if (!customerId) return { ok: false, error: "Select a customer or enter a new company." };

  const stage = input.stage || "New";
  const { error } = await supabase.from("opportunities").insert({
    customer_id: customerId,
    title: input.title.trim(),
    assigned_to: profile.id,
    stage,
    value: Math.max(0, Math.round(input.value || 0)),
    probability: Math.round(STAGE_PROBABILITY[stage] * 100),
    expected_close_date: input.expectedClose || null,
    notes: input.notes || null,
  });
  if (error) return { ok: false, error: error.message };

  revalidatePath("/leads");
  return { ok: true };
}

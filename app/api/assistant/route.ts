import { NextResponse } from "next/server";
import { requireProfile, isManager } from "@/lib/auth";
import { getAnalyticsBundle, getProfiles } from "@/lib/data";
import { selectTargets } from "@/lib/analytics";
import { buildCorpus, retrieve } from "@/lib/ai/rag";
import { groqChat, groqVision, extractJson } from "@/lib/ai/groq";
import { recoveryScore } from "@/lib/engines/recovery";
import { dailyActions } from "@/lib/engines/actions";
import { createCustomer } from "@/app/(app)/customers/actions";
import { createLead } from "@/app/(app)/leads/actions";
import { inr } from "@/lib/utils";
import { STAGE_PROBABILITY, type OppStage } from "@/lib/types";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

interface Body {
  messages?: { role: "user" | "assistant"; content: string }[];
  image?: string; // data URL
}

export async function POST(req: Request) {
  const profile = await requireProfile();
  const body = (await req.json()) as Body;
  const messages = body.messages ?? [];
  const lastUser = [...messages].reverse().find((m) => m.role === "user")?.content ?? "";

  const [bundle, profiles] = await Promise.all([getAnalyticsBundle(profile), getProfiles()]);
  const { projection, customers, opportunities, allTargets } = bundle;
  const nameById = new Map(profiles.map((p) => [p.id, p.name]));

  // ---------- IMAGE → entity extraction ----------
  if (body.image) {
    const raw = await groqVision(
      body.image,
      `You are extracting sales contact info from an image (business card, enquiry, letterhead, or product request). Return ONLY JSON:
{"entity":"customer"|"lead","company_name":"","contact_person":"","phone":"","email":"","country":"","industry":"","title":"","notes":""}
"title" is the opportunity/product if it looks like an enquiry. Leave unknown fields as "".`
    );
    const parsed = extractJson<any>(raw);
    if (!parsed || !parsed.company_name) {
      return NextResponse.json({ message: "I couldn't read a company name from that image. Try a clearer photo, or tell me the details and I'll create it." });
    }
    if (parsed.entity === "lead" || parsed.title) {
      const res = await createLead({
        newCompany: parsed.company_name, contact: parsed.contact_person, country: parsed.country,
        title: parsed.title || `Enquiry from ${parsed.company_name}`, value: 0, stage: "New", notes: parsed.notes || "Created from uploaded image",
      });
      return NextResponse.json({ message: res.ok ? `📇 Created a new **lead** for **${parsed.company_name}** (${parsed.title || "enquiry"}) from your image. It's now in your pipeline.` : `Couldn't create the lead: ${res.error}` });
    }
    const res = await createCustomer({
      company_name: parsed.company_name, contact_person: parsed.contact_person, phone: parsed.phone,
      email: parsed.email, country: parsed.country, industry: parsed.industry, category: "New",
      notes: parsed.notes || "Created from uploaded image",
    });
    return NextResponse.json({ message: res.ok ? `📇 Created a new **customer**: **${parsed.company_name}**${parsed.contact_person ? ` (${parsed.contact_person})` : ""}. Opening its profile.` : `Couldn't create the customer: ${res.error}`, href: res.id ? `/customers/${res.id}` : undefined });
  }

  // ---------- TEXT: RAG context ----------
  const corpus = buildCorpus(customers, opportunities, nameById);
  const hits = retrieve(lastUser, corpus, 14);
  const periodT = selectTargets(profile, allTargets);
  const mt = periodT.monthly?.target_amount ?? 0;
  const ach = periodT.monthly?.achieved_amount ?? 0;
  const detached = customers.filter((c) => c.category === "Detached");
  const topRecover = detached.map((c) => ({ c, r: recoveryScore(c) })).sort((a, b) => b.r.priorityScore - a.r.priorityScore).slice(0, 5);
  const actions = dailyActions(customers, opportunities, 6);
  const topOpps = opportunities.filter((o) => o.stage !== "Won" && o.stage !== "Lost").sort((a, b) => b.value * STAGE_PROBABILITY[b.stage] - a.value * STAGE_PROBABILITY[a.stage]).slice(0, 6);

  const context = `
USER: ${profile.name} (${profile.role}) · scope: ${isManager(profile.role) ? "company-wide" : "own accounts"}
THIS MONTH: target ${inr(mt)} · achieved ${inr(ach)} · gap ${inr(Math.max(0, mt - ach))} · AI projection ${inr(projection.projectedRevenue)} (${projection.confidence}% conf)
CUSTOMERS: ${customers.length} (${customers.filter((c) => c.category === "Regular").length} regular, ${detached.length} detached, ${customers.filter((c) => c.category === "New").length} new)
TOP OPPORTUNITIES: ${topOpps.map((o) => `${o.title} [${o.stage} ${inr(o.value)}]`).join("; ")}
DETACHED TO RECOVER: ${topRecover.map(({ c, r }) => `${c.company_name} (${Math.round(r.probability * 100)}%)`).join("; ")}
RECOMMENDED TODAY: ${actions.map((a) => a.title).join("; ")}
RELEVANT RECORDS:
${hits.map((h) => `- ${h.text}`).join("\n") || "(no specific matches)"}
`.trim();

  const ai = await groqChat(
    [
      {
        role: "system",
        content: `You are the AI Sales Copilot for Saaya Group (industrial manufacturing & export). Use ONLY the DATA to answer. Be concise, specific, action-oriented; use ₹ and bullet points; name real customers/opportunities.

You can also CREATE records. If the user clearly asks to add/create a lead or a customer, extract the fields.

Respond with ONLY a JSON object:
{"type":"reply"|"create_lead"|"create_customer","message":"...","data":{...}}
- create_customer data: company_name (required), contact_person, phone, email, country, industry, category ("New"|"Regular")
- create_lead data: company (existing customer name OR new prospect), title (required), value_lakhs (number), stage ("New"|"Contacted"|"Meeting Scheduled"|"Quotation Shared"|"Negotiation"), expected_close ("YYYY-MM-DD"), notes
If a required field is missing, use type "reply" and ask for it. For normal questions use type "reply" with the answer in message.`,
      },
      { role: "user", content: `DATA:\n${context}\n\nCONVERSATION:\n${messages.map((m) => `${m.role}: ${m.content}`).join("\n")}` },
    ],
    { temperature: 0.4, maxTokens: 700 }
  );

  const parsed = extractJson<{ type: string; message: string; data?: any }>(ai);

  if (parsed?.type === "create_customer" && parsed.data?.company_name) {
    const d = parsed.data;
    const res = await createCustomer({ company_name: d.company_name, contact_person: d.contact_person, phone: d.phone, email: d.email, country: d.country, industry: d.industry, category: d.category === "Regular" ? "Regular" : "New" });
    return NextResponse.json({ message: res.ok ? `✅ Created customer **${d.company_name}**. ${parsed.message ?? ""}` : `Couldn't create it: ${res.error}`, href: res.id ? `/customers/${res.id}` : undefined });
  }

  if (parsed?.type === "create_lead" && parsed.data?.title) {
    const d = parsed.data;
    const existing = d.company ? customers.find((c) => c.company_name.toLowerCase() === String(d.company).toLowerCase()) : undefined;
    const res = await createLead({
      customerId: existing?.id,
      newCompany: existing ? undefined : d.company,
      title: d.title,
      value: Math.round((Number(d.value_lakhs) || 0) * 100000),
      stage: (d.stage as OppStage) || "New",
      expectedClose: d.expected_close,
      notes: d.notes,
    });
    return NextResponse.json({ message: res.ok ? `✅ Added lead **${d.title}**${d.company ? ` for ${d.company}` : ""}. It's in your pipeline. ${parsed.message ?? ""}` : `Couldn't create the lead: ${res.error}`, href: "/leads" });
  }

  if (parsed?.message) return NextResponse.json({ message: parsed.message });
  if (ai) return NextResponse.json({ message: ai });

  // Deterministic fallback
  return NextResponse.json({
    message: `This month you're at ${inr(ach)} of ${inr(mt)} (gap ${inr(Math.max(0, mt - ach))}). Top focus:\n${actions.slice(0, 4).map((a) => `• ${a.title}`).join("\n")}`,
  });
}

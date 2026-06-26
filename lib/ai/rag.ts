import type { Customer, Opportunity } from "@/lib/types";
import { STAGE_PROBABILITY } from "@/lib/types";
import { inr, monthsAgo } from "@/lib/utils";

export interface RagDoc {
  id: string;
  type: "customer" | "opportunity";
  ref: string; // href
  title: string;
  text: string;
}

const STOP = new Set("the a an of to in on for and or is are with my our me i we who what which how when where show list give find tell about top best".split(" "));

function tokenize(s: string): string[] {
  return s.toLowerCase().replace(/[^a-z0-9₹%\s]/g, " ").split(/\s+/).filter((t) => t.length > 1 && !STOP.has(t));
}

/** Build a retrievable document per customer and per opportunity. */
export function buildCorpus(customers: Customer[], opportunities: Opportunity[], nameById: Map<string, string>): RagDoc[] {
  const oppByCust = new Map<string, Opportunity[]>();
  for (const o of opportunities) if (o.customer_id) (oppByCust.get(o.customer_id) ?? oppByCust.set(o.customer_id, []).get(o.customer_id)!).push(o);

  const docs: RagDoc[] = customers.map((c) => {
    const opps = oppByCust.get(c.id) ?? [];
    const lapse = c.last_order_date ? `${monthsAgo(c.last_order_date).toFixed(0)} months since last order` : "no orders yet";
    return {
      id: c.id, type: "customer", ref: `/customers/${c.id}`, title: c.company_name,
      text: [
        `Customer ${c.company_name}`, c.category, c.health_band, `health ${c.health_score}`,
        c.country, c.industry, `owner ${nameById.get(c.assigned_to ?? "") ?? ""}`,
        `revenue ${inr(c.total_revenue)}`, lapse,
        c.country === "India" ? "local domestic" : "export overseas",
        opps.map((o) => `${o.stage} ${o.title}`).join(" "),
      ].filter(Boolean).join(" · "),
    };
  });

  for (const o of opportunities) {
    const cust = customers.find((c) => c.id === o.customer_id);
    docs.push({
      id: o.id, type: "opportunity", ref: `/leads/${o.id}`, title: o.title,
      text: `Opportunity ${o.title} for ${cust?.company_name ?? ""} · stage ${o.stage} · value ${inr(o.value)} · ${o.probability}% likely · weighted ${inr(o.value * (STAGE_PROBABILITY[o.stage] ?? 0))} · owner ${nameById.get(o.assigned_to ?? "") ?? ""}`,
    });
  }
  return docs;
}

/** Lightweight TF retrieval: rank docs by query-term overlap. */
export function retrieve(query: string, corpus: RagDoc[], k = 14): RagDoc[] {
  const terms = tokenize(query);
  if (terms.length === 0) return [];
  const scored = corpus.map((d) => {
    const text = d.text.toLowerCase();
    let score = 0;
    for (const t of terms) {
      if (text.includes(t)) score += 1;
      if (d.title.toLowerCase().includes(t)) score += 1.5;
    }
    return { d, score };
  });
  return scored.filter((s) => s.score > 0).sort((a, b) => b.score - a.score).slice(0, k).map((s) => s.d);
}

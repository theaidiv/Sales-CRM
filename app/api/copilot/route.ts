import { NextResponse } from "next/server";
import { requireProfile } from "@/lib/auth";
import { getAnalyticsBundle } from "@/lib/data";
import { dailyActions } from "@/lib/engines/actions";
import { recoveryScore } from "@/lib/engines/recovery";
import { groqChat } from "@/lib/ai/groq";
import { inr } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const profile = await requireProfile();
  const { question } = await req.json();
  if (!question || typeof question !== "string") {
    return NextResponse.json({ error: "Missing question" }, { status: 400 });
  }

  const { projection, risks, customers, opportunities, targets: periodT } = await getAnalyticsBundle(profile);
  const monthlyTarget = periodT.monthly?.target_amount ?? 0;
  const achieved = periodT.monthly?.achieved_amount ?? 0;
  const gap = Math.max(0, monthlyTarget - achieved);

  const detached = customers.filter((c) => c.category === "Detached");
  const topRecover = detached
    .map((c) => ({ c, r: recoveryScore(c) }))
    .sort((a, b) => b.r.priorityScore - a.r.priorityScore)
    .slice(0, 5);
  const actions = dailyActions(customers, opportunities, 6);
  const topOpps = opportunities
    .filter((o) => o.stage !== "Won" && o.stage !== "Lost")
    .sort((a, b) => b.value * b.probability - a.value * a.probability)
    .slice(0, 5);

  // Compact data context the model must reason over.
  const context = `
ROLE: ${profile.role} (${profile.name})
PERIOD: this month
TARGET: ${inr(monthlyTarget)} | ACHIEVED: ${inr(achieved)} | GAP: ${inr(gap)}
AI PROJECTION: ${inr(projection.projectedRevenue)} (confidence ${projection.confidence}%)
CUSTOMERS: ${customers.length} total — ${customers.filter((c) => c.category === "Regular").length} regular, ${detached.length} detached, ${customers.filter((c) => c.category === "New").length} new
OPEN OPPORTUNITIES: ${opportunities.filter((o) => o.stage !== "Won" && o.stage !== "Lost").length}

TOP OPPORTUNITIES TO CLOSE:
${topOpps.map((o) => `- ${o.title} | ${o.stage} | ${inr(o.value)} | ${o.probability}% likely`).join("\n")}

TOP DETACHED CUSTOMERS TO RECOVER:
${topRecover.map(({ c, r }) => `- ${c.company_name} | ${Math.round(r.probability * 100)}% recovery | potential ${inr(r.potentialRevenue)} | ${r.priority} priority`).join("\n")}

RECOMMENDED ACTIONS TODAY:
${actions.map((a) => `- ${a.title} (${a.reason})`).join("\n")}

TOP RISK ALERTS:
${risks.slice(0, 5).map((r) => `- [${r.severity}] ${r.title}: ${r.detail}`).join("\n")}
`.trim();

  const ai = await groqChat(
    [
      {
        role: "system",
        content:
          "You are the AI Sales Copilot for an industrial manufacturing & export company. Answer the user's question using ONLY the sales data provided. Be concise, specific, and action-oriented — use bullet points and name actual customers/opportunities. Use the figures given. If the data doesn't contain the answer, say so briefly.",
      },
      { role: "user", content: `DATA:\n${context}\n\nQUESTION: ${question}` },
    ],
    { temperature: 0.4, maxTokens: 600 }
  );

  if (ai) return NextResponse.json({ answer: ai, source: "ai" });

  // Deterministic fallback — still a useful, data-grounded answer.
  const fallback = buildFallback(question, { gap, projection, topOpps, topRecover, actions, risks });
  return NextResponse.json({ answer: fallback, source: "fallback" });
}

function buildFallback(
  q: string,
  d: { gap: number; projection: any; topOpps: any[]; topRecover: any[]; actions: any[]; risks: any[] }
): string {
  const lc = q.toLowerCase();
  if (lc.includes("detached") || lc.includes("recover")) {
    return "Detached customers to target:\n" + d.topRecover.map(({ c, r }: any) => `• ${c.company_name} — ${Math.round(r.probability * 100)}% recovery, potential ${inr(r.potentialRevenue)} (${r.priority})`).join("\n");
  }
  if (lc.includes("close") || lc.includes("opportunit") || lc.includes("deal")) {
    return "Opportunities most likely to close:\n" + d.topOpps.map((o: any) => `• ${o.title} — ${o.stage}, ${inr(o.value)}, ${o.probability}% likely`).join("\n");
  }
  if (lc.includes("behind") || lc.includes("target") || lc.includes("gap")) {
    return `You have a gap of ${inr(d.gap)} to this month's target. Projection is ${inr(d.projection.projectedRevenue)} at ${d.projection.confidence}% confidence. Focus on:\n` + d.actions.slice(0, 4).map((a: any) => `• ${a.title}`).join("\n");
  }
  if (lc.includes("risk")) {
    return "Top revenue risks:\n" + d.risks.slice(0, 5).map((r: any) => `• [${r.severity}] ${r.title}: ${r.detail}`).join("\n");
  }
  if (lc.includes("today") || lc.includes("focus") || lc.includes("priority")) {
    return "Your top priorities today:\n" + d.actions.map((a: any) => `• ${a.title} — ${a.reason}`).join("\n");
  }
  return `This month's projection is ${inr(d.projection.projectedRevenue)} with a ${inr(d.gap)} gap to target. Top priorities:\n` + d.actions.slice(0, 4).map((a: any) => `• ${a.title}`).join("\n");
}

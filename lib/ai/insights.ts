import { groqChat } from "@/lib/ai/groq";
import type { ProjectionResult } from "@/lib/engines/projection";
import type { ForecastResult } from "@/lib/engines/forecast";
import { inr } from "@/lib/utils";

/** Summarize a customer's activity/comment timeline. AI with template fallback. */
export async function summarizeCustomer(input: {
  companyName: string;
  category: string;
  healthBand: string;
  timeline: string[];
}): Promise<string> {
  const { companyName, category, healthBand, timeline } = input;
  const ai = await groqChat(
    [
      {
        role: "system",
        content:
          "You are a sales analyst. Summarize a customer's recent interactions in 3-4 crisp sentences. End with one recommended next action. Be specific and concise.",
      },
      {
        role: "user",
        content: `Customer: ${companyName}\nCategory: ${category}\nHealth: ${healthBand}\nRecent timeline:\n${timeline
          .slice(0, 20)
          .map((t) => `- ${t}`)
          .join("\n")}`,
      },
    ],
    { temperature: 0.3, maxTokens: 280 }
  );
  if (ai) return ai;

  // Deterministic fallback.
  const last = timeline[0] ?? "No recent activity recorded.";
  const action =
    category === "Detached"
      ? "Schedule a recovery call to re-establish contact."
      : healthBand === "At Risk"
      ? "Proactively follow up before the relationship cools further."
      : "Continue the current cadence and look for an upsell opening.";
  return `${companyName} is a ${category} account with ${healthBand} health. ${timeline.length} recent interactions on record; most recently: ${last} Engagement reflects the ${healthBand.toLowerCase()} status. Recommended next action: ${action}`;
}

/** Narrate why a projection came out the way it did. */
export async function explainProjection(p: ProjectionResult): Promise<string> {
  const b = p.breakdown;
  const ctx = `Projected revenue ${inr(p.projectedRevenue)} vs target ${inr(
    p.target
  )} (gap ${inr(p.targetGap)}, confidence ${p.confidence}%). Sources — Regular run-rate ${inr(
    b.regular
  )}, Detached recovery ${inr(b.detached)}, Open opportunities ${inr(
    b.opportunities
  )}, Pending quotations ${inr(b.quotations)}, New customers ${inr(b.newCustomers)}.`;

  const ai = await groqChat(
    [
      {
        role: "system",
        content:
          "You are a sales forecasting assistant. In 2-3 sentences, explain this monthly projection in plain business language: what drives it and the biggest lever to close any gap. No preamble.",
      },
      { role: "user", content: ctx },
    ],
    { temperature: 0.3, maxTokens: 220 }
  );
  if (ai) return ai;

  const biggest = Object.entries(b).sort((a, c) => c[1] - a[1])[0];
  const lever =
    p.targetGap > 0
      ? `To close the ${inr(p.targetGap)} gap, accelerate open opportunities and pending quotations.`
      : `The projection is on track to meet target.`;
  return `This month's projection of ${inr(p.projectedRevenue)} is led by ${labelFor(
    biggest[0]
  )} (${inr(biggest[1])}). Confidence is ${p.confidence}% based on the share coming from stable sources. ${lever}`;
}

/** Narrate a forecast scenario set. */
export async function explainForecast(f: ForecastResult): Promise<string> {
  const ctx = `${f.period} forecast — Best ${inr(f.scenarios.best)}, Expected ${inr(
    f.scenarios.expected
  )}, Worst ${inr(f.scenarios.worst)}. Target ${inr(f.target)}, gap ${inr(
    f.revenueGap
  )}, confidence ${f.confidence}%.`;
  const ai = await groqChat(
    [
      {
        role: "system",
        content:
          "You are a revenue forecasting assistant. Explain this forecast in 2-3 sentences: the expected outcome, the spread between best and worst, and whether the target is reachable. No preamble.",
      },
      { role: "user", content: ctx },
    ],
    { temperature: 0.3, maxTokens: 220 }
  );
  if (ai) return ai;

  const reach =
    f.revenueGap <= 0
      ? "the target is within reach on the expected case."
      : `a ${inr(f.revenueGap)} gap remains on the expected case, reachable only nearer the best case.`;
  return `The ${f.period.toLowerCase()} expected outcome is ${inr(
    f.scenarios.expected
  )}, ranging ${inr(f.scenarios.worst)}–${inr(f.scenarios.best)} as conditions vary. At ${f.confidence}% confidence, ${reach}`;
}

function labelFor(key: string): string {
  return (
    {
      regular: "regular-customer run-rate",
      detached: "detached-customer recovery",
      opportunities: "open opportunities",
      quotations: "pending quotations",
      newCustomers: "new customers",
    } as Record<string, string>
  )[key] ?? key;
}

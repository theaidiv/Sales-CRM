import type { ProjectionResult } from "@/lib/engines/projection";

export interface ForecastScenario {
  best: number;
  expected: number;
  worst: number;
}

export interface ForecastResult {
  period: "Monthly" | "Quarterly" | "Annual";
  scenarios: ForecastScenario;
  confidence: number;
  target: number;
  revenueGap: number; // target - expected
}

/**
 * Build best / expected / worst bands around a projection. Band width widens
 * as confidence falls and as the horizon lengthens.
 */
export function forecastFromProjection(
  projection: ProjectionResult,
  period: ForecastResult["period"],
  periodTarget: number,
  achievedSoFar = 0
): ForecastResult {
  const horizonMultiplier =
    period === "Monthly" ? 1 : period === "Quarterly" ? 3 : 12;

  // Expected = already-achieved + projection scaled to the horizon (decaying contribution).
  const horizonProjection =
    projection.projectedRevenue * horizonGrowth(horizonMultiplier);
  const expected = achievedSoFar + horizonProjection;

  // Band width: lower confidence => wider spread (8%–28%).
  const spread = 0.08 + (1 - projection.confidence / 100) * 0.2;
  const best = expected * (1 + spread);
  const worst = expected * (1 - spread);

  return {
    period,
    scenarios: {
      best: Math.round(best),
      expected: Math.round(expected),
      worst: Math.round(worst),
    },
    confidence: projection.confidence,
    target: periodTarget,
    revenueGap: Math.round(periodTarget - expected),
  };
}

/** Future months contribute with mild decay (pipeline thins out). */
function horizonGrowth(months: number): number {
  let total = 0;
  for (let i = 0; i < months; i++) total += Math.pow(0.97, i);
  return total;
}

// Statistical / ML forecasting: ordinary least-squares trend + multiplicative
// seasonal indices + residual-based prediction intervals. Trained on the
// customer's own monthly revenue history (no external service required).

export interface MonthObs {
  month0: number; // 0=Jan
  revenue: number;
}

export interface Regression {
  slope: number;
  intercept: number;
  r2: number;
  residualStd: number;
}

/** Ordinary least squares fit of y = slope*x + intercept (x = 0..n-1). */
export function linearRegression(y: number[]): Regression {
  const n = y.length;
  if (n < 2) return { slope: 0, intercept: y[0] ?? 0, r2: 0, residualStd: 0 };
  const xs = y.map((_, i) => i);
  const xMean = (n - 1) / 2;
  const yMean = y.reduce((a, b) => a + b, 0) / n;
  let sxy = 0, sxx = 0, syy = 0;
  for (let i = 0; i < n; i++) {
    sxy += (xs[i] - xMean) * (y[i] - yMean);
    sxx += (xs[i] - xMean) ** 2;
    syy += (y[i] - yMean) ** 2;
  }
  const slope = sxx === 0 ? 0 : sxy / sxx;
  const intercept = yMean - slope * xMean;

  let ssRes = 0;
  for (let i = 0; i < n; i++) {
    const pred = slope * i + intercept;
    ssRes += (y[i] - pred) ** 2;
  }
  const r2 = syy === 0 ? 0 : Math.max(0, 1 - ssRes / syy);
  const residualStd = Math.sqrt(ssRes / Math.max(1, n - 2));
  return { slope, intercept, r2, residualStd };
}

/** Multiplicative seasonal index per calendar month (mean-normalised to 1.0). */
export function seasonalIndices(obs: MonthObs[]): number[] {
  const trend = linearRegression(obs.map((o) => o.revenue));
  const ratios: number[][] = Array.from({ length: 12 }, () => []);
  obs.forEach((o, i) => {
    const fit = trend.slope * i + trend.intercept;
    if (fit > 0) ratios[o.month0].push(o.revenue / fit);
  });
  const idx = ratios.map((r) => (r.length ? r.reduce((a, b) => a + b, 0) / r.length : 1));
  const mean = idx.reduce((a, b) => a + b, 0) / 12 || 1;
  return idx.map((v) => v / mean);
}

export interface Prediction {
  month0: number;
  expected: number;
  low: number;
  high: number;
}

export interface MLForecast {
  history: MonthObs[];
  reg: Regression;
  seasonal: number[];
  predictions: Prediction[]; // future months
  monthlyExpected: number;   // next month
  growthRatePct: number;     // implied MoM trend on the de-seasonalised level
  confidence: number;        // 0-100 from R²
}

/**
 * Fit on monthly history, forecast `horizon` future months with ~80% prediction
 * intervals (z≈1.28) widened slightly per step out.
 */
export function mlForecast(obs: MonthObs[], horizon = 6): MLForecast {
  const y = obs.map((o) => o.revenue);
  const reg = linearRegression(y);
  const seasonal = seasonalIndices(obs);
  const n = obs.length;
  const lastMonth0 = obs.length ? obs[obs.length - 1].month0 : new Date().getMonth();

  const z = 1.28;
  const predictions: Prediction[] = [];
  for (let h = 1; h <= horizon; h++) {
    const x = n - 1 + h;
    const m0 = (lastMonth0 + h) % 12;
    const trend = Math.max(0, reg.slope * x + reg.intercept);
    const expected = Math.max(0, trend * (seasonal[m0] ?? 1));
    // Interval widens with horizon (sqrt growth of uncertainty).
    const band = z * reg.residualStd * Math.sqrt(h);
    predictions.push({
      month0: m0,
      expected: Math.round(expected),
      low: Math.round(Math.max(0, expected - band)),
      high: Math.round(expected + band),
    });
  }

  const level = reg.intercept + reg.slope * (n - 1);
  const growthRatePct = level > 0 ? (reg.slope / level) * 100 : 0;
  const confidence = Math.round(Math.max(35, Math.min(95, 45 + reg.r2 * 50)));

  return {
    history: obs,
    reg,
    seasonal,
    predictions,
    monthlyExpected: predictions[0]?.expected ?? 0,
    growthRatePct,
    confidence,
  };
}

/** Sum the next `months` predictions into a single period forecast with bands. */
export function aggregateForecast(f: MLForecast, months: number) {
  const slice = f.predictions.slice(0, months);
  return {
    expected: slice.reduce((s, p) => s + p.expected, 0),
    low: slice.reduce((s, p) => s + p.low, 0),
    high: slice.reduce((s, p) => s + p.high, 0),
  };
}

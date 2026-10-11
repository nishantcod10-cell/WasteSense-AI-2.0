import { differenceInDays, parseISO, startOfDay } from 'date-fns';
import { InventoryItem, ForecastResult, RiskLevel, RiskWeights, AppSettings } from '../../types';

export const DEFAULT_RISK_WEIGHTS: RiskWeights = {
  surplusRatio: 0.35,
  urgency: 0.35,
  financialValue: 0.20,
  volatility: 0.10,
};

/**
 * Calculates a weighted moving average where recent observations have higher weight.
 * If weights are not provided, linearly decaying weights [n, n-1, ..., 1] are used.
 */
export function weightedMovingAverage(salesHistory: number[], weights?: number[]): number {
  if (!salesHistory || salesHistory.length === 0) {
    return 0;
  }

  const n = salesHistory.length;
  let normalizedWeights: number[] = [];

  if (weights && weights.length === n) {
    const sumW = weights.reduce((acc, w) => acc + w, 0);
    normalizedWeights = sumW > 0 ? weights.map((w) => w / sumW) : weights.map(() => 1 / n);
  } else {
    // Linear decaying weights favoring most recent days
    // e.g. for [day-3, day-2, day-1, today] -> weights [1, 2, 3, 4]
    const weightSum = (n * (n + 1)) / 2;
    normalizedWeights = Array.from({ length: n }, (_, i) => (i + 1) / weightSum);
  }

  const weightedSum = salesHistory.reduce((sum, val, idx) => sum + val * normalizedWeights[idx], 0);
  return Number(Math.max(0, weightedSum).toFixed(2));
}

/**
 * Linear trend extrapolation over the recent sales history.
 * Uses simple linear regression (OLS) to estimate the slope and next day prediction.
 */
export function trendAdjustedForecast(salesHistory: number[]): number {
  if (!salesHistory || salesHistory.length === 0) {
    return 0;
  }
  if (salesHistory.length === 1) {
    return Math.max(0, salesHistory[0]);
  }

  const n = salesHistory.length;
  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumX2 = 0;

  for (let i = 0; i < n; i++) {
    const x = i + 1;
    const y = salesHistory[i];
    sumX += x;
    sumY += y;
    sumXY += x * y;
    sumX2 += x * x;
  }

  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX || 1);
  const intercept = (sumY - slope * sumX) / n;

  // Forecast for next time step (n + 1)
  const nextVal = intercept + slope * (n + 1);
  return Number(Math.max(0, nextVal).toFixed(2));
}

/**
 * Computes the usable selling days remaining before expiry, considering an optional safety buffer.
 */
export function calculateUsableSellingDays(expiryDate: string, safetyBufferDays: number = 0): number {
  try {
    const expiry = startOfDay(parseISO(expiryDate));
    const today = startOfDay(new Date());
    const rawDiff = differenceInDays(expiry, today);
    return Math.max(0, rawDiff - safetyBufferDays);
  } catch {
    return 0;
  }
}

/**
 * Calculates expected surplus quantity given current inventory and forecast demand.
 */
export function calculateExpectedSurplus(quantity: number, forecastDemand: number): number {
  return Number(Math.max(0, quantity - forecastDemand).toFixed(2));
}

/**
 * Computes daily demand forecast combining trend extrapolation and weighted moving average.
 */
export function forecastDailyDemand(item: InventoryItem): {
  forecast: number;
  method: 'trend_adjusted' | 'weighted_moving_average' | 'simple_moving_average' | 'baseline';
  confidence: number;
} {
  const history = item.salesHistory || [];
  
  if (history.length >= 7) {
    const trend = trendAdjustedForecast(history);
    const wma = weightedMovingAverage(history);

    // Compute variance to gauge confidence
    const mean = history.reduce((a, b) => a + b, 0) / history.length;
    const variance = history.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / history.length;
    const stdDev = Math.sqrt(variance);
    const cv = mean > 0 ? stdDev / mean : 1; // Coefficient of variation

    // High variability lowers confidence
    const confidence = Number(Math.max(0.4, Math.min(0.95, 1 - cv * 0.35)).toFixed(2));

    // Combine trend (40%) and WMA (60%) for smoothed prediction
    const blended = Number((trend * 0.4 + wma * 0.6).toFixed(2));

    return {
      forecast: blended > 0 ? blended : Number(item.avgDailySales.toFixed(2)),
      method: 'trend_adjusted',
      confidence,
    };
  }

  if (history.length >= 3) {
    const wma = weightedMovingAverage(history);
    return {
      forecast: wma > 0 ? wma : Number(item.avgDailySales.toFixed(2)),
      method: 'weighted_moving_average',
      confidence: 0.72,
    };
  }

  // Fallback to baseline avgDailySales
  return {
    forecast: Number(Math.max(0, item.avgDailySales).toFixed(2)),
    method: 'baseline',
    confidence: 0.55,
  };
}

/**
 * Classifies a risk score into discrete risk levels.
 */
export function classifyRisk(score: number): RiskLevel {
  if (score >= 80) return 'critical';
  if (score >= 55) return 'high';
  if (score >= 30) return 'moderate';
  return 'low';
}

/**
 * Calculates the composite risk score (0 - 100) and extracts key risk factors.
 */
export function calculateRiskScore(
  item: InventoryItem,
  surplus: number,
  daysRemaining: number,
  forecastConfidence: number,
  weights: RiskWeights = DEFAULT_RISK_WEIGHTS
): { score: number; factors: string[] } {
  const factors: string[] = [];

  // 1. Surplus Ratio Component (0 - 100)
  const surplusRatio = item.quantity > 0 ? Math.min(1, surplus / item.quantity) : 0;
  const surplusScore = surplusRatio * 100;
  if (surplusRatio > 0.6) {
    factors.push(`Significant expected surplus: ${Math.round(surplusRatio * 100)}% of stock will not sell`);
  } else if (surplusRatio > 0.25) {
    factors.push(`Moderate surplus expected (${Math.round(surplus)} units unabsorbed)`);
  }

  // 2. Urgency Component (Time decay) (0 - 100)
  let urgencyScore = 0;
  if (daysRemaining <= 0) {
    urgencyScore = 100;
    factors.push('Product has reached or exceeded expiration date');
  } else if (daysRemaining <= 2) {
    urgencyScore = 95;
    factors.push(`Urgent: only ${daysRemaining} day(s) before expiry`);
  } else if (daysRemaining <= 5) {
    urgencyScore = 70;
    factors.push(`Short shelf-life remaining (${daysRemaining} days)`);
  } else if (daysRemaining <= 10) {
    urgencyScore = 40;
  } else {
    urgencyScore = Math.max(5, 30 - daysRemaining);
  }

  // 3. Financial Exposure Component (0 - 100)
  const exposureValue = surplus * item.costPerUnit;
  // Scaled against typical retail stock batch cost threshold ($500 reference)
  const financialScore = Math.min(100, (exposureValue / 500) * 100);
  if (exposureValue >= 250) {
    factors.push(`High financial exposure: $${exposureValue.toFixed(2)} at risk`);
  }

  // 4. Uncertainty & Quality Status Component (0 - 100)
  let volatilityScore = (1 - forecastConfidence) * 60;
  if (item.qualityStatus === 'inspect') {
    volatilityScore += 40;
    factors.push('Physical quality requires verification');
  } else if (item.qualityStatus === 'compromised') {
    volatilityScore = 100;
    factors.push('Compromised quality detected');
  }

  const rawScore =
    surplusScore * weights.surplusRatio +
    urgencyScore * weights.urgency +
    financialScore * weights.financialValue +
    volatilityScore * weights.volatility;

  const finalScore = Math.min(100, Math.max(0, Math.round(rawScore)));

  return {
    score: finalScore,
    factors: factors.length > 0 ? factors : ['Demand and shelf life well-balanced'],
  };
}

/**
 * Generates natural language explanation for the forecasting result.
 */
export function generateExplanation(result: ForecastResult): string {
  if (result.riskLevel === 'expired') {
    return `${result.productName} has passed its expiry date. Immediate removal or eco-safe disposal recommended.`;
  }
  if (result.riskLevel === 'critical') {
    return `Critical risk: ${result.expectedSurplus} units projected surplus with only ${result.daysRemaining} days left. Financial risk of $${result.financialExposure.toFixed(2)}. Urgent clearance or immediate donation required.`;
  }
  if (result.riskLevel === 'high') {
    return `High waste risk: Demand is outpaced by inventory by ${result.expectedSurplus} units. Action required within 48 hours to prevent spoilage.`;
  }
  if (result.riskLevel === 'moderate') {
    return `Moderate risk: Slight surplus anticipated (${result.expectedSurplus} units). Proactive markdown or shelf repositioning advised.`;
  }
  return `Stable: Expected daily velocity is sufficient to clear inventory before expiration with minimal waste risk.`;
}

/**
 * Analyzes all inventory items and yields forecast and risk predictions.
 */
export function analyzeInventory(items: InventoryItem[], settings?: AppSettings): ForecastResult[] {
  const safetyBuffer = settings?.safetyBufferDays ?? 0;
  const weights = settings?.riskWeights ?? DEFAULT_RISK_WEIGHTS;

  return items.map((item) => {
    const usableDays = calculateUsableSellingDays(item.expiryDate, safetyBuffer);
    const { forecast: dailyDemand, method, confidence } = forecastDailyDemand(item);
    
    // Total demand expected over the usable days
    const totalForecastDemand = Number((dailyDemand * usableDays).toFixed(2));
    const expectedSurplus = calculateExpectedSurplus(item.quantity, totalForecastDemand);
    const financialExposure = Number((expectedSurplus * item.costPerUnit).toFixed(2));

    const isExpired = usableDays === 0;
    let riskLevel: RiskLevel;
    let riskScore: number;
    let riskFactors: string[];

    if (isExpired) {
      riskLevel = 'expired';
      riskScore = 100;
      riskFactors = ['Item has expired'];
    } else {
      const calculated = calculateRiskScore(item, expectedSurplus, usableDays, confidence, weights);
      riskScore = calculated.score;
      riskFactors = calculated.factors;
      riskLevel = classifyRisk(riskScore);
    }

    let recommendation = 'Maintain standard monitoring';
    if (riskLevel === 'expired') {
      recommendation = 'Dispose / record shrinkage immediately';
    } else if (riskLevel === 'critical') {
      recommendation = 'Apply 40-60% markdown or immediate partner donation';
    } else if (riskLevel === 'high') {
      recommendation = 'Apply 20-30% dynamic markdown promotion';
    } else if (riskLevel === 'moderate') {
      recommendation = 'Front-face merchandising / consider bundle offer';
    }

    const result: ForecastResult = {
      productId: item.id,
      batchId: item.batchId,
      productName: item.name,
      currentQuantity: item.quantity,
      daysRemaining: usableDays,
      forecastDemand: totalForecastDemand,
      expectedSurplus,
      riskScore,
      riskLevel,
      confidence,
      financialExposure,
      riskFactors,
      recommendation,
      forecastMethod: method,
    };

    return result;
  });
}

/**
 * Evaluates forecast accuracy against observed actuals.
 * Computes Mean Absolute Error (MAE), Root Mean Squared Error (RMSE), and Weighted Absolute Percentage Error (WAPE).
 */
export function evaluateModel(
  actuals: number[],
  predicted: number[]
): { mae: number; rmse: number; wape: number } {
  if (actuals.length === 0 || actuals.length !== predicted.length) {
    return { mae: 0, rmse: 0, wape: 0 };
  }

  const n = actuals.length;
  let absErrorSum = 0;
  let squaredErrorSum = 0;
  let totalActual = 0;

  for (let i = 0; i < n; i++) {
    const error = Math.abs(actuals[i] - predicted[i]);
    absErrorSum += error;
    squaredErrorSum += Math.pow(actuals[i] - predicted[i], 2);
    totalActual += actuals[i];
  }

  const mae = Number((absErrorSum / n).toFixed(2));
  const rmse = Number(Math.sqrt(squaredErrorSum / n).toFixed(2));
  const wape = totalActual > 0 ? Number(((absErrorSum / totalActual) * 100).toFixed(2)) : 0;

  return { mae, rmse, wape };
}

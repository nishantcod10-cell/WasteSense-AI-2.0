import { InventoryItem, ForecastResult, ScenarioInput, ScenarioResult } from '../../types';

/**
 * Simulates the outcome of markdown discount vs donation strategies.
 * Enforces business logic: prevents double-allocation and sales beyond expiry.
 */
export function simulateScenario(
  item: InventoryItem,
  forecast: ForecastResult,
  input: ScenarioInput
): ScenarioResult {
  const totalQty = Math.max(0, item.quantity);
  const cost = item.costPerUnit;
  const regularPrice = item.sellingPrice;
  const daysRemaining = forecast.daysRemaining;

  // Validate discount bounds
  const discountPercent = Math.max(0, Math.min(90, input.markdownDiscountPercent));
  const donationPortionPercent = Math.max(0, Math.min(100, input.donationPortionPercent));
  const elasticity = input.priceElasticity || 1.3;

  // Effective discounted unit price
  const discountedPrice = Number((regularPrice * (1 - discountPercent / 100)).toFixed(2));

  // Determine inventory partition
  // Double-allocation prevention: Ensure markdown quantity + donation quantity <= total stock
  // Donation targets portion of surplus
  const surplus = Math.min(totalQty, forecast.expectedSurplus);
  let donationQty = 0;

  if (daysRemaining > 0 && donationPortionPercent > 0) {
    donationQty = Math.round((surplus * donationPortionPercent) / 100);
  }
  donationQty = Math.min(donationQty, totalQty);

  // Available stock for commercial sale (regular + markdown)
  const availableForSale = Math.max(0, totalQty - donationQty);

  // Demand projection with price elasticity boost
  // e.g. 20% discount with elasticity 1.3 -> 26% uplift in baseline demand
  const priceReductionRatio = discountPercent / 100;
  const demandUpliftRatio = 1 + priceReductionRatio * elasticity;

  // Max units that can be sold given remaining days
  let projectedSales = 0;
  if (daysRemaining > 0) {
    const boostedDailyDemand = (forecast.forecastDemand / Math.max(1, daysRemaining)) * demandUpliftRatio;
    const effectiveSellDays = Math.min(daysRemaining, input.targetSellThroughDays ?? daysRemaining);
    const calculatedSales = Math.round(boostedDailyDemand * effectiveSellDays);
    projectedSales = Math.min(availableForSale, calculatedSales);
  } else {
    // Cannot sell past expiry
    projectedSales = 0;
  }

  // Waste quantity is remaining unsold stock that is not donated
  const remainingStock = availableForSale - projectedSales;
  const wasteQty = Math.max(0, remainingStock);

  // Financial calculations
  const projectedRevenue = Number((projectedSales * discountedPrice).toFixed(2));
  
  // Logistics cost: $0.15 per markdown item processed + $5 flat per donation pickup if donation > 0
  const processingCost = Number((projectedSales * 0.15 + (donationQty > 0 ? 5.0 : 0)).toFixed(2));
  const inventoryCost = Number((totalQty * cost).toFixed(2));
  const totalCost = Number((inventoryCost + processingCost).toFixed(2));

  // Tax benefit estimation for donated items (e.g., 50% cost basis)
  const donationTaxBenefit = Number((donationQty * cost * 0.5).toFixed(2));

  const projectedNetMargin = Number((projectedRevenue + donationTaxBenefit - totalCost).toFixed(2));

  // Waste reduction rate compared to do-nothing scenario (where surplus becomes waste)
  const baselineWaste = Math.max(1, forecast.expectedSurplus);
  const wasteAvoided = Math.max(0, baselineWaste - wasteQty);
  const wasteReductionRate = Number(Math.min(100, Math.max(0, (wasteAvoided / baselineWaste) * 100)).toFixed(1));

  // Feasibility score (0-100) based on realistic operational bounds
  let feasibilityScore = 90;
  const notes: string[] = [];

  if (daysRemaining <= 1 && projectedSales > 0) {
    feasibilityScore -= 25;
    notes.push('Very short window (<24h) to achieve expected markdown sales volume.');
  }

  if (discountPercent > 60) {
    feasibilityScore -= 15;
    notes.push('High discount depth may erode brand or encourage delayed purchasing.');
  }

  if (donationQty > 0 && daysRemaining < 2) {
    feasibilityScore -= 30;
    notes.push('Donation partner pickup turnaround may be too tight before expiration.');
  } else if (donationQty > 0) {
    notes.push(`Diverts ${donationQty} units to donation partners.`);
  }

  notes.push(`Projected to salvage ${projectedSales} units via ${discountPercent}% price markdown.`);
  if (wasteQty > 0) {
    notes.push(`${wasteQty} units remain at risk of spoilage.`);
  } else {
    notes.push('Zero waste achieved under this parameter combination.');
  }

  return {
    id: `sim-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    name: `${discountPercent}% Markdown + ${donationPortionPercent}% Donation`,
    scenarioInput: input,
    projectedSalesQuantity: projectedSales,
    projectedDonationQuantity: donationQty,
    projectedWasteQuantity: wasteQty,
    projectedRevenue,
    projectedCost: totalCost,
    projectedNetMargin,
    wasteReductionRate,
    feasibilityScore: Math.max(10, Math.min(100, feasibilityScore)),
    notes,
  };
}

/**
 * Compares a list of simulated scenario results to recommend the best option.
 */
export function compareScenarios(results: ScenarioResult[]): {
  best: ScenarioResult;
  explanation: string;
} {
  if (!results || results.length === 0) {
    throw new Error('No scenario results provided for comparison');
  }

  // Multi-objective scoring: 45% waste reduction, 35% net margin (normalized), 20% feasibility
  const scored = results.map((res) => {
    const marginComponent = Math.max(0, res.projectedNetMargin);
    const compositeScore =
      res.wasteReductionRate * 0.45 +
      Math.min(100, marginComponent * 0.5) * 0.35 +
      res.feasibilityScore * 0.20;

    return { res, compositeScore };
  });

  scored.sort((a, b) => b.compositeScore - a.compositeScore);
  const best = scored[0].res;

  const explanation = `Scenario "${best.name}" selected as optimal: achieves ${best.wasteReductionRate}% waste reduction with $${best.projectedNetMargin.toFixed(2)} projected net margin and ${best.feasibilityScore}/100 operational feasibility.`;

  return { best, explanation };
}

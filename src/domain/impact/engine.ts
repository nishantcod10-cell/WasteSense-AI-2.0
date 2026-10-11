import { ActionRecommendation, InventoryItem, ImpactMetrics } from '../../types';

// Standard conversion constants
// Environmental Protection Agency (EPA) & WRI estimates:
// ~2.5 kg CO2e per 1 kg food waste diverted from landfill
const CO2E_PER_KG_FOOD = 2.5;

// Global FoodBanking Network estimate: 1 meal = ~0.8 kg food
const KG_PER_MEAL = 0.8;

// Average unit weight in kg if item unit is 'units', 'packs', 'cases'
function estimateWeightInKg(quantity: number, unit: string): number {
  const normalized = (unit || '').toLowerCase();
  switch (normalized) {
    case 'kg':
      return quantity;
    case 'lbs':
      return quantity * 0.453592;
    case 'cases':
      return quantity * 8.0;
    case 'packs':
      return quantity * 0.5;
    case 'bunches':
      return quantity * 0.35;
    case 'units':
    default:
      return quantity * 0.6; // Average 600g per retail packaged unit
  }
}

/**
 * Calculates environmental and financial impact metrics.
 * Strictly distinguishes measured/verified impact (from completed actions)
 * from simulated/potential impact (from pending or deferred actions).
 */
export function calculateImpactMetrics(
  actions: ActionRecommendation[],
  items: InventoryItem[]
): ImpactMetrics {
  const itemMap = new Map<string, InventoryItem>();
  for (const item of items) {
    itemMap.set(item.id, item);
  }

  let totalWasteDivertedKg = 0;
  let totalFinancialSaved = 0;
  let completedActionsCount = 0;
  let pendingActionsCount = 0;

  let simulatedPotentialSavings = 0;
  let simulatedPotentialWasteDivertedKg = 0;

  const actionBreakdown = {
    markdowns: 0,
    donations: 0,
    transfers: 0,
    inspections: 0,
    removals: 0,
  };

  for (const action of actions) {
    const item = itemMap.get(action.productId);
    const unit = item ? item.unit : 'kg';
    const weightKg = estimateWeightInKg(action.estimatedWasteAvoided, unit);

    if (action.status === 'completed') {
      completedActionsCount += 1;
      totalWasteDivertedKg += weightKg;
      totalFinancialSaved += Math.max(0, action.netBenefit);

      // Track action breakdown for completed actions
      switch (action.actionType) {
        case 'markdown':
          actionBreakdown.markdowns += 1;
          break;
        case 'donation':
          actionBreakdown.donations += 1;
          break;
        case 'transfer':
          actionBreakdown.transfers += 1;
          break;
        case 'inspect':
          actionBreakdown.inspections += 1;
          break;
        case 'remove':
          actionBreakdown.removals += 1;
          break;
        default:
          break;
      }
    } else if (action.status === 'pending' || action.status === 'accepted') {
      pendingActionsCount += 1;
      simulatedPotentialWasteDivertedKg += weightKg;
      simulatedPotentialSavings += Math.max(0, action.netBenefit);
    }
  }

  // Derived environmental metrics based on verified diverted kilograms
  const co2EmissionsAvoidedKg = Number((totalWasteDivertedKg * CO2E_PER_KG_FOOD).toFixed(2));
  const mealsRescuedEquivalent = Math.round(totalWasteDivertedKg / KG_PER_MEAL);

  return {
    totalWasteDivertedKg: Number(totalWasteDivertedKg.toFixed(2)),
    totalFinancialSaved: Number(totalFinancialSaved.toFixed(2)),
    co2EmissionsAvoidedKg,
    mealsRescuedEquivalent,
    completedActionsCount,
    pendingActionsCount,
    simulatedPotentialSavings: Number(simulatedPotentialSavings.toFixed(2)),
    simulatedPotentialWasteDivertedKg: Number(simulatedPotentialWasteDivertedKg.toFixed(2)),
    actionBreakdown,
  };
}

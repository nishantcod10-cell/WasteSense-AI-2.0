import {
  InventoryItem,
  ForecastResult,
  ActionRecommendation,
  AppSettings,
  ActionType,
} from '../../types';
import { validateDonationEligibility } from '../donations/engine';

/**
 * Calculates dynamic markdown recommendation including discount tier and expected financial recovery.
 */
export function calculateMarkdownRecommendation(
  forecast: ForecastResult,
  item: InventoryItem,
  settings: AppSettings
): ActionRecommendation {
  const days = forecast.daysRemaining;
  let discountPercent = 20;

  // Escalating discount schedule based on urgency
  if (days <= 1) {
    discountPercent = 60;
  } else if (days <= 2) {
    discountPercent = 45;
  } else if (days <= 4) {
    discountPercent = 30;
  } else {
    discountPercent = 20;
  }

  // Ensure discount does not breach floor
  const maxDiscountAllowed = Math.round((1 - (settings.markdownFloor || 0.3)) * 100);
  discountPercent = Math.min(discountPercent, maxDiscountAllowed);

  const discountedPrice = Number((item.sellingPrice * (1 - discountPercent / 100)).toFixed(2));
  
  // Surplus units to clear through markdown
  const targetQuantity = forecast.expectedSurplus > 0 ? forecast.expectedSurplus : Math.round(item.quantity * 0.5);

  // Price elasticity model: demand uplift factor
  const elasticity = 1.35;
  const estimatedSellThrough = Math.min(
    1,
    0.55 + (discountPercent / 100) * elasticity
  );

  const estimatedWasteAvoided = Math.round(targetQuantity * estimatedSellThrough);
  const estimatedRecovery = Number((estimatedWasteAvoided * discountedPrice).toFixed(2));
  
  // Repricing and sticker execution cost
  const actionCost = Number((targetQuantity * 0.15).toFixed(2));
  const netBenefit = Number((estimatedRecovery - actionCost).toFixed(2));

  const now = new Date().toISOString();
  return {
    id: `rec-md-${item.id}-${Date.now().toString(36)}`,
    productId: item.id,
    batchId: item.batchId,
    productName: item.name,
    riskLevel: forecast.riskLevel,
    actionType: 'markdown',
    reason: `Projected surplus of ${forecast.expectedSurplus} units before expiry in ${days} days. Apply ${discountPercent}% discount to accelerate sell-through.`,
    quantity: targetQuantity,
    discountPercent,
    recommendedPrice: discountedPrice,
    estimatedRecovery,
    estimatedWasteAvoided,
    actionCost,
    netBenefit,
    assumptions: [
      `Assumes ${Math.round(estimatedSellThrough * 100)}% sell-through lift with ${discountPercent}% markdown`,
      `Unit execution cost ~$0.15 for tagging and POS update`,
      `Prevents imminent shrinkage of $${forecast.financialExposure.toFixed(2)}`,
    ],
    status: 'pending',
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Checks donation eligibility helper wrapper.
 */
export function calculateDonationEligibility(
  item: InventoryItem,
  settings: AppSettings
): boolean {
  return validateDonationEligibility(item, settings).eligible;
}

/**
 * Calculates composite ranking priority for an action recommendation.
 * Higher score = execute sooner.
 */
export function priorityScore(rec: ActionRecommendation): number {
  let score = 0;

  // Base score from risk level
  switch (rec.riskLevel) {
    case 'expired':
      score += 100;
      break;
    case 'critical':
      score += 85;
      break;
    case 'high':
      score += 65;
      break;
    case 'moderate':
      score += 45;
      break;
    case 'low':
      score += 20;
      break;
  }

  // Value preserved component (logarithmic scale up to 25 pts)
  if (rec.netBenefit > 0) {
    score += Math.min(25, Math.log10(rec.netBenefit + 10) * 10);
  }

  // Action type adjustment
  if (rec.actionType === 'remove') score += 15;
  if (rec.actionType === 'inspect') score += 10;

  return Math.round(score);
}

/**
 * Ranks recommendations in order of operational urgency and net value.
 */
export function rankActions(recommendations: ActionRecommendation[]): ActionRecommendation[] {
  return [...recommendations].sort((a, b) => priorityScore(b) - priorityScore(a));
}

/**
 * Generates tailored operational recommendations for all forecast items.
 */
export function generateRecommendations(
  forecasts: ForecastResult[],
  items: InventoryItem[],
  settings: AppSettings
): ActionRecommendation[] {
  const recommendations: ActionRecommendation[] = [];
  const itemMap = new Map<string, InventoryItem>();
  for (const item of items) {
    itemMap.set(item.id, item);
  }

  const now = new Date().toISOString();

  for (const forecast of forecasts) {
    const item = itemMap.get(forecast.productId);
    if (!item) continue;

    // Case 1: Expired Items -> Remove
    if (forecast.riskLevel === 'expired' || forecast.daysRemaining <= 0) {
      recommendations.push({
        id: `rec-rem-${item.id}-${Date.now().toString(36)}`,
        productId: item.id,
        batchId: item.batchId,
        productName: item.name,
        riskLevel: 'expired',
        actionType: 'remove',
        reason: 'Item passed expiry date. Must be withdrawn immediately from shelves.',
        quantity: item.quantity,
        estimatedRecovery: 0,
        estimatedWasteAvoided: 0,
        actionCost: Number((item.quantity * 0.25).toFixed(2)),
        netBenefit: Number((-item.quantity * 0.25).toFixed(2)),
        assumptions: ['Non-saleable item; disposal or anaerobic digestion route required'],
        status: 'pending',
        createdAt: now,
        updatedAt: now,
      });
      continue;
    }

    // Case 2: Quality Inspection Required
    if (item.qualityStatus === 'inspect') {
      recommendations.push({
        id: `rec-insp-${item.id}-${Date.now().toString(36)}`,
        productId: item.id,
        batchId: item.batchId,
        productName: item.name,
        riskLevel: forecast.riskLevel,
        actionType: 'inspect',
        reason: 'Visual inspection needed to confirm freshness and shelf viability.',
        quantity: item.quantity,
        estimatedRecovery: Number((item.quantity * item.sellingPrice * 0.8).toFixed(2)),
        estimatedWasteAvoided: item.quantity,
        actionCost: 2.5,
        netBenefit: Number((item.quantity * item.sellingPrice * 0.8 - 2.5).toFixed(2)),
        assumptions: ['Staff verification within 2 hours will determine markdown or clearance'],
        status: 'pending',
        createdAt: now,
        updatedAt: now,
      });
      continue;
    }

    // Case 3: Donation candidate
    // If critical/high surplus and donation eligibility criteria met
    const donationCheck = validateDonationEligibility(item, settings);
    if (
      forecast.expectedSurplus > 0 &&
      (forecast.riskLevel === 'critical' || forecast.riskLevel === 'high') &&
      donationCheck.eligible &&
      forecast.daysRemaining >= (settings.donationEligibilityDays || 2)
    ) {
      // If daysRemaining is moderate (e.g. 2-3 days) and surplus is high, offer donation or split
      const donationQty = Math.min(forecast.expectedSurplus, Math.ceil(item.quantity * 0.6));
      recommendations.push({
        id: `rec-don-${item.id}-${Date.now().toString(36)}`,
        productId: item.id,
        batchId: item.batchId,
        productName: item.name,
        riskLevel: forecast.riskLevel,
        actionType: 'donation',
        reason: `Safe for consumption with ${forecast.daysRemaining} days left. High surplus of ${forecast.expectedSurplus} units can be donated to local food bank.`,
        quantity: donationQty,
        estimatedRecovery: Number((donationQty * item.costPerUnit * 0.5).toFixed(2)), // Tax deduction / goodwill equivalent
        estimatedWasteAvoided: donationQty,
        actionCost: 5.0, // Staging & pickup preparation
        netBenefit: Number((donationQty * item.costPerUnit * 0.5 - 5.0).toFixed(2)),
        assumptions: [
          'Partner pickup scheduled within 24 hours',
          'Tax write-off recovery estimated at ~50% unit cost',
          `${donationQty} ${item.unit} prevented from landfill`,
        ],
        status: 'pending',
        createdAt: now,
        updatedAt: now,
      });
      continue;
    }

    // Case 4: Markdown promotion for surplus or moderate/high risk
    if (forecast.expectedSurplus > 0 || forecast.riskLevel === 'high' || forecast.riskLevel === 'moderate') {
      recommendations.push(calculateMarkdownRecommendation(forecast, item, settings));
      continue;
    }

    // Case 5: Front-face prioritize if low surplus but short shelf-life
    if (forecast.daysRemaining <= 4 && item.quantity > 0) {
      recommendations.push({
        id: `rec-prio-${item.id}-${Date.now().toString(36)}`,
        productId: item.id,
        batchId: item.batchId,
        productName: item.name,
        riskLevel: forecast.riskLevel,
        actionType: 'prioritize',
        reason: `Move older batch to front of shelf (FIFO rotation) with ${forecast.daysRemaining} days remaining.`,
        quantity: item.quantity,
        estimatedRecovery: Number((item.quantity * item.sellingPrice).toFixed(2)),
        estimatedWasteAvoided: Math.round(item.quantity * 0.8),
        actionCost: 0,
        netBenefit: Number((item.quantity * item.sellingPrice).toFixed(2)),
        assumptions: ['Front-facing display increases consumer pick rate by ~25%'],
        status: 'pending',
        createdAt: now,
        updatedAt: now,
      });
    }
  }

  return rankActions(recommendations);
}

import { InventoryItem, AppSettings, DonationPartner } from '../../types';
import { differenceInDays, parseISO, startOfDay, isValid } from 'date-fns';

/**
 * Validates whether an inventory item meets food safety and logistics criteria for food donation.
 */
export function validateDonationEligibility(
  item: InventoryItem,
  settings: AppSettings
): { eligible: boolean; reason: string } {
  // Quality check
  if (item.qualityStatus === 'compromised' || item.qualityStatus === 'expired') {
    return {
      eligible: false,
      reason: `Quality status is '${item.qualityStatus}'; violates partner safety protocols.`,
    };
  }

  if (item.qualityStatus === 'inspect') {
    return {
      eligible: false,
      reason: 'Physical QA inspection required before approving donation.',
    };
  }

  // Validate expiry date
  const expiry = parseISO(item.expiryDate);
  if (!isValid(expiry)) {
    return {
      eligible: false,
      reason: 'Invalid or missing expiration date; cannot verify food safety.',
    };
  }

  // Shelf-life remaining check (using date-fns for consistency)
  const today = startOfDay(new Date());
  const daysRemaining = Math.max(0, differenceInDays(startOfDay(expiry), today));

  const minEligibilityDays = settings.donationEligibilityDays || 2;
  if (daysRemaining < minEligibilityDays) {
    return {
      eligible: false,
      reason: `Only ${daysRemaining} day(s) remain before expiry; minimum required is ${minEligibilityDays} days.`,
    };
  }

  if (item.quantity <= 0) {
    return {
      eligible: false,
      reason: 'No surplus inventory available to donate.',
    };
  }

  return {
    eligible: true,
    reason: `Item is in ${item.qualityStatus} condition with ${daysRemaining} safe distribution days remaining.`,
  };
}

/**
 * Matches an inventory surplus item with candidate donation partners.
 * Computes suitability score based on category match, capacity, and proximity.
 */
export function matchDonationPartners(
  item: InventoryItem,
  partners: DonationPartner[]
): { partner: DonationPartner; score: number; rationale: string }[] {
  const matches: { partner: DonationPartner; score: number; rationale: string }[] = [];

  for (const partner of partners) {
    if (partner.operatingStatus !== 'active') {
      continue;
    }

    let score = 0;
    const reasons: string[] = [];

    // 1. Category acceptance
    const acceptsCategory =
      partner.categories.includes(item.category) ||
      partner.categories.includes('All') ||
      partner.categories.some((c) => c.toLowerCase() === item.category.toLowerCase());

    if (acceptsCategory) {
      score += 40;
      reasons.push('Accepts product category');
    } else {
      // Incompatible category
      continue;
    }

    // 2. Capacity score
    if (partner.maxQuantity >= item.quantity) {
      score += 30;
      reasons.push(`Capacity adequate (${partner.maxQuantity} ${item.unit} cap)`);
    } else {
      const capacityRatio = partner.maxQuantity / (item.quantity || 1);
      score += Math.round(capacityRatio * 20);
      reasons.push(`Partial capacity (${partner.maxQuantity} of ${item.quantity})`);
    }

    // 3. Proximity score (shorter distance = higher score)
    // Up to 30 points for <= 15 miles
    const distance = partner.distance || 5;
    const distanceScore = Math.max(5, Math.round(30 - distance * 1.5));
    score += distanceScore;
    reasons.push(`${distance} mi away`);

    matches.push({
      partner,
      score: Math.min(100, score),
      rationale: reasons.join('; '),
    });
  }

  // Sort descending by score
  return matches.sort((a, b) => b.score - a.score);
}

/**
 * Creates a structured donation offer object.
 */
export function createDonationOffer(
  partnerId: string,
  productId: string,
  batchId: string,
  quantity: number,
  scheduledPickup: string
) {
  const now = new Date().toISOString();
  return {
    id: `offer-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    partnerId,
    productId,
    batchId,
    quantity,
    scheduledPickup,
    status: 'proposed' as const,
    createdAt: now,
    updatedAt: now,
  };
}

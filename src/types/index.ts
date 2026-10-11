// WasteSense AI - Core TypeScript Definitions and Domain Models

export type RiskLevel = 'low' | 'moderate' | 'high' | 'critical' | 'expired';

export type ActionType =
  | 'markdown'
  | 'transfer'
  | 'donation'
  | 'replenishment'
  | 'prioritize'
  | 'inspect'
  | 'remove';

export type ActionStatus = 'pending' | 'accepted' | 'rejected' | 'deferred' | 'completed';

export type StorageType = 'ambient' | 'refrigerated' | 'frozen';

export type QualityStatus = 'optimal' | 'good' | 'fair' | 'inspect' | 'compromised' | 'expired';

export type DataMode = 'demo' | 'live';

export type UnitType = 'kg' | 'units' | 'cases' | 'lbs' | 'packs' | 'bunches';

export type ProductCategory =
  | 'Fresh Produce'
  | 'Dairy & Eggs'
  | 'Bakery'
  | 'Meat & Seafood'
  | 'Prepared Foods'
  | 'Pantry & Dry Goods'
  | 'Beverages';

export interface InventoryItem {
  id: string;
  name: string;
  sku: string;
  category: ProductCategory | string;
  quantity: number;
  unit: UnitType | string;
  expiryDate: string; // ISO 8601 date string (YYYY-MM-DD)
  avgDailySales: number;
  salesHistory: number[]; // Daily sales figures, e.g. last 14 days
  costPerUnit: number;
  sellingPrice: number;
  leadTimeDays: number;
  storageType: StorageType;
  lastUpdated: string;
  batchId: string;
  qualityStatus: QualityStatus;
  isDemo?: boolean;
}

export interface RiskWeights {
  surplusRatio: number;   // Weight for surplus vs total stock
  urgency: number;        // Weight for time decay / shelf life remaining
  financialValue: number; // Weight for total cost exposure
  volatility: number;     // Weight for sales variance or confidence
}

export interface ForecastResult {
  productId: string;
  batchId: string;
  productName: string;
  currentQuantity: number;
  daysRemaining: number;
  forecastDemand: number;
  expectedSurplus: number;
  riskScore: number; // 0 - 100
  riskLevel: RiskLevel;
  confidence: number; // 0 - 1 (e.g. 0.85)
  financialExposure: number; // Total cost at risk (expectedSurplus * costPerUnit)
  riskFactors: string[];
  recommendation: string;
  forecastMethod: 'trend_adjusted' | 'weighted_moving_average' | 'simple_moving_average' | 'baseline';
}

export interface ActionRecommendation {
  id: string;
  productId: string;
  batchId: string;
  productName: string;
  riskLevel: RiskLevel;
  reason: string;
  actionType: ActionType;
  quantity: number;
  estimatedRecovery: number; // Projected revenue / value preserved
  estimatedWasteAvoided: number; // Quantity in units or kg prevented from disposal
  actionCost: number; // Cost to execute action (logistics, discount loss, etc.)
  netBenefit: number; // estimatedRecovery - actionCost
  assumptions: string[];
  status: ActionStatus;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  outcomeNotes?: string;
  discountPercent?: number; // e.g., 20%, 40%, 60%
  recommendedPrice?: number;
  partnerId?: string; // If donation
}

export interface DonationPartner {
  id: string;
  name: string;
  categories: string[];
  maxQuantity: number;
  operatingStatus: 'active' | 'limited' | 'inactive';
  pickupDays: ('Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | 'Sun')[];
  pickupTimeStart: string; // e.g. "09:00"
  pickupTimeEnd: string;   // e.g. "17:00"
  contactInfo: {
    name: string;
    phone: string;
    email: string;
  };
  address: string;
  distance: number; // distance in miles or km
  isDemo?: boolean;
}

export interface DonationOffer {
  id: string;
  partnerId: string;
  productId: string;
  batchId: string;
  quantity: number;
  scheduledPickup: string; // ISO datetime string
  status: 'proposed' | 'accepted' | 'picked_up' | 'cancelled';
  createdAt: string;
  updatedAt: string;
}

export interface ScenarioInput {
  markdownDiscountPercent: number; // e.g. 25 (%)
  donationPortionPercent: number;  // e.g. 50 (%)
  priceElasticity?: number;        // default e.g. 1.3
  targetSellThroughDays?: number;  // days over which markdown applies
}

export interface ScenarioResult {
  id: string;
  name: string;
  scenarioInput: ScenarioInput;
  projectedSalesQuantity: number;
  projectedDonationQuantity: number;
  projectedWasteQuantity: number;
  projectedRevenue: number;
  projectedCost: number;
  projectedNetMargin: number;
  wasteReductionRate: number; // 0-100%
  feasibilityScore: number;   // 0-100
  notes: string[];
}

export interface AppSettings {
  storeName: string;
  currency: string; // e.g., 'USD', '$'
  defaultUnit: UnitType | string;
  riskWeights: RiskWeights;
  markdownFloor: number; // Minimum price multiplier (e.g. 0.3 for 70% max discount)
  donationEligibilityDays: number; // Minimum days remaining before expiry required for donation
  dataMode: DataMode;
  safetyBufferDays: number; // Shelf-life safety margin in days
}

export interface ImpactMetrics {
  totalWasteDivertedKg: number;
  totalFinancialSaved: number;
  co2EmissionsAvoidedKg: number; // ~2.5 kg CO2e per kg food waste avoided
  mealsRescuedEquivalent: number; // ~0.8 kg per meal
  completedActionsCount: number;
  pendingActionsCount: number;
  simulatedPotentialSavings: number;
  simulatedPotentialWasteDivertedKg: number;
  actionBreakdown: {
    markdowns: number;
    donations: number;
    transfers: number;
    inspections: number;
    removals: number;
  };
}

export interface DemoDataIndicator {
  isDemo: boolean;
  generatedDate: string;
  version: string;
}

export interface Toast {
  id: string;
  title?: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
}

export interface CSVValidationError {
  row: number;
  field: string;
  message: string;
}

export interface CSVValidationResult {
  isValid: boolean;
  errors: (string | CSVValidationError)[];
  warnings?: string[];
  validRows: any[];
  invalidRowsCount: number;
  totalRows: number;
}


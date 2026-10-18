import { describe, it, expect, beforeEach } from 'vitest';
import {
  weightedMovingAverage,
  trendAdjustedForecast,
  calculateUsableSellingDays,
  calculateExpectedSurplus,
  calculateRiskScore,
  classifyRisk,
  forecastDailyDemand,
  evaluateModel,
  analyzeInventory,
} from '../domain/forecasting/engine';
import {
  generateRecommendations,
  rankActions,
  calculateMarkdownRecommendation,
  priorityScore,
} from '../domain/recommendations/engine';
import {
  validateDonationEligibility,
  matchDonationPartners,
  createDonationOffer,
} from '../domain/donations/engine';
import { simulateScenario, compareScenarios } from '../domain/simulator/engine';
import { calculateImpactMetrics } from '../domain/impact/engine';
import { storage, DEFAULT_SETTINGS } from '../services/storage';
import { generateDemoInventory, generateDemoPartners } from '../data/demoData';
import { parseCSVToInventory } from '../utils/csv';
import type { InventoryItem, ActionRecommendation, DonationPartner, ScenarioInput } from '../types';

describe('Forecasting & Risk Engine', () => {
  it('correctly calculates weighted moving average giving higher weight to recent days', () => {
    const history = [10, 10, 10, 20];
    const wma = weightedMovingAverage(history);
    // [10*1 + 10*2 + 10*3 + 20*4] / 10 = (10 + 20 + 30 + 80) / 10 = 14
    expect(wma).toBe(14);
  });

  it('handles zero demand and empty history gracefully', () => {
    expect(weightedMovingAverage([])).toBe(0);
    expect(trendAdjustedForecast([])).toBe(0);
    expect(calculateExpectedSurplus(0, 0)).toBe(0);
    expect(calculateExpectedSurplus(50, 60)).toBe(0); // demand exceeds stock
    expect(calculateExpectedSurplus(50, 20)).toBe(30); // surplus = 30
  });

  it('calculates usable selling days considering safety buffer', () => {
    const today = new Date();
    const futureDate = new Date(today);
    futureDate.setDate(today.getDate() + 5);
    const dateStr = futureDate.toISOString().split('T')[0];

    const daysWithoutBuffer = calculateUsableSellingDays(dateStr, 0);
    const daysWithBuffer = calculateUsableSellingDays(dateStr, 1);

    expect(daysWithoutBuffer).toBe(5);
    expect(daysWithBuffer).toBe(4);
  });

  it('handles expired items correctly (returns 0 selling days)', () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 2);
    const dateStr = yesterday.toISOString().split('T')[0];

    expect(calculateUsableSellingDays(dateStr, 0)).toBe(0);
  });

  it('enforces risk score boundaries between 0 and 100', () => {
    const mockItem: InventoryItem = {
      id: 'test-1',
      name: 'Organic Milk',
      sku: 'DRY-001',
      category: 'Dairy & Eggs',
      quantity: 100,
      unit: 'units',
      expiryDate: new Date().toISOString().split('T')[0],
      avgDailySales: 5,
      salesHistory: [5, 4, 3, 2],
      costPerUnit: 40,
      sellingPrice: 60,
      leadTimeDays: 1,
      storageType: 'refrigerated',
      lastUpdated: new Date().toISOString(),
      batchId: 'BATCH-001',
      qualityStatus: 'inspect',
      isDemo: true,
    };

    const risk = calculateRiskScore(mockItem, 90, 1, 0.5);
    expect(risk.score).toBeGreaterThanOrEqual(0);
    expect(risk.score).toBeLessThanOrEqual(100);
    expect(risk.factors.length).toBeGreaterThan(0);
  });

  it('classifies risk levels accurately', () => {
    expect(classifyRisk(85)).toBe('critical');
    expect(classifyRisk(60)).toBe('high');
    expect(classifyRisk(35)).toBe('moderate');
    expect(classifyRisk(10)).toBe('low');
  });

  it('evaluates model with MAE, RMSE, and WAPE metrics', () => {
    const actuals = [10, 12, 15, 20];
    const predicted = [11, 10, 14, 18];
    const metrics = evaluateModel(actuals, predicted);

    expect(metrics.mae).toBeGreaterThan(0);
    expect(metrics.rmse).toBeGreaterThan(0);
    expect(metrics.wape).toBeGreaterThan(0);
  });
});

describe('Action & Recommendation Engine', () => {
  it('generates markdown recommendations respecting markdown floor', () => {
    const demoItems = generateDemoInventory();
    const milk = demoItems.find((i) => i.category === 'Dairy & Eggs') || demoItems[0];
    const forecasts = analyzeInventory([milk], DEFAULT_SETTINGS);

    const recs = generateRecommendations(forecasts, [milk], DEFAULT_SETTINGS);
    expect(recs.length).toBeGreaterThan(0);

    const markdownRec = recs.find((r) => r.actionType === 'markdown');
    if (markdownRec && markdownRec.recommendedPrice) {
      const minAllowed = milk.sellingPrice * DEFAULT_SETTINGS.markdownFloor;
      expect(markdownRec.recommendedPrice).toBeGreaterThanOrEqual(minAllowed);
    }
  });

  it('ranks actions with higher priority score for urgent and high-recovery items', () => {
    const now = new Date().toISOString();
    const rec1: ActionRecommendation = {
      id: 'r1',
      productId: 'p1',
      batchId: 'b1',
      productName: 'Bread',
      riskLevel: 'critical',
      reason: 'Urgent expiry',
      actionType: 'markdown',
      quantity: 20,
      estimatedRecovery: 100,
      estimatedWasteAvoided: 20,
      actionCost: 5,
      netBenefit: 95,
      assumptions: [],
      status: 'pending',
      createdAt: now,
      updatedAt: now,
    };

    const rec2: ActionRecommendation = {
      id: 'r2',
      productId: 'p2',
      batchId: 'b2',
      productName: 'Canned Beans',
      riskLevel: 'low',
      reason: 'Normal stock',
      actionType: 'prioritize',
      quantity: 5,
      estimatedRecovery: 20,
      estimatedWasteAvoided: 5,
      actionCost: 0,
      netBenefit: 20,
      assumptions: [],
      status: 'pending',
      createdAt: now,
      updatedAt: now,
    };

    expect(priorityScore(rec1)).toBeGreaterThan(priorityScore(rec2));

    const ranked = rankActions([rec2, rec1]);
    expect(ranked[0].id).toBe('r1');
  });
});

describe('Donation Safety & Partner Matching', () => {
  it('strictly rejects expired and compromised inventory for donation', () => {
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 3);

    const expiredItem: InventoryItem = {
      id: 'item-exp',
      name: 'Old Yogurt',
      sku: 'EXP-1',
      category: 'Dairy & Eggs',
      quantity: 20,
      unit: 'units',
      expiryDate: pastDate.toISOString().split('T')[0],
      avgDailySales: 2,
      salesHistory: [2, 2],
      costPerUnit: 20,
      sellingPrice: 30,
      leadTimeDays: 1,
      storageType: 'refrigerated',
      lastUpdated: new Date().toISOString(),
      batchId: 'BATCH-EXP',
      qualityStatus: 'expired',
      isDemo: true,
    };

    const check = validateDonationEligibility(expiredItem, DEFAULT_SETTINGS);
    expect(check.eligible).toBe(false);
    expect(check.reason).toContain('expired');
  });

  it('matches compatible partners based on accepted categories and distance', () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 4);

    const produceItem: InventoryItem = {
      id: 'item-fresh',
      name: 'Fresh Spinach',
      sku: 'SPN-1',
      category: 'Fresh Produce',
      quantity: 30,
      unit: 'kg',
      expiryDate: futureDate.toISOString().split('T')[0],
      avgDailySales: 5,
      salesHistory: [5, 4, 6],
      costPerUnit: 25,
      sellingPrice: 40,
      leadTimeDays: 1,
      storageType: 'refrigerated',
      lastUpdated: new Date().toISOString(),
      batchId: 'BATCH-SPN',
      qualityStatus: 'good',
      isDemo: true,
    };

    const partners = generateDemoPartners();
    const matches = matchDonationPartners(produceItem, partners);

    expect(matches.length).toBeGreaterThan(0);
    // Top match should accept Fresh Produce
    expect(matches[0].partner.categories).toContain('Fresh Produce');
  });
});

describe('What-If Scenario Simulator', () => {
  it('simulates markdown and donation allocations without exceeding available stock', () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 3);

    const item: InventoryItem = {
      id: 'item-sim',
      name: 'Bakery Bread',
      sku: 'BRD-1',
      category: 'Bakery',
      quantity: 50,
      unit: 'units',
      expiryDate: futureDate.toISOString().split('T')[0],
      avgDailySales: 5,
      salesHistory: [5, 5, 5, 5],
      costPerUnit: 20,
      sellingPrice: 40,
      leadTimeDays: 1,
      storageType: 'ambient',
      lastUpdated: new Date().toISOString(),
      batchId: 'BATCH-BRD',
      qualityStatus: 'good',
      isDemo: true,
    };

    const forecasts = analyzeInventory([item], DEFAULT_SETTINGS);
    const forecast = forecasts[0];

    const input: ScenarioInput = {
      markdownDiscountPercent: 40,
      donationPortionPercent: 50,
      priceElasticity: 1.5,
      targetSellThroughDays: 2,
    };

    const result = simulateScenario(item, forecast, input);

    // Sum of sales, donation, and remaining waste must equal total quantity
    const totalAllocated =
      result.projectedSalesQuantity +
      result.projectedDonationQuantity +
      result.projectedWasteQuantity;

    expect(totalAllocated).toBeLessThanOrEqual(item.quantity);
    expect(result.wasteReductionRate).toBeGreaterThanOrEqual(0);
    expect(result.wasteReductionRate).toBeLessThanOrEqual(100);
  });
});

describe('Impact Metrics & Data Persistence', () => {
  it('calculates verified vs potential metrics distinctly', () => {
    const now = new Date().toISOString();
    const completedAction: ActionRecommendation = {
      id: 'act-done',
      productId: 'p1',
      batchId: 'b1',
      productName: 'Tomatoes',
      riskLevel: 'high',
      reason: 'Surplus',
      actionType: 'donation',
      quantity: 40,
      estimatedRecovery: 120,
      estimatedWasteAvoided: 40,
      actionCost: 5,
      netBenefit: 115,
      assumptions: [],
      status: 'completed',
      createdAt: now,
      updatedAt: now,
      completedAt: now,
    };

    const pendingAction: ActionRecommendation = {
      id: 'act-pend',
      productId: 'p2',
      batchId: 'b2',
      productName: 'Milk',
      riskLevel: 'critical',
      reason: 'Urgent',
      actionType: 'markdown',
      quantity: 25,
      estimatedRecovery: 75,
      estimatedWasteAvoided: 25,
      actionCost: 3,
      netBenefit: 72,
      assumptions: [],
      status: 'pending',
      createdAt: now,
      updatedAt: now,
    };

    const metrics = calculateImpactMetrics([completedAction, pendingAction], []);

    // Verified must only count completed actions
    expect(metrics.totalWasteDivertedKg).toBe(40);
    expect(metrics.totalFinancialSaved).toBe(115);
    expect(metrics.completedActionsCount).toBe(1);
    expect(metrics.pendingActionsCount).toBe(1);

    // EPA Carbon and meal conversions
    expect(metrics.co2EmissionsAvoidedKg).toBe(40 * 2.5);
    expect(metrics.mealsRescuedEquivalent).toBe(Math.round(40 / 0.8));
  });

  it('resets demo data cleanly with deterministic seed items', () => {
    const demoItems = generateDemoInventory();
    expect(demoItems.length).toBeGreaterThanOrEqual(25);
    expect(demoItems.some((i) => i.category === 'Fresh Produce')).toBe(true);
    expect(demoItems.some((i) => i.category === 'Dairy & Eggs')).toBe(true);
    expect(demoItems.some((i) => i.category === 'Bakery')).toBe(true);
    expect(demoItems.some((i) => i.category === 'Meat & Seafood')).toBe(true);
    expect(demoItems.some((i) => i.isDemo === true)).toBe(true);
  });

  it('safely routes compromised food items to remove action and forbids markdown promotion', () => {
    const compromisedItem: InventoryItem = {
      id: 'test-compromised-01',
      name: 'Damaged Organic Oil',
      sku: 'OIL-COMP-01',
      category: 'Pantry & Dry Goods',
      quantity: 20,
      unit: 'units',
      expiryDate: new Date(Date.now() + 86400000 * 5).toISOString().split('T')[0],
      avgDailySales: 5,
      salesHistory: [5, 5, 5, 5, 5],
      costPerUnit: 100,
      sellingPrice: 150,
      leadTimeDays: 1,
      storageType: 'ambient',
      lastUpdated: new Date().toISOString(),
      batchId: 'BATCH-OIL-X',
      qualityStatus: 'compromised',
    };

    const forecasts = analyzeInventory([compromisedItem], DEFAULT_SETTINGS);
    const recs = generateRecommendations(forecasts, [compromisedItem], DEFAULT_SETTINGS);

    expect(recs.length).toBeGreaterThan(0);
    const action = recs[0];
    expect(action.actionType).toBe('remove');
    expect(action.reason).toContain('compromised');
    // Must NOT be markdown or donation
    expect(recs.some((r) => r.actionType === 'markdown')).toBe(false);
    expect(recs.some((r) => r.actionType === 'donation')).toBe(false);
  });

  it('rejects donation eligibility for malformed or invalid expiry dates', () => {
    const badDateItem: InventoryItem = {
      id: 'test-bad-date',
      name: 'Unsafe Item',
      sku: 'BAD-DATE-01',
      category: 'Fresh Produce',
      quantity: 10,
      unit: 'kg',
      expiryDate: 'invalid-not-a-date',
      avgDailySales: 2,
      salesHistory: [2, 2],
      costPerUnit: 20,
      sellingPrice: 30,
      leadTimeDays: 1,
      storageType: 'ambient',
      lastUpdated: new Date().toISOString(),
      batchId: 'BATCH-BAD-01',
      qualityStatus: 'good',
    };

    const result = validateDonationEligibility(badDateItem, DEFAULT_SETTINGS);
    expect(result.eligible).toBe(false);
    expect(result.reason).toContain('Invalid or missing expiration date');
  });

  it('handles safety buffer boundary correctly without falsely flagging as expired', () => {
    // 1 day remaining with 1-day safety buffer -> usableDays = 0, but NOT truly expired
    const tomorrow = new Date(Date.now() + 86400000 * 1).toISOString().split('T')[0];
    const boundaryItem: InventoryItem = {
      id: 'test-boundary-01',
      name: 'Tomorrow Milk',
      sku: 'DAIR-TOM-01',
      category: 'Dairy & Eggs',
      quantity: 15,
      unit: 'units',
      expiryDate: tomorrow,
      avgDailySales: 5,
      salesHistory: [5, 5, 5, 5, 5, 5, 5],
      costPerUnit: 40,
      sellingPrice: 60,
      leadTimeDays: 1,
      storageType: 'refrigerated',
      lastUpdated: new Date().toISOString(),
      batchId: 'BATCH-TOM-01',
      qualityStatus: 'good',
    };

    const forecasts = analyzeInventory([boundaryItem], { ...DEFAULT_SETTINGS, safetyBufferDays: 1 });
    expect(forecasts[0].riskLevel).toBe('critical'); // Critical, NOT expired
    expect(forecasts[0].riskFactors).toContain(
      'Within safety buffer period — no usable selling days remain'
    );
  });

  it('properly normalizes CSV rows with Title Case and mixed capitalization headers', () => {
    const rawCsvRows = [
      {
        Name: 'Alphonso Mangoes',
        SKU: 'MNG-001',
        Category: 'Fresh Produce',
        Quantity: '50',
        ExpiryDate: '2026-10-30',
        CostPerUnit: '120',
        SellingPrice: '200',
        Unit: 'kg',
      },
    ];

    const parsed = parseCSVToInventory(rawCsvRows);
    expect(parsed.length).toBe(1);
    expect(parsed[0].name).toBe('Alphonso Mangoes');
    expect(parsed[0].sku).toBe('MNG-001');
    expect(parsed[0].category).toBe('Fresh Produce');
    expect(parsed[0].quantity).toBe(50);
    expect(parsed[0].costPerUnit).toBe(120);
    expect(parsed[0].sellingPrice).toBe(200);
    expect(parsed[0].expiryDate).toBe('2026-10-30');
  });

  it('handles targetSellThroughDays = 0 correctly in scenario simulator without falsy fallback', () => {
    const item: InventoryItem = {
      id: 'test-sim-0',
      name: 'Sim Item',
      sku: 'SIM-01',
      category: 'Bakery',
      quantity: 50,
      unit: 'units',
      expiryDate: new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0],
      avgDailySales: 10,
      salesHistory: [10, 10, 10],
      costPerUnit: 30,
      sellingPrice: 50,
      leadTimeDays: 1,
      storageType: 'ambient',
      lastUpdated: new Date().toISOString(),
      batchId: 'BATCH-SIM-01',
      qualityStatus: 'good',
    };

    const forecast = analyzeInventory([item], DEFAULT_SETTINGS)[0];
    const scenario = simulateScenario(item, forecast, {
      markdownDiscountPercent: 20,
      donationPortionPercent: 0,
      priceElasticity: 1.3,
      targetSellThroughDays: 0, // Explicitly zero days!
    });

    expect(scenario.projectedSalesQuantity).toBe(0); // 0 days means 0 sales
  });
});

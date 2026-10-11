import { addDays, format } from 'date-fns';
import type { InventoryItem, DonationPartner, StorageType, QualityStatus, UnitType } from '../types/index.ts';

/**
 * Calculates mean daily sales from a historical array
 */
function calculateAvgDailySales(history: number[]): number {
  if (!history.length) return 0;
  const sum = history.reduce((acc, curr) => acc + curr, 0);
  return Number((sum / history.length).toFixed(1));
}

/**
 * Generates an ISO date string (YYYY-MM-DD) offset by days from today
 */
function getOffsetDateString(daysOffset: number): string {
  const targetDate = addDays(new Date(), daysOffset);
  return format(targetDate, 'yyyy-MM-dd');
}

/**
 * Generates comprehensive demo inventory dataset
 * Total: 33 realistic products across 7 categories
 */
export function generateDemoInventory(): InventoryItem[] {
  const now = new Date().toISOString();

  const rawProducts: Array<{
    id: string;
    name: string;
    sku: string;
    category:
      | 'Fresh Produce'
      | 'Dairy & Eggs'
      | 'Bakery'
      | 'Meat & Seafood'
      | 'Prepared Foods'
      | 'Pantry & Dry Goods'
      | 'Beverages';
    quantity: number;
    unit: UnitType;
    daysOffset: number;
    salesHistory: number[];
    costPerUnit: number;
    sellingPrice: number;
    leadTimeDays: number;
    storageType: StorageType;
    qualityStatus: QualityStatus;
    batchSuffix: string;
  }> = [
    // -------------------------------------------------------------
    // FRESH PRODUCE (6 items)
    // -------------------------------------------------------------
    {
      id: 'demo-prod-01',
      name: 'Robusta Bananas (Ripe)',
      sku: 'PROD-BAN-01',
      category: 'Fresh Produce',
      quantity: 85,
      unit: 'kg',
      daysOffset: 1, // Expiring tomorrow -> high urgency
      salesHistory: [22, 25, 20, 24, 28, 30, 26, 21, 23, 27, 29, 24, 22, 25],
      costPerUnit: 32,
      sellingPrice: 50,
      leadTimeDays: 1,
      storageType: 'ambient',
      qualityStatus: 'fair',
      batchSuffix: 'A',
    },
    {
      id: 'demo-prod-02',
      name: 'Vine-Ripened Hybrid Tomatoes',
      sku: 'PROD-TOM-02',
      category: 'Fresh Produce',
      quantity: 120,
      unit: 'kg',
      daysOffset: 3,
      salesHistory: [18, 16, 22, 19, 24, 20, 21, 17, 19, 23, 22, 18, 20, 21],
      costPerUnit: 28,
      sellingPrice: 42,
      leadTimeDays: 2,
      storageType: 'ambient',
      qualityStatus: 'good',
      batchSuffix: 'B',
    },
    {
      id: 'demo-prod-03',
      name: 'Tender Baby Spinach (Hydroponic)',
      sku: 'PROD-SPN-03',
      category: 'Fresh Produce',
      quantity: 45,
      unit: 'packs',
      daysOffset: 0, // Expiring today
      salesHistory: [14, 12, 15, 11, 16, 18, 13, 12, 15, 14, 17, 13, 11, 14],
      costPerUnit: 35,
      sellingPrice: 60,
      leadTimeDays: 1,
      storageType: 'refrigerated',
      qualityStatus: 'inspect',
      batchSuffix: 'C',
    },
    {
      id: 'demo-prod-04',
      name: 'Hass Avocados (Ready to Eat)',
      sku: 'PROD-AVO-04',
      category: 'Fresh Produce',
      quantity: 38,
      unit: 'units',
      daysOffset: 2,
      salesHistory: [8, 10, 7, 9, 11, 12, 8, 7, 9, 10, 11, 8, 9, 10],
      costPerUnit: 90,
      sellingPrice: 150,
      leadTimeDays: 3,
      storageType: 'refrigerated',
      qualityStatus: 'fair',
      batchSuffix: 'A',
    },
    {
      id: 'demo-prod-05',
      name: 'Mahabaleshwar Fresh Strawberries',
      sku: 'PROD-STR-05',
      category: 'Fresh Produce',
      quantity: 60,
      unit: 'packs',
      daysOffset: -1, // Expired yesterday
      salesHistory: [15, 18, 12, 16, 19, 20, 17, 14, 16, 18, 21, 15, 13, 16],
      costPerUnit: 110,
      sellingPrice: 180,
      leadTimeDays: 2,
      storageType: 'refrigerated',
      qualityStatus: 'expired',
      batchSuffix: 'D',
    },
    {
      id: 'demo-prod-06',
      name: 'Kinnaur Crisp Apples',
      sku: 'PROD-APL-06',
      category: 'Fresh Produce',
      quantity: 210,
      unit: 'kg',
      daysOffset: 12,
      salesHistory: [16, 18, 15, 19, 22, 25, 20, 17, 18, 21, 23, 19, 18, 20],
      costPerUnit: 120,
      sellingPrice: 180,
      leadTimeDays: 4,
      storageType: 'ambient',
      qualityStatus: 'optimal',
      batchSuffix: 'A',
    },

    // -------------------------------------------------------------
    // DAIRY & EGGS (5 items)
    // -------------------------------------------------------------
    {
      id: 'demo-dairy-01',
      name: 'Pasteurized Toned Milk (1L Pouch)',
      sku: 'DAIR-MLK-01',
      category: 'Dairy & Eggs',
      quantity: 140,
      unit: 'units',
      daysOffset: 1, // 1 day remaining
      salesHistory: [45, 50, 48, 52, 55, 60, 50, 47, 49, 54, 58, 48, 46, 51],
      costPerUnit: 52,
      sellingPrice: 66,
      leadTimeDays: 1,
      storageType: 'refrigerated',
      qualityStatus: 'good',
      batchSuffix: 'A',
    },
    {
      id: 'demo-dairy-02',
      name: 'Greek Yogurt Blueberry (400g)',
      sku: 'DAIR-YGT-02',
      category: 'Dairy & Eggs',
      quantity: 52,
      unit: 'units',
      daysOffset: 4,
      salesHistory: [12, 10, 14, 11, 15, 17, 13, 11, 13, 16, 18, 12, 10, 13],
      costPerUnit: 85,
      sellingPrice: 135,
      leadTimeDays: 2,
      storageType: 'refrigerated',
      qualityStatus: 'good',
      batchSuffix: 'B',
    },
    {
      id: 'demo-dairy-03',
      name: 'Farm Fresh Brown Eggs (Pack of 12)',
      sku: 'DAIR-EGG-03',
      category: 'Dairy & Eggs',
      quantity: 95,
      unit: 'packs',
      daysOffset: 6,
      salesHistory: [20, 22, 19, 21, 26, 28, 23, 21, 20, 24, 27, 22, 20, 23],
      costPerUnit: 90,
      sellingPrice: 130,
      leadTimeDays: 2,
      storageType: 'ambient',
      qualityStatus: 'good',
      batchSuffix: 'A',
    },
    {
      id: 'demo-dairy-04',
      name: 'Malai Paneer Fresh Block (200g)',
      sku: 'DAIR-PAN-04',
      category: 'Dairy & Eggs',
      quantity: 42,
      unit: 'units',
      daysOffset: 2,
      salesHistory: [16, 14, 18, 15, 20, 22, 17, 15, 16, 19, 21, 16, 14, 17],
      costPerUnit: 70,
      sellingPrice: 105,
      leadTimeDays: 1,
      storageType: 'refrigerated',
      qualityStatus: 'fair',
      batchSuffix: 'C',
    },
    {
      id: 'demo-dairy-05',
      name: 'Artisanal Cheddar Cheese Block (250g)',
      sku: 'DAIR-CHS-05',
      category: 'Dairy & Eggs',
      quantity: 30,
      unit: 'units',
      daysOffset: 25,
      salesHistory: [4, 5, 3, 6, 7, 8, 5, 4, 5, 6, 7, 5, 4, 5],
      costPerUnit: 220,
      sellingPrice: 340,
      leadTimeDays: 5,
      storageType: 'refrigerated',
      qualityStatus: 'optimal',
      batchSuffix: 'A',
    },

    // -------------------------------------------------------------
    // BAKERY (5 items)
    // -------------------------------------------------------------
    {
      id: 'demo-bake-01',
      name: 'Artisan Whole Wheat Sourdough (400g)',
      sku: 'BAKE-SDR-01',
      category: 'Bakery',
      quantity: 26,
      unit: 'units',
      daysOffset: 0, // Expiring today
      salesHistory: [10, 12, 11, 13, 15, 17, 12, 10, 11, 14, 16, 12, 11, 13],
      costPerUnit: 55,
      sellingPrice: 95,
      leadTimeDays: 1,
      storageType: 'ambient',
      qualityStatus: 'fair',
      batchSuffix: 'A',
    },
    {
      id: 'demo-bake-02',
      name: 'Pure Butter French Croissants (Pack of 2)',
      sku: 'BAKE-CRS-02',
      category: 'Bakery',
      quantity: 34,
      unit: 'packs',
      daysOffset: 1,
      salesHistory: [14, 16, 13, 15, 19, 22, 16, 13, 15, 18, 20, 15, 14, 16],
      costPerUnit: 65,
      sellingPrice: 120,
      leadTimeDays: 1,
      storageType: 'ambient',
      qualityStatus: 'good',
      batchSuffix: 'B',
    },
    {
      id: 'demo-bake-03',
      name: 'Wild Blueberry Streusel Muffins',
      sku: 'BAKE-MUF-03',
      category: 'Bakery',
      quantity: 22,
      unit: 'packs',
      daysOffset: 2,
      salesHistory: [8, 9, 7, 10, 12, 14, 9, 8, 9, 11, 13, 9, 8, 10],
      costPerUnit: 50,
      sellingPrice: 90,
      leadTimeDays: 1,
      storageType: 'ambient',
      qualityStatus: 'good',
      batchSuffix: 'C',
    },
    {
      id: 'demo-bake-04',
      name: 'Dutch Chocolate Truffle Cake (500g)',
      sku: 'BAKE-CKE-04',
      category: 'Bakery',
      quantity: 14,
      unit: 'units',
      daysOffset: 3,
      salesHistory: [3, 4, 3, 5, 7, 8, 4, 3, 4, 6, 7, 4, 3, 5],
      costPerUnit: 260,
      sellingPrice: 480,
      leadTimeDays: 2,
      storageType: 'refrigerated',
      qualityStatus: 'good',
      batchSuffix: 'A',
    },
    {
      id: 'demo-bake-05',
      name: 'Multigrain Sandwich Bread Loaf',
      sku: 'BAKE-BRD-05',
      category: 'Bakery',
      quantity: 48,
      unit: 'units',
      daysOffset: 1,
      salesHistory: [25, 28, 24, 27, 30, 32, 26, 24, 26, 29, 31, 26, 25, 27],
      costPerUnit: 30,
      sellingPrice: 50,
      leadTimeDays: 1,
      storageType: 'ambient',
      qualityStatus: 'good',
      batchSuffix: 'A',
    },

    // -------------------------------------------------------------
    // MEAT & SEAFOOD (4 items)
    // -------------------------------------------------------------
    {
      id: 'demo-meat-01',
      name: 'Fresh Boneless Chicken Breast',
      sku: 'MEAT-CHK-01',
      category: 'Meat & Seafood',
      quantity: 35,
      unit: 'kg',
      daysOffset: 2, // 2 days shelf life remaining
      salesHistory: [14, 16, 12, 15, 20, 24, 16, 13, 15, 18, 22, 15, 13, 16],
      costPerUnit: 220,
      sellingPrice: 320,
      leadTimeDays: 1,
      storageType: 'refrigerated',
      qualityStatus: 'good',
      batchSuffix: 'A',
    },
    {
      id: 'demo-meat-02',
      name: 'Norwegian Salmon Fillet Cuts',
      sku: 'MEAT-SAL-02',
      category: 'Meat & Seafood',
      quantity: 16,
      unit: 'kg',
      daysOffset: 1,
      salesHistory: [4, 5, 3, 6, 8, 9, 5, 4, 5, 7, 8, 5, 4, 6],
      costPerUnit: 950,
      sellingPrice: 1450,
      leadTimeDays: 2,
      storageType: 'refrigerated',
      qualityStatus: 'fair',
      batchSuffix: 'B',
    },
    {
      id: 'demo-meat-03',
      name: 'Lean Minced Mutton / Kheema',
      sku: 'MEAT-MUT-03',
      category: 'Meat & Seafood',
      quantity: 18,
      unit: 'kg',
      daysOffset: 0, // Today
      salesHistory: [7, 8, 6, 9, 12, 14, 8, 7, 8, 10, 13, 8, 7, 9],
      costPerUnit: 520,
      sellingPrice: 750,
      leadTimeDays: 1,
      storageType: 'refrigerated',
      qualityStatus: 'inspect',
      batchSuffix: 'C',
    },
    {
      id: 'demo-meat-04',
      name: 'Cleaned Deveined Tiger Prawns',
      sku: 'MEAT-PRW-04',
      category: 'Meat & Seafood',
      quantity: 22,
      unit: 'kg',
      daysOffset: 18,
      salesHistory: [5, 6, 4, 7, 9, 10, 6, 5, 6, 8, 9, 6, 5, 7],
      costPerUnit: 480,
      sellingPrice: 720,
      leadTimeDays: 3,
      storageType: 'frozen',
      qualityStatus: 'optimal',
      batchSuffix: 'A',
    },

    // -------------------------------------------------------------
    // PREPARED FOODS (5 items)
    // -------------------------------------------------------------
    {
      id: 'demo-prep-01',
      name: 'Roasted Mediterranean Veggie Wrap',
      sku: 'PREP-WRP-01',
      category: 'Prepared Foods',
      quantity: 28,
      unit: 'units',
      daysOffset: 0, // Expiring today
      salesHistory: [15, 18, 14, 16, 20, 22, 17, 14, 16, 19, 21, 16, 15, 17],
      costPerUnit: 75,
      sellingPrice: 140,
      leadTimeDays: 1,
      storageType: 'refrigerated',
      qualityStatus: 'fair',
      batchSuffix: 'A',
    },
    {
      id: 'demo-prep-02',
      name: 'Crispy Falafel & Quinoa Bowl',
      sku: 'PREP-SLD-02',
      category: 'Prepared Foods',
      quantity: 32,
      unit: 'units',
      daysOffset: 1,
      salesHistory: [11, 14, 12, 15, 18, 20, 14, 12, 13, 16, 19, 13, 11, 14],
      costPerUnit: 95,
      sellingPrice: 180,
      leadTimeDays: 1,
      storageType: 'refrigerated',
      qualityStatus: 'good',
      batchSuffix: 'B',
    },
    {
      id: 'demo-prep-03',
      name: 'Avocado & Cucumber Sushi Bento Box',
      sku: 'PREP-SMI-03',
      category: 'Prepared Foods',
      quantity: 20,
      unit: 'units',
      daysOffset: 0, // Expiring today
      salesHistory: [8, 10, 7, 9, 12, 14, 9, 8, 9, 11, 13, 9, 8, 10],
      costPerUnit: 140,
      sellingPrice: 260,
      leadTimeDays: 1,
      storageType: 'refrigerated',
      qualityStatus: 'inspect',
      batchSuffix: 'C',
    },
    {
      id: 'demo-prep-04',
      name: 'Creamy Roasted Tomato & Herb Soup (350ml)',
      sku: 'PREP-SOP-04',
      category: 'Prepared Foods',
      quantity: 24,
      unit: 'units',
      daysOffset: 2,
      salesHistory: [10, 11, 9, 12, 15, 16, 11, 10, 11, 13, 15, 11, 10, 12],
      costPerUnit: 60,
      sellingPrice: 110,
      leadTimeDays: 1,
      storageType: 'refrigerated',
      qualityStatus: 'good',
      batchSuffix: 'A',
    },
    {
      id: 'demo-prep-05',
      name: 'Murgh Makhani Meal Tray with Pulao',
      sku: 'PREP-MLT-05',
      category: 'Prepared Foods',
      quantity: 15,
      unit: 'units',
      daysOffset: -2, // Expired 2 days ago
      salesHistory: [12, 14, 11, 13, 17, 19, 13, 11, 13, 15, 18, 13, 12, 14],
      costPerUnit: 120,
      sellingPrice: 220,
      leadTimeDays: 1,
      storageType: 'refrigerated',
      qualityStatus: 'expired',
      batchSuffix: 'E',
    },

    // -------------------------------------------------------------
    // PANTRY & DRY GOODS (4 items)
    // -------------------------------------------------------------
    {
      id: 'demo-pant-01',
      name: 'Royal Aged Basmati Rice (5kg Bag)',
      sku: 'PANT-RCE-01',
      category: 'Pantry & Dry Goods',
      quantity: 110,
      unit: 'units',
      daysOffset: 150,
      salesHistory: [8, 10, 9, 11, 14, 16, 10, 8, 10, 12, 15, 10, 9, 11],
      costPerUnit: 360,
      sellingPrice: 520,
      leadTimeDays: 7,
      storageType: 'ambient',
      qualityStatus: 'optimal',
      batchSuffix: 'A',
    },
    {
      id: 'demo-pant-02',
      name: 'Durum Wheat Penne Rigate (500g)',
      sku: 'PANT-PST-02',
      category: 'Pantry & Dry Goods',
      quantity: 180,
      unit: 'units',
      daysOffset: 120,
      salesHistory: [14, 16, 13, 17, 21, 23, 16, 14, 15, 19, 22, 16, 14, 17],
      costPerUnit: 65,
      sellingPrice: 115,
      leadTimeDays: 5,
      storageType: 'ambient',
      qualityStatus: 'optimal',
      batchSuffix: 'A',
    },
    {
      id: 'demo-pant-03',
      name: 'Organic Kabuli Chickpeas Canned (400g)',
      sku: 'PANT-BN-03',
      category: 'Pantry & Dry Goods',
      quantity: 90,
      unit: 'units',
      daysOffset: 85,
      salesHistory: [7, 8, 6, 9, 11, 12, 8, 7, 8, 10, 11, 8, 7, 9],
      costPerUnit: 55,
      sellingPrice: 95,
      leadTimeDays: 6,
      storageType: 'ambient',
      qualityStatus: 'good',
      batchSuffix: 'A',
    },
    {
      id: 'demo-pant-04',
      name: 'Cold Pressed Virgin Coconut Oil (500ml)',
      sku: 'PANT-OIL-04',
      category: 'Pantry & Dry Goods',
      quantity: 35,
      unit: 'units',
      daysOffset: 5, // Damaged seal batch expiring soon / compromised
      salesHistory: [4, 5, 3, 5, 6, 7, 4, 3, 4, 6, 7, 4, 3, 5],
      costPerUnit: 180,
      sellingPrice: 290,
      leadTimeDays: 7,
      storageType: 'ambient',
      qualityStatus: 'compromised',
      batchSuffix: 'X',
    },

    // -------------------------------------------------------------
    // BEVERAGES (4 items)
    // -------------------------------------------------------------
    {
      id: 'demo-bev-01',
      name: 'Cold-Pressed Valencia Orange Juice (300ml)',
      sku: 'BEV-OJ-01',
      category: 'Beverages',
      quantity: 56,
      unit: 'units',
      daysOffset: 2,
      salesHistory: [18, 22, 17, 20, 26, 30, 21, 17, 19, 24, 28, 20, 18, 21],
      costPerUnit: 58,
      sellingPrice: 99,
      leadTimeDays: 2,
      storageType: 'refrigerated',
      qualityStatus: 'good',
      batchSuffix: 'A',
    },
    {
      id: 'demo-bev-02',
      name: 'Detox Green Power Smoothie (350ml)',
      sku: 'BEV-SMT-02',
      category: 'Beverages',
      quantity: 38,
      unit: 'units',
      daysOffset: 1, // 1 day remaining
      salesHistory: [12, 14, 11, 15, 18, 21, 14, 11, 13, 16, 19, 13, 12, 15],
      costPerUnit: 70,
      sellingPrice: 125,
      leadTimeDays: 1,
      storageType: 'refrigerated',
      qualityStatus: 'fair',
      batchSuffix: 'B',
    },
    {
      id: 'demo-bev-03',
      name: 'Unsweetened Almond Milk Barista (1L)',
      sku: 'BEV-ALM-03',
      category: 'Beverages',
      quantity: 65,
      unit: 'units',
      daysOffset: 14,
      salesHistory: [9, 11, 8, 12, 15, 17, 11, 9, 10, 13, 16, 11, 9, 12],
      costPerUnit: 160,
      sellingPrice: 260,
      leadTimeDays: 4,
      storageType: 'ambient',
      qualityStatus: 'optimal',
      batchSuffix: 'A',
    },
    {
      id: 'demo-bev-04',
      name: 'Natural Tender Coconut Water (200ml Tetra)',
      sku: 'BEV-COC-04',
      category: 'Beverages',
      quantity: 150,
      unit: 'units',
      daysOffset: 45,
      salesHistory: [28, 32, 26, 30, 36, 40, 31, 27, 29, 34, 38, 30, 28, 32],
      costPerUnit: 32,
      sellingPrice: 50,
      leadTimeDays: 3,
      storageType: 'ambient',
      qualityStatus: 'optimal',
      batchSuffix: 'A',
    },
  ];

  return rawProducts.map((p) => {
    return {
      id: p.id,
      name: p.name,
      sku: p.sku,
      category: p.category,
      quantity: p.quantity,
      unit: p.unit,
      expiryDate: getOffsetDateString(p.daysOffset),
      avgDailySales: calculateAvgDailySales(p.salesHistory),
      salesHistory: p.salesHistory,
      costPerUnit: p.costPerUnit,
      sellingPrice: p.sellingPrice,
      leadTimeDays: p.leadTimeDays,
      storageType: p.storageType,
      lastUpdated: now,
      batchId: `BATCH-${p.sku}-${p.batchSuffix}`,
      qualityStatus: p.qualityStatus,
      isDemo: true,
    };
  });
}

/**
 * Generates demo donation partners with realistic operational metadata
 */
export function generateDemoPartners(): DonationPartner[] {
  return [
    {
      id: 'partner-01',
      name: 'Green Earth Food Bank',
      categories: ['Fresh Produce', 'Dairy & Eggs', 'Bakery'],
      maxQuantity: 200,
      operatingStatus: 'active',
      pickupDays: ['Mon', 'Wed', 'Fri'],
      pickupTimeStart: '08:30',
      pickupTimeEnd: '14:00',
      contactInfo: {
        name: 'Anita Sharma',
        phone: '+91 98201 44821',
        email: 'logistics@greenearthfoodbank.org',
      },
      address: 'Plot 42, Industrial Area, Sector 7, Outer Ring Road',
      distance: 3.2,
      isDemo: true,
    },
    {
      id: 'partner-02',
      name: 'City Meals Foundation',
      categories: ['Prepared Foods', 'Bakery'],
      maxQuantity: 150,
      operatingStatus: 'active',
      pickupDays: ['Tue', 'Thu'],
      pickupTimeStart: '11:00',
      pickupTimeEnd: '16:00',
      contactInfo: {
        name: 'Vikram Joshi',
        phone: '+91 97112 55930',
        email: 'vikram@citymealsfoundation.in',
      },
      address: '14, Community Relief Centre, Civil Lines',
      distance: 5.8,
      isDemo: true,
    },
    {
      id: 'partner-03',
      name: 'Community Kitchen Network',
      categories: [
        'Fresh Produce',
        'Dairy & Eggs',
        'Bakery',
        'Meat & Seafood',
        'Prepared Foods',
        'Pantry & Dry Goods',
        'Beverages',
      ],
      maxQuantity: 500,
      operatingStatus: 'active',
      pickupDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
      pickupTimeStart: '07:30',
      pickupTimeEnd: '18:00',
      contactInfo: {
        name: 'Pooja Iyer',
        phone: '+91 98402 77190',
        email: 'partnerships@communitykitchens.net',
      },
      address: 'Central Food Hub, Gate 2, Metro Station Junction',
      distance: 8.1,
      isDemo: true,
    },
    {
      id: 'partner-04',
      name: 'Student Meal Program',
      categories: ['Dairy & Eggs', 'Pantry & Dry Goods', 'Beverages'],
      maxQuantity: 300,
      operatingStatus: 'active',
      pickupDays: ['Wed', 'Fri'],
      pickupTimeStart: '09:00',
      pickupTimeEnd: '15:30',
      contactInfo: {
        name: 'Karan Mehra',
        phone: '+91 99203 11847',
        email: 'karan@studentmeals.edu.in',
      },
      address: 'University Campus Road, Block B, Hostel Annex',
      distance: 4.5,
      isDemo: true,
    },
    {
      id: 'partner-05',
      name: 'Shelter Care Alliance',
      categories: ['Meat & Seafood', 'Prepared Foods'],
      maxQuantity: 100,
      operatingStatus: 'active',
      pickupDays: ['Mon', 'Thu'],
      pickupTimeStart: '10:00',
      pickupTimeEnd: '15:00',
      contactInfo: {
        name: 'Dr. Ramesh Pillai',
        phone: '+91 94451 90234',
        email: 'ramesh@sheltercare.org',
      },
      address: 'Hope Shelter Campus, NH-48 Service Road',
      distance: 12.3,
      isDemo: true,
    },
    {
      id: 'partner-06',
      name: 'Neighborhood Share Hub',
      categories: ['Fresh Produce', 'Bakery', 'Beverages'],
      maxQuantity: 250,
      operatingStatus: 'active',
      pickupDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
      pickupTimeStart: '07:00',
      pickupTimeEnd: '19:00',
      contactInfo: {
        name: 'Sneha Kulkarni',
        phone: '+91 96194 33201',
        email: 'sneha@sharehub.local',
      },
      address: 'Community Center 3, Market Road, Near Town Clock',
      distance: 1.8,
      isDemo: true,
    },
  ];
}

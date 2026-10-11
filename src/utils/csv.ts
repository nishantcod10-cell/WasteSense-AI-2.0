import Papa from 'papaparse';
import { isValid, parseISO } from 'date-fns';
import type {
  InventoryItem,
  CSVValidationResult,
  CSVValidationError,
  ProductCategory,
  StorageType,
  QualityStatus,
  UnitType,
} from '../types/index.ts';

const VALID_CATEGORIES: ProductCategory[] = [
  'Fresh Produce',
  'Dairy & Eggs',
  'Bakery',
  'Meat & Seafood',
  'Prepared Foods',
  'Pantry & Dry Goods',
  'Beverages',
];

const VALID_STORAGE_TYPES: StorageType[] = ['ambient', 'refrigerated', 'frozen'];
const VALID_QUALITY_STATUSES: QualityStatus[] = [
  'optimal',
  'good',
  'fair',
  'inspect',
  'compromised',
  'expired',
];

/**
 * Validates an uploaded CSV file for inventory importation
 */
export function validateCSV(file: File): Promise<CSVValidationResult> {
  return new Promise((resolve) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header: string) => header.trim(),
      complete: (results: any) => {
        const rows = results.data as Record<string, string>[];
        const errors: CSVValidationError[] = [];
        const warnings: string[] = [];
        const validRows: Record<string, any>[] = [];

        if (!rows || rows.length === 0) {
          resolve({
            isValid: false,
            errors: [{ row: 0, field: 'file', message: 'The CSV file is empty.' }],
            warnings,
            validRows: [],
            invalidRowsCount: 0,
            totalRows: 0,
          });
          return;
        }

        const requiredHeaders = ['name', 'sku', 'category', 'quantity', 'expiryDate', 'costPerUnit', 'sellingPrice'];
        const firstRowKeys = Object.keys(rows[0]).map((k) => k.toLowerCase());

        const missingRequired = requiredHeaders.filter(
          (rh) => !firstRowKeys.includes(rh.toLowerCase())
        );

        if (missingRequired.length > 0) {
          resolve({
            isValid: false,
            errors: [
              {
                row: 0,
                field: 'header',
                message: `Missing required column headers: ${missingRequired.join(', ')}`,
              },
            ],
            warnings,
            validRows: [],
            invalidRowsCount: rows.length,
            totalRows: rows.length,
          });
          return;
        }

        rows.forEach((row, index) => {
          const rowNumber = index + 2; // 1-indexed, accounting for header row
          let rowIsValid = true;

          // Normalize row keys
          const normalizedRow: Record<string, any> = {};
          for (const key of Object.keys(row)) {
            normalizedRow[key.trim()] = row[key];
          }

          // Check Name
          if (!normalizedRow.name || !String(normalizedRow.name).trim()) {
            errors.push({ row: rowNumber, field: 'name', message: 'Product name is required.' });
            rowIsValid = false;
          }

          // Check SKU
          if (!normalizedRow.sku || !String(normalizedRow.sku).trim()) {
            errors.push({ row: rowNumber, field: 'sku', message: 'SKU code is required.' });
            rowIsValid = false;
          }

          // Check Category
          if (!normalizedRow.category || !String(normalizedRow.category).trim()) {
            errors.push({ row: rowNumber, field: 'category', message: 'Category is required.' });
            rowIsValid = false;
          }

          // Check Quantity
          const qty = Number(normalizedRow.quantity);
          if (isNaN(qty) || qty < 0) {
            errors.push({ row: rowNumber, field: 'quantity', message: 'Quantity must be a positive number.' });
            rowIsValid = false;
          }

          // Check Expiry Date
          const expiryStr = String(normalizedRow.expiryDate || '').trim();
          if (!expiryStr) {
            errors.push({ row: rowNumber, field: 'expiryDate', message: 'Expiry date is required.' });
            rowIsValid = false;
          } else {
            const parsed = parseISO(expiryStr);
            if (!isValid(parsed)) {
              errors.push({
                row: rowNumber,
                field: 'expiryDate',
                message: `Invalid date format: "${expiryStr}". Expected YYYY-MM-DD.`,
              });
              rowIsValid = false;
            }
          }

          // Check Cost Per Unit
          const cost = Number(normalizedRow.costPerUnit);
          if (isNaN(cost) || cost < 0) {
            errors.push({ row: rowNumber, field: 'costPerUnit', message: 'Cost per unit must be a non-negative number.' });
            rowIsValid = false;
          }

          // Check Selling Price
          const price = Number(normalizedRow.sellingPrice);
          if (isNaN(price) || price < 0) {
            errors.push({ row: rowNumber, field: 'sellingPrice', message: 'Selling price must be a non-negative number.' });
            rowIsValid = false;
          }

          if (rowIsValid) {
            validRows.push(normalizedRow);
          }
        });

        resolve({
          isValid: errors.length === 0,
          errors,
          warnings,
          validRows,
          invalidRowsCount: rows.length - validRows.length,
          totalRows: rows.length,
        });
      },
      error: (error: any) => {
        resolve({
          isValid: false,
          errors: [{ row: 0, field: 'file', message: `CSV parsing failed: ${error.message}` }],
          warnings: [],
          validRows: [],
          invalidRowsCount: 0,
          totalRows: 0,
        });
      },
    });
  });
}

/**
 * Converts validated CSV raw row objects into typed InventoryItem objects
 */
export function parseCSVToInventory(rows: Record<string, any>[]): InventoryItem[] {
  const timestamp = new Date().toISOString();

  return rows.map((row, idx) => {
    const sku = String(row.sku || `SKU-${idx + 1}`).trim();
    const costPerUnit = Number(row.costPerUnit) || 0;
    const sellingPrice = Number(row.sellingPrice) || costPerUnit * 1.3;
    const quantity = Number(row.quantity) || 0;
    const unit: UnitType = (row.unit as UnitType) || 'units';

    // Parse sales history if present (comma, semicolon, pipe, or json array)
    let salesHistory: number[] = [];
    if (row.salesHistory) {
      if (Array.isArray(row.salesHistory)) {
        salesHistory = row.salesHistory.map(Number);
      } else {
        const rawStr = String(row.salesHistory).replace(/[[\]]/g, '');
        const delimiter = rawStr.includes(';') ? ';' : rawStr.includes('|') ? '|' : ',';
        salesHistory = rawStr
          .split(delimiter)
          .map((v) => Number(v.trim()))
          .filter((v) => !isNaN(v));
      }
    }

    let avgDailySales = Number(row.avgDailySales);
    if (isNaN(avgDailySales) || avgDailySales <= 0) {
      if (salesHistory.length > 0) {
        const sum = salesHistory.reduce((acc, curr) => acc + curr, 0);
        avgDailySales = Number((sum / salesHistory.length).toFixed(1));
      } else {
        avgDailySales = Math.max(1, Math.round(quantity / 7));
      }
    }

    // Ensure 14 data points for sales history
    if (salesHistory.length < 14) {
      const generatedHistory: number[] = [];
      for (let i = 0; i < 14; i++) {
        const variance = (Math.sin(i * 1.5) * 0.2 + (Math.random() * 0.2 - 0.1)) * avgDailySales;
        generatedHistory.push(Math.max(1, Math.round(avgDailySales + variance)));
      }
      salesHistory = generatedHistory;
    }

    // Category fallback
    let category = row.category as ProductCategory;
    if (!VALID_CATEGORIES.includes(category)) {
      category = 'Pantry & Dry Goods';
    }

    // Storage type fallback
    let storageType = (row.storageType || '').toLowerCase() as StorageType;
    if (!VALID_STORAGE_TYPES.includes(storageType)) {
      storageType = 'ambient';
    }

    // Quality status fallback
    let qualityStatus = (row.qualityStatus || '').toLowerCase() as QualityStatus;
    if (!VALID_QUALITY_STATUSES.includes(qualityStatus)) {
      qualityStatus = 'good';
    }

    return {
      id: row.id ? String(row.id) : `item-csv-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 6)}`,
      name: String(row.name).trim(),
      sku,
      category,
      quantity,
      unit,
      expiryDate: String(row.expiryDate).trim(),
      avgDailySales,
      salesHistory,
      costPerUnit,
      sellingPrice,
      leadTimeDays: Number(row.leadTimeDays) || 1,
      storageType,
      lastUpdated: timestamp,
      batchId: row.batchId ? String(row.batchId).trim() : `BATCH-${sku}-01`,
      qualityStatus,
      isDemo: false,
    };
  });
}

/**
 * Converts InventoryItem array to standard downloadable CSV string
 */
export function exportInventoryToCSV(items: InventoryItem[]): string {
  const exportRows = items.map((item) => ({
    id: item.id,
    name: item.name,
    sku: item.sku,
    category: item.category,
    quantity: item.quantity,
    unit: item.unit,
    expiryDate: item.expiryDate,
    costPerUnit: item.costPerUnit,
    sellingPrice: item.sellingPrice,
    avgDailySales: item.avgDailySales,
    salesHistory: item.salesHistory.join(';'),
    leadTimeDays: item.leadTimeDays,
    storageType: item.storageType,
    qualityStatus: item.qualityStatus,
    batchId: item.batchId,
  }));

  return Papa.unparse(exportRows, {
    header: true,
  });
}

/**
 * Triggers a direct browser file download for a generated CSV text
 */
export function downloadCSV(content: string, filename: string): void {
  if (typeof window === 'undefined') return;

  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.setAttribute('href', url);
  link.setAttribute('download', filename.endsWith('.csv') ? filename : `${filename}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Returns a ready-to-use sample CSV string with 5 realistic demonstration rows
 */
export function generateSampleCSV(): string {
  const sampleData = [
    {
      name: 'Organic Cavendish Bananas',
      sku: 'PROD-BAN-99',
      category: 'Fresh Produce',
      quantity: 50,
      unit: 'kg',
      expiryDate: '2026-10-14',
      costPerUnit: 35,
      sellingPrice: 55,
      avgDailySales: 15,
      salesHistory: '12;14;15;16;18;15;14;13;15;16;17;15;14;15',
      leadTimeDays: 1,
      storageType: 'ambient',
      qualityStatus: 'good',
      batchId: 'BATCH-PROD-BAN-99-A',
    },
    {
      name: 'Fresh Buffalo Milk (1L)',
      sku: 'DAIR-MLK-99',
      category: 'Dairy & Eggs',
      quantity: 40,
      unit: 'units',
      expiryDate: '2026-10-13',
      costPerUnit: 62,
      sellingPrice: 78,
      avgDailySales: 22,
      salesHistory: '20;22;25;21;24;26;22;20;23;25;24;21;22;23',
      leadTimeDays: 1,
      storageType: 'refrigerated',
      qualityStatus: 'good',
      batchId: 'BATCH-DAIR-MLK-99-B',
    },
    {
      name: 'Whole Grain Sourdough Loaf',
      sku: 'BAKE-SDR-99',
      category: 'Bakery',
      quantity: 20,
      unit: 'units',
      expiryDate: '2026-10-12',
      costPerUnit: 55,
      sellingPrice: 95,
      avgDailySales: 8,
      salesHistory: '7;8;9;8;10;11;8;7;8;9;10;8;7;9',
      leadTimeDays: 1,
      storageType: 'ambient',
      qualityStatus: 'good',
      batchId: 'BATCH-BAKE-SDR-99-A',
    },
    {
      name: 'Boneless Chicken Thighs',
      sku: 'MEAT-CHK-99',
      category: 'Meat & Seafood',
      quantity: 25,
      unit: 'kg',
      expiryDate: '2026-10-13',
      costPerUnit: 240,
      sellingPrice: 340,
      avgDailySales: 10,
      salesHistory: '9;10;12;8;11;14;10;9;11;12;13;10;9;11',
      leadTimeDays: 1,
      storageType: 'refrigerated',
      qualityStatus: 'good',
      batchId: 'BATCH-MEAT-CHK-99-C',
    },
    {
      name: 'Penne Rigate Pasta (500g)',
      sku: 'PANT-PST-99',
      category: 'Pantry & Dry Goods',
      quantity: 80,
      unit: 'units',
      expiryDate: '2027-04-30',
      costPerUnit: 68,
      sellingPrice: 120,
      avgDailySales: 5,
      salesHistory: '4;5;6;5;7;8;5;4;6;7;6;5;4;5',
      leadTimeDays: 5,
      storageType: 'ambient',
      qualityStatus: 'optimal',
      batchId: 'BATCH-PANT-PST-99-A',
    },
  ];

  return Papa.unparse(sampleData, {
    header: true,
  });
}

/**
 * Downloads a prefilled sample CSV template for quick user testing
 */
export function downloadSampleTemplate(): void {
  const csvContent = generateSampleCSV();
  downloadCSV(csvContent, 'wastesense_inventory_template.csv');
}

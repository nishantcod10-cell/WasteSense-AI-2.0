import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  Upload,
  Download,
  FileSpreadsheet,
  Search,
  Filter,
  ArrowUpDown,
  Edit2,
  Trash2,
  AlertTriangle,
  CheckCircle,
  Clock,
  Package,
  IndianRupee,
  Calendar,
  Layers,
  TrendingDown,
  X,
  FileText,
  Info,
  Check,
  LayoutList,
  Sparkles,
} from 'lucide-react';
import { z } from 'zod';
import { differenceInCalendarDays, parseISO, isValid } from 'date-fns';

import type {
  InventoryItem,
  ProductCategory,
  QualityStatus,
  StorageType,
  UnitType,
  ForecastResult,
  RiskLevel,
  CSVValidationResult,
} from '../types/index.ts';
import { storage } from '../services/storage.ts';
import { analyzeInventory } from '../domain/forecasting/engine.ts';
import { cn } from '../utils/cn.ts';
import { formatCurrency, formatNumber, formatDate } from '../utils/format.ts';
import {
  validateCSV,
  parseCSVToInventory,
  exportInventoryToCSV,
  downloadCSV,
  downloadSampleTemplate,
} from '../utils/csv.ts';
import { InventoryUniverse3D } from '../components/3d/InventoryUniverse3D';

const CATEGORIES: ProductCategory[] = [
  'Fresh Produce',
  'Dairy & Eggs',
  'Bakery',
  'Meat & Seafood',
  'Prepared Foods',
  'Pantry & Dry Goods',
  'Beverages',
];

const STORAGE_TYPES: StorageType[] = ['ambient', 'refrigerated', 'frozen'];
const QUALITY_STATUSES: QualityStatus[] = ['optimal', 'good', 'fair', 'inspect', 'compromised', 'expired'];
const UNITS: UnitType[] = ['units', 'kg', 'packs', 'cases', 'lbs', 'bunches'];

// Zod Validation Schema for InventoryItem
const itemFormSchema = z.object({
  name: z.string().trim().min(2, 'Product name must be at least 2 characters'),
  sku: z.string().trim().min(1, 'SKU code is required'),
  category: z.string().min(1, 'Please select a valid category'),
  quantity: z.number().min(0, 'Quantity cannot be negative'),
  unit: z.string().min(1, 'Unit is required'),
  expiryDate: z.string().refine((val) => {
    if (!val) return false;
    const d = parseISO(val);
    return isValid(d);
  }, 'Please provide a valid expiry date (YYYY-MM-DD)'),
  costPerUnit: z.number().gt(0, 'Cost per unit must be greater than 0'),
  sellingPrice: z.number().gt(0, 'Selling price must be greater than 0'),
  avgDailySales: z.number().min(0, 'Average daily sales cannot be negative'),
  leadTimeDays: z.number().min(0, 'Lead time must be at least 0').default(1),
  storageType: z.enum(['ambient', 'refrigerated', 'frozen']),
  qualityStatus: z.enum(['optimal', 'good', 'fair', 'inspect', 'compromised', 'expired']),
  batchId: z.string().optional(),
}).refine((data) => data.sellingPrice >= data.costPerUnit, {
  message: 'Selling price must be greater than or equal to cost per unit',
  path: ['sellingPrice'],
});

type ItemFormData = z.infer<typeof itemFormSchema>;

interface ToastNotification {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

export default function InventoryPage() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [riskFilter, setRiskFilter] = useState<string>('All');
  const [sortBy, setSortBy] = useState<'name' | 'expiry' | 'quantity' | 'value' | 'risk'>('expiry');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [viewMode, setViewMode] = useState<'table' | 'universe'>('table');

  // Modals & Panels
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [itemToDelete, setItemToDelete] = useState<InventoryItem | null>(null);
  const [selectedItemDetail, setSelectedItemDetail] = useState<InventoryItem | null>(null);
  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);

  // Form State
  const [formData, setFormData] = useState<ItemFormData>({
    name: '',
    sku: '',
    category: 'Fresh Produce',
    quantity: 10,
    unit: 'units',
    expiryDate: new Date().toISOString().split('T')[0],
    costPerUnit: 50,
    sellingPrice: 75,
    avgDailySales: 5,
    leadTimeDays: 1,
    storageType: 'ambient',
    qualityStatus: 'good',
    batchId: '',
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // CSV Import State
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvValidation, setCsvValidation] = useState<CSVValidationResult | null>(null);
  const [isParsingCsv, setIsParsingCsv] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Toast State
  const [toasts, setToasts] = useState<ToastNotification[]>([]);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  // Load Inventory from Storage on Mount
  useEffect(() => {
    if (!storage.isInitialized()) {
      storage.resetToDemo();
    }
    const stored = storage.getInventory();
    setItems(stored);
  }, []);

  // Compute Forecasts dynamically for risk and value at risk calculations
  const forecastsMap = useMemo(() => {
    const settings = storage.getSettings();
    const results = analyzeInventory(items, settings);
    const map = new Map<string, ForecastResult>();
    results.forEach((res) => map.set(res.productId, res));
    return map;
  }, [items]);

  // Currency from settings
  const currency = useMemo(() => {
    return storage.getSettings().currency || 'INR';
  }, []);

  // Helper to get days left until expiry
  const getDaysLeft = (expiryDate: string): number => {
    try {
      const expiry = parseISO(expiryDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return differenceInCalendarDays(expiry, today);
    } catch {
      return 0;
    }
  };

  // Filter and Sort Items
  const filteredAndSortedItems = useMemo(() => {
    return items
      .filter((item) => {
        // Search
        const matchesSearch =
          item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.batchId.toLowerCase().includes(searchQuery.toLowerCase());

        // Category Filter
        const matchesCategory =
          categoryFilter === 'All' || item.category === categoryFilter;

        // Risk Filter
        const forecast = forecastsMap.get(item.id);
        const itemRisk: RiskLevel = forecast ? forecast.riskLevel : 'low';
        const matchesRisk =
          riskFilter === 'All' ||
          itemRisk.toLowerCase() === riskFilter.toLowerCase();

        return matchesSearch && matchesCategory && matchesRisk;
      })
      .sort((a, b) => {
        let diff = 0;
        const forecastA = forecastsMap.get(a.id);
        const forecastB = forecastsMap.get(b.id);

        if (sortBy === 'name') {
          diff = a.name.localeCompare(b.name);
        } else if (sortBy === 'expiry') {
          diff = getDaysLeft(a.expiryDate) - getDaysLeft(b.expiryDate);
        } else if (sortBy === 'quantity') {
          diff = a.quantity - b.quantity;
        } else if (sortBy === 'value') {
          const valA = a.quantity * a.sellingPrice;
          const valB = b.quantity * b.sellingPrice;
          diff = valA - valB;
        } else if (sortBy === 'risk') {
          const scoreA = forecastA ? forecastA.riskScore : 0;
          const scoreB = forecastB ? forecastB.riskScore : 0;
          diff = scoreA - scoreB;
        }

        return sortOrder === 'asc' ? diff : -diff;
      });
  }, [items, searchQuery, categoryFilter, riskFilter, sortBy, sortOrder, forecastsMap]);

  // Aggregate Metrics for Stats Bar
  const stats = useMemo(() => {
    const totalCount = items.length;
    const totalInventoryValue = items.reduce(
      (sum, i) => sum + i.quantity * i.sellingPrice,
      0
    );
    const expiringIn3Days = items.filter((i) => {
      const d = getDaysLeft(i.expiryDate);
      return d >= 0 && d <= 3;
    }).length;
    const avgDailyDemandSum = items.reduce((sum, i) => sum + i.avgDailySales, 0);
    const avgDailyDemand = totalCount > 0 ? avgDailyDemandSum / totalCount : 0;

    return {
      totalCount,
      totalInventoryValue,
      expiringIn3Days,
      avgDailyDemand,
    };
  }, [items]);

  // Open Form for Adding New Item
  const handleAddNew = () => {
    setEditingItem(null);
    setFormData({
      name: '',
      sku: `SKU-${Math.floor(1000 + Math.random() * 9000)}`,
      category: 'Fresh Produce',
      quantity: 25,
      unit: 'units',
      expiryDate: new Date(Date.now() + 5 * 86400000).toISOString().split('T')[0],
      costPerUnit: 50,
      sellingPrice: 75,
      avgDailySales: 5,
      leadTimeDays: 1,
      storageType: 'ambient',
      qualityStatus: 'good',
      batchId: '',
    });
    setFormErrors({});
    setIsFormOpen(true);
  };

  // Open Form for Editing Existing Item
  const handleEdit = (item: InventoryItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditingItem(item);
    setFormData({
      name: item.name,
      sku: item.sku,
      category: (item.category as ProductCategory) || 'Fresh Produce',
      quantity: item.quantity,
      unit: item.unit,
      expiryDate: item.expiryDate,
      costPerUnit: item.costPerUnit,
      sellingPrice: item.sellingPrice,
      avgDailySales: item.avgDailySales,
      leadTimeDays: item.leadTimeDays,
      storageType: item.storageType,
      qualityStatus: item.qualityStatus,
      batchId: item.batchId,
    });
    setFormErrors({});
    setIsFormOpen(true);
  };

  // Handle Form Submission
  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const result = itemFormSchema.safeParse(formData);

    if (!result.success) {
      const formattedErrors: Record<string, string> = {};
      result.error.issues.forEach((issue) => {
        if (issue.path[0]) {
          formattedErrors[issue.path[0] as string] = issue.message;
        }
      });
      setFormErrors(formattedErrors);
      return;
    }

    const validData = result.data;
    const now = new Date().toISOString();

    if (editingItem) {
      // Update existing item
      const updatedList = items.map((i) => {
        if (i.id === editingItem.id) {
          return {
            ...i,
            ...validData,
            batchId: validData.batchId || i.batchId,
            lastUpdated: now,
          };
        }
        return i;
      });
      setItems(updatedList);
      storage.setInventory(updatedList);
      showToast(`Updated "${validData.name}" successfully`, 'success');
    } else {
      // Add new item
      const newItemId = `item-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      const batchId =
        validData.batchId || `BATCH-${validData.sku}-${Math.random().toString(36).substring(2, 5).toUpperCase()}`;

      // Generate initial 14-day sales history based on avgDailySales
      const initialSalesHistory = Array.from({ length: 14 }, () =>
        Math.max(1, Math.round(validData.avgDailySales + (Math.random() * 4 - 2)))
      );

      const newItem: InventoryItem = {
        id: newItemId,
        ...validData,
        batchId,
        salesHistory: initialSalesHistory,
        lastUpdated: now,
        isDemo: false,
      };

      const updatedList = [newItem, ...items];
      setItems(updatedList);
      storage.setInventory(updatedList);
      showToast(`Added "${newItem.name}" to inventory`, 'success');
    }

    setIsFormOpen(false);
  };

  // Handle Deletion
  const confirmDelete = () => {
    if (!itemToDelete) return;
    const updatedList = items.filter((i) => i.id !== itemToDelete.id);
    setItems(updatedList);
    storage.setInventory(updatedList);
    showToast(`Removed "${itemToDelete.name}" from inventory`, 'info');
    setItemToDelete(null);
    if (selectedItemDetail?.id === itemToDelete.id) {
      setSelectedItemDetail(null);
    }
  };

  // Handle CSV File Selection
  const handleCsvSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCsvFile(file);
    setIsParsingCsv(true);
    try {
      const validation = await validateCSV(file);
      setCsvValidation(validation);
    } catch {
      showToast('Error parsing CSV file', 'error');
    } finally {
      setIsParsingCsv(false);
    }
  };

  // Handle CSV Import
  const handleImportCsv = () => {
    if (!csvValidation || csvValidation.validRows.length === 0) return;
    const parsedItems = parseCSVToInventory(csvValidation.validRows);

    // Merge with existing items (overwrite items with same SKU if exists, else append)
    const existingSkuMap = new Map(items.map((i) => [i.sku, i]));
    parsedItems.forEach((newItem) => {
      existingSkuMap.set(newItem.sku, newItem);
    });

    const mergedItems = Array.from(existingSkuMap.values());
    setItems(mergedItems);
    storage.setInventory(mergedItems);

    showToast(`Successfully imported ${parsedItems.length} products`, 'success');
    setIsCsvModalOpen(false);
    setCsvFile(null);
    setCsvValidation(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Handle Export CSV
  const handleExportCsv = () => {
    if (items.length === 0) {
      showToast('Inventory is empty, nothing to export', 'error');
      return;
    }
    const csvData = exportInventoryToCSV(items);
    const dateStr = new Date().toISOString().split('T')[0];
    downloadCSV(csvData, `WasteSense_Inventory_${dateStr}.csv`);
    showToast('Inventory exported successfully', 'success');
  };

  // Column header click for sorting
  const handleSortClick = (type: 'name' | 'expiry' | 'quantity' | 'value' | 'risk') => {
    if (sortBy === type) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(type);
      setSortOrder('asc');
    }
  };

  // Days left badge styling helper
  const getDaysLeftBadge = (daysLeft: number) => {
    if (daysLeft < 0) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-gray-500/10 text-gray-400 border border-gray-500/20">
          <Clock className="w-3 h-3" /> Expired
        </span>
      );
    }
    if (daysLeft === 0) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-red-500/20 text-ws-coral border border-red-500/30 animate-pulse">
          <AlertTriangle className="w-3 h-3" /> Expires Today
        </span>
      );
    }
    if (daysLeft <= 3) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-red-500/15 text-ws-coral border border-red-500/30">
          <AlertTriangle className="w-3 h-3" /> {daysLeft}d left
        </span>
      );
    }
    if (daysLeft <= 7) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-amber-500/15 text-ws-amber border border-amber-500/30">
          <Clock className="w-3 h-3" /> {daysLeft}d left
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-emerald-500/15 text-ws-primary border border-emerald-500/30">
        <CheckCircle className="w-3 h-3" /> {daysLeft}d left
      </span>
    );
  };

  // Quality badge styling helper
  const getQualityBadge = (status: QualityStatus) => {
    switch (status) {
      case 'optimal':
        return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-ws-primary border border-emerald-500/20">Optimal</span>;
      case 'good':
        return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-teal-500/10 text-teal-300 border border-teal-500/20">Good</span>;
      case 'fair':
        return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-500/10 text-yellow-300 border border-yellow-500/20">Fair</span>;
      case 'inspect':
        return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-amber-500/20 text-ws-amber border border-amber-500/30">Inspect</span>;
      case 'compromised':
        return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-rose-500/20 text-ws-coral border border-rose-500/30">Compromised</span>;
      case 'expired':
        return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-600/20 text-gray-400 border border-gray-600/30">Expired</span>;
    }
  };

  // Risk badge styling helper
  const getRiskBadge = (level: RiskLevel, score: number) => {
    switch (level) {
      case 'critical':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-rose-500/20 text-ws-coral border border-rose-500/40">
            Critical ({score})
          </span>
        );
      case 'high':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-orange-500/20 text-orange-400 border border-orange-500/40">
            High ({score})
          </span>
        );
      case 'moderate':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-amber-500/15 text-ws-amber border border-amber-500/30">
            Moderate ({score})
          </span>
        );
      case 'low':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-emerald-500/15 text-ws-primary border border-emerald-500/30">
            Low ({score})
          </span>
        );
      case 'expired':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-gray-500/15 text-gray-400 border border-gray-500/30">
            Expired
          </span>
        );
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full space-y-6">
      {/* Toast Notifications */}
      <div className="fixed top-5 right-5 z-50 flex flex-col gap-2 max-w-md pointer-events-none">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              className={cn(
                'pointer-events-auto flex items-center justify-between gap-3 px-4 py-3 rounded-xl shadow-xl backdrop-blur-md border text-sm',
                toast.type === 'success' && 'bg-ws-bg-card/95 border-ws-primary/40 text-ws-text',
                toast.type === 'error' && 'bg-rose-950/90 border-rose-500/40 text-rose-200',
                toast.type === 'info' && 'bg-ws-bg-card/95 border-blue-500/40 text-blue-200'
              )}
            >
              <div className="flex items-center gap-2">
                {toast.type === 'success' && <CheckCircle className="w-4 h-4 text-ws-primary shrink-0" />}
                {toast.type === 'error' && <AlertTriangle className="w-4 h-4 text-ws-coral shrink-0" />}
                {toast.type === 'info' && <Info className="w-4 h-4 text-blue-400 shrink-0" />}
                <span>{toast.message}</span>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-ws-text">
            Inventory <span className="text-gradient-primary">Management</span>
          </h1>
          <p className="text-ws-text-secondary mt-1 text-sm sm:text-base">
            Track products, batches, and expiry dates across all departments
          </p>
        </div>

        {/* Action Buttons & View Toggle */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* View Mode Toggle */}
          <div className="flex items-center rounded-xl border border-ws-border bg-ws-bg/90 p-1 shadow-inner">
            <button
              onClick={() => setViewMode('table')}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5',
                viewMode === 'table'
                  ? 'bg-ws-primary text-ws-bg-darkest font-bold shadow-sm'
                  : 'text-ws-text-secondary hover:text-ws-text'
              )}
            >
              <LayoutList className="w-3.5 h-3.5" />
              Table
            </button>
            <button
              onClick={() => setViewMode('universe')}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5',
                viewMode === 'universe'
                  ? 'bg-ws-primary text-ws-bg-darkest font-bold shadow-[0_0_15px_rgba(24,199,132,0.4)]'
                  : 'text-ws-text-secondary hover:text-ws-text'
              )}
            >
              <Sparkles className="w-3.5 h-3.5 text-ws-lime animate-pulse" />
              3D Universe
            </button>
          </div>

          <button
            onClick={downloadSampleTemplate}
            className="px-3 py-2 text-xs sm:text-sm font-medium text-ws-text-secondary hover:text-ws-text hover:bg-ws-glass rounded-lg border border-transparent hover:border-ws-border transition-all flex items-center gap-1.5"
            title="Download blank sample template"
          >
            <Download className="w-4 h-4 text-ws-text-muted" />
            <span className="hidden md:inline">Download</span> Template
          </button>

          <button
            onClick={handleExportCsv}
            className="px-3.5 py-2 text-xs sm:text-sm font-medium text-ws-text bg-ws-bg-card hover:bg-ws-bg-card-hover rounded-lg border border-ws-border hover:border-ws-border-light transition-all flex items-center gap-1.5 shadow-sm"
          >
            <FileSpreadsheet className="w-4 h-4 text-ws-primary" />
            Export CSV
          </button>

          <button
            onClick={() => setIsCsvModalOpen(true)}
            className="px-3.5 py-2 text-xs sm:text-sm font-medium text-ws-text bg-ws-bg-card hover:bg-ws-bg-card-hover rounded-lg border border-ws-border hover:border-ws-border-light transition-all flex items-center gap-1.5 shadow-sm"
          >
            <Upload className="w-4 h-4 text-ws-primary" />
            Import CSV
          </button>

          <button
            onClick={handleAddNew}
            className="px-4 py-2 text-xs sm:text-sm font-medium text-ws-bg-darkest bg-ws-primary hover:bg-ws-primary-light rounded-lg transition-all flex items-center gap-1.5 shadow-md font-semibold"
          >
            <Plus className="w-4 h-4" />
            Add Product
          </button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="glass-card p-4 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-ws-text-muted" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by product, SKU, batch..."
              className="w-full pl-9 pr-3 py-2 bg-ws-bg/80 border border-ws-border rounded-lg text-sm text-ws-text placeholder-ws-text-muted focus:outline-none focus:border-ws-primary transition-colors"
            />
          </div>

          {/* Category Dropdown */}
          <div className="relative">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full px-3 py-2 bg-ws-bg/80 border border-ws-border rounded-lg text-sm text-ws-text focus:outline-none focus:border-ws-primary transition-colors appearance-none cursor-pointer"
            >
              <option value="All">All Categories</option>
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
            <Filter className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 text-ws-text-muted pointer-events-none" />
          </div>

          {/* Risk Filter */}
          <div className="relative">
            <select
              value={riskFilter}
              onChange={(e) => setRiskFilter(e.target.value)}
              className="w-full px-3 py-2 bg-ws-bg/80 border border-ws-border rounded-lg text-sm text-ws-text focus:outline-none focus:border-ws-primary transition-colors appearance-none cursor-pointer"
            >
              <option value="All">All Risk Levels</option>
              <option value="critical">Critical Risk</option>
              <option value="high">High Risk</option>
              <option value="moderate">Moderate Risk</option>
              <option value="low">Low Risk</option>
              <option value="expired">Expired</option>
            </select>
            <AlertTriangle className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 text-ws-text-muted pointer-events-none" />
          </div>

          {/* Sort By */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="w-full px-3 py-2 bg-ws-bg/80 border border-ws-border rounded-lg text-sm text-ws-text focus:outline-none focus:border-ws-primary transition-colors appearance-none cursor-pointer"
              >
                <option value="expiry">Sort by Expiry Date</option>
                <option value="name">Sort by Product Name</option>
                <option value="quantity">Sort by Quantity</option>
                <option value="value">Sort by Total Value</option>
                <option value="risk">Sort by Risk Score</option>
              </select>
              <ArrowUpDown className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 text-ws-text-muted pointer-events-none" />
            </div>
            <button
              onClick={() => setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'))}
              className="p-2 bg-ws-bg/80 border border-ws-border hover:border-ws-border-light rounded-lg text-ws-text-secondary hover:text-ws-text text-sm transition-colors"
              title={`Order: ${sortOrder === 'asc' ? 'Ascending' : 'Descending'}`}
            >
              {sortOrder === 'asc' ? '↑' : '↓'}
            </button>
          </div>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="glass-card p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-ws-primary/15 border border-ws-primary/30 flex items-center justify-center shrink-0">
            <Package className="w-5 h-5 text-ws-primary" />
          </div>
          <div>
            <div className="text-xs text-ws-text-secondary font-medium">Total Products</div>
            <div className="text-xl font-bold text-ws-text mt-0.5">{formatNumber(stats.totalCount)}</div>
          </div>
        </div>

        <div className="glass-card p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-ws-lime/15 border border-ws-lime/30 flex items-center justify-center shrink-0">
            <IndianRupee className="w-5 h-5 text-ws-lime" />
          </div>
          <div>
            <div className="text-xs text-ws-text-secondary font-medium">Total Value</div>
            <div className="text-xl font-bold text-ws-text mt-0.5">
              {formatCurrency(stats.totalInventoryValue, currency)}
            </div>
          </div>
        </div>

        <div className="glass-card p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5 text-ws-coral" />
          </div>
          <div>
            <div className="text-xs text-ws-text-secondary font-medium">Expiring ≤ 3 Days</div>
            <div className="text-xl font-bold text-ws-coral mt-0.5">{stats.expiringIn3Days}</div>
          </div>
        </div>

        <div className="glass-card p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center shrink-0">
            <TrendingDown className="w-5 h-5 text-ws-amber" />
          </div>
          <div>
            <div className="text-xs text-ws-text-secondary font-medium">Avg Daily Demand</div>
            <div className="text-xl font-bold text-ws-text mt-0.5">
              {stats.avgDailyDemand.toFixed(1)} <span className="text-xs font-normal text-ws-text-muted">units/day</span>
            </div>
          </div>
        </div>
      </div>

      {viewMode === 'universe' ? (
        /* 3D Inventory Universe Module */
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
          className="w-full space-y-3"
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 px-1">
            <div className="text-xs text-ws-text-secondary flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-ws-primary animate-pulse" />
              <span>Interactive spatial clusters: node size indicates quantity, glow color reflects waste risk.</span>
            </div>
            <button
              onClick={() => setViewMode('table')}
              className="text-xs text-ws-primary hover:underline flex items-center gap-1 font-medium"
            >
              Switch to Standard Table →
            </button>
          </div>
          <InventoryUniverse3D
            items={items}
            forecasts={Array.from(forecastsMap.values())}
            onSelectItem={(item) => setSelectedItemDetail(item)}
          />
        </motion.div>
      ) : (
        /* Inventory Table */
        <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="border-b border-ws-border bg-ws-bg/60 text-ws-text-secondary text-xs font-semibold uppercase tracking-wider select-none">
                <th
                  onClick={() => handleSortClick('name')}
                  className="py-3 px-4 cursor-pointer hover:text-ws-text transition-colors"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Product Name</span>
                    {sortBy === 'name' && (
                      <span className="text-ws-primary">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </div>
                </th>
                <th className="py-3 px-3">SKU</th>
                <th className="py-3 px-3">Category</th>
                <th
                  onClick={() => handleSortClick('quantity')}
                  className="py-3 px-3 text-right cursor-pointer hover:text-ws-text transition-colors"
                >
                  <div className="flex items-center justify-end gap-1.5">
                    <span>Qty</span>
                    {sortBy === 'quantity' && (
                      <span className="text-ws-primary">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </div>
                </th>
                <th
                  onClick={() => handleSortClick('expiry')}
                  className="py-3 px-3 cursor-pointer hover:text-ws-text transition-colors"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Expiry</span>
                    {sortBy === 'expiry' && (
                      <span className="text-ws-primary">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </div>
                </th>
                <th className="py-3 px-3 text-center">Days Left</th>
                <th className="py-3 px-3 text-right">Daily Sales</th>
                <th
                  onClick={() => handleSortClick('value')}
                  className="py-3 px-3 text-right cursor-pointer hover:text-ws-text transition-colors"
                >
                  <div className="flex items-center justify-end gap-1.5">
                    <span>Total Value</span>
                    {sortBy === 'value' && (
                      <span className="text-ws-primary">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </div>
                </th>
                <th
                  onClick={() => handleSortClick('risk')}
                  className="py-3 px-3 text-center cursor-pointer hover:text-ws-text transition-colors"
                >
                  <div className="flex items-center justify-center gap-1.5">
                    <span>Risk Level</span>
                    {sortBy === 'risk' && (
                      <span className="text-ws-primary">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </div>
                </th>
                <th className="py-3 px-3 text-center">Quality</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ws-border/60">
              {filteredAndSortedItems.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-ws-text-muted">
                    <Package className="w-10 h-10 mx-auto text-ws-text-muted/60 mb-2" />
                    <p className="text-base font-medium text-ws-text-secondary">No products match your criteria</p>
                    <p className="text-xs text-ws-text-muted mt-1">Try resetting filters or adding a new product</p>
                  </td>
                </tr>
              ) : (
                filteredAndSortedItems.map((item) => {
                  const daysLeft = getDaysLeft(item.expiryDate);
                  const totalValue = item.quantity * item.sellingPrice;
                  const forecast = forecastsMap.get(item.id);
                  const riskLevel = forecast ? forecast.riskLevel : 'low';
                  const riskScore = forecast ? forecast.riskScore : 0;

                  return (
                    <tr
                      key={item.id}
                      onClick={() => setSelectedItemDetail(item)}
                      className="hover:bg-ws-bg-card-hover/40 transition-colors cursor-pointer group"
                    >
                      <td className="py-3 px-4">
                        <div className="font-medium text-ws-text group-hover:text-ws-primary-light transition-colors">
                          {item.name}
                        </div>
                        <div className="text-xs text-ws-text-muted">{item.batchId}</div>
                      </td>

                      <td className="py-3 px-3 font-mono text-xs text-ws-text-secondary">
                        {item.sku}
                      </td>

                      <td className="py-3 px-3">
                        <span className="text-xs text-ws-text-secondary">{item.category}</span>
                      </td>

                      <td className="py-3 px-3 text-right">
                        <span className="font-semibold text-ws-text">{formatNumber(item.quantity)}</span>{' '}
                        <span className="text-xs text-ws-text-muted">{item.unit}</span>
                      </td>

                      <td className="py-3 px-3 text-ws-text-secondary text-xs">
                        {formatDate(item.expiryDate)}
                      </td>

                      <td className="py-3 px-3 text-center">
                        {getDaysLeftBadge(daysLeft)}
                      </td>

                      <td className="py-3 px-3 text-right text-xs text-ws-text-secondary">
                        {item.avgDailySales.toFixed(1)} /day
                      </td>

                      <td className="py-3 px-3 text-right font-medium text-ws-text">
                        {formatCurrency(totalValue, currency)}
                      </td>

                      <td className="py-3 px-3 text-center">
                        {getRiskBadge(riskLevel, riskScore)}
                      </td>

                      <td className="py-3 px-3 text-center">
                        {getQualityBadge(item.qualityStatus)}
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={(e) => handleEdit(item, e)}
                            className="p-1.5 text-ws-text-secondary hover:text-ws-primary hover:bg-ws-glass rounded transition-colors"
                            title="Edit Product"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setItemToDelete(item);
                            }}
                            className="p-1.5 text-ws-text-secondary hover:text-ws-coral hover:bg-rose-500/10 rounded transition-colors"
                            title="Delete Product"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
      )}

      {/* Slide-over Detail View */}
      <AnimatePresence>
        {selectedItemDetail && (
          <div className="fixed inset-0 z-40 flex justify-end bg-[#17231B]/40 backdrop-blur-xs">
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="w-full max-w-lg bg-ws-bg-card border-l border-ws-border h-full flex flex-col shadow-2xl p-6 overflow-y-auto"
            >
              <div className="flex items-center justify-between pb-4 border-b border-ws-border">
                <div>
                  <span className="text-xs uppercase tracking-wider font-semibold text-ws-primary">
                    Product Details
                  </span>
                  <h2 className="text-xl font-bold text-ws-text mt-0.5">
                    {selectedItemDetail.name}
                  </h2>
                </div>
                <button
                  onClick={() => setSelectedItemDetail(null)}
                  className="p-1.5 text-ws-text-muted hover:text-ws-text hover:bg-ws-glass rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="py-6 space-y-6 flex-1">
                {/* Risk Insight Banner */}
                {(() => {
                  const forecast = forecastsMap.get(selectedItemDetail.id);
                  if (!forecast) return null;
                  return (
                    <div className="glass-card p-4 border border-ws-border space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-ws-text-secondary font-medium">Risk Score</span>
                        {getRiskBadge(forecast.riskLevel, forecast.riskScore)}
                      </div>
                      <div className="w-full bg-ws-bg/80 h-2 rounded-full overflow-hidden">
                        <div
                          className={cn(
                            'h-full transition-all duration-500',
                            forecast.riskScore > 75 ? 'bg-ws-coral' : forecast.riskScore > 40 ? 'bg-ws-amber' : 'bg-ws-primary'
                          )}
                          style={{ width: `${forecast.riskScore}%` }}
                        />
                      </div>
                      <p className="text-xs text-ws-text-secondary mt-1">
                        Surplus at risk: <strong className="text-ws-text">{forecast.expectedSurplus} {selectedItemDetail.unit}</strong> | Exposure:{' '}
                        <strong className="text-ws-coral">{formatCurrency(forecast.financialExposure, currency)}</strong>
                      </p>
                      <div className="pt-2 text-xs text-ws-text-muted italic border-t border-ws-border/50">
                        Recommendation: {forecast.recommendation}
                      </div>
                    </div>
                  );
                })()}

                {/* Info Grid */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-ws-bg/60 p-3 rounded-lg border border-ws-border">
                    <span className="text-xs text-ws-text-muted">SKU</span>
                    <p className="font-mono text-sm text-ws-text font-medium mt-0.5">{selectedItemDetail.sku}</p>
                  </div>
                  <div className="bg-ws-bg/60 p-3 rounded-lg border border-ws-border">
                    <span className="text-xs text-ws-text-muted">Batch ID</span>
                    <p className="font-mono text-sm text-ws-text font-medium mt-0.5">{selectedItemDetail.batchId}</p>
                  </div>
                  <div className="bg-ws-bg/60 p-3 rounded-lg border border-ws-border">
                    <span className="text-xs text-ws-text-muted">Category</span>
                    <p className="text-sm text-ws-text font-medium mt-0.5">{selectedItemDetail.category}</p>
                  </div>
                  <div className="bg-ws-bg/60 p-3 rounded-lg border border-ws-border">
                    <span className="text-xs text-ws-text-muted">Storage Condition</span>
                    <p className="text-sm capitalize text-ws-text font-medium mt-0.5">{selectedItemDetail.storageType}</p>
                  </div>
                  <div className="bg-ws-bg/60 p-3 rounded-lg border border-ws-border">
                    <span className="text-xs text-ws-text-muted">Current Stock</span>
                    <p className="text-sm text-ws-text font-semibold mt-0.5">
                      {selectedItemDetail.quantity} {selectedItemDetail.unit}
                    </p>
                  </div>
                  <div className="bg-ws-bg/60 p-3 rounded-lg border border-ws-border">
                    <span className="text-xs text-ws-text-muted">Daily Sales Velocity</span>
                    <p className="text-sm text-ws-text font-medium mt-0.5">
                      {selectedItemDetail.avgDailySales} /day
                    </p>
                  </div>
                  <div className="bg-ws-bg/60 p-3 rounded-lg border border-ws-border">
                    <span className="text-xs text-ws-text-muted">Unit Cost</span>
                    <p className="text-sm text-ws-text font-medium mt-0.5">
                      {formatCurrency(selectedItemDetail.costPerUnit, currency)}
                    </p>
                  </div>
                  <div className="bg-ws-bg/60 p-3 rounded-lg border border-ws-border">
                    <span className="text-xs text-ws-text-muted">Selling Price</span>
                    <p className="text-sm text-ws-text font-medium mt-0.5">
                      {formatCurrency(selectedItemDetail.sellingPrice, currency)}
                    </p>
                  </div>
                  <div className="bg-ws-bg/60 p-3 rounded-lg border border-ws-border">
                    <span className="text-xs text-ws-text-muted">Expiry Date</span>
                    <p className="text-sm text-ws-text font-medium mt-0.5">{formatDate(selectedItemDetail.expiryDate)}</p>
                  </div>
                  <div className="bg-ws-bg/60 p-3 rounded-lg border border-ws-border">
                    <span className="text-xs text-ws-text-muted">Quality Status</span>
                    <div className="mt-1">{getQualityBadge(selectedItemDetail.qualityStatus)}</div>
                  </div>
                </div>

                {/* Sales History mini sparkline */}
                {selectedItemDetail.salesHistory && selectedItemDetail.salesHistory.length > 0 && (
                  <div className="bg-ws-bg/60 p-4 rounded-lg border border-ws-border">
                    <div className="text-xs text-ws-text-muted font-medium mb-2">14-Day Velocity History</div>
                    <div className="flex items-end gap-1 h-14">
                      {selectedItemDetail.salesHistory.map((val, idx) => {
                        const maxVal = Math.max(...selectedItemDetail.salesHistory, 1);
                        const pct = Math.round((val / maxVal) * 100);
                        return (
                          <div
                            key={idx}
                            className="flex-1 bg-ws-primary/40 hover:bg-ws-primary transition-colors rounded-xs"
                            style={{ height: `${pct}%` }}
                            title={`Day ${idx + 1}: ${val} units`}
                          />
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Action buttons */}
              <div className="pt-4 border-t border-ws-border flex gap-3">
                <button
                  onClick={() => {
                    handleEdit(selectedItemDetail);
                    setSelectedItemDetail(null);
                  }}
                  className="flex-1 py-2 px-3 text-sm font-medium bg-ws-primary/20 text-ws-primary hover:bg-ws-primary/30 border border-ws-primary/40 rounded-lg transition-colors flex items-center justify-center gap-1.5"
                >
                  <Edit2 className="w-4 h-4" /> Edit Item
                </button>
                <button
                  onClick={() => {
                    setItemToDelete(selectedItemDetail);
                  }}
                  className="py-2 px-4 text-sm font-medium bg-rose-500/10 text-ws-coral hover:bg-rose-500/20 border border-rose-500/30 rounded-lg transition-colors flex items-center gap-1.5"
                >
                  <Trash2 className="w-4 h-4" /> Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add / Edit Product Modal */}
      <AnimatePresence>
        {isFormOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#17231B]/40 backdrop-blur-xs overflow-y-auto">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-ws-bg-card border border-ws-border rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden"
            >
              <div className="flex items-center justify-between p-5 border-b border-ws-border">
                <h3 className="text-lg font-bold text-ws-text">
                  {editingItem ? 'Edit Product' : 'Add New Product'}
                </h3>
                <button
                  onClick={() => setIsFormOpen(false)}
                  className="p-1.5 text-ws-text-muted hover:text-ws-text hover:bg-ws-glass rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleFormSubmit} className="p-6 overflow-y-auto space-y-6 flex-1">
                {/* Section 1: Basic Info */}
                <div>
                  <h4 className="text-xs uppercase tracking-wider font-semibold text-ws-primary mb-3 flex items-center gap-2">
                    <Package className="w-4 h-4" /> Basic Information
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-ws-text-secondary mb-1">
                        Product Name *
                      </label>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="e.g. Organic Cavendish Bananas"
                        className={cn(
                          'w-full px-3 py-2 bg-ws-bg border rounded-lg text-sm text-ws-text focus:outline-none focus:border-ws-primary',
                          formErrors.name ? 'border-rose-500' : 'border-ws-border'
                        )}
                      />
                      {formErrors.name && (
                        <p className="text-xs text-rose-400 mt-1">{formErrors.name}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-ws-text-secondary mb-1">
                        SKU Code *
                      </label>
                      <input
                        type="text"
                        value={formData.sku}
                        onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                        placeholder="PROD-BAN-01"
                        className={cn(
                          'w-full px-3 py-2 bg-ws-bg border rounded-lg text-sm text-ws-text focus:outline-none focus:border-ws-primary font-mono',
                          formErrors.sku ? 'border-rose-500' : 'border-ws-border'
                        )}
                      />
                      {formErrors.sku && (
                        <p className="text-xs text-rose-400 mt-1">{formErrors.sku}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-ws-text-secondary mb-1">
                        Category *
                      </label>
                      <select
                        value={formData.category}
                        onChange={(e) =>
                          setFormData({ ...formData, category: e.target.value as ProductCategory })
                        }
                        className="w-full px-3 py-2 bg-ws-bg border border-ws-border rounded-lg text-sm text-ws-text focus:outline-none focus:border-ws-primary"
                      >
                        {CATEGORIES.map((cat) => (
                          <option key={cat} value={cat}>
                            {cat}
                          </option>
                        ))}
                      </select>
                      {formErrors.category && (
                        <p className="text-xs text-rose-400 mt-1">{formErrors.category}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-ws-text-secondary mb-1">
                        Batch ID
                      </label>
                      <input
                        type="text"
                        value={formData.batchId || ''}
                        onChange={(e) => setFormData({ ...formData, batchId: e.target.value })}
                        placeholder="Auto-generated if empty"
                        className="w-full px-3 py-2 bg-ws-bg border border-ws-border rounded-lg text-sm text-ws-text focus:outline-none focus:border-ws-primary font-mono"
                      />
                    </div>
                  </div>
                </div>

                {/* Section 2: Pricing & Inventory */}
                <div className="pt-2 border-t border-ws-border/60">
                  <h4 className="text-xs uppercase tracking-wider font-semibold text-ws-primary mb-3 flex items-center gap-2">
                    <IndianRupee className="w-4 h-4" /> Pricing & Inventory
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-ws-text-secondary mb-1">
                        Current Quantity *
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={formData.quantity}
                        onChange={(e) => setFormData({ ...formData, quantity: Number(e.target.value) })}
                        className={cn(
                          'w-full px-3 py-2 bg-ws-bg border rounded-lg text-sm text-ws-text focus:outline-none focus:border-ws-primary',
                          formErrors.quantity ? 'border-rose-500' : 'border-ws-border'
                        )}
                      />
                      {formErrors.quantity && (
                        <p className="text-xs text-rose-400 mt-1">{formErrors.quantity}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-ws-text-secondary mb-1">
                        Unit *
                      </label>
                      <select
                        value={formData.unit}
                        onChange={(e) => setFormData({ ...formData, unit: e.target.value as UnitType })}
                        className="w-full px-3 py-2 bg-ws-bg border border-ws-border rounded-lg text-sm text-ws-text focus:outline-none focus:border-ws-primary"
                      >
                        {UNITS.map((u) => (
                          <option key={u} value={u}>
                            {u}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-ws-text-secondary mb-1">
                        Cost Per Unit ({currency}) *
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={formData.costPerUnit}
                        onChange={(e) => setFormData({ ...formData, costPerUnit: Number(e.target.value) })}
                        className={cn(
                          'w-full px-3 py-2 bg-ws-bg border rounded-lg text-sm text-ws-text focus:outline-none focus:border-ws-primary',
                          formErrors.costPerUnit ? 'border-rose-500' : 'border-ws-border'
                        )}
                      />
                      {formErrors.costPerUnit && (
                        <p className="text-xs text-rose-400 mt-1">{formErrors.costPerUnit}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-ws-text-secondary mb-1">
                        Selling Price ({currency}) *
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={formData.sellingPrice}
                        onChange={(e) => setFormData({ ...formData, sellingPrice: Number(e.target.value) })}
                        className={cn(
                          'w-full px-3 py-2 bg-ws-bg border rounded-lg text-sm text-ws-text focus:outline-none focus:border-ws-primary',
                          formErrors.sellingPrice ? 'border-rose-500' : 'border-ws-border'
                        )}
                      />
                      {formErrors.sellingPrice && (
                        <p className="text-xs text-rose-400 mt-1">{formErrors.sellingPrice}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Section 3: Sales Data & Dates */}
                <div className="pt-2 border-t border-ws-border/60">
                  <h4 className="text-xs uppercase tracking-wider font-semibold text-ws-primary mb-3 flex items-center gap-2">
                    <Calendar className="w-4 h-4" /> Sales Velocity & Shelf Life
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-ws-text-secondary mb-1">
                        Expiry Date *
                      </label>
                      <input
                        type="date"
                        value={formData.expiryDate}
                        onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
                        className={cn(
                          'w-full px-3 py-2 bg-ws-bg border rounded-lg text-sm text-ws-text focus:outline-none focus:border-ws-primary',
                          formErrors.expiryDate ? 'border-rose-500' : 'border-ws-border'
                        )}
                      />
                      {formErrors.expiryDate && (
                        <p className="text-xs text-rose-400 mt-1">{formErrors.expiryDate}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-ws-text-secondary mb-1">
                        Avg Daily Sales *
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={formData.avgDailySales}
                        onChange={(e) => setFormData({ ...formData, avgDailySales: Number(e.target.value) })}
                        className={cn(
                          'w-full px-3 py-2 bg-ws-bg border rounded-lg text-sm text-ws-text focus:outline-none focus:border-ws-primary',
                          formErrors.avgDailySales ? 'border-rose-500' : 'border-ws-border'
                        )}
                      />
                      {formErrors.avgDailySales && (
                        <p className="text-xs text-rose-400 mt-1">{formErrors.avgDailySales}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-ws-text-secondary mb-1">
                        Lead Time (Days)
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={formData.leadTimeDays}
                        onChange={(e) => setFormData({ ...formData, leadTimeDays: Number(e.target.value) })}
                        className="w-full px-3 py-2 bg-ws-bg border border-ws-border rounded-lg text-sm text-ws-text focus:outline-none focus:border-ws-primary"
                      />
                    </div>
                  </div>
                </div>

                {/* Section 4: Storage & Quality */}
                <div className="pt-2 border-t border-ws-border/60">
                  <h4 className="text-xs uppercase tracking-wider font-semibold text-ws-primary mb-3 flex items-center gap-2">
                    <Layers className="w-4 h-4" /> Storage & Condition
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-ws-text-secondary mb-1">
                        Storage Condition
                      </label>
                      <select
                        value={formData.storageType}
                        onChange={(e) =>
                          setFormData({ ...formData, storageType: e.target.value as StorageType })
                        }
                        className="w-full px-3 py-2 bg-ws-bg border border-ws-border rounded-lg text-sm text-ws-text focus:outline-none focus:border-ws-primary capitalize"
                      >
                        {STORAGE_TYPES.map((st) => (
                          <option key={st} value={st}>
                            {st}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-ws-text-secondary mb-1">
                        Quality Status
                      </label>
                      <select
                        value={formData.qualityStatus}
                        onChange={(e) =>
                          setFormData({ ...formData, qualityStatus: e.target.value as QualityStatus })
                        }
                        className="w-full px-3 py-2 bg-ws-bg border border-ws-border rounded-lg text-sm text-ws-text focus:outline-none focus:border-ws-primary capitalize"
                      >
                        {QUALITY_STATUSES.map((qs) => (
                          <option key={qs} value={qs}>
                            {qs}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-ws-border flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setIsFormOpen(false)}
                    className="px-4 py-2 text-sm font-medium text-ws-text-secondary hover:text-ws-text hover:bg-ws-glass rounded-lg border border-transparent"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 text-sm font-semibold text-ws-bg-darkest bg-ws-primary hover:bg-ws-primary-light rounded-lg transition-colors shadow-md"
                  >
                    {editingItem ? 'Save Changes' : 'Create Product'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* CSV Import Dialog */}
      <AnimatePresence>
        {isCsvModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#17231B]/40 backdrop-blur-xs">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-ws-bg-card border border-ws-border rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden"
            >
              <div className="flex items-center justify-between p-5 border-b border-ws-border">
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="w-5 h-5 text-ws-primary" />
                  <h3 className="text-lg font-bold text-ws-text">Import Products from CSV</h3>
                </div>
                <button
                  onClick={() => {
                    setIsCsvModalOpen(false);
                    setCsvFile(null);
                    setCsvValidation(null);
                  }}
                  className="p-1.5 text-ws-text-muted hover:text-ws-text hover:bg-ws-glass rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 overflow-y-auto space-y-6 flex-1">
                {/* Upload Area */}
                <div className="border-2 border-dashed border-ws-border-light hover:border-ws-primary rounded-xl p-6 text-center transition-colors bg-ws-bg/40">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv"
                    onChange={handleCsvSelect}
                    className="hidden"
                    id="csv-file-upload"
                  />
                  <label htmlFor="csv-file-upload" className="cursor-pointer flex flex-col items-center">
                    <Upload className="w-10 h-10 text-ws-primary mb-3" />
                    <span className="text-sm font-semibold text-ws-text">
                      {csvFile ? csvFile.name : 'Choose CSV file or drag & drop'}
                    </span>
                    <span className="text-xs text-ws-text-muted mt-1">
                      Accepts .csv with name, sku, category, quantity, expiryDate, costPerUnit, sellingPrice
                    </span>
                  </label>
                </div>

                {isParsingCsv && (
                  <div className="text-center py-4 text-ws-text-secondary text-sm">
                    Parsing and validating CSV...
                  </div>
                )}

                {csvValidation && (
                  <div className="space-y-4">
                    {/* Validation Summary */}
                    <div className="flex items-center gap-4 text-xs">
                      <span className="px-3 py-1.5 rounded-lg bg-emerald-500/10 text-ws-primary border border-emerald-500/20 font-medium flex items-center gap-1.5">
                        <Check className="w-3.5 h-3.5" /> {csvValidation.validRows.length} Valid Rows
                      </span>
                      {csvValidation.invalidRowsCount > 0 && (
                        <span className="px-3 py-1.5 rounded-lg bg-rose-500/10 text-ws-coral border border-rose-500/20 font-medium flex items-center gap-1.5">
                          <AlertTriangle className="w-3.5 h-3.5" /> {csvValidation.invalidRowsCount} Invalid Rows
                        </span>
                      )}
                      <span className="text-ws-text-muted">Total: {csvValidation.totalRows} rows</span>
                    </div>

                    {/* Errors List */}
                    {csvValidation.errors.length > 0 && (
                      <div className="p-3 bg-rose-950/40 border border-rose-500/30 rounded-xl space-y-1 max-h-36 overflow-y-auto">
                        <div className="text-xs font-semibold text-rose-300 mb-1 flex items-center gap-1">
                          <AlertTriangle className="w-3.5 h-3.5" /> Validation Errors:
                        </div>
                        {csvValidation.errors.map((err, idx) => (
                          <div key={idx} className="text-xs text-rose-300">
                            {typeof err === 'string'
                              ? err
                              : `Row ${err.row}: [${err.field}] ${err.message}`}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Preview Table */}
                    {csvValidation.validRows.length > 0 && (
                      <div>
                        <div className="text-xs font-semibold text-ws-text-secondary mb-2">
                          Preview (first 10 rows):
                        </div>
                        <div className="border border-ws-border rounded-lg overflow-x-auto max-h-48">
                          <table className="w-full text-left text-xs">
                            <thead className="bg-ws-bg text-ws-text-muted border-b border-ws-border">
                              <tr>
                                <th className="p-2">Name</th>
                                <th className="p-2">SKU</th>
                                <th className="p-2">Category</th>
                                <th className="p-2 text-right">Qty</th>
                                <th className="p-2">Expiry</th>
                                <th className="p-2 text-right">Cost</th>
                                <th className="p-2 text-right">Price</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-ws-border/40">
                              {csvValidation.validRows.slice(0, 10).map((row, idx) => (
                                <tr key={idx} className="text-ws-text">
                                  <td className="p-2 font-medium">{row.name}</td>
                                  <td className="p-2 font-mono text-ws-text-secondary">{row.sku}</td>
                                  <td className="p-2 text-ws-text-secondary">{row.category}</td>
                                  <td className="p-2 text-right">{row.quantity}</td>
                                  <td className="p-2 text-ws-text-secondary">{row.expiryDate}</td>
                                  <td className="p-2 text-right">{row.costPerUnit}</td>
                                  <td className="p-2 text-right">{row.sellingPrice}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="p-5 border-t border-ws-border flex items-center justify-between">
                <button
                  onClick={downloadSampleTemplate}
                  className="text-xs text-ws-primary hover:underline flex items-center gap-1"
                >
                  <FileText className="w-3.5 h-3.5" /> Need template file?
                </button>
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setIsCsvModalOpen(false);
                      setCsvFile(null);
                      setCsvValidation(null);
                    }}
                    className="px-4 py-2 text-sm font-medium text-ws-text-secondary hover:text-ws-text hover:bg-ws-glass rounded-lg"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleImportCsv}
                    disabled={!csvValidation || csvValidation.validRows.length === 0}
                    className="px-5 py-2 text-sm font-semibold text-ws-bg-darkest bg-ws-primary hover:bg-ws-primary-light disabled:opacity-40 disabled:pointer-events-none rounded-lg transition-colors shadow-md"
                  >
                    Import {csvValidation ? csvValidation.validRows.length : 0} Valid Rows
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {itemToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#17231B]/40 backdrop-blur-xs">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-ws-bg-card border border-ws-border rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4"
            >
              <div className="w-12 h-12 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-ws-coral">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-ws-text">Confirm Deletion</h3>
                <p className="text-sm text-ws-text-secondary mt-1">
                  Are you sure you want to delete{' '}
                  <span className="font-semibold text-ws-text">{itemToDelete.name}</span>? This item and its sales
                  history will be permanently removed.
                </p>
              </div>
              <div className="pt-2 flex justify-end gap-3">
                <button
                  onClick={() => setItemToDelete(null)}
                  className="px-4 py-2 text-sm font-medium text-ws-text-secondary hover:text-ws-text hover:bg-ws-glass rounded-lg border border-transparent"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDelete}
                  className="px-4 py-2 text-sm font-semibold text-white bg-rose-600 hover:bg-rose-500 rounded-lg transition-colors shadow-md"
                >
                  Delete Item
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

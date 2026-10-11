import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Store,
  Sliders,
  ShieldCheck,
  Database,
  Info,
  RotateCcw,
  Download,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  HelpCircle,
  Save,
  Tag,
  DollarSign,
  Scale,
  Calendar,
  Layers,
  Sparkles,
} from 'lucide-react';
import type { AppSettings, RiskWeights, DataMode, UnitType } from '../types';
import { storage, DEFAULT_SETTINGS } from '../services/storage';
import { exportInventoryToCSV, downloadCSV } from '../utils/csv';
import { formatNumber } from '../utils/format';
import { useToast } from '../context/ToastContext';

export default function SettingsPage() {
  const { success, warning, error, info } = useToast();
  const [settings, setSettings] = useState<AppSettings>(storage.getSettings());

  // Storage counts for About section
  const [counts, setCounts] = useState({
    items: 0,
    actions: 0,
    offers: 0,
    partners: 0,
    forecasts: 0,
  });

  // Confirmation dialog states
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  useEffect(() => {
    loadSettingsAndCounts();
  }, []);

  const loadSettingsAndCounts = () => {
    const s = storage.getSettings();
    setSettings(s);

    const inv = storage.getInventory();
    const acts = storage.getActions();
    const offers = storage.getDonationOffers();
    const partners = storage.getPartners();
    const fcs = storage.getForecasts();

    setCounts({
      items: inv.length,
      actions: acts.length,
      offers: offers.length,
      partners: partners.length,
      forecasts: fcs.length,
    });
  };

  // Immediate save on any settings mutation
  const updateSetting = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    const updated = { ...settings, [key]: value };
    setSettings(updated);
    storage.setSettings(updated);
    success(`Settings updated`);
  };

  const updateRiskWeight = (weightKey: keyof RiskWeights, value: number) => {
    const updatedWeights: RiskWeights = {
      ...settings.riskWeights,
      [weightKey]: Number(value.toFixed(2)),
    };
    const updated = {
      ...settings,
      riskWeights: updatedWeights,
    };
    setSettings(updated);
    storage.setSettings(updated);
  };

  const handleResetWeights = () => {
    const updated = {
      ...settings,
      riskWeights: { ...DEFAULT_SETTINGS.riskWeights },
    };
    setSettings(updated);
    storage.setSettings(updated);
    success('Risk weights reset to balanced defaults');
  };

  const weightsSum = Number(
    (
      settings.riskWeights.surplusRatio +
      settings.riskWeights.urgency +
      settings.riskWeights.financialValue +
      settings.riskWeights.volatility
    ).toFixed(2)
  );

  const isWeightsValid = Math.abs(weightsSum - 1.0) < 0.01;

  const handleExportAll = () => {
    const inv = storage.getInventory();
    if (inv.length === 0) {
      warning('Inventory is currently empty. Nothing to export.');
      return;
    }
    const csvContent = exportInventoryToCSV(inv);
    downloadCSV(csvContent, `WasteSense_Inventory_Export_${new Date().toISOString().split('T')[0]}.csv`);
    success(`Exported ${inv.length} inventory records to CSV`);
  };

  const handleResetToDemo = () => {
    storage.resetToDemo();
    loadSettingsAndCounts();
    setShowResetConfirm(false);
    success('System refreshed with baseline demo inventory & partners');
  };

  const handleClearAll = () => {
    storage.clearAll();
    loadSettingsAndCounts();
    setShowClearConfirm(false);
    error('All data wiped from local storage');
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.25 }}
      className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto w-full space-y-8"
    >
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-ws-text">
          System <span className="text-gradient-primary">Settings & Policies</span>
        </h1>
        <p className="text-ws-text-secondary mt-1 text-sm sm:text-base">
          Configure store parameters, algorithm risk weightings, markdown policies, and data management.
        </p>
      </div>

      {/* SECTION 1: Store Information */}
      <div className="glass-card border border-ws-border rounded-2xl p-6 space-y-6">
        <div className="flex items-center gap-2 pb-3 border-b border-ws-border">
          <Store className="w-5 h-5 text-ws-primary" />
          <h2 className="text-base sm:text-lg font-bold text-ws-text">Store Information</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <div>
            <label className="block text-xs font-semibold text-ws-text-secondary mb-1.5">
              Store / Facility Name
            </label>
            <input
              type="text"
              value={settings.storeName}
              onChange={(e) => updateSetting('storeName', e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-ws-bg-elevated border border-ws-border text-ws-text text-sm focus:outline-none focus:border-ws-primary"
              placeholder="e.g. WasteSense Flagship Store"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-ws-text-secondary mb-1.5">
              Currency
            </label>
            <select
              value={settings.currency}
              onChange={(e) => updateSetting('currency', e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-ws-bg-elevated border border-ws-border text-ws-text text-sm focus:outline-none focus:border-ws-primary"
            >
              <option value="INR">INR (₹)</option>
              <option value="USD">USD ($)</option>
              <option value="EUR">EUR (€)</option>
              <option value="GBP">GBP (£)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-ws-text-secondary mb-1.5">
              Default Measurement Unit
            </label>
            <select
              value={settings.defaultUnit}
              onChange={(e) => updateSetting('defaultUnit', e.target.value as UnitType)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-ws-bg-elevated border border-ws-border text-ws-text text-sm focus:outline-none focus:border-ws-primary"
            >
              <option value="units">units</option>
              <option value="kg">kg</option>
              <option value="lbs">lbs</option>
              <option value="cases">cases</option>
              <option value="packs">packs</option>
            </select>
          </div>
        </div>
      </div>

      {/* SECTION 2: Risk Scoring Engine */}
      <div className="glass-card border border-ws-border rounded-2xl p-6 space-y-6">
        <div className="flex items-center justify-between pb-3 border-b border-ws-border">
          <div className="flex items-center gap-2">
            <Sliders className="w-5 h-5 text-ws-primary" />
            <h2 className="text-base sm:text-lg font-bold text-ws-text">Risk Scoring Weights</h2>
          </div>

          <div className="flex items-center gap-3">
            <span
              className={`px-2.5 py-1 rounded-full text-xs font-bold border ${
                isWeightsValid
                  ? 'bg-ws-primary/15 text-ws-primary border-ws-primary/30'
                  : 'bg-ws-coral/15 text-ws-coral border-ws-coral/30'
              }`}
            >
              Sum: {weightsSum.toFixed(2)} / 1.00 {isWeightsValid ? '✓' : '(Must equal 1.00)'}
            </span>

            <button
              type="button"
              onClick={handleResetWeights}
              className="text-xs text-ws-text-secondary hover:text-ws-primary flex items-center gap-1 px-2.5 py-1 rounded-lg bg-ws-bg-elevated hover:bg-ws-border transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Reset
            </button>
          </div>
        </div>

        <p className="text-xs text-ws-text-secondary">
          Configure how the risk engine weighs individual risk factors. Adjusting these weights alters product prioritization in the Action Center.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {/* Surplus Ratio */}
          <div className="space-y-2 bg-ws-bg-darkest/60 p-4 rounded-xl border border-ws-border/40">
            <div className="flex justify-between text-xs">
              <span className="font-semibold text-ws-text">Surplus Volume Ratio</span>
              <span className="font-bold text-ws-primary">
                {Math.round(settings.riskWeights.surplusRatio * 100)}% ({settings.riskWeights.surplusRatio.toFixed(2)})
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={settings.riskWeights.surplusRatio}
              onChange={(e) => updateRiskWeight('surplusRatio', parseFloat(e.target.value))}
              className="w-full accent-ws-primary cursor-pointer"
            />
            <span className="text-[11px] text-ws-text-muted block">
              Impact of expected surplus unabsorbed by baseline velocity.
            </span>
          </div>

          {/* Urgency (Shelf-life) */}
          <div className="space-y-2 bg-ws-bg-darkest/60 p-4 rounded-xl border border-ws-border/40">
            <div className="flex justify-between text-xs">
              <span className="font-semibold text-ws-text">Urgency (Time-to-Expiry Decay)</span>
              <span className="font-bold text-ws-amber">
                {Math.round(settings.riskWeights.urgency * 100)}% ({settings.riskWeights.urgency.toFixed(2)})
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={settings.riskWeights.urgency}
              onChange={(e) => updateRiskWeight('urgency', parseFloat(e.target.value))}
              className="w-full accent-ws-amber cursor-pointer"
            />
            <span className="text-[11px] text-ws-text-muted block">
              Urgency penalty as items approach their expiration date.
            </span>
          </div>

          {/* Financial Value Exposure */}
          <div className="space-y-2 bg-ws-bg-darkest/60 p-4 rounded-xl border border-ws-border/40">
            <div className="flex justify-between text-xs">
              <span className="font-semibold text-ws-text">Financial Exposure</span>
              <span className="font-bold text-ws-lime">
                {Math.round(settings.riskWeights.financialValue * 100)}% ({settings.riskWeights.financialValue.toFixed(2)})
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={settings.riskWeights.financialValue}
              onChange={(e) => updateRiskWeight('financialValue', parseFloat(e.target.value))}
              className="w-full accent-ws-lime cursor-pointer"
            />
            <span className="text-[11px] text-ws-text-muted block">
              Dollar/Rupee value at risk based on unit cost.
            </span>
          </div>

          {/* Volatility & Uncertainty */}
          <div className="space-y-2 bg-ws-bg-darkest/60 p-4 rounded-xl border border-ws-border/40">
            <div className="flex justify-between text-xs">
              <span className="font-semibold text-ws-text">Demand Volatility & QA Check</span>
              <span className="font-bold text-ws-coral">
                {Math.round(settings.riskWeights.volatility * 100)}% ({settings.riskWeights.volatility.toFixed(2)})
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={settings.riskWeights.volatility}
              onChange={(e) => updateRiskWeight('volatility', parseFloat(e.target.value))}
              className="w-full accent-ws-coral cursor-pointer"
            />
            <span className="text-[11px] text-ws-text-muted block">
              Weight given to forecast confidence variance and quality flags.
            </span>
          </div>
        </div>
      </div>

      {/* SECTION 3: Policy Settings */}
      <div className="glass-card border border-ws-border rounded-2xl p-6 space-y-6">
        <div className="flex items-center gap-2 pb-3 border-b border-ws-border">
          <ShieldCheck className="w-5 h-5 text-ws-primary" />
          <h2 className="text-base sm:text-lg font-bold text-ws-text">Intervention Policies & Guards</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          {/* Markdown Floor */}
          <div>
            <label className="block text-xs font-semibold text-ws-text-secondary mb-1">
              Markdown Price Floor (%)
            </label>
            <div className="relative">
              <input
                type="number"
                min={10}
                max={80}
                value={Math.round((settings.markdownFloor || 0.3) * 100)}
                onChange={(e) =>
                  updateSetting(
                    'markdownFloor',
                    Math.max(0.1, Math.min(0.8, Number(e.target.value) / 100))
                  )
                }
                className="w-full px-3.5 py-2.5 rounded-xl bg-ws-bg-elevated border border-ws-border text-ws-text text-sm focus:outline-none focus:border-ws-primary pr-8"
              />
              <span className="absolute right-3 top-2.5 text-xs text-ws-text-muted">%</span>
            </div>
            <span className="text-[11px] text-ws-text-muted mt-1 block">
              Minimum selling price ratio floor (e.g. 30% allows up to 70% discount).
            </span>
          </div>

          {/* Donation Eligibility */}
          <div>
            <label className="block text-xs font-semibold text-ws-text-secondary mb-1">
              Min Days Before Expiry for Donation
            </label>
            <input
              type="number"
              min={1}
              max={7}
              value={settings.donationEligibilityDays}
              onChange={(e) =>
                updateSetting('donationEligibilityDays', Math.max(1, Number(e.target.value)))
              }
              className="w-full px-3.5 py-2.5 rounded-xl bg-ws-bg-elevated border border-ws-border text-ws-text text-sm focus:outline-none focus:border-ws-primary"
            />
            <span className="text-[11px] text-ws-text-muted mt-1 block">
              Food safety rule: minimum safe buffer window before partner collection.
            </span>
          </div>

          {/* Safety Buffer Days */}
          <div>
            <label className="block text-xs font-semibold text-ws-text-secondary mb-1">
              Shelf-Life Safety Buffer Days
            </label>
            <input
              type="number"
              min={0}
              max={3}
              value={settings.safetyBufferDays}
              onChange={(e) =>
                updateSetting('safetyBufferDays', Math.max(0, Number(e.target.value)))
              }
              className="w-full px-3.5 py-2.5 rounded-xl bg-ws-bg-elevated border border-ws-border text-ws-text text-sm focus:outline-none focus:border-ws-primary"
            />
            <span className="text-[11px] text-ws-text-muted mt-1 block">
              Treat items as expired N days before stated label date for extra caution.
            </span>
          </div>
        </div>
      </div>

      {/* SECTION 4: Data Management */}
      <div className="glass-card border border-ws-border rounded-2xl p-6 space-y-6">
        <div className="flex items-center justify-between pb-3 border-b border-ws-border">
          <div className="flex items-center gap-2">
            <Database className="w-5 h-5 text-ws-primary" />
            <h2 className="text-base sm:text-lg font-bold text-ws-text">Data Operations & Backups</h2>
          </div>

          <span
            className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
              settings.dataMode === 'demo'
                ? 'bg-ws-primary/20 text-ws-primary border border-ws-primary/30'
                : 'bg-ws-lime/20 text-ws-lime border border-ws-lime/30'
            }`}
          >
            {settings.dataMode} Mode
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleExportAll}
            className="px-4 py-2.5 rounded-xl bg-ws-bg-card hover:bg-ws-bg-card-hover border border-ws-border text-ws-text hover:text-ws-primary hover:border-ws-primary transition-all text-xs sm:text-sm font-semibold flex items-center gap-2 active:scale-95"
          >
            <Download className="w-4 h-4 text-ws-primary" />
            Export All Inventory Data (CSV)
          </button>

          <button
            type="button"
            onClick={() => setShowResetConfirm(true)}
            className="px-4 py-2.5 rounded-xl bg-ws-bg-elevated hover:bg-ws-border text-ws-text transition-all text-xs sm:text-sm font-semibold flex items-center gap-2 active:scale-95"
          >
            <RotateCcw className="w-4 h-4 text-ws-amber" />
            Reset to Demo Data
          </button>

          <button
            type="button"
            onClick={() => setShowClearConfirm(true)}
            className="px-4 py-2.5 rounded-xl bg-ws-coral/15 hover:bg-ws-coral/25 border border-ws-coral/30 text-ws-coral transition-all text-xs sm:text-sm font-semibold flex items-center gap-2 active:scale-95"
          >
            <Trash2 className="w-4 h-4" />
            Clear All Data
          </button>
        </div>

        {/* Confirmation Dialog: Reset to Demo */}
        <AnimatePresence>
          {showResetConfirm && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="bg-ws-amber/10 border border-ws-amber/30 rounded-xl p-4 text-xs space-y-3"
            >
              <div className="flex items-center gap-2 text-ws-amber font-bold">
                <AlertTriangle className="w-4 h-4" /> Reset to Demo Dataset?
              </div>
              <p className="text-ws-text-secondary">
                This will overwrite current inventory items with standard grocery demo products and partners.
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleResetToDemo}
                  className="px-3 py-1.5 rounded-lg bg-ws-amber text-ws-bg-darkest font-bold hover:bg-amber-400 transition-colors"
                >
                  Yes, Reset
                </button>
                <button
                  type="button"
                  onClick={() => setShowResetConfirm(false)}
                  className="px-3 py-1.5 rounded-lg bg-ws-bg-elevated text-ws-text hover:bg-ws-border transition-colors"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Confirmation Dialog: Clear All Data */}
        <AnimatePresence>
          {showClearConfirm && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="bg-ws-coral/10 border border-ws-coral/30 rounded-xl p-4 text-xs space-y-3"
            >
              <div className="flex items-center gap-2 text-ws-coral font-bold">
                <AlertCircle className="w-4 h-4" /> Danger: Clear Entire Storage?
              </div>
              <p className="text-ws-text-secondary">
                This will permanently delete all inventory, forecast predictions, action recommendations, and donation offers from your browser's local storage.
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleClearAll}
                  className="px-3 py-1.5 rounded-lg bg-ws-coral text-white font-bold hover:bg-red-600 transition-colors"
                >
                  Yes, Permanently Clear
                </button>
                <button
                  type="button"
                  onClick={() => setShowClearConfirm(false)}
                  className="px-3 py-1.5 rounded-lg bg-ws-bg-elevated text-ws-text hover:bg-ws-border transition-colors"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* SECTION 5: About WasteSense AI */}
      <div className="glass-card border border-ws-border rounded-2xl p-6 space-y-5">
        <div className="flex items-center gap-2 pb-3 border-b border-ws-border">
          <Info className="w-5 h-5 text-ws-primary" />
          <h2 className="text-base sm:text-lg font-bold text-ws-text">About WasteSense AI</h2>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-ws-text">WasteSense AI Platform</h3>
              <span className="px-2 py-0.5 rounded-full text-xs font-mono font-bold bg-ws-primary/20 text-ws-primary">
                v1.0.0
              </span>
            </div>
            <p className="text-xs text-ws-text-secondary mt-1">
              Predict Before Waste — Autonomous retail food shrinkage prevention and surplus diversion ecosystem.
            </p>
          </div>
        </div>

        {/* Storage stats count grid */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-2 text-xs">
          <div className="bg-ws-bg-darkest/60 p-3 rounded-xl border border-ws-border/40 text-center">
            <span className="text-ws-text-muted">Inventory Items</span>
            <div className="text-lg font-bold text-ws-text mt-0.5">{counts.items}</div>
          </div>
          <div className="bg-ws-bg-darkest/60 p-3 rounded-xl border border-ws-border/40 text-center">
            <span className="text-ws-text-muted">Action Recs</span>
            <div className="text-lg font-bold text-ws-primary mt-0.5">{counts.actions}</div>
          </div>
          <div className="bg-ws-bg-darkest/60 p-3 rounded-xl border border-ws-border/40 text-center">
            <span className="text-ws-text-muted">Donation Offers</span>
            <div className="text-lg font-bold text-ws-lime mt-0.5">{counts.offers}</div>
          </div>
          <div className="bg-ws-bg-darkest/60 p-3 rounded-xl border border-ws-border/40 text-center">
            <span className="text-ws-text-muted">Partners</span>
            <div className="text-lg font-bold text-ws-amber mt-0.5">{counts.partners}</div>
          </div>
          <div className="bg-ws-bg-darkest/60 p-3 rounded-xl border border-ws-border/40 text-center">
            <span className="text-ws-text-muted">Forecast Batches</span>
            <div className="text-lg font-bold text-ws-text mt-0.5">{counts.forecasts}</div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Sliders,
  RotateCcw,
  Sparkles,
  Package,
  TrendingUp,
  AlertTriangle,
  Layers,
  ShieldCheck,
  DollarSign,
  CheckCircle2,
  Calendar,
  BarChart3,
  Percent,
  HeartHandshake,
  Tag,
  Info,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import type {
  InventoryItem,
  ForecastResult,
  ScenarioInput,
  ScenarioResult,
  AppSettings,
} from '../types';
import { storage } from '../services/storage';
import { analyzeInventory } from '../domain/forecasting/engine';
import { simulateScenario, compareScenarios } from '../domain/simulator/engine';
import { formatCurrency, formatNumber, formatPercent, formatDate } from '../utils/format';

const DEFAULT_INPUT: ScenarioInput = {
  markdownDiscountPercent: 25,
  donationPortionPercent: 30,
  priceElasticity: 1.3,
  targetSellThroughDays: 3,
};

export default function SimulatorPage() {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [forecasts, setForecasts] = useState<ForecastResult[]>([]);
  const [settings, setSettings] = useState<AppSettings>(storage.getSettings());
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [scenarioInput, setScenarioInput] = useState<ScenarioInput>(DEFAULT_INPUT);

  useEffect(() => {
    const inv = storage.getInventory();
    const set = storage.getSettings();
    setInventory(inv);
    setSettings(set);

    if (inv.length > 0) {
      let fcs = storage.getForecasts();
      if (fcs.length === 0) {
        fcs = analyzeInventory(inv, set);
        storage.setForecasts(fcs);
      }
      setForecasts(fcs);

      // Select first product with surplus or just first product
      const candidate = fcs.find((f) => f.expectedSurplus > 0) || fcs[0];
      if (candidate) {
        setSelectedProductId(candidate.productId);
      } else {
        setSelectedProductId(inv[0].id);
      }
    }
  }, []);

  const selectedItem = useMemo(() => {
    return inventory.find((i) => i.id === selectedProductId) || null;
  }, [inventory, selectedProductId]);

  const selectedForecast = useMemo(() => {
    return forecasts.find((f) => f.productId === selectedProductId) || null;
  }, [forecasts, selectedProductId]);

  // Handle reset
  const handleResetScenario = () => {
    setScenarioInput(DEFAULT_INPUT);
  };

  // Generate 4 core scenarios
  const scenarioResults = useMemo(() => {
    if (!selectedItem || !selectedForecast) return [];

    // 1. Do Nothing
    const doNothing = simulateScenario(selectedItem, selectedForecast, {
      markdownDiscountPercent: 0,
      donationPortionPercent: 0,
      priceElasticity: scenarioInput.priceElasticity,
      targetSellThroughDays: scenarioInput.targetSellThroughDays,
    });
    doNothing.name = 'Do Nothing';

    // 2. Markdown Only
    const markdownOnly = simulateScenario(selectedItem, selectedForecast, {
      markdownDiscountPercent: scenarioInput.markdownDiscountPercent,
      donationPortionPercent: 0,
      priceElasticity: scenarioInput.priceElasticity,
      targetSellThroughDays: scenarioInput.targetSellThroughDays,
    });
    markdownOnly.name = `Markdown Only (${scenarioInput.markdownDiscountPercent}%)`;

    // 3. Donate Only
    const donateOnly = simulateScenario(selectedItem, selectedForecast, {
      markdownDiscountPercent: 0,
      donationPortionPercent: 50,
      priceElasticity: scenarioInput.priceElasticity,
      targetSellThroughDays: scenarioInput.targetSellThroughDays,
    });
    donateOnly.name = 'Donate Only (50%)';

    // 4. Combined Strategy
    const combined = simulateScenario(selectedItem, selectedForecast, {
      markdownDiscountPercent: scenarioInput.markdownDiscountPercent,
      donationPortionPercent: scenarioInput.donationPortionPercent,
      priceElasticity: scenarioInput.priceElasticity,
      targetSellThroughDays: scenarioInput.targetSellThroughDays,
    });
    combined.name = `Combined (${scenarioInput.markdownDiscountPercent}% MD + ${scenarioInput.donationPortionPercent}% Don)`;

    return [doNothing, markdownOnly, donateOnly, combined];
  }, [selectedItem, selectedForecast, scenarioInput]);

  // Comparison & best recommendation
  const comparison = useMemo(() => {
    if (scenarioResults.length === 0) return null;
    return compareScenarios(scenarioResults);
  }, [scenarioResults]);

  // Chart datasets
  const wasteComparisonChartData = useMemo(() => {
    return scenarioResults.map((s) => ({
      name: s.name.split(' (')[0],
      Waste: s.projectedWasteQuantity,
      Salvaged: s.projectedSalesQuantity + s.projectedDonationQuantity,
    }));
  }, [scenarioResults]);

  const marginComparisonChartData = useMemo(() => {
    return scenarioResults.map((s) => ({
      name: s.name.split(' (')[0],
      NetMargin: s.projectedNetMargin,
      Revenue: s.projectedRevenue,
      TotalCost: s.projectedCost,
    }));
  }, [scenarioResults]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.25 }}
      className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full space-y-8"
    >
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-ws-text">
          What-If <span className="text-gradient-primary">Scenario Simulator</span>
        </h1>
        <p className="text-ws-text-secondary mt-1 text-sm sm:text-base">
          Model dynamic discount depths, donation allocations, and demand elasticities before committing capital.
        </p>
      </div>

      {/* Product Selection & Inventory Baseline Card */}
      <div className="glass-card border border-ws-border rounded-2xl p-5 sm:p-6 space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex-1">
            <label className="block text-xs font-semibold text-ws-text-secondary uppercase tracking-wider mb-1.5">
              Select Product & Batch to Simulate
            </label>
            <select
              value={selectedProductId}
              onChange={(e) => setSelectedProductId(e.target.value)}
              className="w-full max-w-xl px-4 py-2.5 rounded-xl bg-ws-bg-elevated border border-ws-border text-ws-text text-sm focus:outline-none focus:border-ws-primary"
            >
              {inventory.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name} (Batch: {item.batchId}) — {item.quantity} {item.unit} in stock
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs px-3 py-1.5 rounded-lg bg-ws-bg-elevated text-ws-text-secondary border border-ws-border">
              Simulated estimates, not achieved outcomes
            </span>
          </div>
        </div>

        {/* Selected Product Stats Banner */}
        {selectedItem && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 pt-3 border-t border-ws-border/60 text-xs">
            <div className="bg-ws-bg-darkest/60 p-3 rounded-xl border border-ws-border/40">
              <span className="text-ws-text-muted">Current Stock</span>
              <div className="text-base font-bold text-ws-text mt-0.5">
                {selectedItem.quantity} {selectedItem.unit}
              </div>
            </div>
            <div className="bg-ws-bg-darkest/60 p-3 rounded-xl border border-ws-border/40">
              <span className="text-ws-text-muted">Selling Price</span>
              <div className="text-base font-bold text-ws-primary mt-0.5">
                {formatCurrency(selectedItem.sellingPrice, settings.currency)}
              </div>
            </div>
            <div className="bg-ws-bg-darkest/60 p-3 rounded-xl border border-ws-border/40">
              <span className="text-ws-text-muted">Unit Cost</span>
              <div className="text-base font-bold text-ws-text mt-0.5">
                {formatCurrency(selectedItem.costPerUnit, settings.currency)}
              </div>
            </div>
            <div className="bg-ws-bg-darkest/60 p-3 rounded-xl border border-ws-border/40">
              <span className="text-ws-text-muted">Days to Expiry</span>
              <div className="text-base font-bold text-ws-amber mt-0.5">
                {selectedForecast?.daysRemaining ?? 0} days
              </div>
            </div>
            <div className="bg-ws-bg-darkest/60 p-3 rounded-xl border border-ws-border/40">
              <span className="text-ws-text-muted">Forecast Demand</span>
              <div className="text-base font-bold text-ws-text mt-0.5">
                {selectedForecast?.forecastDemand ?? 0} {selectedItem.unit}
              </div>
            </div>
            <div className="bg-ws-bg-darkest/60 p-3 rounded-xl border border-ws-border/40">
              <span className="text-ws-text-muted">Expected Surplus</span>
              <div className="text-base font-bold text-ws-coral mt-0.5">
                {selectedForecast?.expectedSurplus ?? 0} {selectedItem.unit}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Scenario Controls (glass-card) */}
      <div className="glass-card border border-ws-border rounded-2xl p-5 sm:p-6 space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-ws-border/60">
          <div className="flex items-center gap-2">
            <Sliders className="w-5 h-5 text-ws-primary" />
            <h3 className="font-bold text-ws-text text-base">Simulation Parameters</h3>
          </div>
          <button
            type="button"
            onClick={handleResetScenario}
            className="text-xs text-ws-text-secondary hover:text-ws-primary flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-ws-bg-elevated hover:bg-ws-border transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Reset Scenario
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Discount Slider */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="font-semibold text-ws-text">Markdown Discount</span>
              <span className="text-ws-primary font-bold text-sm">
                {scenarioInput.markdownDiscountPercent}%
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={70}
              step={5}
              value={scenarioInput.markdownDiscountPercent}
              onChange={(e) =>
                setScenarioInput({
                  ...scenarioInput,
                  markdownDiscountPercent: Number(e.target.value),
                })
              }
              className="w-full accent-ws-primary cursor-pointer"
            />
            <div className="flex justify-between text-[11px] text-ws-text-muted">
              <span>0% (No discount)</span>
              <span>70% (Clearance)</span>
            </div>
          </div>

          {/* Donation Slider */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="font-semibold text-ws-text">Surplus Donation Share</span>
              <span className="text-ws-lime font-bold text-sm">
                {scenarioInput.donationPortionPercent}%
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              step={10}
              value={scenarioInput.donationPortionPercent}
              onChange={(e) =>
                setScenarioInput({
                  ...scenarioInput,
                  donationPortionPercent: Number(e.target.value),
                })
              }
              className="w-full accent-ws-lime cursor-pointer"
            />
            <div className="flex justify-between text-[11px] text-ws-text-muted">
              <span>0%</span>
              <span>100% (Full rescue)</span>
            </div>
          </div>

          {/* Price Elasticity */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="font-semibold text-ws-text">Price Elasticity (ε)</span>
              <span className="text-ws-amber font-bold text-sm">
                {scenarioInput.priceElasticity}
              </span>
            </div>
            <input
              type="number"
              step={0.1}
              min={0.5}
              max={2.5}
              value={scenarioInput.priceElasticity}
              onChange={(e) =>
                setScenarioInput({
                  ...scenarioInput,
                  priceElasticity: Number(e.target.value),
                })
              }
              className="w-full px-3 py-1.5 rounded-lg bg-ws-bg-elevated border border-ws-border text-ws-text text-sm focus:outline-none focus:border-ws-primary"
            />
            <span className="text-[11px] text-ws-text-muted block">
              Typical grocery range: 1.1 - 1.8
            </span>
          </div>

          {/* Target Sell-through Days */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="font-semibold text-ws-text">Sell-Through Window (Days)</span>
              <span className="text-ws-text font-bold text-sm">
                {scenarioInput.targetSellThroughDays}d
              </span>
            </div>
            <input
              type="number"
              min={1}
              max={selectedForecast?.daysRemaining || 14}
              value={scenarioInput.targetSellThroughDays}
              onChange={(e) =>
                setScenarioInput({
                  ...scenarioInput,
                  targetSellThroughDays: Number(e.target.value),
                })
              }
              className="w-full px-3 py-1.5 rounded-lg bg-ws-bg-elevated border border-ws-border text-ws-text text-sm focus:outline-none focus:border-ws-primary"
            />
            <span className="text-[11px] text-ws-text-muted block">
              Max available: {selectedForecast?.daysRemaining ?? 7} days
            </span>
          </div>
        </div>
      </div>

      {/* Optimal Scenario Recommendation Highlight */}
      {comparison && (
        <div className="glass-card border border-ws-primary/50 p-5 rounded-2xl bg-ws-primary/5 glow-primary flex items-start gap-4">
          <Sparkles className="w-6 h-6 text-ws-primary shrink-0 mt-0.5" />
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-ws-primary">
                AI Optimization Recommendation
              </span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-ws-primary/20 text-ws-primary font-bold">
                {comparison.best.name}
              </span>
            </div>
            <p className="text-sm text-ws-text-secondary leading-relaxed">
              {comparison.explanation}
            </p>
          </div>
        </div>
      )}

      {/* 4 Scenario Cards Comparison View */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {scenarioResults.map((scenario) => {
          const isBest = comparison?.best.id === scenario.id;

          return (
            <div
              key={scenario.id}
              className={`rounded-2xl border p-5 flex flex-col justify-between transition-all ${
                isBest
                  ? 'border-ws-primary ring-2 ring-ws-primary/60 bg-ws-bg-card-hover shadow-xl glow-primary'
                  : 'border-ws-border bg-ws-bg-card'
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <h4 className="font-bold text-ws-text text-sm">{scenario.name}</h4>
                  {isBest && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-ws-primary text-ws-bg-darkest flex items-center gap-0.5">
                      BEST
                    </span>
                  )}
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex justify-between py-1 border-b border-ws-border/40">
                    <span className="text-ws-text-muted">Units Sold:</span>
                    <span className="font-semibold text-ws-text">
                      {formatNumber(scenario.projectedSalesQuantity)}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-ws-border/40">
                    <span className="text-ws-text-muted">Donated:</span>
                    <span className="font-semibold text-ws-lime">
                      {formatNumber(scenario.projectedDonationQuantity)}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-ws-border/40">
                    <span className="text-ws-text-muted">Waste Left:</span>
                    <span
                      className={`font-semibold ${
                        scenario.projectedWasteQuantity > 0 ? 'text-ws-coral' : 'text-ws-lime'
                      }`}
                    >
                      {formatNumber(scenario.projectedWasteQuantity)}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-ws-border/40">
                    <span className="text-ws-text-muted">Projected Revenue:</span>
                    <span className="font-semibold text-ws-text">
                      {formatCurrency(scenario.projectedRevenue, settings.currency)}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-ws-border/40">
                    <span className="text-ws-text-muted">Projected Net Margin:</span>
                    <span
                      className={`font-bold ${
                        scenario.projectedNetMargin >= 0 ? 'text-ws-primary' : 'text-ws-coral'
                      }`}
                    >
                      {formatCurrency(scenario.projectedNetMargin, settings.currency)}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-ws-border/40">
                    <span className="text-ws-text-muted">Waste Reduction Rate:</span>
                    <span className="font-bold text-ws-lime">
                      {scenario.wasteReductionRate}%
                    </span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-ws-text-muted">Feasibility Score:</span>
                    <span className="font-semibold text-ws-text">
                      {scenario.feasibilityScore}/100
                    </span>
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div className="mt-4 pt-3 border-t border-ws-border/40 text-[11px] text-ws-text-muted space-y-1">
                {scenario.notes.slice(0, 2).map((note, idx) => (
                  <p key={idx} className="line-clamp-2">
                    • {note}
                  </p>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Visual Analytics Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Projected Waste across Scenarios */}
        <div className="glass-card border border-ws-border rounded-2xl p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-ws-text text-sm sm:text-base flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-ws-coral" />
              Projected Waste & Salvage Volume (Units)
            </h4>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={wasteComparisonChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#D4DFCE" />
                <XAxis dataKey="name" stroke="#58645A" fontSize={11} />
                <YAxis stroke="#58645A" fontSize={11} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#FFFDF8',
                    borderColor: '#D4DFCE',
                    borderRadius: '12px',
                    fontSize: '12px',
                    color: '#17231B',
                    boxShadow: '0 4px 12px rgba(23, 61, 42, 0.06)',
                  }}
                />
                <Legend />
                <Bar dataKey="Waste" fill="#C54A43" name="Spoiled / Disposed" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Salvaged" fill="#245B38" name="Diverted / Sold" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Projected Net Margin and Revenue */}
        <div className="glass-card border border-ws-border rounded-2xl p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-ws-text text-sm sm:text-base flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-ws-primary" />
              Financial Return Comparison ({settings.currency})
            </h4>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={marginComparisonChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#D4DFCE" />
                <XAxis dataKey="name" stroke="#58645A" fontSize={11} />
                <YAxis stroke="#58645A" fontSize={11} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#FFFDF8',
                    borderColor: '#D4DFCE',
                    borderRadius: '12px',
                    fontSize: '12px',
                    color: '#17231B',
                    boxShadow: '0 4px 12px rgba(23, 61, 42, 0.06)',
                  }}
                  formatter={(val: any) => formatCurrency(Number(val), settings.currency)}
                />
                <Legend />
                <Bar dataKey="Revenue" fill="#D89A3D" name="Gross Revenue" radius={[4, 4, 0, 0]} />
                <Bar dataKey="NetMargin" fill="#245B38" name="Projected Net Margin" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

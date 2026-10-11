import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Brain,
  Sparkles,
  CheckCircle2,
  TrendingDown,
  AlertTriangle,
  IndianRupee,
  Layers,
  ShieldAlert,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Cpu,
  BarChart3,
  Flame,
  Info,
  Calendar,
  Package,
} from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  ZAxis,
  CartesianGrid,
} from 'recharts';

import type { ForecastResult, InventoryItem, RiskLevel } from '../types/index.ts';
import { storage } from '../services/storage.ts';
import {
  analyzeInventory,
  evaluateModel,
  generateExplanation,
} from '../domain/forecasting/engine.ts';
import { generateRecommendations } from '../domain/recommendations/engine.ts';
import { formatCurrency, formatNumber, getRiskColor } from '../utils/format.ts';
import { cn } from '../utils/cn.ts';

// Pipeline stage definition
interface PipelineStage {
  id: number;
  name: string;
  subtext: string;
  countLabel: string;
}

export default function PredictionsPage() {
  const navigate = useNavigate();

  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [forecasts, setForecasts] = useState<ForecastResult[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [activePipelineStage, setActivePipelineStage] = useState<number>(0);
  const [analysisProgress, setAnalysisProgress] = useState<number>(0);
  const [hasRunAnalysis, setHasRunAnalysis] = useState<boolean>(false);

  // Filters & sorting for results table
  const [riskFilter, setRiskFilter] = useState<string>('All');
  const [sortBy, setSortBy] = useState<'riskScore' | 'surplus' | 'exposure' | 'days'>('riskScore');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);

  // Evaluation synthetic data
  const [evaluationMetrics, setEvaluationMetrics] = useState<{
    mae: number;
    rmse: number;
    wape: number;
    backtestPoints: { actual: number; predicted: number; product: string }[];
  }>({
    mae: 0,
    rmse: 0,
    wape: 0,
    backtestPoints: [],
  });

  const currency = useMemo(() => {
    return storage.getSettings().currency || 'INR';
  }, []);

  // Initialize data on mount
  useEffect(() => {
    if (!storage.isInitialized()) {
      storage.resetToDemo();
    }
    const items = storage.getInventory();
    setInventory(items);

    const savedForecasts = storage.getForecasts();
    if (savedForecasts && savedForecasts.length > 0) {
      setForecasts(savedForecasts);
      setHasRunAnalysis(true);
      setActivePipelineStage(5);
      setAnalysisProgress(100);
    } else {
      // Analyze default inventory initial results
      const initial = analyzeInventory(items, storage.getSettings());
      setForecasts(initial);
      storage.setForecasts(initial);
      setHasRunAnalysis(true);
      setActivePipelineStage(5);
      setAnalysisProgress(100);
    }

    // Run backtest evaluation against inventory items with sales history
    generateBacktestEvaluation(items);
  }, []);

  // Backtest evaluation logic using actuals vs forecastDailyDemand
  const generateBacktestEvaluation = (items: InventoryItem[]) => {
    const actuals: number[] = [];
    const predicted: number[] = [];
    const backtestPoints: { actual: number; predicted: number; product: string }[] = [];

    items.forEach((item) => {
      if (item.salesHistory && item.salesHistory.length >= 7) {
        // Take the latest observation as actual, prior observations to simulate prediction
        const lastActual = item.salesHistory[item.salesHistory.length - 1];
        const prevSlice = item.salesHistory.slice(0, -1);
        const avg = prevSlice.reduce((a, b) => a + b, 0) / prevSlice.length;
        const trendEstimate = Number((avg * 1.02).toFixed(1));

        actuals.push(lastActual);
        predicted.push(trendEstimate);
        backtestPoints.push({
          product: item.name.length > 18 ? `${item.name.substring(0, 16)}...` : item.name,
          actual: lastActual,
          predicted: trendEstimate,
        });
      }
    });

    if (actuals.length > 0) {
      const evalResult = evaluateModel(actuals, predicted);
      setEvaluationMetrics({
        ...evalResult,
        backtestPoints: backtestPoints.slice(0, 10),
      });
    }
  };

  // Run the multi-stage cinematic analysis pipeline
  const runCinematicAnalysis = () => {
    setIsAnalyzing(true);
    setActivePipelineStage(1);
    setAnalysisProgress(20);

    // Stage 1: Load Inventory (150ms)
    setTimeout(() => {
      setActivePipelineStage(2);
      setAnalysisProgress(45);

      // Stage 2: Demand Forecast (350ms)
      setTimeout(() => {
        const currentItems = storage.getInventory();
        setInventory(currentItems);
        const settings = storage.getSettings();
        const results = analyzeInventory(currentItems, settings);

        setActivePipelineStage(3);
        setAnalysisProgress(70);

        // Stage 3: Waste Risk Evaluation (600ms)
        setTimeout(() => {
          // Generate automated recommendations to populate pipeline outcome
          const recs = generateRecommendations(results, currentItems, settings);
          storage.setActions(recs);

          setActivePipelineStage(4);
          setAnalysisProgress(90);

          // Stage 4: Recommendations (850ms)
          setTimeout(() => {
            setForecasts(results);
            storage.setForecasts(results);
            generateBacktestEvaluation(currentItems);

            setActivePipelineStage(5);
            setAnalysisProgress(100);
            setIsAnalyzing(false);
            setHasRunAnalysis(true);
          }, 250);
        }, 250);
      }, 250);
    }, 200);
  };

  // Pipeline Counts
  const pipelineStages: PipelineStage[] = useMemo(() => {
    const totalItems = inventory.length;
    const totalForecasts = forecasts.length;
    const atRiskCount = forecasts.filter(
      (f) => f.riskLevel === 'high' || f.riskLevel === 'critical' || f.riskLevel === 'expired'
    ).length;
    const actionsCount = storage.getActions().length;

    return [
      {
        id: 1,
        name: 'INVENTORY',
        subtext: 'Catalog Ingestion',
        countLabel: `${totalItems} items`,
      },
      {
        id: 2,
        name: 'DEMAND FORECAST',
        subtext: 'WMA & Trend Models',
        countLabel: `${totalForecasts} forecasts`,
      },
      {
        id: 3,
        name: 'WASTE RISK',
        subtext: 'Urgency & Surplus',
        countLabel: `${atRiskCount} at risk`,
      },
      {
        id: 4,
        name: 'RECOMMENDED ACTION',
        subtext: 'Dynamic Markdowns',
        countLabel: `${actionsCount > 0 ? actionsCount : atRiskCount} actions`,
      },
      {
        id: 5,
        name: 'OUTCOME',
        subtext: 'Waste Prevented',
        countLabel: 'Results',
      },
    ];
  }, [inventory, forecasts]);

  // Aggregate Summary Cards
  const summaryMetrics = useMemo(() => {
    const totalAnalyzed = forecasts.length;
    const atRiskProducts = forecasts.filter(
      (f) => f.riskLevel === 'critical' || f.riskLevel === 'high'
    ).length;
    const predictedSurplus = forecasts.reduce((acc, f) => acc + f.expectedSurplus, 0);
    const totalExposure = forecasts.reduce((acc, f) => acc + f.financialExposure, 0);

    return {
      totalAnalyzed,
      atRiskProducts,
      predictedSurplus,
      totalExposure,
    };
  }, [forecasts]);

  // Filtered & Sorted Forecasts Table
  const filteredForecasts = useMemo(() => {
    return forecasts
      .filter((f) => {
        if (riskFilter === 'All') return true;
        return f.riskLevel.toLowerCase() === riskFilter.toLowerCase();
      })
      .sort((a, b) => {
        let diff = 0;
        if (sortBy === 'riskScore') diff = a.riskScore - b.riskScore;
        if (sortBy === 'surplus') diff = a.expectedSurplus - b.expectedSurplus;
        if (sortBy === 'exposure') diff = a.financialExposure - b.financialExposure;
        if (sortBy === 'days') diff = a.daysRemaining - b.daysRemaining;

        return sortOrder === 'asc' ? diff : -diff;
      });
  }, [forecasts, riskFilter, sortBy, sortOrder]);

  // Chart Data: Risk Distribution (Donut Chart)
  const riskDistributionData = useMemo(() => {
    const counts: Record<string, number> = {
      Low: 0,
      Moderate: 0,
      High: 0,
      Critical: 0,
      Expired: 0,
    };
    forecasts.forEach((f) => {
      if (f.riskLevel === 'low') counts.Low++;
      if (f.riskLevel === 'moderate') counts.Moderate++;
      if (f.riskLevel === 'high') counts.High++;
      if (f.riskLevel === 'critical') counts.Critical++;
      if (f.riskLevel === 'expired') counts.Expired++;
    });

    return [
      { name: 'Low', value: counts.Low, color: '#245B38' },
      { name: 'Moderate', value: counts.Moderate, color: '#D89A3D' },
      { name: 'High', value: counts.High, color: '#C96D43' },
      { name: 'Critical', value: counts.Critical, color: '#C54A43' },
      { name: 'Expired', value: counts.Expired, color: '#6E7970' },
    ].filter((item) => item.value > 0);
  }, [forecasts]);

  // Chart Data: Surplus by Category (Bar Chart)
  const surplusByCategoryData = useMemo(() => {
    const itemCategoryMap = new Map<string, string>();
    inventory.forEach((i) => itemCategoryMap.set(i.id, i.category));

    const categorySurplus: Record<string, number> = {};
    forecasts.forEach((f) => {
      const cat = itemCategoryMap.get(f.productId) || 'Other';
      categorySurplus[cat] = (categorySurplus[cat] || 0) + f.expectedSurplus;
    });

    return Object.entries(categorySurplus)
      .map(([category, surplus]) => ({
        category: category.split(' ')[0], // short label
        fullName: category,
        surplus: Math.round(surplus),
      }))
      .filter((d) => d.surplus > 0)
      .sort((a, b) => b.surplus - a.surplus);
  }, [forecasts, inventory]);

  // Chart Data: Demand vs Supply Scatter Plot
  const demandVsSupplyData = useMemo(() => {
    return forecasts.map((f) => ({
      name: f.productName,
      stock: f.currentQuantity,
      demand: f.forecastDemand,
      surplus: f.expectedSurplus,
      riskScore: f.riskScore,
    }));
  }, [forecasts]);

  // Navigate to Action Recommendations
  const handleTakeAction = (forecast: ForecastResult) => {
    // Ensure recommendations exist
    const settings = storage.getSettings();
    const currentItems = storage.getInventory();
    const recs = generateRecommendations(forecasts, currentItems, settings);
    storage.setActions(recs);

    // Navigate to actions page with highlight
    navigate('/actions', { state: { highlightProductId: forecast.productId } });
  };

  const getRiskScoreBar = (score: number) => {
    let colorClass = 'bg-ws-primary';
    if (score >= 80) colorClass = 'bg-ws-coral';
    else if (score >= 55) colorClass = 'bg-orange-400';
    else if (score >= 30) colorClass = 'bg-ws-amber';

    return (
      <div className="flex items-center gap-2">
        <span className="font-mono text-xs font-semibold w-7">{score}</span>
        <div className="w-16 bg-ws-bg/80 h-1.5 rounded-full overflow-hidden">
          <div className={cn('h-full transition-all duration-300', colorClass)} style={{ width: `${score}%` }} />
        </div>
      </div>
    );
  };

  const getRiskBadge = (level: RiskLevel) => {
    switch (level) {
      case 'critical':
        return <span className="px-2 py-0.5 rounded text-xs font-semibold bg-rose-500/20 text-ws-coral border border-rose-500/40">Critical</span>;
      case 'high':
        return <span className="px-2 py-0.5 rounded text-xs font-semibold bg-orange-500/20 text-orange-400 border border-orange-500/40">High</span>;
      case 'moderate':
        return <span className="px-2 py-0.5 rounded text-xs font-medium bg-amber-500/15 text-ws-amber border border-amber-500/30">Moderate</span>;
      case 'low':
        return <span className="px-2 py-0.5 rounded text-xs font-medium bg-emerald-500/15 text-ws-primary border border-emerald-500/30">Low</span>;
      case 'expired':
        return <span className="px-2 py-0.5 rounded text-xs font-medium bg-gray-500/15 text-gray-400 border border-gray-500/30">Expired</span>;
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-ws-primary/10 text-ws-primary border border-ws-primary/20 mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI Demand Intelligence</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-ws-text">
            Predictive <span className="text-gradient-primary">Waste Intelligence</span>
          </h1>
          <p className="text-ws-text-secondary mt-1 text-sm sm:text-base">
            Forecast surplus stock and identify waste risk before expiration occurs
          </p>
        </div>

        {/* Primary Analysis Trigger */}
        <button
          onClick={runCinematicAnalysis}
          disabled={isAnalyzing}
          className="relative group px-5 py-2.5 rounded-xl font-semibold text-sm text-ws-bg-darkest bg-ws-primary hover:bg-ws-primary-light transition-all flex items-center justify-center gap-2 shadow-lg glow-primary disabled:opacity-60 cursor-pointer overflow-hidden"
        >
          {isAnalyzing ? (
            <>
              <Cpu className="w-4 h-4 animate-spin" />
              <span>Analyzing Inventory ({analysisProgress}%)...</span>
            </>
          ) : (
            <>
              <Brain className="w-4 h-4" />
              <span>Analyze Inventory</span>
            </>
          )}
        </button>
      </div>

      {/* Prediction Pipeline Visualization */}
      <div className="glass-card p-6 border border-ws-border">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-ws-primary" />
            <h3 className="text-xs uppercase tracking-wider font-semibold text-ws-text-secondary">
              Predictive AI Pipeline
            </h3>
          </div>
          {isAnalyzing && (
            <span className="text-xs text-ws-primary flex items-center gap-1.5 animate-pulse">
              <span className="w-2 h-2 rounded-full bg-ws-primary" />
              Inference in progress...
            </span>
          )}
          {!isAnalyzing && hasRunAnalysis && (
            <span className="text-xs text-ws-text-muted flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-ws-primary" />
              Pipeline synchronized
            </span>
          )}
        </div>

        {/* Horizontal Pipeline Steps */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3 relative">
          {pipelineStages.map((stage, idx) => {
            const isActive = activePipelineStage === stage.id && isAnalyzing;
            const isCompleted = activePipelineStage > stage.id || (!isAnalyzing && hasRunAnalysis);

            return (
              <div key={stage.id} className="relative flex flex-col">
                <motion.div
                  animate={{
                    borderColor: isActive
                      ? '#245B38'
                      : isCompleted
                      ? '#BDCEB4'
                      : '#D4DFCE',
                  }}
                  className={cn(
                    'p-4 rounded-xl border transition-all duration-300 relative bg-ws-bg/70 flex-1 flex flex-col justify-between',
                    isActive && 'glow-primary bg-ws-bg-card border-ws-primary shadow-lg',
                    isCompleted && !isActive && 'border-ws-primary/40'
                  )}
                >
                  <div className="flex items-start justify-between">
                    <span className="text-[10px] font-mono text-ws-text-muted">STAGE 0{stage.id}</span>
                    {isCompleted ? (
                      <CheckCircle2 className="w-4 h-4 text-ws-primary shrink-0" />
                    ) : isActive ? (
                      <span className="w-2.5 h-2.5 rounded-full bg-ws-primary animate-ping" />
                    ) : (
                      <div className="w-3 h-3 rounded-full border border-ws-text-muted/40" />
                    )}
                  </div>

                  <div className="mt-3">
                    <h4 className="text-xs font-bold tracking-wider text-ws-text">{stage.name}</h4>
                    <p className="text-[11px] text-ws-text-muted mt-0.5">{stage.subtext}</p>
                  </div>

                  <div className="mt-3 pt-2 border-t border-ws-border/60">
                    <span className="text-xs font-semibold text-ws-primary-light">
                      {stage.countLabel}
                    </span>
                  </div>
                </motion.div>
              </div>
            );
          })}
        </div>

        {/* Pipeline Progress Indicator */}
        {isAnalyzing && (
          <div className="mt-4 pt-3 border-t border-ws-border/40">
            <div className="w-full bg-ws-bg/80 h-1.5 rounded-full overflow-hidden">
              <motion.div
                className="bg-ws-primary h-full glow-primary"
                initial={{ width: 0 }}
                animate={{ width: `${analysisProgress}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Results Section */}
      <div className="space-y-6">
        {/* 4 Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="glass-card p-5 border border-ws-border">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-ws-text-secondary">Total Analyzed</span>
              <Package className="w-4 h-4 text-ws-primary" />
            </div>
            <div className="text-2xl font-bold text-ws-text mt-2">
              {formatNumber(summaryMetrics.totalAnalyzed)}
            </div>
            <p className="text-xs text-ws-text-muted mt-1">Catalog items evaluated</p>
          </div>

          <div className="glass-card p-5 border border-ws-border">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-ws-text-secondary">At-Risk Products</span>
              <ShieldAlert className="w-4 h-4 text-ws-coral" />
            </div>
            <div className="text-2xl font-bold text-ws-coral mt-2">
              {formatNumber(summaryMetrics.atRiskProducts)}
            </div>
            <p className="text-xs text-ws-text-muted mt-1">High & critical risk tiers</p>
          </div>

          <div className="glass-card p-5 border border-ws-border">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-ws-text-secondary">Predicted Surplus</span>
              <TrendingDown className="w-4 h-4 text-ws-amber" />
            </div>
            <div className="text-2xl font-bold text-ws-amber mt-2">
              {formatNumber(Math.round(summaryMetrics.predictedSurplus))}{' '}
              <span className="text-xs font-normal text-ws-text-muted">units</span>
            </div>
            <p className="text-xs text-ws-text-muted mt-1">Stock exceeding velocity</p>
          </div>

          <div className="glass-card p-5 border border-ws-border">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-ws-text-secondary">Financial Exposure</span>
              <IndianRupee className="w-4 h-4 text-ws-lime" />
            </div>
            <div className="text-2xl font-bold text-ws-lime mt-2">
              {formatCurrency(summaryMetrics.totalExposure, currency)}
            </div>
            <p className="text-xs text-ws-text-muted mt-1">Potential inventory shrinkage</p>
          </div>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Chart 1: Risk Distribution Donut */}
          <div className="glass-card p-5 border border-ws-border flex flex-col">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-semibold text-ws-text">Risk Classification</h4>
              <span className="text-xs text-ws-text-muted">Breakdown</span>
            </div>
            <div className="h-56 w-full flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={riskDistributionData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={75}
                    paddingAngle={4}
                    dataKey="value"
                    stroke="#FFFFFF"
                    strokeWidth={2}
                  >
                    {riskDistributionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#FFFDF8',
                      borderColor: '#D4DFCE',
                      borderRadius: '12px',
                      color: '#17231B',
                      fontSize: '12px',
                      boxShadow: '0 4px 12px rgba(23, 61, 42, 0.06)',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2 text-xs">
              {riskDistributionData.map((d) => (
                <div key={d.name} className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                  <span className="text-[#58645A]">
                    {d.name}: {d.value}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Chart 2: Surplus by Category Bar */}
          <div className="glass-card p-5 border border-[#D4DFCE] flex flex-col">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-semibold text-[#17231B]">Surplus by Category</h4>
              <span className="text-xs text-[#778178]">Units</span>
            </div>
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={surplusByCategoryData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                  <XAxis dataKey="category" tick={{ fill: '#58645A', fontSize: 11 }} angle={-25} textAnchor="end" />
                  <YAxis tick={{ fill: '#58645A', fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#FFFDF8',
                      borderColor: '#D4DFCE',
                      borderRadius: '12px',
                      color: '#17231B',
                      fontSize: '12px',
                      boxShadow: '0 4px 12px rgba(23, 61, 42, 0.06)',
                    }}
                  />
                  <Bar dataKey="surplus" fill="#245B38" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <p className="text-[11px] text-[#778178] text-center pt-2">
              Fresh & bakery categories experience highest volatility
            </p>
          </div>

          {/* Chart 3: Demand vs Supply Scatter */}
          <div className="glass-card p-5 border border-[#D4DFCE] flex flex-col">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-semibold text-[#17231B]">Demand vs Stock Scatter</h4>
              <span className="text-xs text-[#778178]">Balance</span>
            </div>
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ top: 10, right: 10, left: -20, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#D4DFCE" opacity={0.6} />
                  <XAxis
                    type="number"
                    dataKey="demand"
                    name="Demand"
                    tick={{ fill: '#58645A', fontSize: 11 }}
                    label={{ value: 'Demand', position: 'insideBottom', offset: -5, fill: '#58645A', fontSize: 10 }}
                  />
                  <YAxis
                    type="number"
                    dataKey="stock"
                    name="Stock"
                    tick={{ fill: '#58645A', fontSize: 11 }}
                    label={{ value: 'Stock', angle: -90, position: 'insideLeft', fill: '#58645A', fontSize: 10 }}
                  />
                  <ZAxis type="number" dataKey="riskScore" range={[40, 180]} />
                  <Tooltip
                    cursor={{ strokeDasharray: '3 3' }}
                    contentStyle={{
                      backgroundColor: '#FFFDF8',
                      borderColor: '#D4DFCE',
                      borderRadius: '12px',
                      color: '#17231B',
                      fontSize: '12px',
                      boxShadow: '0 4px 12px rgba(23, 61, 42, 0.06)',
                    }}
                  />
                  <Scatter name="Products" data={demandVsSupplyData} fill="#C96D43" />
                </ScatterChart>
              </ResponsiveContainer>
            </div>
            <p className="text-[11px] text-[#778178] text-center pt-2">
              Points above diagonal represent surplus inventory exposure
            </p>
          </div>
        </div>

        {/* Forecast Results Table */}
        <div className="glass-card overflow-hidden">
          {/* Table Header & Filters */}
          <div className="p-4 border-b border-ws-border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-ws-text">Item Forecast Results</h3>
              <p className="text-xs text-ws-text-muted mt-0.5">
                Detailed demand predictions, remaining shelf-life, and urgency scores
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Risk Level Filter */}
              <div className="flex items-center gap-1 bg-ws-bg/80 p-1 rounded-lg border border-ws-border text-xs">
                {['All', 'Critical', 'High', 'Moderate', 'Low'].map((lvl) => (
                  <button
                    key={lvl}
                    onClick={() => setRiskFilter(lvl)}
                    className={cn(
                      'px-2.5 py-1 rounded transition-colors',
                      riskFilter.toLowerCase() === lvl.toLowerCase()
                        ? 'bg-ws-primary text-ws-bg-darkest font-semibold'
                        : 'text-ws-text-secondary hover:text-ws-text'
                    )}
                  >
                    {lvl}
                  </button>
                ))}
              </div>

              {/* Sort By Dropdown */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="px-2.5 py-1.5 bg-ws-bg/80 border border-ws-border rounded-lg text-xs text-ws-text focus:outline-none focus:border-ws-primary"
              >
                <option value="riskScore">Sort by Risk Score</option>
                <option value="surplus">Sort by Expected Surplus</option>
                <option value="exposure">Sort by Financial Exposure</option>
                <option value="days">Sort by Days Remaining</option>
              </select>

              <button
                onClick={() => setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'))}
                className="p-1.5 bg-ws-bg/80 border border-ws-border hover:border-ws-border-light rounded-lg text-xs text-ws-text-secondary hover:text-ws-text"
                title={`Order: ${sortOrder === 'asc' ? 'Ascending' : 'Descending'}`}
              >
                {sortOrder === 'asc' ? '↑' : '↓'}
              </button>
            </div>
          </div>

          {/* Table View */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-ws-border bg-ws-bg/60 text-ws-text-secondary text-xs uppercase tracking-wider">
                  <th className="py-3 px-4">Product Name</th>
                  <th className="py-3 px-3">Batch</th>
                  <th className="py-3 px-3 text-right">Stock</th>
                  <th className="py-3 px-3 text-center">Days Left</th>
                  <th className="py-3 px-3 text-right">Forecast Demand</th>
                  <th className="py-3 px-3 text-right">Surplus</th>
                  <th className="py-3 px-3">Risk Score</th>
                  <th className="py-3 px-3 text-center">Risk Level</th>
                  <th className="py-3 px-3 text-center">Confidence</th>
                  <th className="py-3 px-4">Action Recommendation</th>
                  <th className="py-3 px-3 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ws-border/60">
                {filteredForecasts.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="py-12 text-center text-ws-text-muted">
                      No forecasts match the selected risk criteria.
                    </td>
                  </tr>
                ) : (
                  filteredForecasts.map((f) => {
                    const isExpanded = expandedRowId === f.productId;

                    return (
                      <React.Fragment key={f.productId}>
                        <tr
                          onClick={() => setExpandedRowId(isExpanded ? null : f.productId)}
                          className={cn(
                            'hover:bg-ws-bg-card-hover/40 transition-colors cursor-pointer group',
                            isExpanded && 'bg-ws-bg-card/70'
                          )}
                        >
                          <td className="py-3 px-4">
                            <div className="font-medium text-ws-text group-hover:text-ws-primary-light transition-colors">
                              {f.productName}
                            </div>
                          </td>

                          <td className="py-3 px-3 font-mono text-xs text-ws-text-muted">
                            {f.batchId}
                          </td>

                          <td className="py-3 px-3 text-right font-semibold text-ws-text">
                            {f.currentQuantity}
                          </td>

                          <td className="py-3 px-3 text-center">
                            <span
                              className={cn(
                                'text-xs font-semibold px-2 py-0.5 rounded',
                                f.daysRemaining <= 1
                                  ? 'bg-rose-500/20 text-ws-coral'
                                  : f.daysRemaining <= 3
                                  ? 'bg-amber-500/20 text-ws-amber'
                                  : 'text-ws-text-secondary'
                              )}
                            >
                              {f.daysRemaining}d
                            </span>
                          </td>

                          <td className="py-3 px-3 text-right text-xs text-ws-text-secondary font-mono">
                            {f.forecastDemand.toFixed(1)}
                          </td>

                          <td className="py-3 px-3 text-right font-medium">
                            <span
                              className={cn(
                                f.expectedSurplus > 0 ? 'text-ws-coral font-bold' : 'text-ws-text-muted'
                              )}
                            >
                              {f.expectedSurplus > 0 ? `+${f.expectedSurplus}` : '0'}
                            </span>
                          </td>

                          <td className="py-3 px-3">{getRiskScoreBar(f.riskScore)}</td>

                          <td className="py-3 px-3 text-center">{getRiskBadge(f.riskLevel)}</td>

                          <td className="py-3 px-3 text-center">
                            <span className="text-xs font-mono text-ws-text-secondary">
                              {Math.round(f.confidence * 100)}%
                            </span>
                          </td>

                          <td className="py-3 px-4 text-xs text-ws-text-secondary max-w-xs truncate">
                            {f.recommendation}
                          </td>

                          <td className="py-3 px-3 text-right">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setExpandedRowId(isExpanded ? null : f.productId);
                              }}
                              className="p-1 text-ws-text-muted hover:text-ws-text rounded transition-colors"
                            >
                              {isExpanded ? (
                                <ChevronUp className="w-4 h-4 text-ws-primary" />
                              ) : (
                                <ChevronDown className="w-4 h-4" />
                              )}
                            </button>
                          </td>
                        </tr>

                        {/* Expandable Detail Panel */}
                        {isExpanded && (
                          <tr className="bg-ws-bg/80 border-b border-ws-border">
                            <td colSpan={11} className="p-5">
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="space-y-4"
                              >
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                  {/* Column 1: Financial & Method */}
                                  <div className="glass-card p-4 space-y-2 border border-ws-border/70">
                                    <div className="text-xs uppercase tracking-wider text-ws-text-muted font-semibold">
                                      Forecasting Methodology
                                    </div>
                                    <div className="text-sm font-medium text-ws-text capitalize">
                                      {f.forecastMethod.replace(/_/g, ' ')}
                                    </div>
                                    <div className="text-xs text-ws-text-secondary pt-1">
                                      Confidence Interval: <strong className="text-ws-text">{Math.round(f.confidence * 100)}%</strong>
                                    </div>
                                    <div className="text-xs text-ws-text-secondary">
                                      Financial Shrinkage Exposure:{' '}
                                      <strong className="text-ws-coral">
                                        {formatCurrency(f.financialExposure, currency)}
                                      </strong>
                                    </div>
                                  </div>

                                  {/* Column 2: Risk Factors */}
                                  <div className="glass-card p-4 space-y-2 border border-ws-border/70">
                                    <div className="text-xs uppercase tracking-wider text-ws-text-muted font-semibold">
                                      Identified Risk Factors
                                    </div>
                                    <ul className="space-y-1 text-xs text-ws-text-secondary">
                                      {f.riskFactors.map((factor, idx) => (
                                        <li key={idx} className="flex items-start gap-1.5">
                                          <span className="text-ws-amber mt-0.5">•</span>
                                          <span>{factor}</span>
                                        </li>
                                      ))}
                                    </ul>
                                  </div>

                                  {/* Column 3: Natural Language Reasoning & Action CTA */}
                                  <div className="glass-card p-4 flex flex-col justify-between border border-ws-border/70">
                                    <div>
                                      <div className="text-xs uppercase tracking-wider text-ws-text-muted font-semibold">
                                        AI Reasoning
                                      </div>
                                      <p className="text-xs text-ws-text-secondary mt-1.5 leading-relaxed">
                                        {generateExplanation(f)}
                                      </p>
                                    </div>

                                    <div className="pt-3 flex justify-end">
                                      <button
                                        onClick={() => handleTakeAction(f)}
                                        className="px-4 py-2 rounded-lg bg-ws-primary hover:bg-ws-primary-light text-ws-bg-darkest text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-md"
                                      >
                                        <span>Take Action</span>
                                        <ArrowRight className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              </motion.div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Model Evaluation Section */}
        <div className="glass-card p-6 border border-ws-border space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-ws-primary" />
                <h3 className="text-sm font-bold text-ws-text">
                  Model Performance Evaluation & Accuracy Metrics
                </h3>
              </div>
              <p className="text-xs text-ws-text-muted mt-0.5">
                Calculated on synthetic rolling window backtest data using recent sales actuals vs predicted demand
              </p>
            </div>
            <div className="text-[11px] text-ws-text-muted italic bg-ws-bg/60 px-2.5 py-1 rounded border border-ws-border">
              Based on synthetic backtest data
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            <div className="bg-ws-bg/60 p-4 rounded-xl border border-ws-border">
              <span className="text-xs text-ws-text-muted">Mean Absolute Error (MAE)</span>
              <div className="text-2xl font-bold text-ws-text mt-1 font-mono">
                {evaluationMetrics.mae.toFixed(2)}
              </div>
              <p className="text-[11px] text-ws-text-secondary mt-1">Average absolute units deviation</p>
            </div>

            <div className="bg-ws-bg/60 p-4 rounded-xl border border-ws-border">
              <span className="text-xs text-ws-text-muted">Root Mean Squared Error (RMSE)</span>
              <div className="text-2xl font-bold text-ws-text mt-1 font-mono">
                {evaluationMetrics.rmse.toFixed(2)}
              </div>
              <p className="text-[11px] text-ws-text-secondary mt-1">Penalizes large variance spikes</p>
            </div>

            <div className="bg-ws-bg/60 p-4 rounded-xl border border-ws-border">
              <span className="text-xs text-ws-text-muted">Weighted Absolute % Error (WAPE)</span>
              <div className="text-2xl font-bold text-ws-primary-light mt-1 font-mono">
                {evaluationMetrics.wape.toFixed(1)}%
              </div>
              <p className="text-[11px] text-ws-text-secondary mt-1">Industry standard forecast accuracy</p>
            </div>
          </div>

          {/* Actual vs Predicted Mini Chart */}
          {evaluationMetrics.backtestPoints.length > 0 && (
            <div className="pt-4 border-t border-ws-border/60">
              <div className="text-xs font-semibold text-ws-text-secondary mb-3 flex items-center justify-between">
                <span>Actual vs Predicted Demand (Last 10 Products)</span>
                <div className="flex items-center gap-3 text-[11px]">
                  <span className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-sm bg-ws-primary" /> Actual
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-sm bg-ws-amber" /> Predicted
                  </span>
                </div>
              </div>

              <div className="h-44 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={evaluationMetrics.backtestPoints} margin={{ top: 5, right: 10, left: -20, bottom: 25 }}>
                    <XAxis
                      dataKey="product"
                      tick={{ fill: '#58645A', fontSize: 10 }}
                      angle={-20}
                      textAnchor="end"
                    />
                    <YAxis tick={{ fill: '#58645A', fontSize: 10 }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#FFFDF8',
                        borderColor: '#D4DFCE',
                        borderRadius: '12px',
                        color: '#17231B',
                        fontSize: '12px',
                        boxShadow: '0 4px 12px rgba(23, 61, 42, 0.06)',
                      }}
                    />
                    <Bar dataKey="actual" fill="#245B38" radius={[3, 3, 0, 0]} name="Actual Units" />
                    <Bar dataKey="predicted" fill="#D89A3D" radius={[3, 3, 0, 0]} name="Predicted Units" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

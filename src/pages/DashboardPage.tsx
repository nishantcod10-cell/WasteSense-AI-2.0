import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, Link } from 'react-router-dom';
import {
  Package,
  AlertTriangle,
  TrendingDown,
  DollarSign,
  AlertCircle,
  CheckCircle,
  ArrowRight,
  Plus,
  Tag,
  Truck,
  HeartHandshake,
  Eye,
  Trash2,
  ArrowUpCircle,
  Clock,
  Sparkles,
  ExternalLink,
  ChevronRight,
  ShieldAlert,
} from 'lucide-react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip as RechartsTooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  AreaChart,
  Area,
} from 'recharts';

import type { InventoryItem, ActionRecommendation, ActionType, RiskLevel } from '@/types';
import { storage } from '@/services/storage';
import { analyzeInventory } from '@/domain/forecasting/engine';
import { generateRecommendations } from '@/domain/recommendations/engine';
import { formatCurrency, formatNumber, formatRelativeDate } from '@/utils/format';
import { generateDemoInventory, generateDemoPartners } from '@/data/demoData';

import GlassCard from '@/components/ui/GlassCard';
import KPICard from '@/components/ui/KPICard';
import RiskBadge from '@/components/ui/RiskBadge';
import Button from '@/components/ui/Button';

// Action Type Icon Helper
const renderActionIcon = (actionType: ActionType) => {
  switch (actionType) {
    case 'markdown':
      return <Tag className="w-4 h-4 text-ws-amber" />;
    case 'donation':
      return <HeartHandshake className="w-4 h-4 text-ws-coral" />;
    case 'transfer':
      return <Truck className="w-4 h-4 text-sky-400" />;
    case 'prioritize':
      return <ArrowUpCircle className="w-4 h-4 text-ws-primary" />;
    case 'inspect':
      return <Eye className="w-4 h-4 text-purple-400" />;
    case 'remove':
      return <Trash2 className="w-4 h-4 text-red-400" />;
    default:
      return <Tag className="w-4 h-4 text-ws-primary" />;
  }
};

// Custom Chart Tooltip
const CustomChartTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[#FFFDF8] p-3 rounded-xl border border-[#D4DFCE] shadow-md text-xs space-y-1">
        <p className="font-semibold text-[#17231B]">{label || payload[0]?.name}</p>
        <p className="text-[#245B38] font-mono font-bold">
          {payload[0]?.value?.toLocaleString()} {payload[0]?.unit || 'units'}
        </p>
      </div>
    );
  }
  return null;
};

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();

  // 1. Initialize data
  const [inventory, setInventory] = useState<InventoryItem[]>(() => {
    const stored = storage.getInventory();
    if (stored.length > 0) return stored;
    const demo = generateDemoInventory();
    storage.setInventory(demo);
    const partners = generateDemoPartners();
    storage.setPartners(partners);
    return demo;
  });

  const settings = useMemo(() => storage.getSettings(), []);

  // Compute forecasts and recommendations
  const forecasts = useMemo(() => analyzeInventory(inventory, settings), [inventory, settings]);
  const recommendations = useMemo(
    () => generateRecommendations(forecasts, inventory, settings),
    [forecasts, inventory, settings]
  );

  // Actions from storage (if any user completed actions exist)
  const storedActions = useMemo(() => storage.getActions(), []);

  // Fast inventory ID map for metadata lookups
  const inventoryMap = useMemo(() => {
    const map = new Map<string, InventoryItem>();
    inventory.forEach((item) => map.set(item.id, item));
    return map;
  }, [inventory]);

  // ================= KPI CALCULATIONS =================
  const kpiData = useMemo(() => {
    const totalInventory = inventory.reduce((acc, item) => acc + item.quantity, 0);
    const nearingExpiry = forecasts.filter((f) => f.daysRemaining <= 3).length;
    const predictedSurplus = forecasts.reduce((acc, f) => acc + f.expectedSurplus, 0);
    const valueAtRisk = forecasts.reduce((acc, f) => acc + f.financialExposure, 0);
    const highRiskItems = forecasts.filter(
      (f) => f.riskLevel === 'high' || f.riskLevel === 'critical'
    ).length;
    const completedActions = storedActions.filter((a) => a.status === 'completed').length;

    return {
      totalInventory,
      nearingExpiry,
      predictedSurplus,
      valueAtRisk,
      highRiskItems,
      completedActions,
    };
  }, [inventory, forecasts, storedActions]);

  // ================= 1. RISK DISTRIBUTION DATA (Donut) =================
  const riskDistributionData = useMemo(() => {
    const counts: Record<RiskLevel, number> = {
      low: 0,
      moderate: 0,
      high: 0,
      critical: 0,
      expired: 0,
    };

    forecasts.forEach((f) => {
      counts[f.riskLevel] = (counts[f.riskLevel] || 0) + 1;
    });

    return [
      { name: 'Low Risk', value: counts.low, color: '#245B38' },
      { name: 'Moderate', value: counts.moderate, color: '#D89A3D' },
      { name: 'High Risk', value: counts.high, color: '#C96D43' },
      { name: 'Critical', value: counts.critical, color: '#C54A43' },
      { name: 'Expired', value: counts.expired, color: '#6E7970' },
    ].filter((item) => item.value > 0);
  }, [forecasts]);

  // ================= 2. SURPLUS BY CATEGORY (Bar Chart) =================
  const surplusByCategoryData = useMemo(() => {
    const categorySurplus: Record<string, number> = {};

    forecasts.forEach((f) => {
      const item = inventoryMap.get(f.productId);
      const cat = item?.category || 'Uncategorized';
      categorySurplus[cat] = (categorySurplus[cat] || 0) + f.expectedSurplus;
    });

    return Object.entries(categorySurplus)
      .map(([category, surplus]) => ({
        category,
        surplus: Math.round(surplus),
      }))
      .sort((a, b) => b.surplus - a.surplus);
  }, [forecasts, inventoryMap]);

  // ================= 3. EXPIRY TIMELINE (Area Chart) =================
  const expiryTimelineData = useMemo(() => {
    const bands = {
      '0 Days': 0,
      '1-2 Days': 0,
      '3-5 Days': 0,
      '6-10 Days': 0,
      '10+ Days': 0,
    };

    forecasts.forEach((f) => {
      if (f.daysRemaining <= 0) bands['0 Days']++;
      else if (f.daysRemaining <= 2) bands['1-2 Days']++;
      else if (f.daysRemaining <= 5) bands['3-5 Days']++;
      else if (f.daysRemaining <= 10) bands['6-10 Days']++;
      else bands['10+ Days']++;
    });

    return Object.entries(bands).map(([timeline, count]) => ({
      timeline,
      count,
    }));
  }, [forecasts]);

  // ================= 4. RECENT ACTIVITY (Top 6 recommendations) =================
  const recentActivities = useMemo(() => {
    return recommendations.slice(0, 6);
  }, [recommendations]);

  // ================= 5. URGENT PRODUCTS (Top 10 sorted by riskScore) =================
  const urgentProducts = useMemo(() => {
    return [...forecasts]
      .sort((a, b) => b.riskScore - a.riskScore)
      .slice(0, 10);
  }, [forecasts]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="p-6 max-w-7xl mx-auto w-full space-y-8"
    >
      {/* Top Banner / Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#D4DFCE] pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2.5 h-2.5 rounded-full bg-[#245B38]" />
            <span className="text-xs font-mono uppercase tracking-wider text-[#245B38] font-bold">
              Autonomous Intelligence Feed &bull; Active
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#173D2A]">
            Perishable Operations <span className="text-[#245B38]">Dashboard</span>
          </h1>
          <p className="text-sm text-[#58645A] mt-1">
            Predictive perishable inventory analytics, risk triage, and dynamic mitigation actions.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => navigate('/app/predictions')}
            icon={<Sparkles className="w-4 h-4 text-ws-lime" />}
          >
            Predictive Model
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => navigate('/app/inventory')}
            icon={<Plus className="w-4 h-4" />}
          >
            Add Product
          </Button>
        </div>
      </div>

      {/* ================= 6 KPI CARDS GRID ================= */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {/* 1. Total Inventory */}
        <KPICard
          title="Total Stock"
          value={kpiData.totalInventory}
          unit="units"
          icon={<Package className="w-5 h-5" />}
          colorScheme="primary"
          trend="neutral"
          trendLabel={`${inventory.length} items`}
          onClick={() => navigate('/app/inventory')}
        />

        {/* 2. Nearing Expiry */}
        <KPICard
          title="Nearing Expiry"
          value={kpiData.nearingExpiry}
          unit="items"
          icon={<AlertTriangle className="w-5 h-5" />}
          colorScheme="amber"
          trend={kpiData.nearingExpiry > 0 ? 'down' : 'neutral'}
          trendLabel="≤ 3 days left"
          onClick={() => navigate('/app/predictions')}
        />

        {/* 3. Predicted Surplus */}
        <KPICard
          title="Predicted Surplus"
          value={Math.round(kpiData.predictedSurplus)}
          unit="units"
          icon={<TrendingDown className="w-5 h-5" />}
          colorScheme="coral"
          trend="down"
          trendLabel="Over demand"
        />

        {/* 4. Value at Risk */}
        <KPICard
          title="Value at Risk"
          value={formatCurrency(kpiData.valueAtRisk, settings.currency)}
          icon={<DollarSign className="w-5 h-5" />}
          colorScheme="coral"
          trend="down"
          trendLabel="Total exposure"
        />

        {/* 5. High Risk Items */}
        <KPICard
          title="High Risk"
          value={kpiData.highRiskItems}
          unit="skus"
          icon={<AlertCircle className="w-5 h-5" />}
          colorScheme="amber"
          trend={kpiData.highRiskItems > 0 ? 'down' : 'neutral'}
          trendLabel="Action needed"
          onClick={() => navigate('/app/predictions')}
        />

        {/* 6. Completed Actions */}
        <KPICard
          title="Actions Done"
          value={kpiData.completedActions}
          unit="tasks"
          icon={<CheckCircle className="w-5 h-5" />}
          colorScheme="lime"
          trend="up"
          trendLabel="Mitigated"
          onClick={() => navigate('/app/actions')}
        />
      </div>

      {/* ================= CHARTS SECTION (2-Column Grid) ================= */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* CHART 1: Risk Distribution (Donut Chart) */}
        <GlassCard className="p-6 border border-[#D4DFCE] flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-[#17231B]">Risk Classification</h3>
              <p className="text-xs text-[#58645A]">Distribution of items across threat tiers</p>
            </div>
            <div className="px-2.5 py-1 rounded-full bg-[#EEF3E8] border border-[#D4DFCE] text-[11px] font-mono text-[#245B38] font-bold">
              {forecasts.length} Batches Analyzed
            </div>
          </div>

          <div className="h-64 w-full relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={riskDistributionData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={4}
                  dataKey="value"
                  stroke="#FFFFFF"
                  strokeWidth={2}
                >
                  {riskDistributionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <RechartsTooltip content={<CustomChartTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Legend */}
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 pt-4 border-t border-[#E7E4DA] text-center">
            {riskDistributionData.map((item, idx) => (
              <div key={idx} className="flex flex-col items-center">
                <div className="flex items-center gap-1.5 text-xs text-[#58645A]">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="truncate">{item.name}</span>
                </div>
                <span className="text-sm font-bold text-[#17231B] font-mono mt-0.5">
                  {item.value}
                </span>
              </div>
            ))}
          </div>
        </GlassCard>

        {/* CHART 2: Surplus by Category (Horizontal Bar Chart) */}
        <GlassCard className="p-6 border border-[#D4DFCE] flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-[#17231B]">Predicted Surplus by Category</h3>
              <p className="text-xs text-[#58645A]">Projected unsold units remaining at expiry</p>
            </div>
            <span className="text-xs text-[#778178] font-mono">Units</span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={surplusByCategoryData}
                layout="vertical"
                margin={{ top: 5, right: 20, left: 40, bottom: 5 }}
              >
                <defs>
                  <linearGradient id="surplusBarGradient" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#DCE8D3" />
                    <stop offset="100%" stopColor="#245B38" />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#D4DFCE" horizontal={false} />
                <XAxis
                  type="number"
                  stroke="#58645A"
                  fontSize={11}
                  tickLine={false}
                  axisLine={{ stroke: '#D4DFCE' }}
                />
                <YAxis
                  dataKey="category"
                  type="category"
                  stroke="#58645A"
                  fontSize={11}
                  tickLine={false}
                  axisLine={{ stroke: '#D4DFCE' }}
                  width={110}
                />
                <RechartsTooltip content={<CustomChartTooltip />} />
                <Bar
                  dataKey="surplus"
                  name="Surplus Units"
                  fill="url(#surplusBarGradient)"
                  radius={[0, 6, 6, 0]}
                  barSize={18}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="text-[11px] text-[#778178] pt-2 border-t border-[#E7E4DA] text-center">
            Higher surplus in Fresh Produce & Dairy demands immediate dynamic markdowns.
          </div>
        </GlassCard>

        {/* CHART 3: Expiry Timeline (Area Chart) */}
        <GlassCard className="p-6 border border-[#D4DFCE] flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-[#17231B]">Expiry Velocity Timeline</h3>
              <p className="text-xs text-[#58645A]">Number of products expiring across days remaining</p>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-[#D89A3D] font-medium">
              <Clock className="w-3.5 h-3.5" />
              <span>Decay Horizon</span>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={expiryTimelineData}
                margin={{ top: 10, right: 20, left: -10, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="expiryAreaGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#245B38" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#245B38" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#D4DFCE" vertical={false} />
                <XAxis
                  dataKey="timeline"
                  stroke="#58645A"
                  fontSize={11}
                  tickLine={false}
                  axisLine={{ stroke: '#D4DFCE' }}
                />
                <YAxis
                  stroke="#58645A"
                  fontSize={11}
                  tickLine={false}
                  axisLine={{ stroke: '#D4DFCE' }}
                />
                <RechartsTooltip content={<CustomChartTooltip />} />
                <Area
                  type="monotone"
                  dataKey="count"
                  name="Items Expiring"
                  stroke="#245B38"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#expiryAreaGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="text-[11px] text-[#778178] pt-2 border-t border-[#E7E4DA] flex items-center justify-between">
            <span>Critical window: 0 - 2 days</span>
            <span className="text-[#C54A43] font-medium">Prioritize shelf rotation (FIFO)</span>
          </div>
        </GlassCard>

        {/* CHART 4: Recent Recommended Activity */}
        <GlassCard className="p-6 border border-[#D4DFCE] flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-[#17231B]">Prescriptive AI Interventions</h3>
              <p className="text-xs text-[#58645A]">Ranked real-time actions to preserve value</p>
            </div>
            <Link
              to="/app/actions"
              className="text-xs font-semibold text-[#245B38] hover:text-[#4F8A4B] inline-flex items-center gap-1 transition-colors"
            >
              View all <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="space-y-3 overflow-y-auto max-h-64 pr-1">
            {recentActivities.map((act) => (
              <div
                key={act.id}
                onClick={() => navigate('/app/actions')}
                className="p-3 rounded-xl bg-[#FAF9F4] border border-[#D4DFCE] hover:border-[#BDCEB4] transition-all flex items-center justify-between gap-3 cursor-pointer group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-lg bg-[#EEF3E8] border border-[#D4DFCE] flex items-center justify-center shrink-0">
                    {renderActionIcon(act.actionType)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-[#17231B] truncate group-hover:text-[#245B38] transition-colors">
                      {act.productName}
                    </p>
                    <p className="text-[11px] text-[#58645A] capitalize">
                      {act.actionType} &bull; Recover {formatCurrency(act.netBenefit, settings.currency)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <RiskBadge level={act.riskLevel} size="sm" />
                  <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-md bg-[#FFFDF8] border border-[#D4DFCE] text-[#58645A]">
                    {act.status}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="pt-3 border-t border-[#E7E4DA] text-center">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => navigate('/app/actions')}
              className="w-full text-xs"
              icon={<ArrowRight className="w-3.5 h-3.5" />}
            >
              Execute Prescribed Interventions
            </Button>
          </div>
        </GlassCard>
      </div>

      {/* ================= URGENT PRODUCTS TABLE ================= */}
      <GlassCard className="p-6 border border-[#D4DFCE] space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-[#C54A43]" />
              <h2 className="text-lg font-bold text-[#17231B]">
                Products Requiring Immediate Attention
              </h2>
            </div>
            <p className="text-xs text-[#58645A] mt-0.5">
              Top 10 items ranked by multi-factor waste risk score (decay velocity + surplus volume + financial exposure).
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => navigate('/app/predictions')}
              icon={<Sparkles className="w-3.5 h-3.5 text-[#245B38]" />}
            >
              Analyze All
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => navigate('/app/inventory')}
              icon={<Plus className="w-3.5 h-3.5" />}
            >
              Add Product
            </Button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto rounded-xl border border-[#D4DFCE] bg-[#FFFDF8]">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-[#D4DFCE] bg-[#EEF3E8] text-[#58645A] uppercase tracking-wider font-mono text-[11px]">
                <th className="py-3 px-4 font-semibold">Product</th>
                <th className="py-3 px-4 font-semibold">Category</th>
                <th className="py-3 px-4 font-semibold text-right">Quantity</th>
                <th className="py-3 px-4 font-semibold text-center">Days Left</th>
                <th className="py-3 px-4 font-semibold text-right">Surplus</th>
                <th className="py-3 px-4 font-semibold text-center">Risk Score</th>
                <th className="py-3 px-4 font-semibold text-center">Risk Tier</th>
                <th className="py-3 px-4 font-semibold text-right">Recommended Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E7E4DA]">
              {urgentProducts.map((item) => {
                const invItem = inventoryMap.get(item.productId);
                return (
                  <tr
                    key={item.productId}
                    onClick={() => navigate('/app/predictions')}
                    className="hover:bg-[#FAF9F4] transition-colors cursor-pointer group"
                  >
                    {/* Product Name */}
                    <td className="py-3 px-4 font-medium text-[#17231B] group-hover:text-[#245B38] transition-colors">
                      <div className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#245B38] group-hover:scale-125 transition-transform" />
                        <div>
                          <div className="font-semibold text-[#17231B]">{item.productName}</div>
                          <div className="text-[10px] text-[#778178] font-mono">{invItem?.sku || item.batchId}</div>
                        </div>
                      </div>
                    </td>

                    {/* Category */}
                    <td className="py-3 px-4 text-[#58645A]">
                      {invItem?.category || 'General'}
                    </td>

                    {/* Quantity */}
                    <td className="py-3 px-4 text-right font-mono text-[#17231B] font-semibold">
                      {item.currentQuantity} <span className="text-[10px] text-[#778178] font-normal">{invItem?.unit || 'units'}</span>
                    </td>

                    {/* Days Left */}
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-md font-mono font-bold text-[11px] ${
                          item.daysRemaining <= 1
                            ? 'bg-[#FBEBEB] text-[#C54A43] border border-[#F3C7C5]'
                            : item.daysRemaining <= 3
                            ? 'bg-[#FFF0DF] text-[#A66E24] border border-[#F8E1CD]'
                            : 'bg-[#EEF3E8] text-[#245B38] border border-[#D4DFCE]'
                        }`}
                      >
                        {item.daysRemaining <= 0 ? 'Expired' : `${item.daysRemaining}d`}
                      </span>
                    </td>

                    {/* Expected Surplus */}
                    <td className="py-3 px-4 text-right font-mono font-semibold text-[#C54A43]">
                      +{item.expectedSurplus}
                    </td>

                    {/* Risk Score */}
                    <td className="py-3 px-4 text-center">
                      <div className="inline-flex items-center gap-1.5">
                        <div className="w-12 bg-[#EEF3E8] rounded-full h-2 overflow-hidden border border-[#D4DFCE]">
                          <div
                            className={`h-full ${
                              item.riskScore > 75
                                ? 'bg-[#C54A43]'
                                : item.riskScore > 50
                                ? 'bg-[#D89A3D]'
                                : 'bg-[#245B38]'
                            }`}
                            style={{ width: `${Math.min(100, item.riskScore)}%` }}
                          />
                        </div>
                        <span className="font-mono font-bold text-[#17231B] text-[11px]">
                          {item.riskScore}
                        </span>
                      </div>
                    </td>

                    {/* Risk Level Badge */}
                    <td className="py-3 px-4 text-center">
                      <RiskBadge level={item.riskLevel} size="sm" />
                    </td>

                    {/* Action */}
                    <td className="py-3 px-4 text-right">
                      <span className="text-xs text-[#245B38] font-medium group-hover:underline inline-flex items-center gap-1">
                        {item.recommendation.length > 25 ? `${item.recommendation.slice(0, 24)}...` : item.recommendation}
                        <ArrowRight className="w-3 h-3 text-[#245B38]" />
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </GlassCard>
    </motion.div>
  );
};

export default DashboardPage;

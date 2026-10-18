import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, AlertTriangle, TrendingDown, ArrowRight, Filter, ChevronDown, ChevronUp, Activity, DollarSign, Package, Zap } from 'lucide-react';
import { storage } from '../services/storage';
import { analyzeInventory } from '../domain/forecasting/engine';
import type { ForecastResult } from '../types';
import { GlassCard } from '../components/ui';

function formatTimeRemaining(days: number): string {
  if (days <= 0) return 'Expired';
  if (days < 1) return `${Math.round(days * 24)}h remaining`;
  if (days === 1) return '1 day remaining';
  if (days < 2) return `1d ${Math.round((days - 1) * 24)}h`;
  return `${Math.floor(days)}d ${Math.round((days % 1) * 24)}h`;
}

function getRingColor(riskLevel: string): string {
  switch (riskLevel) {
    case 'critical': case 'expired': return '#C75D4B';
    case 'high': return '#D99239';
    case 'moderate': return '#70A77B';
    default: return '#235A43';
  }
}

function CountdownRing({ progress, color, size = 80 }: { progress: number; color: string; size?: number }) {
  const radius = (size - 8) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - Math.min(1, Math.max(0, progress)));

  return (
    <svg width={size} height={size} className="transform -rotate-90">
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#DDE5DC" strokeWidth="4" />
      <motion.circle
        cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={color} strokeWidth="4"
        strokeLinecap="round" strokeDasharray={circumference}
        initial={{ strokeDashoffset: circumference }}
        animate={{ strokeDashoffset: offset }}
        transition={{ duration: 1, ease: 'easeOut' }}
      />
    </svg>
  );
}

type SortKey = 'time' | 'risk' | 'financial';
type FilterLevel = 'all' | 'critical' | 'high' | 'moderate';

export default function RescueClockPage() {
  const navigate = useNavigate();
  const [filterLevel, setFilterLevel] = useState<FilterLevel>('all');
  const [sortBy, setSortBy] = useState<SortKey>('time');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const inventory = storage.getInventory();
  const settings = storage.getSettings();
  const forecasts = useMemo(() => analyzeInventory(inventory, settings), [inventory, settings]);

  const atRiskForecasts = useMemo(() => {
    let filtered = forecasts.filter(f => f.riskScore > 25 && f.riskLevel !== 'expired');
    
    if (filterLevel !== 'all') {
      filtered = filtered.filter(f => f.riskLevel === filterLevel);
    }

    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'time': return a.daysRemaining - b.daysRemaining;
        case 'risk': return b.riskScore - a.riskScore;
        case 'financial': return b.financialExposure - a.financialExposure;
        default: return 0;
      }
    });

    return filtered;
  }, [forecasts, filterLevel, sortBy]);

  const stats = useMemo(() => ({
    totalAtRisk: atRiskForecasts.length,
    totalUnitsAtRisk: atRiskForecasts.reduce((sum, f) => sum + f.expectedSurplus, 0),
    totalExposure: atRiskForecasts.reduce((sum, f) => sum + f.financialExposure, 0),
    criticalCount: atRiskForecasts.filter(f => f.riskLevel === 'critical').length,
  }), [atRiskForecasts]);

  const getMaxShelfLife = (f: ForecastResult): number => {
    const item = inventory.find(i => i.id === f.productId);
    return item ? Math.max(f.daysRemaining + (settings.safetyBufferDays || 0) + 3, 7) : 14;
  };

  return (
    <div className="space-y-6 p-1">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2" style={{ color: '#192820' }}>
            <Clock className="w-6 h-6" style={{ color: '#C75D4B' }} />
            Rescue Clock
          </h1>
          <p className="text-sm mt-1" style={{ color: '#63716A' }}>
            Time-critical inventory requiring intervention before expiry
          </p>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'At-Risk Batches', value: stats.totalAtRisk, icon: Package, color: '#D99239' },
          { label: 'Units at Risk', value: Math.round(stats.totalUnitsAtRisk), icon: AlertTriangle, color: '#C75D4B' },
          { label: 'Financial Exposure', value: `₹${stats.totalExposure.toFixed(0)}`, icon: DollarSign, color: '#D99239' },
          { label: 'Critical Now', value: stats.criticalCount, icon: Zap, color: '#C75D4B' },
        ].map((stat) => (
          <GlassCard key={stat.label} className="p-4 text-center">
            <stat.icon className="w-5 h-5 mx-auto mb-1" style={{ color: stat.color }} />
            <p className="text-xl font-bold" style={{ color: '#192820' }}>{stat.value}</p>
            <p className="text-xs" style={{ color: '#63716A' }}>{stat.label}</p>
          </GlassCard>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1 text-sm" style={{ color: '#63716A' }}>
          <Filter className="w-4 h-4" />
          <span>Urgency:</span>
        </div>
        {(['all', 'critical', 'high', 'moderate'] as FilterLevel[]).map((level) => (
          <button key={level} onClick={() => setFilterLevel(level)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${filterLevel === level ? 'text-white' : ''}`}
            style={{
              backgroundColor: filterLevel === level ? '#235A43' : '#E9F2E8',
              color: filterLevel === level ? 'white' : '#235A43',
            }}>
            {level === 'all' ? 'All' : level.charAt(0).toUpperCase() + level.slice(1)}
          </button>
        ))}

        <div className="ml-auto flex items-center gap-2">
          <span className="text-xs" style={{ color: '#63716A' }}>Sort:</span>
          {([
            { key: 'time' as SortKey, label: 'Time' },
            { key: 'risk' as SortKey, label: 'Risk' },
            { key: 'financial' as SortKey, label: 'Value' },
          ]).map((s) => (
            <button key={s.key} onClick={() => setSortBy(s.key)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${sortBy === s.key ? 'text-white' : ''}`}
              style={{
                backgroundColor: sortBy === s.key ? '#123B2A' : '#FAF9F5',
                color: sortBy === s.key ? 'white' : '#63716A',
                border: `1px solid ${sortBy === s.key ? '#123B2A' : '#DDE5DC'}`,
              }}>
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Clock Cards */}
      {atRiskForecasts.length === 0 ? (
        <GlassCard className="p-12 text-center">
          <Clock className="w-12 h-12 mx-auto mb-3" style={{ color: '#70A77B' }} />
          <p className="text-lg font-medium" style={{ color: '#192820' }}>All Clear</p>
          <p className="text-sm mt-1" style={{ color: '#63716A' }}>No inventory batches require urgent attention right now.</p>
        </GlassCard>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          <AnimatePresence mode="popLayout">
            {atRiskForecasts.map((forecast, idx) => {
              const ringColor = getRingColor(forecast.riskLevel);
              const progress = forecast.daysRemaining / getMaxShelfLife(forecast);
              const isExpanded = expandedId === forecast.productId;
              const isCritical = forecast.riskLevel === 'critical' && forecast.daysRemaining <= 1;

              return (
                <motion.div key={forecast.productId}
                  layout initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.3, delay: idx * 0.05 }}
                  className={`bg-white rounded-2xl border overflow-hidden cursor-pointer transition-shadow hover:shadow-lg ${isCritical ? 'ring-2' : ''}`}
                  style={{ borderColor: '#DDE5DC', ...(isCritical ? { ringColor: '#C75D4B33' } : {}) }}
                  onClick={() => setExpandedId(isExpanded ? null : forecast.productId)}>
                  
                  {/* Top bar */}
                  <div className="h-1" style={{ backgroundColor: ringColor }} />

                  <div className="p-4">
                    <div className="flex items-start gap-4">
                      {/* Countdown Ring */}
                      <div className="relative flex-shrink-0">
                        <CountdownRing progress={progress} color={ringColor} size={72} />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-xs font-bold" style={{ color: ringColor }}>
                            {forecast.daysRemaining <= 0 ? '0d' : `${Math.floor(forecast.daysRemaining)}d`}
                          </span>
                        </div>
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-sm truncate" style={{ color: '#192820' }}>
                          {forecast.productName}
                        </h3>
                        <p className="text-xs mt-0.5" style={{ color: '#63716A' }}>
                          {forecast.batchId}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium text-white"
                            style={{ backgroundColor: ringColor }}>
                            {forecast.riskLevel.toUpperCase()}
                          </span>
                          <span className="text-xs" style={{ color: '#63716A' }}>
                            Score: {forecast.riskScore}/100
                          </span>
                        </div>
                      </div>

                      {/* Expand icon */}
                      <div className="flex-shrink-0">
                        {isExpanded ? <ChevronUp className="w-4 h-4" style={{ color: '#63716A' }} /> : <ChevronDown className="w-4 h-4" style={{ color: '#63716A' }} />}
                      </div>
                    </div>

                    {/* Key metrics */}
                    <div className="grid grid-cols-3 gap-2 mt-3 pt-3" style={{ borderTop: '1px solid #DDE5DC' }}>
                      <div className="text-center">
                        <p className="text-xs" style={{ color: '#63716A' }}>Time Left</p>
                        <p className="text-sm font-semibold" style={{ color: ringColor }}>
                          {formatTimeRemaining(forecast.daysRemaining)}
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs" style={{ color: '#63716A' }}>At Risk</p>
                        <p className="text-sm font-semibold" style={{ color: '#192820' }}>
                          {Math.round(forecast.expectedSurplus)} units
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs" style={{ color: '#63716A' }}>Exposure</p>
                        <p className="text-sm font-semibold" style={{ color: '#D99239' }}>
                          ₹{forecast.financialExposure.toFixed(0)}
                        </p>
                      </div>
                    </div>

                    {/* Expanded details */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.3 }}
                          className="overflow-hidden"
                        >
                          <div className="mt-3 pt-3 space-y-3" style={{ borderTop: '1px solid #DDE5DC' }}>
                            {/* Demand rate */}
                            <div className="flex items-center justify-between text-xs">
                              <span className="flex items-center gap-1" style={{ color: '#63716A' }}>
                                <Activity className="w-3 h-3" /> Daily Demand Rate
                              </span>
                              <span className="font-medium" style={{ color: '#192820' }}>
                                {(forecast.forecastDemand / Math.max(1, forecast.daysRemaining)).toFixed(1)} units/day
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-xs">
                              <span className="flex items-center gap-1" style={{ color: '#63716A' }}>
                                <TrendingDown className="w-3 h-3" /> Forecast Method
                              </span>
                              <span className="font-medium" style={{ color: '#192820' }}>
                                {forecast.forecastMethod.replace(/_/g, ' ')}
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-xs">
                              <span style={{ color: '#63716A' }}>Confidence</span>
                              <span className="font-medium" style={{ color: '#192820' }}>
                                {Math.round(forecast.confidence * 100)}%
                              </span>
                            </div>

                            {/* Risk factors */}
                            <div>
                              <p className="text-xs font-medium mb-1" style={{ color: '#192820' }}>Risk Factors:</p>
                              <ul className="space-y-1">
                                {forecast.riskFactors.map((factor, i) => (
                                  <li key={i} className="text-xs flex items-start gap-1.5" style={{ color: '#63716A' }}>
                                    <AlertTriangle className="w-3 h-3 flex-shrink-0 mt-0.5" style={{ color: '#D99239' }} />
                                    {factor}
                                  </li>
                                ))}
                              </ul>
                            </div>

                            {/* Action suggestion */}
                            <div className="p-3 rounded-xl" style={{ backgroundColor: '#E9F2E8' }}>
                              <p className="text-xs font-medium" style={{ color: '#235A43' }}>Suggested Action:</p>
                              <p className="text-xs mt-0.5" style={{ color: '#192820' }}>{forecast.recommendation}</p>
                            </div>

                            {/* Action button */}
                            <button
                              onClick={(e) => { e.stopPropagation(); navigate('/app/actions'); }}
                              className="w-full py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all hover:opacity-90 text-white"
                              style={{ backgroundColor: '#235A43' }}
                            >
                              Take Action <ArrowRight className="w-3 h-3" />
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

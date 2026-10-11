import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Tag,
  Truck,
  HeartHandshake,
  Eye,
  Trash2,
  PackagePlus,
  ArrowUpCircle,
  HelpCircle,
  Sparkles,
  RefreshCw,
  Check,
  X,
  Clock,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Info,
  DollarSign,
  TrendingDown,
  Layers,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';
import type {
  ActionRecommendation,
  ActionStatus,
  ActionType,
  RiskLevel,
  InventoryItem,
  AppSettings,
} from '../types';
import { storage } from '../services/storage';
import { analyzeInventory } from '../domain/forecasting/engine';
import { generateRecommendations } from '../domain/recommendations/engine';
import {
  formatCurrency,
  formatNumber,
  formatDate,
  getRiskColor,
  getRiskBgClass,
} from '../utils/format';
import { useToast } from '../context/ToastContext';

type FilterTab = 'all' | ActionStatus;

function getActionIconComponent(type: ActionType) {
  switch (type) {
    case 'markdown':
      return Tag;
    case 'donation':
      return HeartHandshake;
    case 'transfer':
      return Truck;
    case 'inspect':
      return Eye;
    case 'remove':
      return Trash2;
    case 'prioritize':
      return ArrowUpCircle;
    case 'replenishment':
      return PackagePlus;
    default:
      return HelpCircle;
  }
}

export default function ActionsPage() {
  const { success, info } = useToast();
  const [actions, setActions] = useState<ActionRecommendation[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [settings, setSettings] = useState<AppSettings>(storage.getSettings());
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [selectedAction, setSelectedAction] = useState<ActionRecommendation | null>(null);
  const [expandedCardIds, setExpandedCardIds] = useState<Set<string>>(new Set());
  const [isGenerating, setIsGenerating] = useState(false);

  // Load data on mount
  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    const currentSettings = storage.getSettings();
    const currentInv = storage.getInventory();
    let currentActions = storage.getActions();

    setSettings(currentSettings);
    setInventory(currentInv);

    // If no actions exist yet but inventory exists, automatically generate them
    if (currentActions.length === 0 && currentInv.length > 0) {
      const forecasts = analyzeInventory(currentInv, currentSettings);
      storage.setForecasts(forecasts);
      currentActions = generateRecommendations(forecasts, currentInv, currentSettings);
      storage.setActions(currentActions);
    }

    setActions(currentActions);
  };

  const handleGenerateRecommendations = () => {
    setIsGenerating(true);
    setTimeout(() => {
      const currentInv = storage.getInventory();
      const currentSettings = storage.getSettings();
      const forecasts = analyzeInventory(currentInv, currentSettings);
      storage.setForecasts(forecasts);

      const newRecs = generateRecommendations(forecasts, currentInv, currentSettings);

      // Preserve status of actions already resolved by the user
      const existingMap = new Map(actions.map((a) => [a.productId, a]));
      const mergedRecs = newRecs.map((rec) => {
        const existing = existingMap.get(rec.productId);
        if (existing && existing.status !== 'pending') {
          return {
            ...rec,
            status: existing.status,
            completedAt: existing.completedAt,
            outcomeNotes: existing.outcomeNotes,
          };
        }
        return rec;
      });

      storage.setActions(mergedRecs);
      setActions(mergedRecs);
      setIsGenerating(false);
      success(`Updated recommendations for ${mergedRecs.length} items`);
    }, 400);
  };

  const updateActionStatus = (actionId: string, newStatus: ActionStatus) => {
    const now = new Date().toISOString();
    const updated = actions.map((act) => {
      if (act.id === actionId) {
        return {
          ...act,
          status: newStatus,
          updatedAt: now,
          ...(newStatus === 'completed' ? { completedAt: now } : {}),
        };
      }
      return act;
    });

    storage.setActions(updated);
    setActions(updated);

    if (selectedAction && selectedAction.id === actionId) {
      setSelectedAction({
        ...selectedAction,
        status: newStatus,
        updatedAt: now,
        ...(newStatus === 'completed' ? { completedAt: now } : {}),
      });
    }

    const actionObj = actions.find((a) => a.id === actionId);
    const actionLabel = actionObj ? actionObj.actionType.toUpperCase() : 'ACTION';

    if (newStatus === 'accepted') {
      success(`Accepted ${actionLabel} on ${actionObj?.productName}`);
    } else if (newStatus === 'completed') {
      success(`Completed ${actionLabel} on ${actionObj?.productName}! Savings locked in.`);
    } else if (newStatus === 'rejected') {
      info(`Rejected ${actionLabel} on ${actionObj?.productName}`);
    } else if (newStatus === 'deferred') {
      info(`Deferred ${actionLabel} on ${actionObj?.productName}`);
    }
  };

  const toggleExpand = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedCardIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Filtered counts
  const counts = useMemo(() => {
    return {
      all: actions.length,
      pending: actions.filter((a) => a.status === 'pending').length,
      accepted: actions.filter((a) => a.status === 'accepted').length,
      completed: actions.filter((a) => a.status === 'completed').length,
      rejected: actions.filter((a) => a.status === 'rejected').length,
      deferred: actions.filter((a) => a.status === 'deferred').length,
    };
  }, [actions]);

  // Total Net Benefit for Accepted + Completed
  const totalNetBenefit = useMemo(() => {
    return actions
      .filter((a) => a.status === 'accepted' || a.status === 'completed')
      .reduce((sum, a) => sum + Math.max(0, a.netBenefit), 0);
  }, [actions]);

  const filteredActions = useMemo(() => {
    if (activeTab === 'all') return actions;
    return actions.filter((a) => a.status === activeTab);
  }, [actions, activeTab]);

  const selectedItem = useMemo(() => {
    if (!selectedAction) return null;
    return inventory.find((i) => i.id === selectedAction.productId) || null;
  }, [selectedAction, inventory]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.25 }}
      className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full space-y-6"
    >
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-ws-text">
            Prevention <span className="text-gradient-primary">Command Center</span>
          </h1>
          <p className="text-ws-text-secondary mt-1 text-sm sm:text-base">
            Prioritized interventions to prevent waste before expiration occurs.
          </p>
        </div>

        <button
          onClick={handleGenerateRecommendations}
          disabled={isGenerating}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-ws-primary text-ws-bg-darkest font-semibold hover:bg-ws-primary-light transition-all shadow-lg hover:shadow-ws-primary/20 active:scale-95 disabled:opacity-60"
        >
          <RefreshCw className={`w-4 h-4 ${isGenerating ? 'animate-spin' : ''}`} />
          {isGenerating ? 'Recalculating...' : 'Generate Recommendations'}
        </button>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-card p-4 sm:p-5 border border-ws-border">
          <div className="flex items-center justify-between text-ws-text-muted mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Pending Actions</span>
            <Clock className="w-4 h-4 text-ws-amber" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-ws-amber">
            {formatNumber(counts.pending)}
          </div>
          <p className="text-xs text-ws-text-secondary mt-1">Awaiting operational decision</p>
        </div>

        <div className="glass-card p-4 sm:p-5 border border-ws-border">
          <div className="flex items-center justify-between text-ws-text-muted mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Accepted</span>
            <Sparkles className="w-4 h-4 text-ws-primary" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-ws-primary">
            {formatNumber(counts.accepted)}
          </div>
          <p className="text-xs text-ws-text-secondary mt-1">Queued for floor execution</p>
        </div>

        <div className="glass-card p-4 sm:p-5 border border-ws-border">
          <div className="flex items-center justify-between text-ws-text-muted mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Completed</span>
            <CheckCircle2 className="w-4 h-4 text-ws-lime" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-ws-lime">
            {formatNumber(counts.completed)}
          </div>
          <p className="text-xs text-ws-text-secondary mt-1">Executed and verified</p>
        </div>

        <div className="glass-card p-4 sm:p-5 border border-ws-border">
          <div className="flex items-center justify-between text-ws-text-muted mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Est. Net Benefit</span>
            <DollarSign className="w-4 h-4 text-ws-primary" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-gradient-primary">
            {formatCurrency(totalNetBenefit, settings.currency)}
          </div>
          <p className="text-xs text-ws-text-secondary mt-1">Accepted & completed actions</p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none border-b border-ws-border/60">
        {(['all', 'pending', 'accepted', 'completed', 'rejected', 'deferred'] as FilterTab[]).map(
          (tab) => {
            const count = counts[tab];
            const isActive = activeTab === tab;
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`relative px-3.5 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all whitespace-nowrap flex items-center gap-2 ${
                  isActive
                    ? 'bg-ws-primary/15 text-ws-primary border border-ws-primary/30'
                    : 'text-ws-text-secondary hover:text-ws-text hover:bg-ws-bg-card'
                }`}
              >
                <span className="capitalize">{tab}</span>
                <span
                  className={`text-xs px-1.5 py-0.5 rounded-full ${
                    isActive
                      ? 'bg-ws-primary text-ws-bg-darkest font-semibold'
                      : 'bg-ws-bg-elevated text-ws-text-muted'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          }
        )}
      </div>

      {/* Main Content Layout (List + Detail Modal/Side Panel) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Actions List (8 cols or full) */}
        <div className={selectedAction ? 'lg:col-span-7 space-y-3' : 'lg:col-span-12 space-y-3'}>
          {filteredActions.length === 0 ? (
            <div className="glass-card p-12 text-center border border-ws-border">
              <Layers className="w-12 h-12 text-ws-text-muted mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-ws-text">No actions in this view</h3>
              <p className="text-sm text-ws-text-secondary mt-1 max-w-md mx-auto">
                {activeTab === 'all'
                  ? 'No recommendations are currently active. Click "Generate Recommendations" above.'
                  : `There are currently no actions marked as "${activeTab}".`}
              </p>
            </div>
          ) : (
            <AnimatePresence mode="popLayout">
              {filteredActions.map((rec) => {
                const IconComponent = getActionIconComponent(rec.actionType);
                const isSelected = selectedAction?.id === rec.id;
                const isExpanded = expandedCardIds.has(rec.id);

                return (
                  <motion.div
                    key={rec.id}
                    layout
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.96 }}
                    transition={{ duration: 0.2 }}
                    onClick={() => setSelectedAction(rec)}
                    className={`relative overflow-hidden rounded-xl border cursor-pointer transition-all ${
                      isSelected
                        ? 'border-ws-primary ring-1 ring-ws-primary/40 bg-ws-bg-card-hover'
                        : 'border-ws-border bg-ws-bg-card hover:bg-ws-bg-card-hover'
                    }`}
                  >
                    {/* Left Risk Level Color Strip */}
                    <div
                      className={`absolute left-0 top-0 bottom-0 w-1.5 ${
                        rec.riskLevel === 'critical'
                          ? 'bg-ws-coral'
                          : rec.riskLevel === 'high'
                          ? 'bg-orange-400'
                          : rec.riskLevel === 'moderate'
                          ? 'bg-ws-amber'
                          : rec.riskLevel === 'expired'
                          ? 'bg-gray-400'
                          : 'bg-ws-primary'
                      }`}
                    />

                    <div className="pl-4 p-4 sm:p-5">
                      {/* Top Header of Card */}
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-ws-bg-elevated flex items-center justify-center text-ws-primary">
                            <IconComponent className="w-4 h-4" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-ws-text text-sm sm:text-base leading-snug">
                              {rec.productName}
                            </h3>
                            <div className="flex items-center gap-2 text-xs text-ws-text-muted mt-0.5">
                              <span>Batch {rec.batchId}</span>
                              <span>•</span>
                              <span className="capitalize font-mono text-ws-primary">
                                {rec.actionType}
                              </span>
                              {rec.discountPercent && (
                                <span className="text-ws-amber font-semibold">
                                  -{rec.discountPercent}%
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Badges: Risk & Status */}
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-0.5 rounded-full text-xs font-medium border ${getRiskBgClass(
                              rec.riskLevel
                            )} ${getRiskColor(rec.riskLevel)}`}
                          >
                            {rec.riskLevel.toUpperCase()}
                          </span>

                          <span
                            className={`px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${
                              rec.status === 'completed'
                                ? 'bg-ws-lime/20 text-ws-lime border border-ws-lime/30'
                                : rec.status === 'accepted'
                                ? 'bg-ws-primary/20 text-ws-primary border border-ws-primary/30'
                                : rec.status === 'pending'
                                ? 'bg-ws-amber/20 text-ws-amber border border-ws-amber/30'
                                : rec.status === 'rejected'
                                ? 'bg-ws-coral/20 text-ws-coral border border-ws-coral/30'
                                : 'bg-ws-bg-elevated text-ws-text-muted border border-ws-border'
                            }`}
                          >
                            {rec.status}
                          </span>
                        </div>
                      </div>

                      {/* Reason Description */}
                      <p className="text-xs sm:text-sm text-ws-text-secondary mt-3 leading-relaxed">
                        {rec.reason}
                      </p>

                      {/* Bottom Stats Row */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-3 border-t border-ws-border/50 text-xs">
                        <div>
                          <div className="text-ws-text-muted">Target Qty</div>
                          <div className="font-semibold text-ws-text text-sm">
                            {formatNumber(rec.quantity)} units
                          </div>
                        </div>
                        <div>
                          <div className="text-ws-text-muted">Est. Recovery</div>
                          <div className="font-semibold text-ws-text text-sm">
                            {formatCurrency(rec.estimatedRecovery, settings.currency)}
                          </div>
                        </div>
                        <div>
                          <div className="text-ws-text-muted">Waste Avoided</div>
                          <div className="font-semibold text-ws-lime text-sm">
                            {formatNumber(rec.estimatedWasteAvoided)} units
                          </div>
                        </div>
                        <div>
                          <div className="text-ws-text-muted">Net Benefit</div>
                          <div className="font-bold text-ws-primary text-sm">
                            {formatCurrency(rec.netBenefit, settings.currency)}
                          </div>
                        </div>
                      </div>

                      {/* Action Control Buttons */}
                      <div className="mt-4 pt-3 border-t border-ws-border/50 flex flex-wrap items-center justify-between gap-3">
                        <button
                          type="button"
                          onClick={(e) => toggleExpand(rec.id, e)}
                          className="inline-flex items-center gap-1 text-xs text-ws-text-secondary hover:text-ws-primary transition-colors"
                        >
                          {isExpanded ? (
                            <>
                              <ChevronUp className="w-3.5 h-3.5" /> Hide Breakdown
                            </>
                          ) : (
                            <>
                              <ChevronDown className="w-3.5 h-3.5" /> Financial & Assumptions (
                              {rec.assumptions.length})
                            </>
                          )}
                        </button>

                        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                          {rec.status === 'pending' && (
                            <>
                              <button
                                type="button"
                                onClick={() => updateActionStatus(rec.id, 'accepted')}
                                className="px-3 py-1.5 rounded-lg bg-ws-primary text-ws-bg-darkest text-xs font-semibold hover:bg-ws-primary-light transition-all flex items-center gap-1 active:scale-95"
                              >
                                <Check className="w-3.5 h-3.5" /> Accept
                              </button>
                              <button
                                type="button"
                                onClick={() => updateActionStatus(rec.id, 'deferred')}
                                className="px-2.5 py-1.5 rounded-lg bg-ws-bg-elevated hover:bg-ws-border text-ws-text text-xs font-medium transition-colors"
                              >
                                Defer
                              </button>
                              <button
                                type="button"
                                onClick={() => updateActionStatus(rec.id, 'rejected')}
                                className="px-2.5 py-1.5 rounded-lg bg-ws-bg-elevated hover:bg-ws-coral/20 text-ws-coral text-xs font-medium transition-colors"
                              >
                                Reject
                              </button>
                            </>
                          )}

                          {rec.status === 'accepted' && (
                            <>
                              <button
                                type="button"
                                onClick={() => updateActionStatus(rec.id, 'completed')}
                                className="px-3 py-1.5 rounded-lg bg-ws-lime text-ws-bg-darkest text-xs font-semibold hover:bg-lime-300 transition-all flex items-center gap-1 active:scale-95"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" /> Complete
                              </button>
                              <button
                                type="button"
                                onClick={() => updateActionStatus(rec.id, 'deferred')}
                                className="px-2.5 py-1.5 rounded-lg bg-ws-bg-elevated hover:bg-ws-border text-ws-text text-xs font-medium transition-colors"
                              >
                                Defer
                              </button>
                            </>
                          )}

                          {rec.status === 'completed' && (
                            <span className="text-xs text-ws-lime flex items-center gap-1 font-medium">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Executed {rec.completedAt ? formatDate(rec.completedAt) : 'Recently'}
                            </span>
                          )}

                          {(rec.status === 'rejected' || rec.status === 'deferred') && (
                            <button
                              type="button"
                              onClick={() => updateActionStatus(rec.id, 'pending')}
                              className="px-2.5 py-1.5 rounded-lg bg-ws-bg-elevated hover:bg-ws-border text-ws-text text-xs font-medium transition-colors"
                            >
                              Reopen
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Expandable Section: Assumptions & Financial Breakdown */}
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.2 }}
                            className="mt-3 pt-3 border-t border-ws-border/50 text-xs space-y-3"
                          >
                            <div>
                              <div className="font-semibold text-ws-text mb-1 flex items-center gap-1.5">
                                <DollarSign className="w-3.5 h-3.5 text-ws-primary" /> Financial
                                Breakdown
                              </div>
                              <div className="grid grid-cols-3 gap-2 bg-ws-bg-darkest/60 p-2.5 rounded-lg border border-ws-border/40">
                                <div>
                                  <span className="text-ws-text-muted">Estimated Recovery:</span>
                                  <div className="font-medium text-ws-text">
                                    {formatCurrency(rec.estimatedRecovery, settings.currency)}
                                  </div>
                                </div>
                                <div>
                                  <span className="text-ws-text-muted">Action Cost:</span>
                                  <div className="font-medium text-ws-coral">
                                    -{formatCurrency(rec.actionCost, settings.currency)}
                                  </div>
                                </div>
                                <div>
                                  <span className="text-ws-text-muted">Calculated Net Benefit:</span>
                                  <div className="font-bold text-ws-primary">
                                    {formatCurrency(rec.netBenefit, settings.currency)}
                                  </div>
                                </div>
                              </div>
                            </div>

                            {rec.assumptions.length > 0 && (
                              <div>
                                <div className="font-semibold text-ws-text mb-1 flex items-center gap-1.5">
                                  <Info className="w-3.5 h-3.5 text-ws-text-muted" /> Model
                                  Assumptions
                                </div>
                                <ul className="list-disc list-inside space-y-0.5 text-ws-text-secondary pl-1">
                                  {rec.assumptions.map((assump, idx) => (
                                    <li key={idx}>{assump}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          )}
        </div>

        {/* Side Panel for Detail Inspection (5 cols) */}
        {selectedAction && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="lg:col-span-5 glass-card border border-ws-border rounded-xl p-5 sm:p-6 space-y-5 sticky top-24"
          >
            {/* Header with Close */}
            <div className="flex items-start justify-between gap-3 pb-3 border-b border-ws-border">
              <div>
                <span className="text-xs font-semibold text-ws-primary uppercase tracking-wider">
                  Action Detail Inspector
                </span>
                <h3 className="text-lg font-bold text-ws-text mt-0.5">
                  {selectedAction.productName}
                </h3>
                <p className="text-xs text-ws-text-muted">
                  Batch: {selectedAction.batchId} • ID: {selectedAction.id}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedAction(null)}
                className="p-1 rounded-lg text-ws-text-muted hover:text-ws-text hover:bg-ws-bg-elevated transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Inventory Item Info */}
            {selectedItem && (
              <div className="bg-ws-bg-darkest/60 rounded-xl p-3.5 border border-ws-border/60 text-xs space-y-2">
                <div className="font-semibold text-ws-text flex items-center justify-between">
                  <span>Available Inventory Profile</span>
                  <span className="text-ws-text-muted">{selectedItem.category}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-ws-text-secondary pt-1">
                  <div>
                    Current Stock:{' '}
                    <span className="text-ws-text font-semibold">
                      {selectedItem.quantity} {selectedItem.unit}
                    </span>
                  </div>
                  <div>
                    Unit Cost:{' '}
                    <span className="text-ws-text font-semibold">
                      {formatCurrency(selectedItem.costPerUnit, settings.currency)}
                    </span>
                  </div>
                  <div>
                    Selling Price:{' '}
                    <span className="text-ws-text font-semibold">
                      {formatCurrency(selectedItem.sellingPrice, settings.currency)}
                    </span>
                  </div>
                  <div>
                    Expiry Date:{' '}
                    <span className="text-ws-coral font-semibold">
                      {formatDate(selectedItem.expiryDate)}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Recommendation Reasoning */}
            <div className="space-y-1.5 text-xs">
              <span className="font-semibold text-ws-text flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4 text-ws-amber" /> Recommendation Logic
              </span>
              <p className="text-ws-text-secondary leading-relaxed bg-ws-bg-elevated/40 p-3 rounded-lg border border-ws-border/40">
                {selectedAction.reason}
              </p>
            </div>

            {/* Financial Balance Calculation */}
            <div className="space-y-2 text-xs">
              <span className="font-semibold text-ws-text flex items-center gap-1.5">
                <DollarSign className="w-4 h-4 text-ws-primary" /> Financial Equation
              </span>
              <div className="space-y-1.5 bg-ws-bg-darkest/60 p-3 rounded-lg border border-ws-border/60">
                <div className="flex justify-between text-ws-text-secondary">
                  <span>Est. Revenue Preservation</span>
                  <span className="font-medium text-ws-text">
                    +{formatCurrency(selectedAction.estimatedRecovery, settings.currency)}
                  </span>
                </div>
                <div className="flex justify-between text-ws-text-secondary">
                  <span>Execution Logistics & Repricing</span>
                  <span className="font-medium text-ws-coral">
                    -{formatCurrency(selectedAction.actionCost, settings.currency)}
                  </span>
                </div>
                <div className="pt-2 border-t border-ws-border/60 flex justify-between font-bold text-sm">
                  <span className="text-ws-text">Projected Net Benefit</span>
                  <span className="text-ws-primary">
                    {formatCurrency(selectedAction.netBenefit, settings.currency)}
                  </span>
                </div>
              </div>
            </div>

            {/* Assumptions List */}
            {selectedAction.assumptions.length > 0 && (
              <div className="space-y-1.5 text-xs">
                <span className="font-semibold text-ws-text flex items-center gap-1.5">
                  <Info className="w-4 h-4 text-ws-text-muted" /> Active Assumptions
                </span>
                <ul className="space-y-1 bg-ws-bg-elevated/40 p-3 rounded-lg border border-ws-border/40 text-ws-text-secondary">
                  {selectedAction.assumptions.map((assump, idx) => (
                    <li key={idx} className="flex items-start gap-1.5">
                      <ArrowRight className="w-3 h-3 text-ws-primary mt-0.5 shrink-0" />
                      <span>{assump}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Interactive Actions within Side Panel */}
            <div className="pt-3 border-t border-ws-border flex flex-wrap gap-2">
              {selectedAction.status === 'pending' && (
                <>
                  <button
                    type="button"
                    onClick={() => updateActionStatus(selectedAction.id, 'accepted')}
                    className="flex-1 py-2 px-3 rounded-xl bg-ws-primary text-ws-bg-darkest font-semibold hover:bg-ws-primary-light transition-all text-xs flex items-center justify-center gap-1 shadow-md"
                  >
                    <Check className="w-3.5 h-3.5" /> Accept Action
                  </button>
                  <button
                    type="button"
                    onClick={() => updateActionStatus(selectedAction.id, 'deferred')}
                    className="py-2 px-3 rounded-xl bg-ws-bg-elevated text-ws-text font-medium hover:bg-ws-border transition-colors text-xs"
                  >
                    Defer
                  </button>
                  <button
                    type="button"
                    onClick={() => updateActionStatus(selectedAction.id, 'rejected')}
                    className="py-2 px-3 rounded-xl bg-ws-bg-elevated text-ws-coral font-medium hover:bg-ws-coral/20 transition-colors text-xs"
                  >
                    Reject
                  </button>
                </>
              )}

              {selectedAction.status === 'accepted' && (
                <>
                  <button
                    type="button"
                    onClick={() => updateActionStatus(selectedAction.id, 'completed')}
                    className="flex-1 py-2 px-3 rounded-xl bg-ws-lime text-ws-bg-darkest font-semibold hover:bg-lime-300 transition-all text-xs flex items-center justify-center gap-1 shadow-md"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" /> Mark Completed
                  </button>
                  <button
                    type="button"
                    onClick={() => updateActionStatus(selectedAction.id, 'deferred')}
                    className="py-2 px-3 rounded-xl bg-ws-bg-elevated text-ws-text font-medium hover:bg-ws-border transition-colors text-xs"
                  >
                    Defer
                  </button>
                </>
              )}

              {selectedAction.status === 'completed' && (
                <div className="w-full text-center py-2 px-3 rounded-xl bg-ws-lime/15 border border-ws-lime/30 text-ws-lime text-xs font-semibold flex items-center justify-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" /> This intervention is fully executed
                </div>
              )}
            </div>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}

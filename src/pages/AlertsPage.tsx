import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, AlertTriangle, CheckCircle, Clock, XCircle, ShieldAlert, TrendingDown, Thermometer, Package, ArrowRight, Filter, Check } from 'lucide-react';
import { storage } from '../services/storage';
import { analyzeInventory } from '../domain/forecasting/engine';
import { generateRecommendations } from '../domain/recommendations/engine';
import { GlassCard } from '../components/ui';

type AlertSeverity = 'critical' | 'warning' | 'info' | 'success';
type AlertCategory = 'expiry' | 'surplus' | 'quality' | 'action' | 'system';

interface Alert {
  id: string;
  title: string;
  message: string;
  severity: AlertSeverity;
  category: AlertCategory;
  timestamp: string;
  productId?: string;
  batchId?: string;
  actionRequired: boolean;
  acknowledged: boolean;
  link?: string;
}

function getAlertIcon(severity: AlertSeverity) {
  switch (severity) {
    case 'critical': return <ShieldAlert className="w-5 h-5" style={{ color: '#C75D4B' }} />;
    case 'warning': return <AlertTriangle className="w-5 h-5" style={{ color: '#D99239' }} />;
    case 'info': return <Bell className="w-5 h-5" style={{ color: '#235A43' }} />;
    case 'success': return <CheckCircle className="w-5 h-5" style={{ color: '#70A77B' }} />;
  }
}

function getSeverityColors(severity: AlertSeverity): { bg: string; border: string; text: string; badge: string } {
  switch (severity) {
    case 'critical': return { bg: '#FEF2F0', border: '#C75D4B', text: '#9A3A2A', badge: '#C75D4B' };
    case 'warning': return { bg: '#FEF6E8', border: '#D99239', text: '#8A5A1A', badge: '#D99239' };
    case 'info': return { bg: '#E9F2E8', border: '#70A77B', text: '#235A43', badge: '#235A43' };
    case 'success': return { bg: '#E9F2E8', border: '#70A77B', text: '#1A5A2E', badge: '#70A77B' };
  }
}

export default function AlertsPage() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<AlertSeverity | 'all'>('all');
  const [acknowledgedIds, setAcknowledgedIds] = useState<Set<string>>(new Set());
  const [showAcknowledged, setShowAcknowledged] = useState(false);

  const inventory = storage.getInventory();
  const settings = storage.getSettings();
  const forecasts = useMemo(() => analyzeInventory(inventory, settings), [inventory, settings]);
  const recommendations = useMemo(() => generateRecommendations(forecasts, inventory, settings), [forecasts, inventory, settings]);

  // Generate alerts from real-time data
  const alerts = useMemo<Alert[]>(() => {
    const result: Alert[] = [];
    const now = new Date();

    // Expiry alerts
    for (const f of forecasts) {
      const item = inventory.find(i => i.id === f.productId);
      if (!item) continue;

      if (f.riskLevel === 'expired') {
        result.push({
          id: `alert-exp-${f.productId}`, title: `EXPIRED: ${item.name}`,
          message: `Batch ${item.batchId} has passed its expiry date. Remove immediately from shelves.`,
          severity: 'critical', category: 'expiry', timestamp: now.toISOString(),
          productId: f.productId, batchId: item.batchId, actionRequired: true, acknowledged: false, link: '/app/actions',
        });
      } else if (f.daysRemaining <= 1 && f.riskLevel === 'critical') {
        result.push({
          id: `alert-urg-${f.productId}`, title: `CRITICAL: ${item.name} — ${f.daysRemaining}d left`,
          message: `${item.quantity} ${item.unit} at risk. Financial exposure: ₹${f.financialExposure.toFixed(0)}. Immediate action required.`,
          severity: 'critical', category: 'expiry', timestamp: now.toISOString(),
          productId: f.productId, batchId: item.batchId, actionRequired: true, acknowledged: false, link: '/app/rescue-clock',
        });
      } else if (f.daysRemaining <= 3 && f.riskLevel === 'high') {
        result.push({
          id: `alert-high-${f.productId}`, title: `HIGH RISK: ${item.name}`,
          message: `${f.daysRemaining} days remaining. Expected surplus of ${f.expectedSurplus.toFixed(0)} units. Consider markdown or donation.`,
          severity: 'warning', category: 'expiry', timestamp: now.toISOString(),
          productId: f.productId, batchId: item.batchId, actionRequired: true, acknowledged: false, link: '/app/actions',
        });
      }

      // Surplus alerts
      if (f.expectedSurplus > 0 && f.riskScore > 55) {
        const existing = result.find(a => a.productId === f.productId);
        if (!existing) {
          result.push({
            id: `alert-surp-${f.productId}`, title: `Surplus Warning: ${item.name}`,
            message: `Forecast predicts ${f.expectedSurplus.toFixed(0)} surplus units. Demand is ${(f.forecastDemand / Math.max(1, f.daysRemaining)).toFixed(1)} units/day.`,
            severity: 'warning', category: 'surplus', timestamp: now.toISOString(),
            productId: f.productId, batchId: item.batchId, actionRequired: false, acknowledged: false,
          });
        }
      }

      // Quality alerts
      if (item.qualityStatus === 'inspect') {
        result.push({
          id: `alert-qa-${f.productId}`, title: `QA Inspection Required: ${item.name}`,
          message: `Batch ${item.batchId} requires physical quality inspection before further action.`,
          severity: 'warning', category: 'quality', timestamp: now.toISOString(),
          productId: f.productId, batchId: item.batchId, actionRequired: true, acknowledged: false, link: '/app/inventory',
        });
      }

      if (item.qualityStatus === 'compromised') {
        result.push({
          id: `alert-comp-${f.productId}`, title: `COMPROMISED: ${item.name}`,
          message: `Batch ${item.batchId} quality is compromised. Must be removed from sale immediately.`,
          severity: 'critical', category: 'quality', timestamp: now.toISOString(),
          productId: f.productId, batchId: item.batchId, actionRequired: true, acknowledged: false, link: '/app/actions',
        });
      }
    }

    // Action completion alerts
    const completedActions = recommendations.filter(r => r.status === 'completed');
    if (completedActions.length > 0) {
      result.push({
        id: 'alert-actions-done', title: `${completedActions.length} Actions Completed`,
        message: `Great work! ${completedActions.length} preventive actions have been executed this session.`,
        severity: 'success', category: 'action', timestamp: now.toISOString(),
        actionRequired: false, acknowledged: false, link: '/app/impact',
      });
    }

    // Pending actions alert
    const pendingCount = recommendations.filter(r => r.status === 'pending').length;
    if (pendingCount > 0) {
      result.push({
        id: 'alert-pending', title: `${pendingCount} Pending Actions`,
        message: `There are ${pendingCount} recommended actions awaiting your review.`,
        severity: 'info', category: 'action', timestamp: now.toISOString(),
        actionRequired: true, acknowledged: false, link: '/app/actions',
      });
    }

    // Sort: critical first, then warning, info, success
    const severityOrder: Record<AlertSeverity, number> = { critical: 0, warning: 1, info: 2, success: 3 };
    result.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);
    return result;
  }, [forecasts, inventory, recommendations]);

  const acknowledge = (id: string) => {
    setAcknowledgedIds(prev => new Set(prev).add(id));
  };

  const acknowledgeAll = () => {
    setAcknowledgedIds(new Set(alerts.map(a => a.id)));
  };

  const filteredAlerts = alerts.filter(a => {
    if (filter !== 'all' && a.severity !== filter) return false;
    if (!showAcknowledged && acknowledgedIds.has(a.id)) return false;
    return true;
  });

  const countBySeverity = (s: AlertSeverity) => alerts.filter(a => a.severity === s && !acknowledgedIds.has(a.id)).length;

  return (
    <div className="space-y-6 p-1">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2" style={{ color: '#192820' }}>
            <Bell className="w-6 h-6" style={{ color: '#235A43' }} />
            Alert Center
            {alerts.length - acknowledgedIds.size > 0 && (
              <span className="ml-2 px-2 py-0.5 rounded-full text-xs font-semibold text-white" style={{ backgroundColor: '#C75D4B' }}>
                {alerts.length - acknowledgedIds.size}
              </span>
            )}
          </h1>
          <p className="text-sm mt-1" style={{ color: '#63716A' }}>Real-time alerts generated from inventory analysis</p>
        </div>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1.5 text-xs cursor-pointer" style={{ color: '#63716A' }}>
            <input type="checkbox" checked={showAcknowledged} onChange={(e) => setShowAcknowledged(e.target.checked)} className="accent-[#235A43]" />
            Show dismissed
          </label>
          <button onClick={acknowledgeAll} className="px-3 py-1.5 rounded-lg border text-xs font-medium hover:shadow-sm transition-all"
            style={{ borderColor: '#DDE5DC', color: '#63716A' }}>
            <Check className="inline w-3 h-3 mr-1" /> Dismiss All
          </button>
        </div>
      </div>

      {/* Severity summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {([
          { severity: 'critical' as AlertSeverity, label: 'Critical', icon: ShieldAlert, color: '#C75D4B' },
          { severity: 'warning' as AlertSeverity, label: 'Warning', icon: AlertTriangle, color: '#D99239' },
          { severity: 'info' as AlertSeverity, label: 'Info', icon: Bell, color: '#235A43' },
          { severity: 'success' as AlertSeverity, label: 'Resolved', icon: CheckCircle, color: '#70A77B' },
        ]).map((s) => (
          <button key={s.severity} onClick={() => setFilter(filter === s.severity ? 'all' : s.severity)}
            className={`rounded-xl border p-3 text-center transition-all hover:shadow-sm ${filter === s.severity ? 'ring-2' : ''}`}
            style={{ borderColor: filter === s.severity ? s.color : '#DDE5DC' }}>
            <s.icon className="w-5 h-5 mx-auto mb-1" style={{ color: s.color }} />
            <p className="text-lg font-bold" style={{ color: '#192820' }}>{countBySeverity(s.severity)}</p>
            <p className="text-xs" style={{ color: '#63716A' }}>{s.label}</p>
          </button>
        ))}
      </div>

      {/* Alert list */}
      {filteredAlerts.length === 0 ? (
        <GlassCard className="p-12 text-center">
          <CheckCircle className="w-12 h-12 mx-auto mb-3" style={{ color: '#70A77B' }} />
          <p className="text-lg font-medium" style={{ color: '#192820' }}>All Clear</p>
          <p className="text-sm mt-1" style={{ color: '#63716A' }}>
            {filter !== 'all' ? `No ${filter} alerts.` : 'No active alerts. All inventory is within normal parameters.'}
          </p>
        </GlassCard>
      ) : (
        <div className="space-y-3">
          <AnimatePresence mode="popLayout">
            {filteredAlerts.map((alert, idx) => {
              const colors = getSeverityColors(alert.severity);
              const isAcknowledged = acknowledgedIds.has(alert.id);

              return (
                <motion.div key={alert.id} layout
                  initial={{ opacity: 0, x: -12 }} animate={{ opacity: isAcknowledged ? 0.5 : 1, x: 0 }}
                  exit={{ opacity: 0, x: 12 }} transition={{ duration: 0.25, delay: idx * 0.03 }}
                  className="rounded-xl border p-4 transition-all hover:shadow-sm"
                  style={{ borderColor: colors.border, borderLeftWidth: 4, backgroundColor: isAcknowledged ? '#FAF9F5' : colors.bg }}>
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-0.5">{getAlertIcon(alert.severity)}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="text-sm font-semibold" style={{ color: '#192820' }}>{alert.title}</h3>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          {alert.actionRequired && !isAcknowledged && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold text-white" style={{ backgroundColor: colors.badge }}>
                              ACTION REQUIRED
                            </span>
                          )}
                        </div>
                      </div>
                      <p className="text-xs mt-1" style={{ color: '#63716A' }}>{alert.message}</p>
                      {alert.batchId && (
                        <p className="text-xs mt-1" style={{ color: '#63716A' }}>Batch: {alert.batchId}</p>
                      )}
                      <div className="flex items-center gap-3 mt-2">
                        {alert.link && !isAcknowledged && (
                          <button onClick={() => navigate(alert.link!)}
                            className="text-xs font-semibold flex items-center gap-1 transition-all hover:underline"
                            style={{ color: '#235A43' }}>
                            Take Action <ArrowRight className="w-3 h-3" />
                          </button>
                        )}
                        {!isAcknowledged && (
                          <button onClick={() => acknowledge(alert.id)}
                            className="text-xs flex items-center gap-1 transition-all hover:underline"
                            style={{ color: '#63716A' }}>
                            <XCircle className="w-3 h-3" /> Dismiss
                          </button>
                        )}
                      </div>
                    </div>
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

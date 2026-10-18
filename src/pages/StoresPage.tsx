import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Building2,
  ArrowRightLeft,
  Truck,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  MapPin,
  Clock,
  DollarSign,
  Plus,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import { storage } from '../services/storage';
import { analyzeInventory } from '../domain/forecasting/engine';
import { useToast } from '../context/ToastContext';
import { GlassCard } from '../components/ui';
import type { InventoryItem } from '../types';

export interface StoreLocation {
  id: string;
  name: string;
  code: string;
  address: string;
  distanceKm: number;
  transitHours: number;
  manager: string;
  currentStockUnits: number;
  stockHealthPct: number;
  demandIndex: number; // 1.0 = average, 1.4 = high demand
}

export interface InterStoreTransfer {
  id: string;
  sourceStoreId: string;
  sourceStoreName: string;
  targetStoreId: string;
  targetStoreName: string;
  productId: string;
  productName: string;
  batchId: string;
  quantity: number;
  unit: string;
  status: 'suggested' | 'approved' | 'in_transit' | 'completed';
  createdAt: string;
  estimatedTransitCost: number;
  salvagedValue: number;
  urgencyDays: number;
}

const DEMO_STORES: StoreLocation[] = [
  {
    id: 'store-01',
    name: 'GreenBasket Flagship (Bandra West)',
    code: 'GB-MUM-01',
    address: 'Linking Road, Bandra West, Mumbai',
    distanceKm: 0,
    transitHours: 0,
    manager: 'Priya Sharma',
    currentStockUnits: 2840,
    stockHealthPct: 88,
    demandIndex: 1.1,
  },
  {
    id: 'store-02',
    name: 'GreenBasket Express (Andheri East)',
    code: 'GB-MUM-02',
    address: 'MIDC Cross Road, Andheri East, Mumbai',
    distanceKm: 11.4,
    transitHours: 1.5,
    manager: 'Rajesh Nair',
    currentStockUnits: 1420,
    stockHealthPct: 76,
    demandIndex: 1.45, // High demand! Perfect receiver for surplus
  },
  {
    id: 'store-03',
    name: 'GreenBasket Fresh (Powai Hiranandani)',
    code: 'GB-MUM-03',
    address: 'Central Avenue, Hiranandani Gardens, Powai',
    distanceKm: 16.8,
    transitHours: 2.0,
    manager: 'Sneha Roy',
    currentStockUnits: 1980,
    stockHealthPct: 92,
    demandIndex: 1.25,
  },
  {
    id: 'store-04',
    name: 'GreenBasket Metro (Colaba Causeway)',
    code: 'GB-MUM-04',
    address: 'Shahid Bhagat Singh Rd, Colaba, Mumbai',
    distanceKm: 21.0,
    transitHours: 2.5,
    manager: 'Farhan Merchant',
    currentStockUnits: 1150,
    stockHealthPct: 81,
    demandIndex: 1.35,
  },
];

const INITIAL_TRANSFERS: InterStoreTransfer[] = [
  {
    id: 'tr-01',
    sourceStoreId: 'store-01',
    sourceStoreName: 'GreenBasket Flagship (Bandra)',
    targetStoreId: 'store-02',
    targetStoreName: 'GreenBasket Express (Andheri)',
    productId: 'demo-prod-02',
    productName: 'Vine-Ripened Hybrid Tomatoes',
    batchId: 'BATCH-PROD-TOM-02-B',
    quantity: 45,
    unit: 'kg',
    status: 'in_transit',
    createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
    estimatedTransitCost: 280,
    salvagedValue: 1890,
    urgencyDays: 2.5,
  },
  {
    id: 'tr-02',
    sourceStoreId: 'store-01',
    sourceStoreName: 'GreenBasket Flagship (Bandra)',
    targetStoreId: 'store-03',
    targetStoreName: 'GreenBasket Fresh (Powai)',
    productId: 'demo-dairy-01',
    productName: 'Pasteurized Toned Milk (1L Pouch)',
    batchId: 'BATCH-DAIR-MLK-01-A',
    quantity: 40,
    unit: 'units',
    status: 'suggested',
    createdAt: new Date(Date.now() - 1800000).toISOString(),
    estimatedTransitCost: 190,
    salvagedValue: 2640,
    urgencyDays: 1.0,
  },
];

export default function StoresPage() {
  const { success, info } = useToast();
  const [transfers, setTransfers] = useState<InterStoreTransfer[]>(INITIAL_TRANSFERS);
  const [selectedStore, setSelectedStore] = useState<StoreLocation>(DEMO_STORES[0]);
  const [showNewTransferModal, setShowNewTransferModal] = useState(false);

  // New transfer form inputs
  const [newProductId, setNewProductId] = useState('');
  const [newTargetStoreId, setNewTargetStoreId] = useState(DEMO_STORES[1].id);
  const [newQuantity, setNewQuantity] = useState('');

  const inventory = storage.getInventory();
  const settings = storage.getSettings();
  const forecasts = useMemo(() => analyzeInventory(inventory, settings), [inventory, settings]);

  // Find candidate items that have surplus and > 1.5 days shelf life (safe to transfer)
  const transferCandidates = useMemo(() => {
    return forecasts
      .filter((f) => f.expectedSurplus > 5 && f.daysRemaining >= 1.5)
      .map((f) => {
        const item = inventory.find((i) => i.id === f.productId);
        return { forecast: f, item };
      })
      .filter((c): c is { forecast: typeof c.forecast; item: InventoryItem } => !!c.item);
  }, [forecasts, inventory]);

  const handleApproveTransfer = (transferId: string) => {
    setTransfers((prev) =>
      prev.map((t) => (t.id === transferId ? { ...t, status: 'in_transit' as const } : t))
    );
    success('Transfer dispatched! Refrigerated fleet notified.');
  };

  const handleCompleteTransfer = (transferId: string) => {
    setTransfers((prev) =>
      prev.map((t) => (t.id === transferId ? { ...t, status: 'completed' as const } : t))
    );
    success('Transfer received and integrated into destination inventory.');
  };

  const handleCreateTransfer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProductId || !newQuantity || Number(newQuantity) <= 0) {
      info('Please select a product and enter a valid transfer quantity.');
      return;
    }

    const candidate = transferCandidates.find((c) => c.item.id === newProductId);
    const targetStore = DEMO_STORES.find((s) => s.id === newTargetStoreId);

    if (!candidate || !targetStore) return;

    const qty = Math.min(Number(newQuantity), candidate.item.quantity);
    const estCost = Math.round(150 + targetStore.distanceKm * 12);
    const salvaged = Math.round(qty * candidate.item.sellingPrice);

    const newTr: InterStoreTransfer = {
      id: `tr-${Date.now().toString(36)}`,
      sourceStoreId: selectedStore.id,
      sourceStoreName: selectedStore.name,
      targetStoreId: targetStore.id,
      targetStoreName: targetStore.name,
      productId: candidate.item.id,
      productName: candidate.item.name,
      batchId: candidate.item.batchId,
      quantity: qty,
      unit: candidate.item.unit,
      status: 'suggested',
      createdAt: new Date().toISOString(),
      estimatedTransitCost: estCost,
      salvagedValue: salvaged,
      urgencyDays: candidate.forecast.daysRemaining,
    };

    setTransfers((prev) => [newTr, ...prev]);
    setShowNewTransferModal(false);
    setNewProductId('');
    setNewQuantity('');
    success(`Transfer order proposed for ${candidate.item.name} to ${targetStore.name}`);
  };

  const totalSalvagedThroughTransfers = useMemo(() => {
    return transfers
      .filter((t) => t.status === 'completed' || t.status === 'in_transit')
      .reduce((sum, t) => sum + (t.salvagedValue - t.estimatedTransitCost), 0);
  }, [transfers]);

  return (
    <div className="space-y-6 p-1">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2" style={{ color: '#192820' }}>
            <Building2 className="w-6 h-6" style={{ color: '#235A43' }} />
            Multi-Store Balancing & Transfers
          </h1>
          <p className="text-sm mt-1" style={{ color: '#63716A' }}>
            Coordinate perishable stock balancing across the GreenBasket regional network
          </p>
        </div>

        <button
          onClick={() => setShowNewTransferModal(true)}
          className="px-4 py-2.5 rounded-xl text-white text-xs font-semibold flex items-center gap-2 transition-all hover:opacity-95 shadow-xs"
          style={{ backgroundColor: '#235A43' }}
        >
          <Plus className="w-4 h-4" /> Propose New Transfer
        </button>
      </div>

      {/* Network Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {DEMO_STORES.map((store) => {
          const isSelected = selectedStore.id === store.id;
          return (
            <GlassCard
              key={store.id}
              onClick={() => setSelectedStore(store)}
              className={`p-4 cursor-pointer transition-all hover:shadow-md ${
                isSelected ? 'ring-2' : ''
              }`}
              style={{
                borderColor: isSelected ? '#235A43' : '#DDE5DC',
              }}
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded bg-[#FAF9F5] border border-[#DDE5DC] text-[#63716A]">
                    {store.code}
                  </span>
                  <h3 className="font-semibold text-sm mt-2" style={{ color: '#192820' }}>
                    {store.name}
                  </h3>
                </div>
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold"
                  style={{
                    backgroundColor: store.stockHealthPct >= 85 ? '#E9F2E8' : '#FEF6E8',
                    color: store.stockHealthPct >= 85 ? '#235A43' : '#D99239',
                  }}
                >
                  {store.stockHealthPct}%
                </div>
              </div>

              <div className="mt-3 text-xs space-y-1" style={{ color: '#63716A' }}>
                <p className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5" />
                  {store.distanceKm === 0 ? 'Home Facility' : `${store.distanceKm} km away`}
                </p>
                <p className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  {store.transitHours === 0 ? 'Local' : `~${store.transitHours}h transit`}
                </p>
                <p className="flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5" />
                  Demand Velocity:{' '}
                  <span
                    className="font-semibold"
                    style={{ color: store.demandIndex > 1.3 ? '#235A43' : '#192820' }}
                  >
                    {store.demandIndex > 1.3 ? 'High Absorptive (145%)' : 'Balanced'}
                  </span>
                </p>
              </div>
            </GlassCard>
          );
        })}
      </div>

      {/* Transfer Pipeline & Financial Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <GlassCard className="p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-[#E9F2E8] flex items-center justify-center shrink-0">
            <DollarSign className="w-6 h-6 text-[#235A43]" />
          </div>
          <div>
            <p className="text-xs text-[#63716A]">Net Value Rescued (Transfers)</p>
            <p className="text-xl font-bold text-[#192820]">
              ₹{totalSalvagedThroughTransfers.toLocaleString('en-IN')}
            </p>
            <p className="text-[11px] text-[#235A43]">After transit & refrigeration logistics</p>
          </div>
        </GlassCard>

        <GlassCard className="p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-[#FEF6E8] flex items-center justify-center shrink-0">
            <Truck className="w-6 h-6 text-[#D99239]" />
          </div>
          <div>
            <p className="text-xs text-[#63716A]">Active Network Dispatches</p>
            <p className="text-xl font-bold text-[#192820]">
              {transfers.filter((t) => t.status === 'in_transit').length} In Transit
            </p>
            <p className="text-[11px] text-[#63716A]">Cold-chain route monitoring active</p>
          </div>
        </GlassCard>

        <GlassCard className="p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-[#E9F2E8] flex items-center justify-center shrink-0">
            <ShieldCheck className="w-6 h-6 text-[#235A43]" />
          </div>
          <div>
            <p className="text-xs text-[#63716A]">Automated Candidate Batches</p>
            <p className="text-xl font-bold text-[#192820]">{transferCandidates.length} Eligible</p>
            <p className="text-[11px] text-[#63716A]">Surplus items with &ge; 1.5d transit safety</p>
          </div>
        </GlassCard>
      </div>

      {/* Transfer Orders Queue */}
      <div className="bg-white rounded-2xl border p-6" style={{ borderColor: '#DDE5DC' }}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold flex items-center gap-2" style={{ color: '#192820' }}>
            <ArrowRightLeft className="w-5 h-5 text-[#235A43]" />
            Inter-Store Transfer Orders
          </h2>
          <span className="text-xs px-2.5 py-1 rounded-full bg-[#FAF9F5] border border-[#DDE5DC] text-[#63716A]">
            {transfers.length} Total Orders
          </span>
        </div>

        {transfers.length === 0 ? (
          <div className="text-center py-12 text-[#63716A] text-sm">
            No store transfers recorded yet.
          </div>
        ) : (
          <div className="space-y-3">
            <AnimatePresence>
              {transfers.map((tr) => (
                <motion.div
                  key={tr.id}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="rounded-xl border p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all hover:shadow-xs"
                  style={{ borderColor: '#DDE5DC', backgroundColor: '#FAF9F5' }}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
                      style={{
                        backgroundColor:
                          tr.status === 'completed'
                            ? '#E9F2E8'
                            : tr.status === 'in_transit'
                            ? '#FEF6E8'
                            : '#FAF9F5',
                        border: '1px solid #DDE5DC',
                      }}
                    >
                      {tr.status === 'completed' ? (
                        <CheckCircle2 className="w-5 h-5 text-[#235A43]" />
                      ) : (
                        <Truck
                          className="w-5 h-5"
                          style={{
                            color: tr.status === 'in_transit' ? '#D99239' : '#63716A',
                          }}
                        />
                      )}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold text-sm" style={{ color: '#192820' }}>
                          {tr.productName}
                        </h4>
                        <span
                          className="text-[10px] font-bold px-2 py-0.5 rounded uppercase"
                          style={{
                            backgroundColor:
                              tr.status === 'completed'
                                ? '#E9F2E8'
                                : tr.status === 'in_transit'
                                ? '#FEF6E8'
                                : '#F0EDE5',
                            color:
                              tr.status === 'completed'
                                ? '#235A43'
                                : tr.status === 'in_transit'
                                ? '#D99239'
                                : '#63716A',
                          }}
                        >
                          {tr.status.replace('_', ' ')}
                        </span>
                      </div>

                      <p className="text-xs text-[#63716A] mt-1">
                        <span className="font-medium text-[#192820]">
                          {tr.quantity} {tr.unit}
                        </span>{' '}
                        &bull; {tr.batchId}
                      </p>

                      <div className="flex items-center gap-2 mt-1.5 text-xs text-[#63716A]">
                        <span>{tr.sourceStoreName}</span>
                        <ArrowRight className="w-3.5 h-3.5 text-[#235A43]" />
                        <span className="font-medium text-[#192820]">{tr.targetStoreName}</span>
                      </div>
                    </div>
                  </div>

                  {/* Financial Metrics & Actions */}
                  <div className="flex items-center justify-between md:justify-end gap-6 pt-2 md:pt-0 border-t md:border-t-0 border-[#DDE5DC]">
                    <div className="text-right">
                      <p className="text-xs text-[#63716A]">Gross Salvage</p>
                      <p className="text-sm font-bold text-[#235A43]">
                        +₹{tr.salvagedValue.toLocaleString('en-IN')}
                      </p>
                      <p className="text-[10px] text-[#63716A]">
                        Transit cost: ₹{tr.estimatedTransitCost}
                      </p>
                    </div>

                    <div>
                      {tr.status === 'suggested' && (
                        <button
                          onClick={() => handleApproveTransfer(tr.id)}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-[#235A43] hover:opacity-90 transition-all flex items-center gap-1.5"
                        >
                          Dispatch <Truck className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {tr.status === 'in_transit' && (
                        <button
                          onClick={() => handleCompleteTransfer(tr.id)}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold text-[#235A43] bg-[#E9F2E8] border border-[#235A43] hover:bg-[#d8e8d6] transition-all flex items-center gap-1.5"
                        >
                          Confirm Receipt <CheckCircle2 className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {tr.status === 'completed' && (
                        <span className="text-xs font-medium text-[#235A43] flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Rebalanced
                        </span>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Propose Transfer Modal */}
      {showNewTransferModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-[#DDE5DC]"
          >
            <div className="flex items-center justify-between pb-3 border-b border-[#DDE5DC]">
              <h3 className="font-bold text-base text-[#192820] flex items-center gap-2">
                <Truck className="w-5 h-5 text-[#235A43]" />
                Propose Inter-Store Stock Transfer
              </h3>
              <button
                onClick={() => setShowNewTransferModal(false)}
                className="text-[#63716A] hover:text-[#192820]"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleCreateTransfer} className="space-y-4 mt-4 text-xs">
              <div>
                <label className="block font-medium text-[#192820] mb-1">
                  Source Surplus Batch *
                </label>
                <select
                  value={newProductId}
                  onChange={(e) => {
                    setNewProductId(e.target.value);
                    const cand = transferCandidates.find((c) => c.item.id === e.target.value);
                    if (cand) {
                      setNewQuantity(String(Math.min(cand.forecast.expectedSurplus, cand.item.quantity)));
                    }
                  }}
                  className="w-full px-3 py-2 rounded-xl border border-[#DDE5DC] bg-[#FAF9F5] text-xs text-[#192820]"
                >
                  <option value="">Select candidate batch...</option>
                  {transferCandidates.map((c) => (
                    <option key={c.item.id} value={c.item.id}>
                      {c.item.name} &bull; Surplus: {c.forecast.expectedSurplus} {c.item.unit} (
                      {c.forecast.daysRemaining}d left)
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-[#63716A] mt-1">
                  Only items with &ge; 1.5 days shelf-life are eligible for safe refrigerated
                  transit.
                </p>
              </div>

              <div>
                <label className="block font-medium text-[#192820] mb-1">
                  Destination Store *
                </label>
                <select
                  value={newTargetStoreId}
                  onChange={(e) => setNewTargetStoreId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[#DDE5DC] bg-[#FAF9F5] text-xs text-[#192820]"
                >
                  {DEMO_STORES.filter((s) => s.id !== selectedStore.id).map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.distanceKm} km &bull; {s.demandIndex > 1.3 ? '🔥 High Demand' : 'Normal'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-medium text-[#192820] mb-1">
                  Transfer Quantity *
                </label>
                <input
                  type="number"
                  min="1"
                  value={newQuantity}
                  onChange={(e) => setNewQuantity(e.target.value)}
                  placeholder="Units to transfer"
                  className="w-full px-3 py-2 rounded-xl border border-[#DDE5DC] bg-[#FAF9F5] text-xs text-[#192820]"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowNewTransferModal(false)}
                  className="px-4 py-2 rounded-xl border border-[#DDE5DC] text-[#63716A] hover:bg-[#FAF9F5]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-white font-semibold bg-[#235A43] hover:opacity-95"
                >
                  Confirm Transfer
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}

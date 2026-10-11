import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  HeartHandshake,
  Building2,
  Calendar,
  Clock,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Truck,
  Sparkles,
  ChevronRight,
  ShieldAlert,
  Send,
  Phone,
  Mail,
  User,
  Package,
  Layers,
  ArrowRight,
  AlertCircle,
  Check,
  X,
} from 'lucide-react';
import type {
  InventoryItem,
  DonationPartner,
  DonationOffer,
  AppSettings,
} from '../types';
import { storage } from '../services/storage';
import {
  validateDonationEligibility,
  matchDonationPartners,
  createDonationOffer,
} from '../domain/donations/engine';
import {
  formatDate,
  formatRelativeDate,
  formatNumber,
} from '../utils/format';
import { useToast } from '../context/ToastContext';

export default function DonationsPage() {
  const { success, warning, info } = useToast();
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [partners, setPartners] = useState<DonationPartner[]>([]);
  const [offers, setOffers] = useState<DonationOffer[]>([]);
  const [settings, setSettings] = useState<AppSettings>(storage.getSettings());

  // Selected candidate and partner for donation workflow
  const [selectedCandidate, setSelectedCandidate] = useState<InventoryItem | null>(null);
  const [selectedPartner, setSelectedPartner] = useState<DonationPartner | null>(null);
  const [offerQuantity, setOfferQuantity] = useState<number>(1);
  const [pickupDate, setPickupDate] = useState<string>('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    const inv = storage.getInventory();
    const pts = storage.getPartners();
    const ofs = storage.getDonationOffers();
    const set = storage.getSettings();

    setInventory(inv);
    setPartners(pts);
    setOffers(ofs);
    setSettings(set);

    // Default pickup date to tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setPickupDate(tomorrow.toISOString().split('T')[0]);
  };

  // Compute eligibility for each inventory item
  const candidateItemsWithEligibility = useMemo(() => {
    return inventory.map((item) => {
      const eligibility = validateDonationEligibility(item, settings);
      return {
        item,
        eligible: eligibility.eligible,
        reason: eligibility.reason,
      };
    });
  }, [inventory, settings]);

  // Match scores when candidate is selected
  const partnerMatches = useMemo(() => {
    if (!selectedCandidate) {
      return partners.map((p) => ({
        partner: p,
        score: 0,
        rationale: 'Select a candidate product on the left to compute compatibility scores.',
      }));
    }
    return matchDonationPartners(selectedCandidate, partners);
  }, [selectedCandidate, partners]);

  const bestPartnerId = useMemo(() => {
    if (!partnerMatches || partnerMatches.length === 0) return null;
    const activeValid = partnerMatches.filter((m) => m.score > 0);
    return activeValid.length > 0 ? activeValid[0].partner.id : null;
  }, [partnerMatches]);

  const handleSelectCandidate = (item: InventoryItem) => {
    setSelectedCandidate(item);
    const maxQty = Math.max(1, Math.min(item.quantity, selectedPartner?.maxQuantity || item.quantity));
    setOfferQuantity(maxQty);

    // Auto-select top match if available
    const matches = matchDonationPartners(item, partners);
    if (matches.length > 0 && matches[0].score > 0) {
      setSelectedPartner(matches[0].partner);
    }
  };

  const handleCreateOffer = () => {
    if (!selectedCandidate || !selectedPartner) {
      warning('Please choose both an eligible candidate product and a destination partner.');
      return;
    }

    if (offerQuantity <= 0 || offerQuantity > selectedCandidate.quantity) {
      warning(`Quantity must be between 1 and ${selectedCandidate.quantity}`);
      return;
    }

    if (!pickupDate) {
      warning('Please choose a scheduled pickup date.');
      return;
    }

    const newOffer = createDonationOffer(
      selectedPartner.id,
      selectedCandidate.id,
      selectedCandidate.batchId,
      offerQuantity,
      new Date(pickupDate).toISOString()
    );

    const updatedOffers = [newOffer, ...offers];
    storage.setDonationOffers(updatedOffers);
    setOffers(updatedOffers);

    // Also deduct donated quantity from inventory surplus to avoid double commitment
    const updatedInventory = inventory.map((inv) => {
      if (inv.id === selectedCandidate.id) {
        return {
          ...inv,
          quantity: Math.max(0, inv.quantity - offerQuantity),
          lastUpdated: new Date().toISOString(),
        };
      }
      return inv;
    });
    storage.setInventory(updatedInventory);
    setInventory(updatedInventory);

    success(`Created donation offer for ${offerQuantity} ${selectedCandidate.unit} with ${selectedPartner.name}`);

    // Reset selection
    setSelectedCandidate(null);
    setSelectedPartner(null);
  };

  const handleUpdateOfferStatus = (
    offerId: string,
    newStatus: DonationOffer['status']
  ) => {
    const now = new Date().toISOString();
    const updated = offers.map((o) => {
      if (o.id === offerId) {
        return {
          ...o,
          status: newStatus,
          updatedAt: now,
        };
      }
      return o;
    });

    storage.setDonationOffers(updated);
    setOffers(updated);

    const offerObj = offers.find((o) => o.id === offerId);
    const partnerObj = partners.find((p) => p.id === offerObj?.partnerId);

    if (newStatus === 'accepted') {
      success(`Offer marked as accepted by ${partnerObj?.name || 'partner'}`);
    } else if (newStatus === 'picked_up') {
      success(`Surplus confirmed picked up and rescued!`);
    } else if (newStatus === 'cancelled') {
      info(`Donation offer cancelled`);
    }
  };

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
          Surplus <span className="text-gradient-primary">Donation Coordinator</span>
        </h1>
        <p className="text-ws-text-secondary mt-1 text-sm sm:text-base">
          Match edible excess stock with registered regional food banks, charities, and community kitchens.
        </p>
      </div>

      {/* Safety Policy Notice */}
      <div className="bg-ws-bg-card border border-ws-border rounded-xl p-4 flex items-start gap-3 text-xs sm:text-sm text-ws-text-secondary">
        <ShieldAlert className="w-5 h-5 text-ws-primary shrink-0 mt-0.5" />
        <div className="space-y-0.5">
          <span className="font-semibold text-ws-text">Automated Food Safety Protocol Active</span>
          <p>
            Items expiring in under {settings.donationEligibilityDays} days, or marked with 'compromised'/'expired' status, are strictly locked from donation distribution to ensure food safety compliance.
          </p>
        </div>
      </div>

      {/* Two-Panel Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Panel: Donation Candidates (6 cols) */}
        <div className="lg:col-span-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base sm:text-lg font-bold text-ws-text flex items-center gap-2">
              <Package className="w-5 h-5 text-ws-primary" />
              Donation Candidates
            </h2>
            <span className="text-xs text-ws-text-muted">
              {candidateItemsWithEligibility.filter((c) => c.eligible).length} Eligible
            </span>
          </div>

          <div className="space-y-3 max-h-[620px] overflow-y-auto pr-1">
            {candidateItemsWithEligibility.length === 0 ? (
              <div className="glass-card p-8 text-center border border-ws-border text-ws-text-muted text-sm">
                No inventory items found. Add items or reset to demo data.
              </div>
            ) : (
              candidateItemsWithEligibility.map(({ item, eligible, reason }) => {
                const isSelected = selectedCandidate?.id === item.id;

                return (
                  <div
                    key={item.id}
                    className={`rounded-xl border p-4 transition-all ${
                      isSelected
                        ? 'border-ws-primary ring-1 ring-ws-primary bg-ws-bg-card-hover'
                        : eligible
                        ? 'border-ws-border bg-ws-bg-card hover:bg-ws-bg-card-hover'
                        : 'border-ws-border/40 bg-ws-bg-darkest/40 opacity-60'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-ws-text text-sm sm:text-base">
                            {item.name}
                          </h3>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase ${
                              eligible
                                ? 'bg-ws-primary/20 text-ws-primary border border-ws-primary/30'
                                : 'bg-ws-coral/15 text-ws-coral border border-ws-coral/30'
                            }`}
                          >
                            {eligible ? 'Eligible' : 'Ineligible'}
                          </span>
                        </div>
                        <div className="text-xs text-ws-text-muted mt-0.5 flex flex-wrap gap-x-2">
                          <span>{item.category}</span>
                          <span>•</span>
                          <span>
                            {item.quantity} {item.unit} available
                          </span>
                        </div>
                      </div>

                      {eligible && (
                        <button
                          type="button"
                          onClick={() => handleSelectCandidate(item)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                            isSelected
                              ? 'bg-ws-primary text-ws-bg-darkest'
                              : 'bg-ws-bg-elevated hover:bg-ws-primary/20 text-ws-text hover:text-ws-primary'
                          }`}
                        >
                          {isSelected ? 'Selected' : 'Select'}
                        </button>
                      )}
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-ws-border/40 grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                      <div>
                        <span className="text-ws-text-muted">Expiry:</span>
                        <div className="text-ws-text font-medium">{formatDate(item.expiryDate)}</div>
                      </div>
                      <div>
                        <span className="text-ws-text-muted">Window:</span>
                        <div className="text-ws-amber font-medium">
                          {formatRelativeDate(item.expiryDate)}
                        </div>
                      </div>
                      <div>
                        <span className="text-ws-text-muted">Condition:</span>
                        <div className="text-ws-text capitalize">{item.qualityStatus}</div>
                      </div>
                    </div>

                    {!eligible && (
                      <div className="mt-2.5 text-xs text-ws-coral/90 flex items-center gap-1.5 bg-ws-coral/10 p-2 rounded-lg">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        <span>{reason}</span>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Panel: Partner Organizations (6 cols) */}
        <div className="lg:col-span-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base sm:text-lg font-bold text-ws-text flex items-center gap-2">
              <Building2 className="w-5 h-5 text-ws-primary" />
              Partner Organizations
            </h2>
            <span className="text-xs text-ws-text-muted">{partners.length} Partners</span>
          </div>

          <div className="space-y-3 max-h-[620px] overflow-y-auto pr-1">
            {partnerMatches.length === 0 ? (
              <div className="glass-card p-8 text-center border border-ws-border text-ws-text-muted text-sm">
                No active donation partners registered.
              </div>
            ) : (
              partnerMatches.map(({ partner, score, rationale }) => {
                const isSelected = selectedPartner?.id === partner.id;
                const isTopMatch = bestPartnerId === partner.id && selectedCandidate !== null;

                return (
                  <div
                    key={partner.id}
                    onClick={() => setSelectedPartner(partner)}
                    className={`rounded-xl border p-4 cursor-pointer transition-all ${
                      isSelected
                        ? 'border-ws-primary ring-1 ring-ws-primary bg-ws-bg-card-hover'
                        : isTopMatch
                        ? 'border-ws-primary/50 bg-ws-primary/5 hover:bg-ws-bg-card-hover'
                        : 'border-ws-border bg-ws-bg-card hover:bg-ws-bg-card-hover'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-ws-text text-sm sm:text-base">
                            {partner.name}
                          </h3>
                          {isTopMatch && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-ws-lime/20 text-ws-lime border border-ws-lime/30 flex items-center gap-1">
                              <Sparkles className="w-3 h-3" /> TOP MATCH
                            </span>
                          )}
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-semibold capitalize ${
                              partner.operatingStatus === 'active'
                                ? 'bg-ws-primary/15 text-ws-primary'
                                : 'bg-ws-amber/15 text-ws-amber'
                            }`}
                          >
                            {partner.operatingStatus}
                          </span>
                        </div>
                        <p className="text-xs text-ws-text-muted mt-0.5 flex items-center gap-1">
                          <MapPin className="w-3 h-3" /> {partner.address} • {partner.distance} miles away
                        </p>
                      </div>

                      {selectedCandidate && (
                        <div className="text-right">
                          <div className="text-xs text-ws-text-muted">Compatibility</div>
                          <div
                            className={`text-lg font-bold ${
                              score >= 70
                                ? 'text-ws-lime'
                                : score >= 40
                                ? 'text-ws-amber'
                                : 'text-ws-text-muted'
                            }`}
                          >
                            {score}%
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Categories Accepted */}
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {partner.categories.map((cat, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 rounded-md bg-ws-bg-elevated text-[11px] text-ws-text-secondary"
                        >
                          {cat}
                        </span>
                      ))}
                    </div>

                    {/* Operational Details */}
                    <div className="mt-3 pt-2.5 border-t border-ws-border/40 grid grid-cols-2 gap-2 text-xs text-ws-text-muted">
                      <div>
                        Pickup Days: <span className="text-ws-text">{partner.pickupDays.join(', ')}</span>
                      </div>
                      <div>
                        Max Capacity: <span className="text-ws-text">{partner.maxQuantity} units</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Phone className="w-3 h-3" /> {partner.contactInfo.phone}
                      </div>
                      <div className="flex items-center gap-1">
                        <Mail className="w-3 h-3 truncate" /> {partner.contactInfo.email}
                      </div>
                    </div>

                    {selectedCandidate && (
                      <div className="mt-2.5 text-xs text-ws-text-secondary bg-ws-bg-darkest/60 p-2 rounded-lg border border-ws-border/40">
                        <span className="font-medium text-ws-primary">Match Rationale: </span>
                        {rationale}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Donation Matching Execution Section (When item + partner selected) */}
      <AnimatePresence>
        {selectedCandidate && selectedPartner && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="glass-card border border-ws-primary/50 p-6 rounded-2xl glow-primary"
          >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-ws-border">
              <div>
                <span className="text-xs font-semibold text-ws-primary uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4" /> Ready to Dispatch Surplus
                </span>
                <h3 className="text-xl font-bold text-ws-text mt-0.5">
                  {selectedCandidate.name} ➔ {selectedPartner.name}
                </h3>
                <p className="text-xs text-ws-text-secondary mt-1">
                  Batch {selectedCandidate.batchId} • Destination: {selectedPartner.address}
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setSelectedCandidate(null);
                  setSelectedPartner(null);
                }}
                className="p-1 rounded-lg text-ws-text-muted hover:text-ws-text hover:bg-ws-bg-elevated self-end md:self-auto"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 my-5">
              <div>
                <label className="block text-xs font-semibold text-ws-text-secondary mb-1">
                  Donation Quantity (Max: {selectedCandidate.quantity} {selectedCandidate.unit})
                </label>
                <input
                  type="number"
                  min={1}
                  max={selectedCandidate.quantity}
                  value={offerQuantity}
                  onChange={(e) => setOfferQuantity(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-ws-bg-elevated border border-ws-border text-ws-text text-sm focus:outline-none focus:border-ws-primary"
                />
                <span className="text-[11px] text-ws-text-muted mt-1 block">
                  Partner can accept up to {selectedPartner.maxQuantity} {selectedCandidate.unit}
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-ws-text-secondary mb-1">
                  Scheduled Pickup Date
                </label>
                <input
                  type="date"
                  value={pickupDate}
                  onChange={(e) => setPickupDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-ws-bg-elevated border border-ws-border text-ws-text text-sm focus:outline-none focus:border-ws-primary"
                />
                <span className="text-[11px] text-ws-text-muted mt-1 block">
                  Operating pickup hours: {selectedPartner.pickupTimeStart} - {selectedPartner.pickupTimeEnd}
                </span>
              </div>

              <div className="flex flex-col justify-end">
                <button
                  type="button"
                  onClick={handleCreateOffer}
                  className="w-full py-2.5 px-4 rounded-xl bg-ws-primary text-ws-bg-darkest font-bold hover:bg-ws-primary-light transition-all shadow-lg hover:shadow-ws-primary/25 flex items-center justify-center gap-2 active:scale-95"
                >
                  <Send className="w-4 h-4" /> Create Donation Offer
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Active Donations & Rescue Logistics */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-ws-text flex items-center gap-2">
            <HeartHandshake className="w-5 h-5 text-ws-primary" />
            Active Donation Offers & Dispatch
          </h2>
          <span className="text-xs text-ws-text-muted">{offers.length} Total Offers</span>
        </div>

        {offers.length === 0 ? (
          <div className="glass-card p-10 text-center border border-ws-border rounded-xl">
            <Truck className="w-10 h-10 text-ws-text-muted mx-auto mb-2" />
            <h4 className="text-base font-semibold text-ws-text">No donation offers recorded</h4>
            <p className="text-xs text-ws-text-secondary mt-1">
              Select an eligible candidate product above to generate an official donation proposal.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {offers.map((offer) => {
              const partner = partners.find((p) => p.id === offer.partnerId);
              const item = inventory.find((i) => i.id === offer.productId);

              return (
                <div
                  key={offer.id}
                  className="glass-card border border-ws-border rounded-xl p-4 flex flex-col justify-between space-y-4"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-mono text-ws-text-muted">
                        {offer.id.slice(0, 14)}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${
                          offer.status === 'picked_up'
                            ? 'bg-ws-lime/20 text-ws-lime border border-ws-lime/30'
                            : offer.status === 'accepted'
                            ? 'bg-ws-primary/20 text-ws-primary border border-ws-primary/30'
                            : offer.status === 'proposed'
                            ? 'bg-ws-amber/20 text-ws-amber border border-ws-amber/30'
                            : 'bg-ws-coral/20 text-ws-coral border border-ws-coral/30'
                        }`}
                      >
                        {offer.status.replace('_', ' ')}
                      </span>
                    </div>

                    <h4 className="font-bold text-ws-text text-base mt-2">
                      {item?.name || 'Surplus Inventory Item'}
                    </h4>
                    <p className="text-xs text-ws-text-secondary mt-0.5 flex items-center gap-1">
                      <Building2 className="w-3.5 h-3.5 text-ws-primary" />
                      Partner: <span className="font-semibold text-ws-text">{partner?.name || 'Unknown Partner'}</span>
                    </p>

                    <div className="mt-3 bg-ws-bg-darkest/60 p-2.5 rounded-lg border border-ws-border/40 text-xs space-y-1">
                      <div className="flex justify-between">
                        <span className="text-ws-text-muted">Quantity:</span>
                        <span className="font-semibold text-ws-text">
                          {formatNumber(offer.quantity)} {item?.unit || 'units'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-ws-text-muted">Scheduled Pickup:</span>
                        <span className="font-semibold text-ws-lime">
                          {formatDate(offer.scheduledPickup)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Status Change Buttons & Timeline */}
                  <div className="pt-2 border-t border-ws-border/40 flex items-center justify-end gap-2">
                    {offer.status === 'proposed' && (
                      <>
                        <button
                          type="button"
                          onClick={() => handleUpdateOfferStatus(offer.id, 'accepted')}
                          className="px-2.5 py-1.5 rounded-lg bg-ws-primary text-ws-bg-darkest text-xs font-semibold hover:bg-ws-primary-light transition-colors"
                        >
                          Mark Accepted
                        </button>
                        <button
                          type="button"
                          onClick={() => handleUpdateOfferStatus(offer.id, 'cancelled')}
                          className="px-2.5 py-1.5 rounded-lg bg-ws-bg-elevated text-ws-coral text-xs font-medium hover:bg-ws-coral/20 transition-colors"
                        >
                          Cancel
                        </button>
                      </>
                    )}

                    {offer.status === 'accepted' && (
                      <button
                        type="button"
                        onClick={() => handleUpdateOfferStatus(offer.id, 'picked_up')}
                        className="px-3 py-1.5 rounded-lg bg-ws-lime text-ws-bg-darkest text-xs font-bold hover:bg-lime-300 transition-colors flex items-center gap-1"
                      >
                        <Check className="w-3.5 h-3.5" /> Confirm Picked Up
                      </button>
                    )}

                    {offer.status === 'picked_up' && (
                      <span className="text-xs text-ws-lime flex items-center gap-1 font-semibold">
                        <CheckCircle2 className="w-4 h-4" /> Picked Up & Rescued
                      </span>
                    )}

                    {offer.status === 'cancelled' && (
                      <span className="text-xs text-ws-coral flex items-center gap-1">
                        <XCircle className="w-4 h-4" /> Cancelled
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </motion.div>
  );
}

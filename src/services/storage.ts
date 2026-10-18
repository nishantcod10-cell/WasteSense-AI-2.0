import type {
  InventoryItem,
  ActionRecommendation,
  DonationOffer,
  DonationPartner,
  AppSettings,
  ForecastResult,
} from '../types/index.ts';
import { generateDemoInventory, generateDemoPartners } from '../data/demoData.ts';

const STORAGE_VERSION = 'ws_v2';

const KEYS = {
  inventory: `${STORAGE_VERSION}_inventory`,
  actions: `${STORAGE_VERSION}_actions`,
  donationOffers: `${STORAGE_VERSION}_donation_offers`,
  partners: `${STORAGE_VERSION}_partners`,
  settings: `${STORAGE_VERSION}_settings`,
  forecasts: `${STORAGE_VERSION}_forecasts`,
} as const;

export const DEFAULT_SETTINGS: AppSettings = {
  storeName: 'WasteSense Demo Store',
  currency: 'INR',
  defaultUnit: 'units',
  riskWeights: {
    surplusRatio: 0.35,
    urgency: 0.35,
    financialValue: 0.2,
    volatility: 0.1,
  },
  markdownFloor: 0.3,
  donationEligibilityDays: 2,
  dataMode: 'demo',
  safetyBufferDays: 1,
};

function safeGetItem<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined' || !window.localStorage) {
    return fallback;
  }
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch (error) {
    console.error(`[WasteSense storage] Failed to get key "${key}":`, error);
    return fallback;
  }
}

function safeSetItem<T>(key: string, value: T): void {
  if (typeof window === 'undefined' || !window.localStorage) {
    return;
  }
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error(`[WasteSense storage] Failed to set key "${key}":`, error);
  }
}

export const storage = {
  getInventory(): InventoryItem[] {
    return safeGetItem<InventoryItem[]>(KEYS.inventory, []);
  },

  setInventory(items: InventoryItem[]): void {
    safeSetItem(KEYS.inventory, items);
  },

  getActions(): ActionRecommendation[] {
    return safeGetItem<ActionRecommendation[]>(KEYS.actions, []);
  },

  setActions(actions: ActionRecommendation[]): void {
    safeSetItem(KEYS.actions, actions);
  },

  getDonationOffers(): DonationOffer[] {
    return safeGetItem<DonationOffer[]>(KEYS.donationOffers, []);
  },

  setDonationOffers(offers: DonationOffer[]): void {
    safeSetItem(KEYS.donationOffers, offers);
  },

  getPartners(): DonationPartner[] {
    return safeGetItem<DonationPartner[]>(KEYS.partners, []);
  },

  setPartners(partners: DonationPartner[]): void {
    safeSetItem(KEYS.partners, partners);
  },

  getSettings(): AppSettings {
    return safeGetItem<AppSettings>(KEYS.settings, DEFAULT_SETTINGS);
  },

  setSettings(settings: AppSettings): void {
    safeSetItem(KEYS.settings, settings);
  },

  getForecasts(): ForecastResult[] {
    return safeGetItem<ForecastResult[]>(KEYS.forecasts, []);
  },

  setForecasts(forecasts: ForecastResult[]): void {
    safeSetItem(KEYS.forecasts, forecasts);
  },

  clearAll(): void {
    if (typeof window === 'undefined' || !window.localStorage) return;
    Object.values(KEYS).forEach((k) => {
      window.localStorage.removeItem(k);
    });
  },

  isInitialized(): boolean {
    if (typeof window === 'undefined' || !window.localStorage) return false;
    return window.localStorage.getItem(`${STORAGE_VERSION}_initialized`) === 'true';
  },

  markInitialized(): void {
    if (typeof window === 'undefined' || !window.localStorage) return;
    window.localStorage.setItem(`${STORAGE_VERSION}_initialized`, 'true');
  },

  resetToDemo(): void {
    const demoItems = generateDemoInventory();
    const demoPartners = generateDemoPartners();

    this.setInventory(demoItems);
    this.setPartners(demoPartners);
    this.setSettings(DEFAULT_SETTINGS);
    this.setActions([]);
    this.setDonationOffers([]);
    this.setForecasts([]);
    this.markInitialized();
  },
};

export function initializeStorageIfNeeded(): void {
  if (!storage.isInitialized()) {
    storage.resetToDemo();
  }
}

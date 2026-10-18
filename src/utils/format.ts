import { format, parseISO, differenceInCalendarDays, isValid } from 'date-fns';
import type { RiskLevel, ActionType } from '../types/index.ts';

/**
 * Format numeric value as currency (default: INR)
 */
export function formatCurrency(amount: number, currency: string = 'INR'): string {
  const getSymbol = (c: string) => (c === 'INR' ? '₹' : c === 'EUR' ? '€' : c === 'GBP' ? '£' : '$');

  if (amount === undefined || amount === null || isNaN(amount)) {
    return `${getSymbol(currency)}0.00`;
  }

  try {
    const locale = currency === 'INR' ? 'en-IN' : 'en-US';
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency || 'INR',
      maximumFractionDigits: 2,
      minimumFractionDigits: Number.isInteger(amount) ? 0 : 2,
    }).format(amount);
  } catch {
    const symbol = getSymbol(currency);
    return `${symbol}${amount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
  }
}

/**
 * Format number with comma separation
 */
export function formatNumber(n: number): string {
  if (n === undefined || n === null || isNaN(n)) return '0';
  return new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: 2,
  }).format(n);
}

/**
 * Format ratio or percentage value
 */
export function formatPercent(n: number, decimals: number = 0, isFraction?: boolean): string {
  if (n === undefined || n === null || isNaN(n)) return '0%';
  const val = isFraction || (n > 0 && n <= 1 && decimals === 0) ? n * 100 : n;
  return `${val.toFixed(decimals)}%`;
}

/**
 * Parse a date input safely into a Date object
 */
function safeParseDate(date: string | Date): Date | null {
  if (!date) return null;
  if (date instanceof Date) return isValid(date) ? date : null;
  const parsed = parseISO(date);
  return isValid(parsed) ? parsed : null;
}

/**
 * Format date string into 'MMM dd, yyyy'
 */
export function formatDate(date: string): string {
  const d = safeParseDate(date);
  if (!d) return 'N/A';
  return format(d, 'MMM dd, yyyy');
}

/**
 * Format date string into 'MMM dd'
 */
export function formatDateShort(date: string): string {
  const d = safeParseDate(date);
  if (!d) return 'N/A';
  return format(d, 'MMM dd');
}

/**
 * Format relative expiry or event date (e.g. '2 days left', 'Expired 1 day ago', 'Today')
 */
export function formatRelativeDate(date: string): string {
  const d = safeParseDate(date);
  if (!d) return 'N/A';

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffDays = differenceInCalendarDays(d, today);

  if (diffDays === 0) {
    return 'Today';
  } else if (diffDays === 1) {
    return '1 day left';
  } else if (diffDays > 1) {
    return `${diffDays} days left`;
  } else if (diffDays === -1) {
    return 'Expired 1 day ago';
  } else {
    return `Expired ${Math.abs(diffDays)} days ago`;
  }
}

/**
 * Returns Tailwind text color class for a risk level
 */
export function getRiskColor(level: RiskLevel): string {
  switch (level) {
    case 'low':
      return 'text-ws-primary';
    case 'moderate':
      return 'text-ws-amber';
    case 'high':
      return 'text-orange-400';
    case 'critical':
      return 'text-ws-coral';
    case 'expired':
      return 'text-gray-400';
    default:
      return 'text-ws-text-secondary';
  }
}

/**
 * Returns CSS class for risk level background and border pill/card styling
 */
export function getRiskBgClass(level: RiskLevel): string {
  switch (level) {
    case 'low':
      return 'risk-bg-low';
    case 'moderate':
      return 'risk-bg-moderate';
    case 'high':
      return 'risk-bg-high';
    case 'critical':
      return 'risk-bg-critical';
    case 'expired':
      return 'risk-bg-expired';
    default:
      return 'bg-ws-bg-card border-ws-border';
  }
}

/**
 * Returns Lucide icon component name for an action type
 */
export function getActionIcon(type: ActionType): string {
  switch (type) {
    case 'markdown':
      return 'Tag';
    case 'transfer':
      return 'Truck';
    case 'donation':
      return 'HeartHandshake';
    case 'replenishment':
      return 'PackagePlus';
    case 'prioritize':
      return 'ArrowUpCircle';
    case 'inspect':
      return 'Eye';
    case 'remove':
      return 'Trash2';
    default:
      return 'HelpCircle';
  }
}

/**
 * Truncate string with ellipsis
 */
export function truncate(str: string, len: number): string {
  if (!str) return '';
  if (str.length <= len) return str;
  return `${str.slice(0, len).trim()}...`;
}

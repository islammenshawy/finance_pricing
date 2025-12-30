import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number, currency: string): string {
  const symbols: Record<string, string> = {
    USD: '$',
    EUR: '€',
    GBP: '£',
    AED: 'د.إ',
    SAR: '﷼',
    JPY: '¥',
    CHF: 'CHF',
  };

  const symbol = symbols[currency] || currency;
  const decimals = currency === 'JPY' ? 0 : 2;
  const isNegative = amount < 0;
  const absAmount = Math.abs(amount);

  const formatted = `${symbol}${absAmount.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`;

  return isNegative ? `-${formatted}` : formatted;
}

export function formatPercent(value: number, decimals = 2): string {
  return `${(value * 100).toFixed(decimals)}%`;
}

export function formatDate(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function formatDateTime(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    draft: 'status-draft',
    in_review: 'status-in_review',
    approved: 'status-approved',
    funded: 'status-funded',
    pending: 'pricing-pending',
    priced: 'pricing-priced',
    locked: 'pricing-locked',
  };
  return colors[status] || 'status-draft';
}

export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;

  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

// Status color constants - centralized for consistency
export const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  in_review: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-300',
  approved: 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300',
  funded: 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300',
};

export const PRICING_STATUS_COLORS: Record<string, string> = {
  pending: 'bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300',
  priced: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300',
  locked: 'bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300',
};

export function getStatusBadgeClass(status: string): string {
  return STATUS_COLORS[status] || STATUS_COLORS.draft;
}

export function getPricingStatusBadgeClass(status: string): string {
  return PRICING_STATUS_COLORS[status] || PRICING_STATUS_COLORS.pending;
}

// Format time-only display
export function formatTime(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

// Format short date (no year)
export function formatDateShort(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

// Format relative time (e.g., "2 days ago")
export function formatRelativeTime(date: Date | string): string {
  const d = new Date(date);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffMinutes = Math.floor(diffMs / (1000 * 60));

  if (diffMinutes < 1) return 'just now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return formatDate(date);
}

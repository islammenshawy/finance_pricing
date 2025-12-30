import type { AuditEntry } from '@loan-pricing/shared';
import { formatCurrency, formatPercent } from '@/lib/utils';
import { Plus, Pencil, Trash2, Percent, DollarSign, TrendingUp, TrendingDown, Clock, User } from 'lucide-react';

interface MiniAuditEntryProps {
  entry: AuditEntry;
  currency: string;
}

/**
 * Extract fee amount from audit value object
 */
function extractFeeAmount(value: unknown): number | null {
  if (typeof value === 'number') return value;
  if (typeof value === 'object' && value !== null) {
    const obj = value as Record<string, unknown>;
    if ('calculatedAmount' in obj && typeof obj.calculatedAmount === 'number') {
      return obj.calculatedAmount;
    }
    if ('amount' in obj && typeof obj.amount === 'number') {
      return obj.amount;
    }
  }
  return null;
}

/**
 * Extract fee name from audit value object
 */
function extractFeeName(value: unknown): string | null {
  if (typeof value === 'object' && value !== null) {
    const obj = value as Record<string, unknown>;
    if ('name' in obj && typeof obj.name === 'string') {
      return obj.name;
    }
  }
  return null;
}

/**
 * Format audit values compactly
 */
function formatAuditValueCompact(value: unknown, currency: string): string {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'number') {
    // Rate (small decimal)
    if (value > 0 && value < 1) {
      return formatPercent(value);
    }
    // Likely a currency amount if > 1
    if (value >= 1) {
      return formatCurrency(value, currency);
    }
    return value.toLocaleString();
  }
  if (typeof value === 'object') {
    if ('name' in (value as object)) {
      return (value as { name: string }).name;
    }
    return '{...}';
  }
  return String(value).slice(0, 20);
}

/**
 * Compact audit entry for inline display in change history
 * Shows action type, field changes, and metadata
 */
export function MiniAuditEntry({ entry, currency }: MiniAuditEntryProps) {
  const isRate = entry.fieldName?.toLowerCase().includes('rate') ||
                 entry.fieldName?.toLowerCase().includes('spread');
  const isFee = entry.entityType === 'fee' || entry.fieldName?.toLowerCase().includes('fee');

  // Determine icon and colors
  const getStyle = () => {
    if (entry.action === 'create') {
      return { icon: Plus, color: 'text-green-600', bg: 'bg-green-50 dark:bg-green-950/30' };
    }
    if (entry.action === 'delete') {
      return { icon: Trash2, color: 'text-red-600', bg: 'bg-red-50 dark:bg-red-950/30' };
    }
    if (isRate) {
      return { icon: Percent, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-950/30' };
    }
    if (isFee) {
      return { icon: DollarSign, color: 'text-purple-600', bg: 'bg-purple-50 dark:bg-purple-950/30' };
    }
    return { icon: Pencil, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-950/30' };
  };

  const style = getStyle();
  const Icon = style.icon;

  // Calculate trend for numeric values
  const getTrend = () => {
    if (entry.action !== 'update') return null;
    const oldNum = extractFeeAmount(entry.oldValue) ?? (typeof entry.oldValue === 'number' ? entry.oldValue : null);
    const newNum = extractFeeAmount(entry.newValue) ?? (typeof entry.newValue === 'number' ? entry.newValue : null);
    if (oldNum !== null && newNum !== null) {
      return newNum > oldNum ? 'up' : newNum < oldNum ? 'down' : null;
    }
    return null;
  };

  const trend = getTrend();

  // Format timestamp
  const time = new Date(entry.timestamp);
  const isToday = new Date().toDateString() === time.toDateString();
  const timeStr = isToday
    ? time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : time.toLocaleDateString([], { month: 'short', day: 'numeric' });

  // Get display name and amounts for fee entries
  const getDisplayInfo = () => {
    if (isFee || entry.entityType === 'fee') {
      const oldAmount = extractFeeAmount(entry.oldValue);
      const newAmount = extractFeeAmount(entry.newValue);
      const feeName = extractFeeName(entry.newValue) || extractFeeName(entry.oldValue) || entry.fieldName;
      return { feeName, oldAmount, newAmount };
    }
    return { feeName: null, oldAmount: null, newAmount: null };
  };

  const { feeName, oldAmount, newAmount } = getDisplayInfo();
  const displayName = feeName || entry.fieldName || entry.entityType;

  return (
    <div className={`flex items-center gap-3 px-3 py-2 ${style.bg}`}>
      {/* Icon */}
      <div className={`flex-shrink-0 p-1.5 rounded-full bg-white dark:bg-slate-900 ${style.color}`}>
        <Icon className="h-3 w-3" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-xs truncate">{displayName}</span>
          {trend && (
            <span className={`flex items-center text-xs ${trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
              {trend === 'up' ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            </span>
          )}
        </div>

        {/* Update: show old → new */}
        {entry.action === 'update' && (
          <div className="flex items-center gap-1.5 text-xs mt-0.5">
            <span className="text-muted-foreground line-through font-mono">
              {oldAmount !== null ? formatCurrency(oldAmount, currency) : formatAuditValueCompact(entry.oldValue, currency)}
            </span>
            <span className="text-muted-foreground">→</span>
            <span className="font-mono font-medium">
              {newAmount !== null ? formatCurrency(newAmount, currency) : formatAuditValueCompact(entry.newValue, currency)}
            </span>
            {oldAmount !== null && newAmount !== null && (
              <span className={`font-mono ${newAmount > oldAmount ? 'text-red-600' : 'text-green-600'}`}>
                ({newAmount > oldAmount ? '+' : ''}{formatCurrency(newAmount - oldAmount, currency)})
              </span>
            )}
          </div>
        )}

        {/* Create: show +amount */}
        {entry.action === 'create' && (
          <div className="flex items-center gap-2 text-xs mt-0.5">
            <span className="text-green-600 font-medium">Added</span>
            {newAmount !== null && (
              <span className="font-mono font-semibold text-green-700">
                +{formatCurrency(newAmount, currency)}
              </span>
            )}
          </div>
        )}

        {/* Delete: show -amount */}
        {entry.action === 'delete' && (
          <div className="flex items-center gap-2 text-xs mt-0.5">
            <span className="text-red-600 font-medium">Removed</span>
            {oldAmount !== null && (
              <span className="font-mono font-semibold text-red-700 line-through">
                {formatCurrency(oldAmount, currency)}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Meta */}
      <div className="flex-shrink-0 text-right">
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Clock className="h-3 w-3" />
          {timeStr}
        </div>
        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
          <User className="h-3 w-3" />
          {entry.userName?.split(' ')[0] || 'System'}
        </div>
      </div>
    </div>
  );
}

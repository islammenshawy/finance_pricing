import type { Loan } from '@loan-pricing/shared';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface StatusCellProps {
  loan: Loan;
  onStatusChange?: (loanId: string, status: string, type: 'status' | 'pricingStatus') => void;
  readOnly?: boolean;
}

const PRICING_STATUSES = ['pending', 'priced', 'locked'];

/**
 * Status display configuration with enhanced visibility
 */
const STATUS_CONFIG: Record<string, { bg: string; text: string; border: string; icon: string }> = {
  locked: {
    bg: 'bg-purple-100 dark:bg-purple-900/40',
    text: 'text-purple-800 dark:text-purple-200',
    border: 'border-purple-400 dark:border-purple-500',
    icon: '🔒',
  },
  priced: {
    bg: 'bg-emerald-100 dark:bg-emerald-900/40',
    text: 'text-emerald-800 dark:text-emerald-200',
    border: 'border-emerald-400 dark:border-emerald-500',
    icon: '✓',
  },
  pending: {
    bg: 'bg-amber-50 dark:bg-amber-900/30',
    text: 'text-amber-700 dark:text-amber-200',
    border: 'border-amber-400 dark:border-amber-500',
    icon: '○',
  },
};

/**
 * Get styling for pricing status badge
 */
function getPricingStatusClasses(status: string): string {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
  return `${config.bg} ${config.text} ${config.border}`;
}

/**
 * Pricing status cell with dropdown selector
 * Displays current pricing status and allows status changes (unless locked)
 */
export function StatusCell({ loan, onStatusChange, readOnly = false }: StatusCellProps) {
  const isLocked = loan.pricingStatus === 'locked';
  const config = STATUS_CONFIG[loan.pricingStatus] || STATUS_CONFIG.pending;

  return (
    <Select
      value={loan.pricingStatus}
      onValueChange={(value) => onStatusChange?.(loan.id, value, 'pricingStatus')}
      disabled={!onStatusChange || isLocked || readOnly}
    >
      <SelectTrigger
        className={`h-8 w-24 text-xs font-semibold border-2 shadow-sm ${getPricingStatusClasses(loan.pricingStatus)} ${
          isLocked ? 'cursor-not-allowed opacity-80' : 'hover:shadow-md transition-shadow'
        }`}
      >
        <span className="flex items-center gap-1.5">
          <span className="text-[10px]">{config.icon}</span>
          <SelectValue />
        </span>
      </SelectTrigger>
      <SelectContent>
        {PRICING_STATUSES.map((status) => {
          const statusConfig = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
          return (
            <SelectItem
              key={status}
              value={status}
              className={`text-xs font-medium ${statusConfig.text}`}
            >
              <span className="flex items-center gap-1.5">
                <span className="text-[10px]">{statusConfig.icon}</span>
                {status}
              </span>
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
}

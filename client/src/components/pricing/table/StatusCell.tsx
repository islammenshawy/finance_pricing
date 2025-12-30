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
}

const PRICING_STATUSES = ['pending', 'priced', 'locked'];

/**
 * Get styling for pricing status badge
 */
function getPricingStatusColor(status: string): string {
  switch (status) {
    case 'locked': return 'bg-purple-100 text-purple-800 border-purple-300';
    case 'priced': return 'bg-indigo-100 text-indigo-800 border-indigo-300';
    default: return 'bg-gray-50 text-gray-600 border-gray-200';
  }
}

/**
 * Pricing status cell with dropdown selector
 * Displays current pricing status and allows status changes (unless locked)
 */
export function StatusCell({ loan, onStatusChange }: StatusCellProps) {
  const isLocked = loan.pricingStatus === 'locked';

  return (
    <Select
      value={loan.pricingStatus}
      onValueChange={(value) => onStatusChange?.(loan.id, value, 'pricingStatus')}
      disabled={!onStatusChange || isLocked}
    >
      <SelectTrigger className={`h-7 w-20 text-xs border ${getPricingStatusColor(loan.pricingStatus)}`}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {PRICING_STATUSES.map((status) => (
          <SelectItem key={status} value={status} className="text-xs">
            {status}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

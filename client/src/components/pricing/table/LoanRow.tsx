import { useState } from 'react';
import type { Loan, Fee, FeeConfig } from '@loan-pricing/shared';
import { formatCurrency, formatPercent } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronRight, Scissors } from 'lucide-react';
import { type FeeChange } from '@/stores/changeStore';
import { SplitLoanDialog } from '../SplitLoanDialog';
import { EditableRateCell } from './EditableRateCell';
import { StatusCell } from './StatusCell';
import { LoanDetailsPanel } from './LoanDetailsPanel';
import type { PreviewData } from '@/types/pricing';

interface LoanRowProps {
  loan: Loan;
  allLoans: Loan[];
  feeConfigs: FeeConfig[];
  isSelected: boolean;
  isExpanded: boolean;
  isModified: boolean;
  preview?: PreviewData;
  isFieldModified: (loanId: string, field: string) => boolean;
  getNewValue: (loanId: string, field: string) => unknown;
  onToggleSelect: () => void;
  onToggleExpand: () => void;
  onPreviewChange: (loanId: string, field: 'baseRate' | 'spread', value: number) => void;
  onAddFee: (loanId: string, feeConfigId: string) => void;
  onUpdateFee: (loanId: string, feeId: string, updates: Partial<Fee>) => void;
  onRemoveFee: (loanId: string, feeId: string) => void;
  onStatusChange?: (loanId: string, status: string, type: 'status' | 'pricingStatus') => void;
  onSplitSuccess?: () => void;
  onInvoiceChange?: () => void;
  pendingFeeAdds: FeeChange[];
  isFeeDeleted: (feeId: string) => boolean;
  getFeeUpdates: (feeId: string) => Partial<Fee> | undefined;
}

/**
 * Individual loan row with expandable details
 * Displays loan summary in collapsed state, full details when expanded
 */
export function LoanRow({
  loan,
  allLoans,
  feeConfigs,
  isSelected,
  isExpanded,
  isModified,
  preview,
  isFieldModified,
  getNewValue,
  onToggleSelect,
  onToggleExpand,
  onPreviewChange,
  onAddFee,
  onUpdateFee,
  onRemoveFee,
  onStatusChange,
  onSplitSuccess,
  onInvoiceChange,
  pendingFeeAdds,
  isFeeDeleted,
  getFeeUpdates,
}: LoanRowProps) {
  const [splitDialogOpen, setSplitDialogOpen] = useState(false);
  const effectiveRate = preview?.effectiveRate ?? loan.pricing.effectiveRate;
  const interestAmount = preview?.interestAmount ?? loan.interestAmount;
  const totalFees = preview?.totalFees ?? loan.totalFees;
  const netProceeds = preview?.netProceeds ?? loan.netProceeds;
  const isLocked = loan.pricingStatus === 'locked';

  const pendingDeleteCount = loan.fees.filter((f) => isFeeDeleted(f.id)).length;
  const pendingAddCount = pendingFeeAdds.length;
  const hasFeeChanges = pendingDeleteCount > 0 || pendingAddCount > 0;

  // Use loan's original values as baseline for comparison
  const feesDelta = totalFees !== loan.totalFees;
  const interestDelta = interestAmount !== loan.interestAmount;
  const netDelta = netProceeds !== loan.netProceeds;
  const hasChanges = !!preview || isModified || hasFeeChanges;

  return (
    <div className="border-b">
      {/* Main Row */}
      <div
        data-testid={`loan-row-${loan.loanNumber}`}
        className={`grid grid-cols-[12px_4px_40px_32px_1fr_1fr_80px_1fr_96px_96px_1fr_1fr_112px_1fr_96px_40px] items-center cursor-pointer transition-all text-sm min-h-[44px] py-1 overflow-hidden ${
          isSelected
            ? 'bg-blue-50 dark:bg-blue-950/40 border-l-2 border-l-blue-500'
            : hasChanges
            ? 'bg-amber-50/50 dark:bg-amber-950/30 border-l-2 border-l-amber-500'
            : 'hover:bg-muted/30 border-l-2 border-l-transparent'
        } ${isExpanded ? 'bg-muted/10' : ''}`}
        onClick={onToggleExpand}
      >
        <div /> {/* Spacer */}
        <div /> {/* Border indicator is handled by border-l */}
        <div className="px-3" onClick={(e) => e.stopPropagation()}>
          <input
            type="checkbox"
            checked={isSelected}
            onChange={onToggleSelect}
            className="rounded border-slate-300 text-primary focus:ring-primary/20"
          />
        </div>
        <div className="flex justify-center">
          {isExpanded ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
        <div className="px-3 font-medium text-primary truncate">{loan.loanNumber}</div>
        <div className="px-3 text-muted-foreground truncate">{loan.borrowerName}</div>
        <div className="px-3 text-center">
          <Badge variant="outline" className="text-xs font-normal">{loan.invoices.length}</Badge>
        </div>
        <div className="px-3 text-right font-mono whitespace-nowrap">
          {formatCurrency(loan.totalAmount, loan.currency)}
        </div>
        <div className="px-3 text-right" onClick={(e) => e.stopPropagation()}>
          <EditableRateCell
            value={(getNewValue(loan.id, 'pricing.baseRate') as number) ?? loan.pricing.baseRate}
            isModified={isFieldModified(loan.id, 'pricing.baseRate')}
            originalValue={loan.pricing.baseRate}
            isLocked={isLocked}
            onChange={(value) => onPreviewChange(loan.id, 'baseRate', value)}
          />
        </div>
        <div className="px-3 text-right" onClick={(e) => e.stopPropagation()}>
          <EditableRateCell
            value={(getNewValue(loan.id, 'pricing.spread') as number) ?? loan.pricing.spread}
            isModified={isFieldModified(loan.id, 'pricing.spread')}
            originalValue={loan.pricing.spread}
            isLocked={isLocked}
            onChange={(value) => onPreviewChange(loan.id, 'spread', value)}
          />
        </div>
        <div className="px-3 text-right font-mono">
          <span className={hasChanges ? 'text-amber-600 font-semibold' : ''}>{formatPercent(effectiveRate)}</span>
        </div>
        <div className="px-3 text-right font-mono">
          <div className={feesDelta || hasFeeChanges ? 'text-amber-600 font-semibold' : 'text-muted-foreground'}>
            {formatCurrency(totalFees, loan.currency)}
            {hasFeeChanges && (
              <span className="text-xs ml-0.5">
                {pendingAddCount > 0 && `+${pendingAddCount}`}
                {pendingDeleteCount > 0 && `-${pendingDeleteCount}`}
              </span>
            )}
          </div>
          {feesDelta && (
            <div className={`text-xs ${totalFees > loan.totalFees ? 'text-red-500' : 'text-green-500'}`}>
              {totalFees > loan.totalFees ? '+' : ''}{formatCurrency(totalFees - loan.totalFees, loan.currency)}
            </div>
          )}
        </div>
        <div className="px-3 text-right font-mono">
          <div className={interestDelta ? 'text-amber-600 font-semibold' : ''}>
            {formatCurrency(interestAmount, loan.currency)}
          </div>
          {interestDelta && (
            <div className={`text-xs ${interestAmount > loan.interestAmount ? 'text-red-500' : 'text-green-500'}`}>
              {interestAmount > loan.interestAmount ? '+' : ''}{formatCurrency(interestAmount - loan.interestAmount, loan.currency)}
            </div>
          )}
        </div>
        <div className="px-3 text-right font-mono font-semibold">
          <div className={netDelta ? 'text-amber-600' : ''}>
            {formatCurrency(netProceeds, loan.currency)}
          </div>
          {netDelta && (
            <div className={`text-xs font-normal ${netProceeds > loan.netProceeds ? 'text-green-500' : 'text-red-500'}`}>
              {netProceeds > loan.netProceeds ? '+' : ''}{formatCurrency(netProceeds - loan.netProceeds, loan.currency)}
            </div>
          )}
        </div>
        <div className="px-3 text-center" onClick={(e) => e.stopPropagation()}>
          <StatusCell loan={loan} onStatusChange={onStatusChange} />
        </div>
        <div className="px-2 flex justify-center" onClick={(e) => e.stopPropagation()}>
          {loan.invoices.length > 1 && !isLocked && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
              onClick={() => setSplitDialogOpen(true)}
              title="Split loan"
            >
              <Scissors className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>

      {/* Expanded Details */}
      {isExpanded && (
        <div className={`bg-slate-50 dark:bg-slate-900/50 border-t ${
          isSelected ? 'border-l-2 border-l-blue-500' : hasChanges ? 'border-l-2 border-l-amber-500' : 'border-l-2 border-l-slate-300'
        }`}>
          <LoanDetailsPanel
            loan={loan}
            allLoans={allLoans}
            feeConfigs={feeConfigs}
            preview={preview}
            isLocked={isLocked}
            onAddFee={onAddFee}
            onUpdateFee={onUpdateFee}
            onRemoveFee={onRemoveFee}
            onInvoiceChange={onInvoiceChange}
            pendingFeeAdds={pendingFeeAdds}
            isFeeDeleted={isFeeDeleted}
            getFeeUpdates={getFeeUpdates}
          />
        </div>
      )}

      <SplitLoanDialog
        loan={loan}
        isOpen={splitDialogOpen}
        onClose={() => setSplitDialogOpen(false)}
        onSuccess={() => onSplitSuccess?.()}
      />
    </div>
  );
}

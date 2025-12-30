import { useState } from 'react';
import type { Loan, Fee, FeeConfig } from '@loan-pricing/shared';
import { formatCurrency, formatPercent } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ChevronDown, ChevronRight, Scissors } from 'lucide-react';
import { useChangeStore, type FeeChange } from '@/stores/changeStore';
import { SplitLoanDialog } from './SplitLoanDialog';

interface PreviewData {
  effectiveRate: number;
  interestAmount: number;
  totalFees: number;
  originalTotalFees?: number;
  netProceeds: number;
  originalNetProceeds?: number;
  isOptimistic?: boolean;
}

interface LoanPricingCardsProps {
  loans: Loan[];
  feeConfigs: FeeConfig[];
  onPreviewChange: (loanId: string, field: 'baseRate' | 'spread', value: number) => void;
  onAddFee: (loanId: string, feeConfigId: string) => void;
  onUpdateFee: (loanId: string, feeId: string, updates: Partial<Fee>) => void;
  onRemoveFee: (loanId: string, feeId: string) => void;
  onSplitSuccess?: () => void;
  previews: Map<string, PreviewData>;
  getPendingFeeAdds: (loanId: string) => FeeChange[];
  isFeeDeleted: (loanId: string, feeId: string) => boolean;
  getFeeUpdates: (loanId: string, feeId: string) => Partial<Fee> | undefined;
}

export function LoanPricingCards({
  loans,
  feeConfigs,
  onPreviewChange,
  onAddFee,
  onUpdateFee,
  onRemoveFee,
  onSplitSuccess,
  previews,
  getPendingFeeAdds,
  isFeeDeleted,
  getFeeUpdates,
}: LoanPricingCardsProps) {
  const { isFieldModified, getOriginalValue, hasChangesForLoan } = useChangeStore();

  return (
    <div className="h-full overflow-auto p-4">
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {loans.map((loan) => (
          <LoanCard
            key={loan.id}
            loan={loan}
            feeConfigs={feeConfigs}
            isModified={hasChangesForLoan(loan.id)}
            preview={previews.get(loan.id)}
            isFieldModified={isFieldModified}
            getOriginalValue={getOriginalValue}
            onPreviewChange={onPreviewChange}
            onAddFee={onAddFee}
            onUpdateFee={onUpdateFee}
            onRemoveFee={onRemoveFee}
            onSplitSuccess={onSplitSuccess}
            pendingFeeAdds={getPendingFeeAdds(loan.id)}
            isFeeDeleted={(feeId) => isFeeDeleted(loan.id, feeId)}
            getFeeUpdates={(feeId) => getFeeUpdates(loan.id, feeId)}
          />
        ))}
      </div>
    </div>
  );
}

function LoanCard({
  loan,
  feeConfigs: _feeConfigs,
  isModified,
  preview,
  isFieldModified,
  getOriginalValue,
  onPreviewChange,
  onAddFee: _onAddFee,
  onUpdateFee: _onUpdateFee,
  onRemoveFee: _onRemoveFee,
  onSplitSuccess,
  pendingFeeAdds,
  isFeeDeleted,
  getFeeUpdates,
}: {
  loan: Loan;
  feeConfigs: FeeConfig[];
  isModified: boolean;
  preview?: PreviewData;
  isFieldModified: (loanId: string, field: string) => boolean;
  getOriginalValue: (loanId: string, field: string) => unknown;
  onPreviewChange: (loanId: string, field: 'baseRate' | 'spread', value: number) => void;
  onAddFee: (loanId: string, feeConfigId: string) => void;
  onUpdateFee: (loanId: string, feeId: string, updates: Partial<Fee>) => void;
  onRemoveFee: (loanId: string, feeId: string) => void;
  onSplitSuccess?: () => void;
  pendingFeeAdds: FeeChange[];
  isFeeDeleted: (feeId: string) => boolean;
  getFeeUpdates: (feeId: string) => Partial<Fee> | undefined;
}) {
  // Note: _feeConfigs, _onAddFee, _onUpdateFee, _onRemoveFee reserved for future card editing
  const [isExpanded, setIsExpanded] = useState(false);
  const [splitDialogOpen, setSplitDialogOpen] = useState(false);

  const effectiveRate = preview?.effectiveRate ?? loan.pricing.effectiveRate;
  const interestAmount = preview?.interestAmount ?? loan.interestAmount;
  const totalFees = preview?.totalFees ?? loan.totalFees;
  const netProceeds = preview?.netProceeds ?? loan.netProceeds;
  const isLocked = loan.pricingStatus === 'locked';
  const hasChanges = !!preview || isModified;

  // Count pending fee changes
  const pendingDeleteCount = loan.fees.filter((f) => isFeeDeleted(f.id)).length;
  const pendingUpdateCount = loan.fees.filter((f) => getFeeUpdates(f.id) !== undefined).length;
  const pendingAddCount = pendingFeeAdds.length;
  const hasFeeChanges = pendingDeleteCount > 0 || pendingUpdateCount > 0 || pendingAddCount > 0;

  return (
    <div
      className={`rounded-lg border bg-card shadow-sm transition-all ${
        isModified ? 'border-amber-400 ring-1 ring-amber-200' : 'hover:shadow-md'
      }`}
    >
      {/* Card Header */}
      <div className="p-4 border-b">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-primary">{loan.loanNumber}</span>
              <Badge variant="outline" className="text-xs">{loan.currency}</Badge>
            </div>
            <div className="text-sm text-muted-foreground mt-1">{loan.borrowerName}</div>
          </div>
          <div className="flex items-center gap-2">
            <Badge
              variant={
                loan.pricingStatus === 'locked'
                  ? 'default'
                  : loan.pricingStatus === 'priced'
                  ? 'secondary'
                  : 'outline'
              }
            >
              {loan.pricingStatus}
            </Badge>
            {loan.invoices.length > 1 && !isLocked && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={() => setSplitDialogOpen(true)}
                title="Split loan"
              >
                <Scissors className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Card Body */}
      <div className="p-4 space-y-4">
        {/* Amount */}
        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">Amount</span>
          <span className="font-mono font-semibold text-lg">
            {formatCurrency(loan.totalAmount, loan.currency)}
          </span>
        </div>

        {/* Rates */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-muted-foreground block mb-1">Base Rate</label>
            <EditableRateInput
              value={loan.pricing.baseRate}
              isModified={isFieldModified(loan.id, 'pricing.baseRate')}
              originalValue={getOriginalValue(loan.id, 'pricing.baseRate') as number}
              isLocked={isLocked}
              onChange={(value) => onPreviewChange(loan.id, 'baseRate', value)}
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1">Spread</label>
            <EditableRateInput
              value={loan.pricing.spread}
              isModified={isFieldModified(loan.id, 'pricing.spread')}
              originalValue={getOriginalValue(loan.id, 'pricing.spread') as number}
              isLocked={isLocked}
              onChange={(value) => onPreviewChange(loan.id, 'spread', value)}
            />
          </div>
        </div>

        {/* Summary */}
        <div className="pt-3 border-t space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Effective Rate</span>
            <span className={`font-mono ${hasChanges ? 'text-amber-600 font-semibold' : ''}`}>
              {formatPercent(effectiveRate)}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Fees ({loan.fees.length})</span>
            <span className={`font-mono ${hasFeeChanges ? 'text-amber-600' : ''}`}>
              {formatCurrency(totalFees, loan.currency)}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Interest</span>
            <span className={`font-mono ${hasChanges ? 'text-amber-600' : ''}`}>
              {formatCurrency(interestAmount, loan.currency)}
            </span>
          </div>
          <div className="flex justify-between font-semibold pt-2 border-t">
            <span>Net Proceeds</span>
            <span className={`font-mono ${hasChanges ? 'text-amber-600' : ''}`}>
              {formatCurrency(netProceeds, loan.currency)}
            </span>
          </div>
        </div>
      </div>

      {/* Expand/Collapse Button */}
      <button
        className="w-full py-2 px-4 text-xs text-muted-foreground hover:bg-muted/50 flex items-center justify-center gap-1 border-t"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        {isExpanded ? (
          <>
            <ChevronDown className="h-3 w-3" /> Hide Details
          </>
        ) : (
          <>
            <ChevronRight className="h-3 w-3" /> Show Invoices & Fees
          </>
        )}
      </button>

      {/* Expanded Details */}
      {isExpanded && (
        <div className="p-4 border-t bg-muted/20 space-y-4">
          {/* Invoices */}
          <div>
            <h4 className="text-sm font-medium mb-2">Invoices ({loan.invoices.length})</h4>
            <div className="space-y-1">
              {loan.invoices.slice(0, 5).map((inv) => (
                <div key={inv.id} className="flex justify-between text-xs">
                  <span className="text-muted-foreground truncate">{inv.invoiceNumber}</span>
                  <span className="font-mono">{formatCurrency(inv.amount, inv.currency)}</span>
                </div>
              ))}
              {loan.invoices.length > 5 && (
                <div className="text-xs text-muted-foreground">
                  +{loan.invoices.length - 5} more...
                </div>
              )}
            </div>
          </div>

          {/* Fees */}
          <div>
            <h4 className="text-sm font-medium mb-2">Fees</h4>
            <div className="space-y-1">
              {loan.fees.map((fee) => {
                const isDeleted = isFeeDeleted(fee.id);
                const updates = getFeeUpdates(fee.id);
                const displayAmount = updates?.calculatedAmount ?? fee.calculatedAmount;

                return (
                  <div
                    key={fee.id}
                    className={`flex justify-between text-xs ${
                      isDeleted ? 'line-through opacity-50' : ''
                    } ${updates ? 'text-amber-600' : ''}`}
                  >
                    <span className="text-muted-foreground">{fee.name}</span>
                    <span className="font-mono">{formatCurrency(displayAmount, loan.currency)}</span>
                  </div>
                );
              })}
              {pendingFeeAdds.map((pending) => (
                <div key={pending.id} className="flex justify-between text-xs text-green-600">
                  <span>{pending.feeName} (new)</span>
                  <span>-</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Split Dialog */}
      <SplitLoanDialog
        loan={loan}
        isOpen={splitDialogOpen}
        onClose={() => setSplitDialogOpen(false)}
        onSuccess={() => onSplitSuccess?.()}
      />
    </div>
  );
}

function EditableRateInput({
  value,
  isModified,
  originalValue,
  isLocked,
  onChange,
}: {
  value: number;
  isModified: boolean;
  originalValue: number | undefined;
  isLocked: boolean;
  onChange: (value: number) => void;
}) {
  const [localValue, setLocalValue] = useState((value * 100).toFixed(2));
  const [isFocused, setIsFocused] = useState(false);

  const handleBlur = () => {
    setIsFocused(false);
    const parsed = parseFloat(localValue);
    if (!isNaN(parsed)) {
      onChange(parsed / 100);
    }
  };

  if (isLocked) {
    return (
      <div className="font-mono text-sm text-muted-foreground">
        {formatPercent(value)}
      </div>
    );
  }

  return (
    <div>
      <Input
        type="number"
        step="0.01"
        value={isFocused ? localValue : (value * 100).toFixed(2)}
        onChange={(e) => setLocalValue(e.target.value)}
        onFocus={() => {
          setLocalValue((value * 100).toFixed(2));
          setIsFocused(true);
        }}
        onBlur={handleBlur}
        className={`h-8 font-mono text-sm ${isModified ? 'border-amber-400 bg-amber-50' : ''}`}
      />
      {isModified && originalValue !== undefined && (
        <div className="text-xs text-muted-foreground mt-1">
          was {formatPercent(originalValue)}
        </div>
      )}
    </div>
  );
}

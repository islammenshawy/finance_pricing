import { useState } from 'react';
import type { Loan, Fee, FeeConfig, Invoice } from '@loan-pricing/shared';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useChangeStore } from '@/stores/changeStore';

interface LoanCardProps {
  loan: Loan;
  feeConfigs: FeeConfig[];
  isExpanded: boolean;
  onToggleExpand: () => void;
  onAddFee: (feeConfigId: string) => void;
  onUpdateFee: (feeId: string, updates: Partial<Fee>) => void;
  onRemoveFee: (feeId: string) => void;
  onSplit: (splits: { invoiceIds: string[]; fees?: string[] }[]) => void;
}

export function LoanCard({
  loan,
  feeConfigs,
  isExpanded,
  onToggleExpand,
  onAddFee,
  onUpdateFee,
  onRemoveFee,
  onSplit,
}: LoanCardProps) {
  const { trackChange, isFieldModified, getOriginalValue } = useChangeStore();
  const [showAddFee, setShowAddFee] = useState(false);
  const [showSplit, setShowSplit] = useState(false);
  const [selectedInvoicesForSplit, setSelectedInvoicesForSplit] = useState<
    Set<string>
  >(new Set());
  const [editingFee, setEditingFee] = useState<string | null>(null);

  const statusColors: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-700',
    in_review: 'bg-yellow-100 text-yellow-700',
    approved: 'bg-green-100 text-green-700',
    funded: 'bg-blue-100 text-blue-700',
  };

  const pricingStatusColors: Record<string, string> = {
    pending: 'bg-orange-100 text-orange-700',
    priced: 'bg-emerald-100 text-emerald-700',
    locked: 'bg-purple-100 text-purple-700',
  };

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getDaysToMaturity = () => {
    const maturity = new Date(loan.maturityDate);
    const today = new Date();
    const diff = Math.ceil(
      (maturity.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    );
    return diff;
  };

  const handlePricingChange = (
    field: 'baseRate' | 'spread',
    value: string
  ) => {
    const numValue = parseFloat(value) / 100;
    if (!isNaN(numValue)) {
      trackChange(
        loan.id,
        `pricing.${field}`,
        field === 'baseRate' ? 'Base Rate' : 'Spread',
        loan.pricing[field],
        numValue
      );
    }
  };

  const availableFeeConfigs = feeConfigs.filter(
    (config) => !loan.fees.some((f) => f.feeConfigId === config.id)
  );

  const handleToggleInvoiceForSplit = (invoiceId: string) => {
    setSelectedInvoicesForSplit((prev) => {
      const next = new Set(prev);
      if (next.has(invoiceId)) {
        next.delete(invoiceId);
      } else {
        next.add(invoiceId);
      }
      return next;
    });
  };

  const handleConfirmSplit = () => {
    if (selectedInvoicesForSplit.size === 0) return;
    if (selectedInvoicesForSplit.size === loan.invoices.length) return;

    const remainingInvoices = loan.invoices
      .filter((inv) => !selectedInvoicesForSplit.has(inv.id))
      .map((inv) => inv.id);
    const splitInvoices = Array.from(selectedInvoicesForSplit);

    onSplit([{ invoiceIds: remainingInvoices }, { invoiceIds: splitInvoices }]);
    setShowSplit(false);
    setSelectedInvoicesForSplit(new Set());
  };

  const daysToMaturity = getDaysToMaturity();

  return (
    <div className="bg-card border rounded-lg overflow-hidden">
      {/* Collapsed Header - Always Visible */}
      <div
        className="p-4 cursor-pointer hover:bg-muted/30 transition-colors"
        onClick={onToggleExpand}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-6 h-6 flex items-center justify-center text-muted-foreground">
              {isExpanded ? '▼' : '▶'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold">{loan.loanNumber}</span>
                <Badge
                  className={statusColors[loan.status] || 'bg-gray-100'}
                  variant="secondary"
                >
                  {loan.status.replace('_', ' ')}
                </Badge>
                <Badge
                  className={
                    pricingStatusColors[loan.pricingStatus] || 'bg-gray-100'
                  }
                  variant="secondary"
                >
                  {loan.pricingStatus}
                </Badge>
              </div>
              <div className="text-sm text-muted-foreground mt-1">
                {formatDate(loan.startDate)} → {formatDate(loan.maturityDate)}
                <span
                  className={`ml-2 ${
                    daysToMaturity < 30
                      ? 'text-red-600 font-medium'
                      : daysToMaturity < 90
                      ? 'text-amber-600'
                      : ''
                  }`}
                >
                  ({daysToMaturity > 0 ? `${daysToMaturity}d to maturity` : 'Matured'})
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-6 text-right">
            <div>
              <div className="text-sm text-muted-foreground">Amount</div>
              <div className="font-semibold">
                {loan.currency}{' '}
                {loan.totalAmount.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                })}
              </div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Rate</div>
              <div className="font-semibold">
                {(loan.pricing.effectiveRate * 100).toFixed(2)}%
              </div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Fees</div>
              <div className="font-semibold text-amber-600">
                {loan.currency}{' '}
                {loan.totalFees.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                })}
              </div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Net Proceeds</div>
              <div className="font-semibold">
                {loan.currency}{' '}
                {loan.netProceeds.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="border-t">
          <div className="grid grid-cols-3 divide-x">
            {/* Invoices Section */}
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium">
                  Invoices ({loan.invoices.length})
                </h4>
                {loan.invoices.length > 1 && loan.pricingStatus !== 'locked' && (
                  <Button
                    variant={showSplit ? 'default' : 'outline'}
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowSplit(!showSplit);
                      if (!showSplit) {
                        setSelectedInvoicesForSplit(new Set());
                      }
                    }}
                  >
                    {showSplit ? 'Cancel Split' : 'Split Loan'}
                  </Button>
                )}
              </div>

              {showSplit && (
                <div className="mb-3 p-2 bg-blue-50 rounded text-sm text-blue-800">
                  Select invoices to move to a new loan, then click confirm.
                </div>
              )}

              <div className="space-y-2 max-h-64 overflow-auto">
                {loan.invoices.map((invoice) => (
                  <InvoiceRow
                    key={invoice.id}
                    invoice={invoice}
                    showSplit={showSplit}
                    isSelected={selectedInvoicesForSplit.has(invoice.id)}
                    onToggleSelect={() =>
                      handleToggleInvoiceForSplit(invoice.id)
                    }
                  />
                ))}
              </div>

              {showSplit && selectedInvoicesForSplit.size > 0 && (
                <Button
                  className="w-full mt-3"
                  size="sm"
                  onClick={handleConfirmSplit}
                  disabled={
                    selectedInvoicesForSplit.size === loan.invoices.length
                  }
                >
                  Confirm Split ({selectedInvoicesForSplit.size} invoice
                  {selectedInvoicesForSplit.size > 1 ? 's' : ''})
                </Button>
              )}
            </div>

            {/* Pricing Section */}
            <div className="p-4">
              <h4 className="font-medium mb-3">Pricing</h4>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm text-muted-foreground block mb-1">
                      Base Rate
                      {isFieldModified(loan.id, 'pricing.baseRate') && (
                        <span className="text-amber-500 ml-1">*</span>
                      )}
                    </label>
                    <div className="relative">
                      <Input
                        type="number"
                        step="0.01"
                        defaultValue={(loan.pricing.baseRate * 100).toFixed(2)}
                        onChange={(e) =>
                          handlePricingChange('baseRate', e.target.value)
                        }
                        disabled={loan.pricingStatus === 'locked'}
                        className={`pr-6 ${
                          isFieldModified(loan.id, 'pricing.baseRate')
                            ? 'border-amber-400 bg-amber-50'
                            : ''
                        }`}
                      />
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                        %
                      </span>
                    </div>
                    {isFieldModified(loan.id, 'pricing.baseRate') && (
                      <div className="text-xs text-muted-foreground mt-1">
                        Was:{' '}
                        {(
                          (getOriginalValue(loan.id, 'pricing.baseRate') as number) * 100
                        ).toFixed(2)}
                        %
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="text-sm text-muted-foreground block mb-1">
                      Spread
                      {isFieldModified(loan.id, 'pricing.spread') && (
                        <span className="text-amber-500 ml-1">*</span>
                      )}
                    </label>
                    <div className="relative">
                      <Input
                        type="number"
                        step="0.01"
                        defaultValue={(loan.pricing.spread * 100).toFixed(2)}
                        onChange={(e) =>
                          handlePricingChange('spread', e.target.value)
                        }
                        disabled={loan.pricingStatus === 'locked'}
                        className={`pr-6 ${
                          isFieldModified(loan.id, 'pricing.spread')
                            ? 'border-amber-400 bg-amber-50'
                            : ''
                        }`}
                      />
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                        %
                      </span>
                    </div>
                    {isFieldModified(loan.id, 'pricing.spread') && (
                      <div className="text-xs text-muted-foreground mt-1">
                        Was:{' '}
                        {(
                          (getOriginalValue(loan.id, 'pricing.spread') as number) * 100
                        ).toFixed(2)}
                        %
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-muted/50 rounded-lg p-3">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-muted-foreground">Effective Rate</span>
                    <span className="font-semibold">
                      {(loan.pricing.effectiveRate * 100).toFixed(2)}%
                    </span>
                  </div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-muted-foreground">Day Count</span>
                    <span>{loan.pricing.dayCountConvention}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Accrual</span>
                    <span className="capitalize">
                      {loan.pricing.accrualMethod}
                    </span>
                  </div>
                </div>

                <div className="border-t pt-3">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-muted-foreground">Interest Amount</span>
                    <span className="font-semibold text-blue-600">
                      {loan.currency}{' '}
                      {loan.interestAmount.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                      })}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Fees Section */}
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium">Fees ({loan.fees.length})</h4>
                {availableFeeConfigs.length > 0 &&
                  loan.pricingStatus !== 'locked' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowAddFee(!showAddFee);
                      }}
                    >
                      + Add Fee
                    </Button>
                  )}
              </div>

              {showAddFee && (
                <div className="mb-3 p-2 bg-muted rounded">
                  <div className="text-xs text-muted-foreground mb-2">
                    Select a fee to add:
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {availableFeeConfigs.map((config) => (
                      <Button
                        key={config.id}
                        variant="outline"
                        size="sm"
                        className="text-xs"
                        onClick={() => {
                          onAddFee(config.id);
                          setShowAddFee(false);
                        }}
                      >
                        {config.code}
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-2 max-h-64 overflow-auto">
                {loan.fees.map((fee) => (
                  <FeeRow
                    key={fee.id}
                    fee={fee}
                    loanCurrency={loan.currency}
                    isLocked={loan.pricingStatus === 'locked'}
                    isEditing={editingFee === fee.id}
                    onEdit={() =>
                      setEditingFee(editingFee === fee.id ? null : fee.id)
                    }
                    onUpdate={(updates) => {
                      onUpdateFee(fee.id, updates);
                      setEditingFee(null);
                    }}
                    onRemove={() => onRemoveFee(fee.id)}
                  />
                ))}
              </div>

              <div className="border-t pt-3 mt-3">
                <div className="flex justify-between text-sm font-medium">
                  <span>Total Fees</span>
                  <span className="text-amber-600">
                    {loan.currency}{' '}
                    {loan.totalFees.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                    })}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function InvoiceRow({
  invoice,
  showSplit,
  isSelected,
  onToggleSelect,
}: {
  invoice: Invoice;
  showSplit: boolean;
  isSelected: boolean;
  onToggleSelect: () => void;
}) {
  const invoiceStatusColors: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-700',
    financed: 'bg-green-100 text-green-700',
    paid: 'bg-blue-100 text-blue-700',
  };

  return (
    <div
      className={`p-2 rounded border text-sm ${
        isSelected ? 'border-blue-500 bg-blue-50' : 'bg-muted/30'
      } ${showSplit ? 'cursor-pointer' : ''}`}
      onClick={showSplit ? onToggleSelect : undefined}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {showSplit && (
            <input
              type="checkbox"
              checked={isSelected}
              onChange={onToggleSelect}
              className="rounded"
              onClick={(e) => e.stopPropagation()}
            />
          )}
          <div>
            <div className="font-medium">{invoice.invoiceNumber}</div>
            <div className="text-xs text-muted-foreground">
              {invoice.buyerName}
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className="font-mono">
            {invoice.currency}{' '}
            {invoice.amount.toLocaleString(undefined, {
              minimumFractionDigits: 2,
            })}
          </div>
          <Badge
            className={invoiceStatusColors[invoice.status]}
            variant="secondary"
          >
            {invoice.status}
          </Badge>
        </div>
      </div>
      <div className="text-xs text-muted-foreground mt-1">
        Due: {new Date(invoice.dueDate).toLocaleDateString()}
      </div>
    </div>
  );
}

function FeeRow({
  fee,
  loanCurrency,
  isLocked,
  isEditing,
  onEdit,
  onUpdate,
  onRemove,
}: {
  fee: Fee;
  loanCurrency: string;
  isLocked: boolean;
  isEditing: boolean;
  onEdit: () => void;
  onUpdate: (updates: Partial<Fee>) => void;
  onRemove: () => void;
}) {
  const [editRate, setEditRate] = useState(
    fee.rate ? (fee.rate * 100).toString() : ''
  );
  const [editAmount, setEditAmount] = useState(
    fee.flatAmount?.toString() || ''
  );

  const handleSave = () => {
    if (fee.calculationType === 'percentage') {
      const rate = parseFloat(editRate) / 100;
      if (!isNaN(rate)) {
        onUpdate({ rate, isOverridden: true });
      }
    } else if (fee.calculationType === 'flat') {
      const amount = parseFloat(editAmount);
      if (!isNaN(amount)) {
        onUpdate({ flatAmount: amount, isOverridden: true });
      }
    }
  };

  return (
    <div
      className={`p-2 rounded border text-sm ${
        fee.isWaived
          ? 'bg-gray-50 opacity-60'
          : fee.isOverridden
          ? 'bg-amber-50 border-amber-200'
          : 'bg-muted/30'
      }`}
    >
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-medium">{fee.code}</span>
            {fee.isOverridden && (
              <Badge variant="outline" className="text-xs">
                Override
              </Badge>
            )}
            {fee.isWaived && (
              <Badge variant="secondary" className="text-xs">
                Waived
              </Badge>
            )}
            {fee.isPaid && (
              <Badge className="bg-green-100 text-green-700 text-xs">
                Paid
              </Badge>
            )}
          </div>
          <div className="text-xs text-muted-foreground">{fee.name}</div>
        </div>
        <div className="text-right">
          {!isEditing ? (
            <>
              <div className="font-mono font-semibold">
                {loanCurrency}{' '}
                {fee.calculatedAmount.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                })}
              </div>
              {fee.calculationType === 'percentage' && fee.rate && (
                <div className="text-xs text-muted-foreground">
                  {(fee.rate * 100).toFixed(2)}% of {fee.basisAmount}
                </div>
              )}
            </>
          ) : (
            <div className="flex items-center gap-2">
              {fee.calculationType === 'percentage' ? (
                <div className="relative w-20">
                  <Input
                    type="number"
                    step="0.01"
                    value={editRate}
                    onChange={(e) => setEditRate(e.target.value)}
                    className="pr-6 text-sm"
                  />
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">
                    %
                  </span>
                </div>
              ) : (
                <Input
                  type="number"
                  value={editAmount}
                  onChange={(e) => setEditAmount(e.target.value)}
                  className="w-24 text-sm"
                />
              )}
              <Button size="sm" onClick={handleSave}>
                Save
              </Button>
            </div>
          )}
        </div>
      </div>
      {!isLocked && !fee.isPaid && !isEditing && (
        <div className="flex gap-2 mt-2">
          <Button
            variant="ghost"
            size="sm"
            className="text-xs h-6"
            onClick={onEdit}
          >
            Edit
          </Button>
          {!fee.isWaived && (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs h-6"
              onClick={() => onUpdate({ isWaived: true })}
            >
              Waive
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="text-xs h-6 text-destructive"
            onClick={onRemove}
          >
            Remove
          </Button>
        </div>
      )}
    </div>
  );
}

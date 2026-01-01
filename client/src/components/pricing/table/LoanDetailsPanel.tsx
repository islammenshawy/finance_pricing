import { useState, useEffect, useMemo } from 'react';
import type { Loan, Fee, FeeConfig, AuditEntry, Invoice } from '@loan-pricing/shared';
import { formatCurrency, formatPercent } from '@/lib/utils';
import { getLoanAudit, removeInvoice, addInvoiceToLoan, updateInvoice } from '@/lib/api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Pencil, Trash2, X, Check, Undo2, ArrowRightLeft } from 'lucide-react';
import { useChangeStore, type FeeChange } from '@/stores/changeStore';
import { MoveInvoiceDialog } from '../MoveInvoiceDialog';
import { FeeRow } from './FeeRow';
import { GroupedAuditHistory } from '../audit/GroupedAuditHistory';
import type { PreviewData } from '@/types/pricing';
import { DataGrid, type Column } from '@/components/ui/DataGrid';

interface LoanDetailsPanelProps {
  loan: Loan;
  allLoans: Loan[];
  feeConfigs: FeeConfig[];
  preview?: PreviewData;
  isLocked: boolean;
  readOnly?: boolean;
  onAddFee: (loanId: string, feeConfigId: string) => void;
  onUpdateFee: (loanId: string, feeId: string, updates: Partial<Fee>) => void;
  onRemoveFee: (loanId: string, feeId: string) => void;
  onInvoiceChange?: () => void;
  pendingFeeAdds: FeeChange[];
  isFeeDeleted: (feeId: string) => boolean;
  getFeeUpdates: (feeId: string) => Partial<Fee> | undefined;
  isNewFee?: (feeId: string) => boolean;
}

/**
 * Expanded details panel showing invoices, fees, calculation breakdown, and audit history
 */
export function LoanDetailsPanel({
  loan,
  allLoans,
  feeConfigs,
  preview,
  isLocked,
  readOnly = false,
  onAddFee,
  onUpdateFee,
  onRemoveFee,
  onInvoiceChange,
  pendingFeeAdds,
  isFeeDeleted,
  getFeeUpdates,
  isNewFee,
}: LoanDetailsPanelProps) {
  const { revertFeeChange, isFieldModified, getNewValue } = useChangeStore();
  const [addingFee, setAddingFee] = useState(false);
  const [selectedFeeConfig, setSelectedFeeConfig] = useState<string>('');
  const [auditHistory, setAuditHistory] = useState<AuditEntry[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [moveInvoiceDialogOpen, setMoveInvoiceDialogOpen] = useState(false);
  const [selectedInvoiceForMove, setSelectedInvoiceForMove] = useState<Invoice | null>(null);

  const effectiveRate = preview?.effectiveRate ?? loan.pricing.effectiveRate;
  const interestAmount = preview?.interestAmount ?? loan.interestAmount;
  const originalInterestAmount = loan.interestAmount;
  const totalFees = preview?.totalFees ?? loan.totalFees;
  const originalTotalFees = preview?.originalTotalFees ?? loan.totalFees;
  const netProceeds = preview?.netProceeds ?? loan.netProceeds;
  const originalNetProceeds = preview?.originalNetProceeds ?? loan.netProceeds;
  const hasChanges = !!preview && !preview.isOptimistic;
  const feesDelta = totalFees !== originalTotalFees;
  const interestDelta = interestAmount !== originalInterestAmount;

  // Get current rate values (may be modified)
  const currentBaseRate = (getNewValue(loan.id, 'pricing.baseRate') as number | undefined) ?? loan.pricing.baseRate;
  const currentSpread = (getNewValue(loan.id, 'pricing.spread') as number | undefined) ?? loan.pricing.spread;

  // Fee change counts
  const pendingDeleteCount = loan.fees.filter((f) => isFeeDeleted(f.id)).length;
  const pendingAddCount = pendingFeeAdds.length;

  // Load audit history on mount and refresh when loan updates
  useEffect(() => {
    setLoadingHistory(true);
    getLoanAudit(loan.id, { limit: 20 })
      .then((result) => setAuditHistory(result.entries))
      .catch(console.error)
      .finally(() => setLoadingHistory(false));
  }, [loan.id, loan.updatedAt]);

  // Get available fee configs (not already on this loan and not pending add)
  const pendingAddConfigIds = new Set(pendingFeeAdds.map((p) => p.feeConfigId));
  const availableFeeConfigs = feeConfigs.filter(
    (config) =>
      !loan.fees.some((f) => f.feeConfigId === config.id) &&
      !pendingAddConfigIds.has(config.id)
  );

  // Whether actions are editable
  const canEdit = !isLocked && !readOnly && !!onInvoiceChange;

  // Invoice columns for DataGrid - widths match original table layout
  const invoiceColumns: Column<Invoice>[] = useMemo(() => {
    const baseColumns: Column<Invoice>[] = [
      {
        id: 'invoiceNumber',
        header: 'Invoice #',
        width: 160,
        cell: (invoice) => (
          <span className="font-medium text-primary whitespace-nowrap">{invoice.invoiceNumber}</span>
        ),
      },
      {
        id: 'description',
        header: 'Description',
        width: 120,
        cell: (invoice) => (
          <span className="text-muted-foreground truncate block" title={invoice.description}>
            {invoice.description || '-'}
          </span>
        ),
      },
      {
        id: 'debtor',
        header: 'Debtor',
        minWidth: 150,
        cell: (invoice) => (
          <span className="truncate block">{invoice.debtorName || invoice.buyerName}</span>
        ),
      },
      {
        id: 'amount',
        header: 'Amount',
        width: 110,
        align: 'right' as const,
        cell: (invoice) => (
          <span className="font-mono whitespace-nowrap">{formatCurrency(invoice.amount, loan.currency)}</span>
        ),
      },
      {
        id: 'dueDate',
        header: 'Due Date',
        width: 90,
        align: 'center' as const,
        cell: (invoice) => (
          <span className="text-muted-foreground whitespace-nowrap">
            {new Date(invoice.dueDate).toLocaleDateString()}
          </span>
        ),
      },
      {
        id: 'days',
        header: 'Days',
        width: 60,
        align: 'center' as const,
        cell: (invoice) => {
          const daysUntil = Math.ceil(
            (new Date(invoice.dueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
          );
          return (
            <Badge variant={daysUntil < 30 ? 'destructive' : 'secondary'} className="text-xs">
              {daysUntil}d
            </Badge>
          );
        },
      },
      {
        id: 'status',
        header: 'Status',
        width: 80,
        align: 'center' as const,
        cell: (invoice) => (
          <Badge
            variant={
              invoice.verificationStatus === 'verified'
                ? 'default'
                : invoice.verificationStatus === 'rejected'
                ? 'destructive'
                : 'secondary'
            }
            className="text-xs capitalize"
          >
            {invoice.verificationStatus || 'pending'}
          </Badge>
        ),
      },
    ];

    if (canEdit) {
      baseColumns.push({
        id: 'actions',
        header: 'Actions',
        width: 90,
        align: 'right' as const,
        cell: (invoice) => (
          <div className="flex items-center justify-end gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              title="Edit invoice"
              onClick={() => {
                const amountStr = prompt('New Amount:', invoice.amount.toString());
                if (amountStr && parseFloat(amountStr) !== invoice.amount) {
                  updateInvoice(loan.id, invoice.id, { amount: parseFloat(amountStr) })
                    .then(() => onInvoiceChange?.())
                    .catch(console.error);
                }
              }}
            >
              <Pencil className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 text-blue-500 hover:text-blue-700"
              title="Move to another loan"
              onClick={() => {
                setSelectedInvoiceForMove(invoice);
                setMoveInvoiceDialogOpen(true);
              }}
            >
              <ArrowRightLeft className="h-3 w-3" />
            </Button>
            {loan.invoices.length > 1 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                title="Remove invoice"
                onClick={() => {
                  if (confirm(`Delete invoice ${invoice.invoiceNumber}?`)) {
                    removeInvoice(loan.id, invoice.id)
                      .then(() => onInvoiceChange?.())
                      .catch(console.error);
                  }
                }}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            )}
          </div>
        ),
      });
    }

    return baseColumns;
  }, [loan.currency, loan.id, loan.invoices.length, canEdit, onInvoiceChange]);

  const handleAddFee = () => {
    if (!selectedFeeConfig) return;
    onAddFee(loan.id, selectedFeeConfig);
    setSelectedFeeConfig('');
    setAddingFee(false);
  };

  const handleRemoveFee = (feeId: string) => {
    onRemoveFee(loan.id, feeId);
  };

  return (
    <div className="px-6 py-4 border-t bg-gradient-to-b from-muted/20 to-transparent">
      {/* Invoices Section - Full Width */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-semibold text-sm">Invoices ({loan.invoices.length})</h4>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-xs">
              {formatCurrency(loan.invoices.reduce((sum, inv) => sum + inv.amount, 0), loan.currency)}
            </Badge>
            {!isLocked && !readOnly && onInvoiceChange && (
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs"
                onClick={() => {
                  const invoiceNumber = prompt('Invoice Number:');
                  const debtorName = prompt('Debtor Name:');
                  const amountStr = prompt('Amount:');
                  const dueDateStr = prompt('Due Date (YYYY-MM-DD):');
                  if (invoiceNumber && debtorName && amountStr && dueDateStr) {
                    addInvoiceToLoan(loan.id, {
                      invoiceNumber,
                      debtorName,
                      amount: parseFloat(amountStr),
                      dueDate: dueDateStr,
                    }).then(() => onInvoiceChange()).catch(console.error);
                  }
                }}
              >
                <Plus className="h-3 w-3 mr-1" />
                Add Invoice
              </Button>
            )}
          </div>
        </div>
        <DataGrid
          data={loan.invoices}
          columns={invoiceColumns}
          getRowKey={(invoice) => invoice.id}
          emptyMessage="No invoices"
          hoverable
          className="text-sm"
        />

        {/* Move Invoice Dialog */}
        {selectedInvoiceForMove && (
          <MoveInvoiceDialog
            isOpen={moveInvoiceDialogOpen}
            onClose={() => {
              setMoveInvoiceDialogOpen(false);
              setSelectedInvoiceForMove(null);
            }}
            sourceLoan={loan}
            invoice={selectedInvoiceForMove}
            availableLoans={allLoans}
            onSuccess={() => {
              onInvoiceChange?.();
            }}
          />
        )}
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Fees Section */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-semibold text-sm">Fees</h4>
            {!isLocked && !readOnly && !addingFee && availableFeeConfigs.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAddingFee(true)}
                className="h-7 text-xs"
              >
                <Plus className="h-3 w-3 mr-1" />
                Add Fee
              </Button>
            )}
          </div>

          {loan.fees.length === 0 && pendingFeeAdds.length === 0 && !addingFee ? (
            <div className="text-sm text-muted-foreground italic">No fees applied</div>
          ) : (
            <div className="space-y-2">
              {/* Existing fees */}
              {loan.fees.map((fee) => {
                const isDeleted = isFeeDeleted(fee.id);
                const updates = getFeeUpdates(fee.id);
                const isNew = isNewFee?.(fee.id) ?? false;
                return (
                  <FeeRow
                    key={`${loan.id}-${fee.id}`}
                    fee={fee}
                    currency={loan.currency}
                    isLocked={isLocked || readOnly}
                    isPending={false}
                    isDeleted={isDeleted}
                    isNew={isNew}
                    updates={updates}
                    onUpdate={(upd) => onUpdateFee(loan.id, fee.id, upd)}
                    onRemove={() => handleRemoveFee(fee.id)}
                    onRevert={isDeleted || updates ? () => {
                      const { feeChanges } = useChangeStore.getState();
                      const change = feeChanges.find(
                        (c) => c.loanId === loan.id && c.feeId === fee.id
                      );
                      if (change) revertFeeChange(change.id);
                    } : undefined}
                  />
                );
              })}

              {/* Pending fee adds */}
              {!readOnly && pendingFeeAdds.map((pending) => {
                const config = feeConfigs.find((c) => c.id === pending.feeConfigId);
                let expectedAmount = 0;
                let rateDisplay = '';
                if (config) {
                  if (config.calculationType === 'flat') {
                    expectedAmount = config.defaultFlatAmount ?? 0;
                    rateDisplay = 'Fixed';
                  } else if (config.calculationType === 'percentage') {
                    expectedAmount = loan.totalAmount * (config.defaultRate ?? 0);
                    rateDisplay = formatPercent(config.defaultRate ?? 0);
                  }
                }
                return (
                  <div
                    key={pending.id}
                    className="flex items-center gap-3 p-2 bg-green-50 dark:bg-green-950/30 border border-green-300 dark:border-green-800 rounded-md"
                  >
                    <div className="flex-1">
                      <div className="font-medium text-sm text-green-800 dark:text-green-200">
                        {config?.name || pending.feeName}
                        <Badge className="ml-2 bg-green-500 text-white text-xs">New</Badge>
                      </div>
                      <div className="text-xs text-green-600 dark:text-green-400">
                        {config?.code} - {config?.calculationType === 'percentage' ? rateDisplay : 'Fixed'} - {config?.type}
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="font-mono font-medium text-green-700 dark:text-green-300">
                        {formatCurrency(expectedAmount, loan.currency)}
                      </span>
                      <div className="text-xs text-green-600 dark:text-green-400">
                        estimated
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 w-7 p-0 text-green-600 hover:text-red-600"
                      onClick={() => revertFeeChange(pending.id)}
                      title="Remove"
                    >
                      <Undo2 className="h-3 w-3" />
                    </Button>
                  </div>
                );
              })}

              {/* Add Fee Form */}
              {!readOnly && addingFee && (
                <div className="flex items-center gap-2 p-2 bg-muted/30 rounded-md">
                  <Select value={selectedFeeConfig} onValueChange={setSelectedFeeConfig}>
                    <SelectTrigger className="flex-1 h-8">
                      <SelectValue placeholder="Select fee type..." />
                    </SelectTrigger>
                    <SelectContent>
                      {availableFeeConfigs.map((config) => (
                        <SelectItem key={config.id} value={config.id}>
                          {config.code} - {config.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    size="sm"
                    className="h-8"
                    onClick={handleAddFee}
                    disabled={!selectedFeeConfig}
                  >
                    <Check className="h-3 w-3" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8"
                    onClick={() => {
                      setAddingFee(false);
                      setSelectedFeeConfig('');
                    }}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Calculation Breakdown */}
        <div>
          <h4 className="font-semibold text-sm mb-3">Calculation Breakdown</h4>
          <div className="bg-card border rounded-lg p-4 font-mono text-sm space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Principal</span>
              <span>{formatCurrency(loan.totalAmount, loan.currency)}</span>
            </div>
            <div className="flex justify-between">
              <div>
                <span className={isFieldModified(loan.id, 'pricing.baseRate') ? 'text-amber-600' : 'text-muted-foreground'}>
                  Base Rate ({formatPercent(currentBaseRate)})
                </span>
                {isFieldModified(loan.id, 'pricing.baseRate') && (
                  <span className="text-xs text-muted-foreground ml-1">
                    was {formatPercent(loan.pricing.baseRate)}
                  </span>
                )}
              </div>
              <span className="text-muted-foreground">+</span>
            </div>
            <div className="flex justify-between">
              <div>
                <span className={isFieldModified(loan.id, 'pricing.spread') ? 'text-amber-600' : 'text-muted-foreground'}>
                  Spread ({formatPercent(currentSpread)})
                </span>
                {isFieldModified(loan.id, 'pricing.spread') && (
                  <span className="text-xs text-muted-foreground ml-1">
                    was {formatPercent(loan.pricing.spread)}
                  </span>
                )}
              </div>
              <span className="text-muted-foreground">+</span>
            </div>
            <div className="flex justify-between border-t pt-2">
              <span className="text-muted-foreground">Effective Rate</span>
              <div className="text-right">
                <span className={preview ? 'text-amber-600 font-semibold' : 'font-semibold'}>
                  {formatPercent(effectiveRate)}
                </span>
                {preview && effectiveRate !== loan.pricing.effectiveRate && (
                  <div className="text-xs text-muted-foreground">
                    was {formatPercent(loan.pricing.effectiveRate)}
                  </div>
                )}
              </div>
            </div>
            <div className="h-2" />
            <div className="flex justify-between">
              <span className="text-muted-foreground">Interest</span>
              <div className="text-right">
                <span className={interestDelta ? 'text-amber-600 font-semibold' : 'text-red-600'}>
                  -{formatCurrency(interestAmount, loan.currency)}
                </span>
                {interestDelta && (
                  <div className={`text-xs ${interestAmount > originalInterestAmount ? 'text-red-500' : 'text-green-500'}`}>
                    {interestAmount > originalInterestAmount ? '+' : ''}{formatCurrency(interestAmount - originalInterestAmount, loan.currency)}
                  </div>
                )}
              </div>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total Fees ({loan.fees.length + pendingAddCount - pendingDeleteCount})</span>
              <div className="text-right">
                <span className={feesDelta ? 'text-amber-600 font-semibold' : 'text-red-600'}>
                  -{formatCurrency(totalFees, loan.currency)}
                </span>
                {feesDelta && (
                  <div className={`text-xs ${totalFees > originalTotalFees ? 'text-red-500' : 'text-green-500'}`}>
                    {totalFees > originalTotalFees ? '+' : ''}{formatCurrency(totalFees - originalTotalFees, loan.currency)}
                  </div>
                )}
              </div>
            </div>
            <div className="flex justify-between border-t pt-2 font-semibold text-base">
              <span>Net Proceeds</span>
              <div className="text-right">
                <span className={hasChanges && netProceeds !== originalNetProceeds ? 'text-amber-600' : ''}>
                  {formatCurrency(netProceeds, loan.currency)}
                </span>
                {hasChanges && netProceeds !== originalNetProceeds && (
                  <div className={`text-xs font-normal ${netProceeds > originalNetProceeds ? 'text-green-500' : 'text-red-500'}`}>
                    {netProceeds > originalNetProceeds ? '+' : ''}{formatCurrency(netProceeds - originalNetProceeds, loan.currency)}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Audit History Section */}
        <div data-testid="change-history-section">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-semibold text-sm" data-testid="change-history-header">Change History</h4>
            {auditHistory.length > 0 && (
              <Badge variant="secondary" className="text-xs">{auditHistory.length}</Badge>
            )}
          </div>

          <div className="bg-card border rounded-lg overflow-hidden">
            {loadingHistory ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                <div className="animate-pulse">Loading history...</div>
              </div>
            ) : auditHistory.length === 0 ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                No changes recorded yet
              </div>
            ) : (
              <GroupedAuditHistory entries={auditHistory.slice(0, 15)} currency={loan.currency} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

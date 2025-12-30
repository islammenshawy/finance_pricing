import { useState, useMemo } from 'react';
import type { Loan, Invoice } from '@loan-pricing/shared';
import { moveInvoice } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Combobox, type ComboboxOption } from '@/components/ui/combobox';
import { Badge } from '@/components/ui/badge';
import { ArrowRightLeft, AlertCircle } from 'lucide-react';

interface MoveInvoiceDialogProps {
  isOpen: boolean;
  onClose: () => void;
  sourceLoan: Loan;
  invoice: Invoice;
  availableLoans: Loan[];
  onSuccess?: () => void;
}

export function MoveInvoiceDialog({
  isOpen,
  onClose,
  sourceLoan,
  invoice,
  availableLoans,
  onSuccess,
}: MoveInvoiceDialogProps) {
  const [selectedLoanId, setSelectedLoanId] = useState<string>('');
  const [isMoving, setIsMoving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filter to same currency loans (excluding source loan)
  const targetLoans = useMemo(() =>
    availableLoans.filter(
      (loan) =>
        loan.id !== sourceLoan.id &&
        loan.currency === sourceLoan.currency &&
        loan.pricingStatus !== 'locked'
    ),
    [availableLoans, sourceLoan.id, sourceLoan.currency]
  );

  // Convert to combobox options
  const loanOptions: ComboboxOption[] = useMemo(() =>
    targetLoans.map((loan) => ({
      value: loan.id,
      label: `${loan.loanNumber} - ${loan.borrowerName}`,
      description: `${formatCurrency(loan.totalAmount, loan.currency)} • ${loan.invoices.length} invoices`,
    })),
    [targetLoans]
  );

  const handleMove = async () => {
    if (!selectedLoanId) return;

    setIsMoving(true);
    setError(null);

    try {
      await moveInvoice(sourceLoan.id, invoice.id, selectedLoanId);
      onSuccess?.();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to move invoice');
    } finally {
      setIsMoving(false);
    }
  };

  const handleClose = () => {
    setSelectedLoanId('');
    setError(null);
    onClose();
  };

  const selectedLoan = targetLoans.find((l) => l.id === selectedLoanId);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowRightLeft className="h-5 w-5" />
            Move Invoice
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Invoice being moved */}
          <div className="rounded-lg border bg-muted/30 p-3">
            <div className="text-xs text-muted-foreground mb-1">Moving invoice:</div>
            <div className="flex items-center justify-between">
              <div>
                <span className="font-semibold">{invoice.invoiceNumber}</span>
                <span className="text-muted-foreground ml-2">
                  {invoice.debtorName || invoice.buyerName}
                </span>
              </div>
              <span className="font-mono font-semibold">
                {formatCurrency(invoice.amount, sourceLoan.currency)}
              </span>
            </div>
          </div>

          {/* Source loan */}
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">From:</span>
            <Badge variant="outline">{sourceLoan.loanNumber}</Badge>
            <span className="text-muted-foreground">({sourceLoan.invoices.length} invoices)</span>
          </div>

          {/* Target loan selector */}
          {targetLoans.length === 0 ? (
            <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm">
                No other {sourceLoan.currency} loans available to move to.
              </span>
            </div>
          ) : (
            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">Move to:</label>
              <Combobox
                options={loanOptions}
                value={selectedLoanId}
                onValueChange={setSelectedLoanId}
                placeholder="Select target loan..."
                searchPlaceholder="Search by loan # or borrower..."
                emptyMessage="No matching loans found"
              />
              <div className="text-xs text-muted-foreground">
                {targetLoans.length} loans available
              </div>
            </div>
          )}

          {/* Preview of impact */}
          {selectedLoan && (
            <div className="rounded-lg border bg-card p-3 space-y-2">
              <div className="text-xs text-muted-foreground font-medium">After move:</div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-muted-foreground">{sourceLoan.loanNumber}</div>
                  <div className="font-mono">
                    {formatCurrency(
                      sourceLoan.totalAmount - invoice.amount,
                      sourceLoan.currency
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {sourceLoan.invoices.length - 1} invoices
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground">{selectedLoan.loanNumber}</div>
                  <div className="font-mono">
                    {formatCurrency(
                      selectedLoan.totalAmount + invoice.amount,
                      selectedLoan.currency
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {selectedLoan.invoices.length + 1} invoices
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Warning if source loan will have no invoices */}
          {sourceLoan.invoices.length === 1 && (
            <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm">
                This is the only invoice on this loan. Moving it will leave the loan empty.
              </span>
            </div>
          )}

          {/* Error display */}
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-800">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm">{error}</span>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isMoving}>
            Cancel
          </Button>
          <Button
            onClick={handleMove}
            disabled={!selectedLoanId || isMoving || targetLoans.length === 0}
          >
            {isMoving ? 'Moving...' : 'Move Invoice'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

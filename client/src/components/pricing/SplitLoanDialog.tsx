import { useState, useMemo } from 'react';
import type { Loan } from '@loan-pricing/shared';
import { splitLoan } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Scissors, Plus, Trash2, AlertCircle } from 'lucide-react';

interface SplitLoanDialogProps {
  loan: Loan;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface Split {
  id: string;
  invoiceIds: Set<string>;
}

export function SplitLoanDialog({ loan, isOpen, onClose, onSuccess }: SplitLoanDialogProps) {
  const [splits, setSplits] = useState<Split[]>([
    { id: '1', invoiceIds: new Set() },
    { id: '2', invoiceIds: new Set() },
  ]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get all invoice IDs already assigned to a split
  const assignedInvoiceIds = useMemo(() => {
    const assigned = new Set<string>();
    for (const split of splits) {
      for (const id of split.invoiceIds) {
        assigned.add(id);
      }
    }
    return assigned;
  }, [splits]);

  // Unassigned invoices
  const unassignedInvoices = loan.invoices.filter((inv) => !assignedInvoiceIds.has(inv.id));

  // Calculate split totals
  const splitTotals = useMemo(() => {
    return splits.map((split) => {
      const invoices = loan.invoices.filter((inv) => split.invoiceIds.has(inv.id));
      const total = invoices.reduce((sum, inv) => sum + inv.amount, 0);
      const percentage = loan.totalAmount > 0 ? (total / loan.totalAmount) * 100 : 0;
      return { total, percentage, count: invoices.length };
    });
  }, [splits, loan]);

  // Validation
  const isValid = useMemo(() => {
    // All splits must have at least one invoice
    const allHaveInvoices = splits.every((s) => s.invoiceIds.size > 0);
    // All invoices must be assigned
    const allAssigned = unassignedInvoices.length === 0;
    // Need at least 2 splits
    const hasEnoughSplits = splits.length >= 2;
    return allHaveInvoices && allAssigned && hasEnoughSplits;
  }, [splits, unassignedInvoices]);

  const toggleInvoice = (splitId: string, invoiceId: string) => {
    setSplits((prev) =>
      prev.map((split) => {
        if (split.id === splitId) {
          const next = new Set(split.invoiceIds);
          if (next.has(invoiceId)) {
            next.delete(invoiceId);
          } else {
            next.add(invoiceId);
          }
          return { ...split, invoiceIds: next };
        }
        // Remove from other splits
        const next = new Set(split.invoiceIds);
        next.delete(invoiceId);
        return { ...split, invoiceIds: next };
      })
    );
  };

  const addSplit = () => {
    setSplits((prev) => [...prev, { id: String(Date.now()), invoiceIds: new Set() }]);
  };

  const removeSplit = (splitId: string) => {
    if (splits.length <= 2) return;
    setSplits((prev) => prev.filter((s) => s.id !== splitId));
  };

  const handleSplit = async () => {
    if (!isValid) return;

    setSaving(true);
    setError(null);

    try {
      const splitRequest = {
        splits: splits.map((split, idx) => ({
          invoiceIds: Array.from(split.invoiceIds),
          percentage: splitTotals[idx].percentage / 100,
        })),
      };

      await splitLoan(loan.id, splitRequest);
      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to split loan');
    } finally {
      setSaving(false);
    }
  };

  const resetDialog = () => {
    setSplits([
      { id: '1', invoiceIds: new Set() },
      { id: '2', invoiceIds: new Set() },
    ]);
    setError(null);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) { resetDialog(); onClose(); } }}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Scissors className="h-5 w-5" />
            Split Loan {loan.loanNumber}
          </DialogTitle>
          <DialogDescription>
            Assign invoices to create child loans. Each child loan will inherit pricing and proportional fees.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-auto py-4">
          {/* Original loan summary */}
          <div className="mb-4 p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Original Loan</span>
              <span className="font-mono font-semibold">
                {formatCurrency(loan.totalAmount, loan.currency)}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm mt-1">
              <span className="text-muted-foreground">Invoices</span>
              <span>{loan.invoices.length}</span>
            </div>
          </div>

          {/* Unassigned invoices warning */}
          {unassignedInvoices.length > 0 && (
            <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg flex items-center gap-2 text-amber-800 dark:text-amber-200">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span className="text-sm">
                {unassignedInvoices.length} invoice(s) not assigned to any split
              </span>
            </div>
          )}

          {/* Splits */}
          <div className="grid grid-cols-2 gap-4">
            {splits.map((split, idx) => (
              <div key={split.id} className="border rounded-lg p-3">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">Split {idx + 1}</Badge>
                    <span className="text-sm text-muted-foreground">
                      {splitTotals[idx].count} invoices
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-semibold">
                      {formatCurrency(splitTotals[idx].total, loan.currency)}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      ({splitTotals[idx].percentage.toFixed(1)}%)
                    </span>
                    {splits.length > 2 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                        onClick={() => removeSplit(split.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>

                <div className="space-y-1 max-h-48 overflow-auto">
                  {loan.invoices.map((invoice) => {
                    const isAssigned = split.invoiceIds.has(invoice.id);
                    const isAssignedElsewhere = assignedInvoiceIds.has(invoice.id) && !isAssigned;

                    return (
                      <label
                        key={`${split.id}-${invoice.id}`}
                        className={`flex items-center gap-2 p-2 rounded cursor-pointer transition-colors ${
                          isAssigned
                            ? 'bg-primary/10'
                            : isAssignedElsewhere
                            ? 'opacity-40'
                            : 'hover:bg-muted'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isAssigned}
                          onChange={() => toggleInvoice(split.id, invoice.id)}
                          className="rounded border-gray-300"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">
                            {invoice.invoiceNumber}
                          </div>
                          <div className="text-xs text-muted-foreground truncate">
                            {invoice.buyerName}
                          </div>
                        </div>
                        <span className="font-mono text-sm">
                          {formatCurrency(invoice.amount, invoice.currency)}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Add split button */}
          <Button
            variant="outline"
            size="sm"
            className="mt-4"
            onClick={addSplit}
          >
            <Plus className="h-4 w-4 mr-1" />
            Add Another Split
          </Button>
        </div>

        {error && (
          <div className="p-3 bg-destructive/10 text-destructive rounded-lg text-sm">
            {error}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSplit} disabled={!isValid || saving}>
            {saving ? 'Splitting...' : `Create ${splits.length} Child Loans`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

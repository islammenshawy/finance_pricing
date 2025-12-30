import { useState, useEffect, useCallback } from 'react';
import type { Loan, Fee, FeeConfig } from '@loan-pricing/shared';
import {
  getCustomerWithLoans,
  getFeeConfigs,
  updateLoan,
  addFeeToLoan,
  updateFee,
  removeFee,
  splitLoan,
  type Customer,
  type CustomerTotals,
} from '@/lib/api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { LoanCard } from './LoanCard';
import { InflightChangesPanel } from '@/components/audit/InflightChangesPanel';
import { useChangeStore } from '@/stores/changeStore';

interface CustomerPageProps {
  customerId: string;
  onBack: () => void;
}

export function CustomerPage({ customerId, onBack }: CustomerPageProps) {
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [totals, setTotals] = useState<CustomerTotals>({});
  const [feeConfigs, setFeeConfigs] = useState<FeeConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [expandedLoans, setExpandedLoans] = useState<Set<string>>(new Set());

  const { changes, clearAllChanges, hasChanges } = useChangeStore();

  const loadData = useCallback(async () => {
    try {
      const [customerData, configs] = await Promise.all([
        getCustomerWithLoans(customerId),
        getFeeConfigs(),
      ]);
      setCustomer(customerData.customer);
      setLoans(customerData.loans);
      setTotals(customerData.totals);
      setFeeConfigs(configs);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [customerId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const toggleLoanExpanded = (loanId: string) => {
    setExpandedLoans((prev) => {
      const next = new Set(prev);
      if (next.has(loanId)) {
        next.delete(loanId);
      } else {
        next.add(loanId);
      }
      return next;
    });
  };

  const handleSaveAllChanges = async () => {
    if (!hasChanges()) return;

    setSaving(true);
    try {
      const loanChanges = new Map<string, typeof changes[0][]>();
      for (const change of changes) {
        const existing = loanChanges.get(change.loanId) || [];
        existing.push(change);
        loanChanges.set(change.loanId, existing);
      }

      for (const [loanId, loanChangeList] of loanChanges) {
        const pricingChanges: Record<string, unknown> = {};
        const fieldChanges: Record<string, unknown> = {};

        for (const change of loanChangeList) {
          if (change.fieldPath.startsWith('pricing.')) {
            const key = change.fieldPath.replace('pricing.', '');
            pricingChanges[key] = change.newValue;
          } else {
            fieldChanges[change.fieldPath] = change.newValue;
          }
        }

        const updateRequest: Record<string, unknown> = { ...fieldChanges };
        if (Object.keys(pricingChanges).length > 0) {
          updateRequest.pricing = pricingChanges;
        }

        await updateLoan(loanId, updateRequest);
      }

      clearAllChanges();
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  const handleAddFee = async (loanId: string, feeConfigId: string) => {
    try {
      const config = feeConfigs.find((c) => c.id === feeConfigId);
      if (!config) return;

      await addFeeToLoan(loanId, { feeConfigId });
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add fee');
    }
  };

  const handleUpdateFee = async (
    loanId: string,
    feeId: string,
    updates: Partial<Fee>
  ) => {
    try {
      await updateFee(loanId, feeId, updates);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update fee');
    }
  };

  const handleRemoveFee = async (loanId: string, feeId: string) => {
    try {
      await removeFee(loanId, feeId);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove fee');
    }
  };

  const handleSplitLoan = async (
    loanId: string,
    splits: { invoiceIds: string[]; fees?: string[] }[]
  ) => {
    try {
      await splitLoan(loanId, { splits });
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to split loan');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-muted-foreground">Loading customer data...</div>
      </div>
    );
  }

  if (error && !customer) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-destructive">{error}</div>
      </div>
    );
  }

  if (!customer) return null;

  const currencies = Object.keys(totals);

  return (
    <div className="h-full flex">
      <div className="flex-1 overflow-auto">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-background border-b">
          <div className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button variant="ghost" size="sm" onClick={onBack}>
                  Back
                </Button>
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-xl font-bold">{customer.name}</h1>
                    <Badge variant="outline">{customer.code}</Badge>
                    {customer.creditRating && (
                      <Badge variant="secondary">{customer.creditRating}</Badge>
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {customer.country} • {customer.industry}
                    {customer.relationshipManager &&
                      ` • RM: ${customer.relationshipManager}`}
                  </div>
                </div>
              </div>
              {hasChanges() && (
                <Button onClick={handleSaveAllChanges} disabled={saving}>
                  {saving ? 'Saving...' : 'Save All Changes'}
                </Button>
              )}
            </div>
          </div>

          {/* Customer Totals */}
          <div className="px-4 pb-4">
            <div className="bg-muted/50 rounded-lg p-4">
              <h3 className="text-sm font-medium mb-3">Portfolio Summary</h3>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {currencies.map((currency) => {
                  const t = totals[currency];
                  return (
                    <div
                      key={currency}
                      className="bg-card rounded-lg p-3 border"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold">{currency}</span>
                        <Badge variant="outline">
                          {t.loanCount} loan{t.loanCount !== 1 ? 's' : ''}
                        </Badge>
                      </div>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Total:</span>
                          <span className="font-mono">
                            {t.totalAmount.toLocaleString(undefined, {
                              minimumFractionDigits: 2,
                            })}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Fees:</span>
                          <span className="font-mono text-amber-600">
                            {t.totalFees.toLocaleString(undefined, {
                              minimumFractionDigits: 2,
                            })}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">
                            Interest:
                          </span>
                          <span className="font-mono text-blue-600">
                            {t.totalInterest.toLocaleString(undefined, {
                              minimumFractionDigits: 2,
                            })}
                          </span>
                        </div>
                        <div className="flex justify-between border-t pt-1 mt-1">
                          <span className="text-muted-foreground">Net:</span>
                          <span className="font-mono font-semibold">
                            {t.netProceeds.toLocaleString(undefined, {
                              minimumFractionDigits: 2,
                            })}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="mx-4 mt-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm">
            {error}
            <Button
              variant="ghost"
              size="sm"
              className="ml-2"
              onClick={() => setError(null)}
            >
              Dismiss
            </Button>
          </div>
        )}

        {/* Loans List */}
        <div className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">
              Loans ({loans.length})
            </h2>
          </div>

          {loans.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No loans found for this customer.
            </div>
          ) : (
            <div className="space-y-3">
              {loans.map((loan) => (
                <LoanCard
                  key={loan.id}
                  loan={loan}
                  feeConfigs={feeConfigs}
                  isExpanded={expandedLoans.has(loan.id)}
                  onToggleExpand={() => toggleLoanExpanded(loan.id)}
                  onAddFee={(feeConfigId) => handleAddFee(loan.id, feeConfigId)}
                  onUpdateFee={(feeId, updates) =>
                    handleUpdateFee(loan.id, feeId, updates)
                  }
                  onRemoveFee={(feeId) => handleRemoveFee(loan.id, feeId)}
                  onSplit={(splits) => handleSplitLoan(loan.id, splits)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Inflight Changes Panel */}
      {hasChanges() && (
        <div className="w-80 border-l bg-card">
          <InflightChangesPanel onSave={handleSaveAllChanges} saving={saving} />
        </div>
      )}
    </div>
  );
}

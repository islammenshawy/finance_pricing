import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getLoan, updateLoan, previewPricing } from '@/lib/api';
import type { LoanPricing } from '@loan-pricing/shared';
import { useChangeStore } from '@/stores/changeStore';
import { formatCurrency, formatPercent, formatDate } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { InflightChangesPanel } from '@/components/audit/InflightChangesPanel';
import { FeeScheduleGrid } from '@/components/pricing/FeeScheduleGrid';
import {
  X,
  Save,
  Calculator,
  FileText,
  DollarSign,
  Calendar,
  Percent,
} from 'lucide-react';

interface LoanDetailPanelProps {
  loanId: string;
  onClose: () => void;
}

export function LoanDetailPanel({ loanId, onClose }: LoanDetailPanelProps) {
  const queryClient = useQueryClient();
  const [localPricing, setLocalPricing] = useState<Partial<LoanPricing>>({});
  const [previewResult, setPreviewResult] = useState<{
    effectiveRate: number;
    interestAmount: number;
  } | null>(null);

  const {
    trackChange,
    revertAllForLoan,
    getChangesForLoan,
    hasChangesForLoan,
    isFieldModified,
    clearAllChanges,
  } = useChangeStore();

  const { data: loan, isLoading } = useQuery({
    queryKey: ['loan', loanId],
    queryFn: () => getLoan(loanId),
    enabled: !!loanId,
  });

  const changes = getChangesForLoan(loanId);
  const hasChanges = hasChangesForLoan(loanId);

  // Initialize local pricing when loan loads
  useEffect(() => {
    if (loan) {
      setLocalPricing({
        baseRate: loan.pricing.baseRate,
        spread: loan.pricing.spread,
        dayCountConvention: loan.pricing.dayCountConvention,
        accrualMethod: loan.pricing.accrualMethod,
      });
    }
  }, [loan]);

  // Preview pricing when values change
  useEffect(() => {
    if (!loanId || !hasChanges) {
      setPreviewResult(null);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const result = await previewPricing(loanId, localPricing);
        setPreviewResult(result);
      } catch (error) {
        console.error('Preview failed:', error);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [loanId, localPricing, hasChanges]);

  const handlePricingChange = (field: keyof LoanPricing, value: number) => {
    const originalValue = loan?.pricing[field];
    setLocalPricing((prev) => ({ ...prev, [field]: value }));
    trackChange(
      loanId,
      `pricing.${field}`,
      field === 'baseRate' ? 'Base Rate' : 'Spread',
      originalValue,
      value
    );
  };

  const handleSave = async () => {
    try {
      const pricingUpdates: Partial<LoanPricing> = {};
      for (const change of changes) {
        if (change.fieldPath.startsWith('pricing.')) {
          const key = change.fieldPath.replace('pricing.', '') as keyof LoanPricing;
          (pricingUpdates as Record<string, unknown>)[key] = change.newValue;
        }
      }

      if (Object.keys(pricingUpdates).length > 0) {
        await updateLoan(loanId, { pricing: pricingUpdates });
      }

      clearAllChanges();
      queryClient.invalidateQueries({ queryKey: ['loan', loanId] });
      queryClient.invalidateQueries({ queryKey: ['loans'] });
    } catch (error) {
      console.error('Save failed:', error);
    }
  };

  const handleRevertAll = () => {
    revertAllForLoan(loanId);
    if (loan) {
      setLocalPricing({
        baseRate: loan.pricing.baseRate,
        spread: loan.pricing.spread,
        dayCountConvention: loan.pricing.dayCountConvention,
        accrualMethod: loan.pricing.accrualMethod,
      });
    }
    setPreviewResult(null);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-muted-foreground">Loading loan details...</div>
      </div>
    );
  }

  if (!loan) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-muted-foreground">Loan not found</div>
      </div>
    );
  }

  const displayRate = previewResult?.effectiveRate ?? loan.pricing.effectiveRate;
  const displayInterest = previewResult?.interestAmount ?? loan.interestAmount;

  return (
    <div className="flex h-full">
      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-muted/30">
          <div>
            <h2 className="text-lg font-semibold">{loan.loanNumber}</h2>
            <p className="text-sm text-muted-foreground">{loan.borrowerName}</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">{loan.status.replace('_', ' ')}</Badge>
            <Badge variant="secondary">{loan.pricingStatus}</Badge>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Scrollable Content */}
        <ScrollArea className="flex-1">
          <div className="p-6 space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-4 gap-4">
              <SummaryCard
                icon={<DollarSign className="h-4 w-4" />}
                label="Total Amount"
                value={formatCurrency(loan.totalAmount, loan.currency)}
              />
              <SummaryCard
                icon={<Percent className="h-4 w-4" />}
                label="Effective Rate"
                value={formatPercent(displayRate)}
                modified={hasChanges}
              />
              <SummaryCard
                icon={<Calculator className="h-4 w-4" />}
                label="Interest"
                value={formatCurrency(displayInterest, loan.currency)}
                modified={hasChanges}
              />
              <SummaryCard
                icon={<DollarSign className="h-4 w-4" />}
                label="Net Proceeds"
                value={formatCurrency(loan.netProceeds, loan.currency)}
              />
            </div>

            {/* Pricing Section */}
            <section>
              <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                <Percent className="h-4 w-4" />
                Pricing Configuration
              </h3>
              <div className="grid grid-cols-2 gap-4 p-4 border rounded-lg bg-card">
                <div>
                  <label className="text-sm text-muted-foreground">
                    Base Rate
                    {isFieldModified(loanId, 'pricing.baseRate') && (
                      <span className="ml-2 text-amber-500">*</span>
                    )}
                  </label>
                  <div className="flex items-center gap-2 mt-1">
                    <Input
                      type="number"
                      step="0.001"
                      value={(localPricing.baseRate ?? 0) * 100}
                      onChange={(e) =>
                        handlePricingChange('baseRate', parseFloat(e.target.value) / 100)
                      }
                      className="w-32"
                    />
                    <span className="text-sm text-muted-foreground">%</span>
                  </div>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">
                    Spread
                    {isFieldModified(loanId, 'pricing.spread') && (
                      <span className="ml-2 text-amber-500">*</span>
                    )}
                  </label>
                  <div className="flex items-center gap-2 mt-1">
                    <Input
                      type="number"
                      step="0.001"
                      value={(localPricing.spread ?? 0) * 100}
                      onChange={(e) =>
                        handlePricingChange('spread', parseFloat(e.target.value) / 100)
                      }
                      className="w-32"
                    />
                    <span className="text-sm text-muted-foreground">%</span>
                  </div>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Day Count</label>
                  <div className="mt-1 text-sm">{loan.pricing.dayCountConvention}</div>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Accrual</label>
                  <div className="mt-1 text-sm capitalize">{loan.pricing.accrualMethod}</div>
                </div>
              </div>
            </section>

            {/* Dates Section */}
            <section>
              <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Dates
              </h3>
              <div className="grid grid-cols-2 gap-4 p-4 border rounded-lg bg-card">
                <div>
                  <label className="text-sm text-muted-foreground">Start Date</label>
                  <div className="mt-1">{formatDate(loan.startDate)}</div>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Maturity Date</label>
                  <div className="mt-1">{formatDate(loan.maturityDate)}</div>
                </div>
              </div>
            </section>

            {/* Invoices Section */}
            <section>
              <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Invoices ({loan.invoices.length})
              </h3>
              <div className="border rounded-lg overflow-hidden">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Invoice #</th>
                      <th>Buyer</th>
                      <th>Amount</th>
                      <th>Due Date</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loan.invoices.map((invoice) => (
                      <tr key={invoice.id}>
                        <td className="font-medium">{invoice.invoiceNumber}</td>
                        <td>{invoice.buyerName}</td>
                        <td className="font-mono">
                          {formatCurrency(invoice.amount, invoice.currency)}
                        </td>
                        <td>{formatDate(invoice.dueDate)}</td>
                        <td>
                          <Badge variant="secondary">{invoice.status}</Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            {/* Fees Section */}
            <section>
              <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Fees ({loan.fees.length})
              </h3>
              <FeeScheduleGrid loanId={loanId} fees={loan.fees} currency={loan.currency} />
            </section>
          </div>
        </ScrollArea>

        {/* Footer Actions */}
        {hasChanges && (
          <div className="flex items-center justify-between p-4 border-t bg-amber-50">
            <div className="text-sm text-amber-700">
              {changes.length} unsaved change{changes.length !== 1 ? 's' : ''}
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleRevertAll}>
                Revert All
              </Button>
              <Button size="sm" onClick={handleSave}>
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Inflight Changes Panel */}
      {hasChanges && (
        <InflightChangesPanel onSave={handleSave} />
      )}
    </div>
  );
}

function SummaryCard({
  icon,
  label,
  value,
  modified = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  modified?: boolean;
}) {
  return (
    <div
      className={`p-4 border rounded-lg bg-card ${
        modified ? 'border-l-4 border-l-amber-500' : ''
      }`}
    >
      <div className="flex items-center gap-2 text-muted-foreground mb-1">
        {icon}
        <span className="text-xs">{label}</span>
        {modified && <span className="text-amber-500">*</span>}
      </div>
      <div className="text-lg font-semibold">{value}</div>
    </div>
  );
}

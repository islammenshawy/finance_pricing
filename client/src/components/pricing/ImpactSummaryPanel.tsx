import { useMemo, useState, useEffect, useRef } from 'react';
import type { Loan } from '@loan-pricing/shared';
import { useChangeStore } from '@/stores/changeStore';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, formatPercent } from '@/lib/utils';
import { Plus, Minus, Pencil, ChevronLeft, ChevronRight } from 'lucide-react';
import type { PreviewData, CurrencyImpact } from '@/types/pricing';

interface ImpactSummaryPanelProps {
  loans: Loan[];
  previews: Map<string, PreviewData>;
  onSave: () => void;
  onRevert: () => void;
  saving?: boolean;
}

export function ImpactSummaryPanel({
  loans,
  previews,
  onSave,
  onRevert,
  saving,
}: ImpactSummaryPanelProps) {
  const [collapsed, setCollapsed] = useState(true); // Start collapsed
  const { changes, feeChanges, hasChanges } = useChangeStore();
  const hadChanges = useRef(false);

  // Auto-expand when changes are made
  useEffect(() => {
    const currentlyHasChanges = hasChanges();
    if (currentlyHasChanges && !hadChanges.current) {
      // Changes were just made - expand the panel
      setCollapsed(false);
    }
    hadChanges.current = currentlyHasChanges;
  }, [changes, feeChanges, hasChanges]);

  // Summarize fee changes
  const feeChangeSummary = useMemo(() => {
    const adds = feeChanges.filter((c) => c.type === 'add');
    const updates = feeChanges.filter((c) => c.type === 'update');
    const deletes = feeChanges.filter((c) => c.type === 'delete');
    return { adds, updates, deletes, total: feeChanges.length };
  }, [feeChanges]);

  const impactByCurrency = useMemo(() => {
    // Get loans that have rate changes or fee changes
    const changedLoanIds = new Set([
      ...changes.map((c) => c.loanId),
      ...feeChanges.map((c) => c.loanId),
    ]);
    const changedLoans = loans.filter((l) => changedLoanIds.has(l.id));

    // Group by currency
    const byCurrency = new Map<string, Loan[]>();
    for (const loan of changedLoans) {
      const existing = byCurrency.get(loan.currency) || [];
      existing.push(loan);
      byCurrency.set(loan.currency, existing);
    }

    // Calculate impact for each currency
    const impacts: CurrencyImpact[] = [];
    for (const [currency, currencyLoans] of byCurrency) {
      const before = {
        totalAmount: 0,
        avgRate: 0,
        totalInterest: 0,
        totalFees: 0,
        netProceeds: 0,
      };
      const after = {
        totalAmount: 0,
        avgRate: 0,
        totalInterest: 0,
        totalFees: 0,
        netProceeds: 0,
      };

      let totalRateBefore = 0;
      let totalRateAfter = 0;

      for (const loan of currencyLoans) {
        const preview = previews.get(loan.id);

        // Use loan's actual values for "before" (consistent with group header)
        before.totalAmount += loan.totalAmount;
        before.totalInterest += loan.interestAmount;
        before.totalFees += loan.totalFees;
        before.netProceeds += loan.netProceeds;
        totalRateBefore += loan.pricing.effectiveRate;

        after.totalAmount += loan.totalAmount;
        after.totalInterest += preview?.interestAmount ?? loan.interestAmount;
        after.totalFees += preview?.totalFees ?? loan.totalFees;
        after.netProceeds += preview?.netProceeds ?? loan.netProceeds;
        totalRateAfter += preview?.effectiveRate ?? loan.pricing.effectiveRate;
      }

      before.avgRate = totalRateBefore / currencyLoans.length;
      after.avgRate = totalRateAfter / currencyLoans.length;

      impacts.push({
        currency,
        loanCount: currencyLoans.length,
        before,
        after,
      });
    }

    return impacts;
  }, [loans, changes, feeChanges, previews]);

  const totalChanges = changes.length + feeChangeSummary.total;

  // Collapsed state - show toggle and summary
  if (collapsed) {
    return (
      <aside className="w-12 border-l bg-muted/20 flex flex-col items-center py-3 gap-3" data-testid="impact-panel-collapsed">
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={() => setCollapsed(false)}
          title="Expand panel"
          data-testid="expand-impact-panel"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        {hasChanges() && (
          <>
            <Badge className="bg-amber-500 text-xs px-1.5 py-0.5" data-testid="changes-badge">
              {totalChanges}
            </Badge>
            <span className="text-[10px] text-muted-foreground [writing-mode:vertical-rl] rotate-180">
              changes
            </span>
          </>
        )}
      </aside>
    );
  }

  // When no changes, always show collapsed state
  if (!hasChanges()) {
    return (
      <aside className="w-12 border-l bg-muted/20 flex flex-col items-center py-3 gap-3">
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={() => setCollapsed(false)}
          title="Show impact panel"
          disabled
        >
          <ChevronLeft className="h-4 w-4 text-muted-foreground" />
        </Button>
        <span className="text-[10px] text-muted-foreground [writing-mode:vertical-rl] rotate-180">
          impact
        </span>
      </aside>
    );
  }

  return (
    <aside className="w-72 border-l bg-card flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b bg-amber-50/50 dark:bg-amber-950/30 dark:border-amber-900/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="font-semibold text-amber-900 dark:text-amber-200">Pricing Impact</h2>
            <Badge className="bg-amber-500">{totalChanges} changes</Badge>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={() => setCollapsed(true)}
            title="Collapse panel"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">
          {impactByCurrency.reduce((sum, i) => sum + i.loanCount, 0)} loans modified
        </p>
      </div>

      {/* Impact by currency */}
      <div className="flex-1 overflow-auto p-4 space-y-4">
        {/* Rate changes */}
        {impactByCurrency.map((impact) => (
          <CurrencyImpactCard key={impact.currency} impact={impact} />
        ))}

        {/* Fee changes summary */}
        {feeChangeSummary.total > 0 && (
          <div className="rounded-lg border bg-card p-3">
            <div className="flex items-center justify-between mb-3">
              <span className="font-semibold">Fee Changes</span>
              <Badge variant="secondary">{feeChangeSummary.total}</Badge>
            </div>
            <div className="space-y-2 text-sm">
              {feeChangeSummary.adds.length > 0 && (
                <div className="flex items-center gap-2 text-green-600">
                  <Plus className="h-3 w-3" />
                  <span>{feeChangeSummary.adds.length} fee(s) to add</span>
                </div>
              )}
              {feeChangeSummary.updates.length > 0 && (
                <div className="flex items-center gap-2 text-amber-600">
                  <Pencil className="h-3 w-3" />
                  <span>{feeChangeSummary.updates.length} fee(s) modified</span>
                </div>
              )}
              {feeChangeSummary.deletes.length > 0 && (
                <div className="flex items-center gap-2 text-red-600">
                  <Minus className="h-3 w-3" />
                  <span>{feeChangeSummary.deletes.length} fee(s) to remove</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="p-4 border-t bg-muted/30 space-y-2">
        <Button data-testid="save-all-btn" onClick={onSave} className="w-full" disabled={saving}>
          {saving ? 'Saving...' : 'Save All Changes'}
        </Button>
        <Button data-testid="revert-all-btn" variant="outline" onClick={onRevert} className="w-full" disabled={saving}>
          Revert All
        </Button>
      </div>
    </aside>
  );
}

function CurrencyImpactCard({ impact }: { impact: CurrencyImpact }) {
  const rateDelta = impact.after.avgRate - impact.before.avgRate;
  const interestDelta = impact.after.totalInterest - impact.before.totalInterest;
  const feesDelta = impact.after.totalFees - impact.before.totalFees;
  const netDelta = impact.after.netProceeds - impact.before.netProceeds;

  return (
    <div className="rounded-lg border bg-card p-3">
      <div className="flex items-center justify-between mb-3">
        <span className="font-semibold">{impact.currency}</span>
        <Badge variant="secondary">{impact.loanCount} loans</Badge>
      </div>

      <div className="space-y-3 text-sm">
        {/* Average Rate */}
        <ImpactRow
          label="Avg Rate"
          before={formatPercent(impact.before.avgRate)}
          after={formatPercent(impact.after.avgRate)}
          delta={rateDelta}
          formatDelta={(d) => `${d > 0 ? '+' : ''}${(d * 100).toFixed(2)}%`}
        />

        {/* Total Interest */}
        <ImpactRow
          label="Interest"
          before={formatCurrency(impact.before.totalInterest, impact.currency)}
          after={formatCurrency(impact.after.totalInterest, impact.currency)}
          delta={interestDelta}
          formatDelta={(d) => `${d > 0 ? '+' : ''}${formatCurrency(d, impact.currency)}`}
        />

        {/* Total Fees */}
        <ImpactRow
          label="Fees"
          before={formatCurrency(impact.before.totalFees, impact.currency)}
          after={formatCurrency(impact.after.totalFees, impact.currency)}
          delta={feesDelta}
          formatDelta={(d) => `${d > 0 ? '+' : ''}${formatCurrency(d, impact.currency)}`}
        />

        {/* Net Proceeds */}
        <ImpactRow
          label="Net Proceeds"
          before={formatCurrency(impact.before.netProceeds, impact.currency)}
          after={formatCurrency(impact.after.netProceeds, impact.currency)}
          delta={netDelta}
          formatDelta={(d) => `${d > 0 ? '+' : ''}${formatCurrency(d, impact.currency)}`}
        />
      </div>
    </div>
  );
}

function ImpactRow({
  label,
  before,
  after,
  delta,
  formatDelta,
}: {
  label: string;
  before: string;
  after: string;
  delta: number;
  formatDelta: (d: number) => string;
}) {
  const isPositive = delta > 0;
  const isZero = Math.abs(delta) < 0.0001;

  if (isZero) {
    return (
      <div className="flex items-center justify-between py-1.5">
        <span className="text-muted-foreground text-xs">{label}</span>
        <span className="font-mono text-sm font-medium">{after}</span>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-[1fr_auto_auto] gap-x-3 py-1.5 items-center">
      {/* Row 1: Label | Before | (empty) */}
      <span className="text-muted-foreground text-xs">{label}</span>
      <span className="font-mono text-xs text-muted-foreground line-through">{before}</span>
      <span></span>

      {/* Row 2: (empty) | After | Delta */}
      <span></span>
      <span className="font-mono text-sm font-medium">{after}</span>
      <span className={`text-xs font-medium ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
        {formatDelta(delta)}
      </span>
    </div>
  );
}

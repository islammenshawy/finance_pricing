import { useState, useMemo } from 'react';
import type { Loan } from '@loan-pricing/shared';
import { useChangeStore } from '@/stores/changeStore';
import { Button } from '@/components/ui/button';
import { formatCurrency, formatPercent } from '@/lib/utils';
import {
  ChevronDown,
  ChevronUp,
  Save,
  Undo2,
  Percent,
  Plus,
  Minus,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Receipt,
} from 'lucide-react';

interface PreviewData {
  effectiveRate: number;
  interestAmount: number;
  totalFees: number;
  originalTotalFees?: number;
  netProceeds: number;
  originalNetProceeds?: number;
}

interface ChangesOverviewPanelProps {
  loans: Loan[];
  previews: Map<string, PreviewData>;
  onSave: () => void;
  onRevert: () => void;
  saving?: boolean;
}

export function ChangesOverviewPanel({
  loans,
  previews,
  onSave,
  onRevert,
  saving,
}: ChangesOverviewPanelProps) {
  const { changes, feeChanges, hasChanges } = useChangeStore();
  const [isExpanded, setIsExpanded] = useState(false);

  const summary = useMemo(() => {
    const rateChanges = changes.filter(c =>
      c.fieldPath.includes('baseRate') || c.fieldPath.includes('spread')
    );
    const feeAdds = feeChanges.filter(c => c.type === 'add');
    const feeUpdates = feeChanges.filter(c => c.type === 'update');
    const feeDeletes = feeChanges.filter(c => c.type === 'delete');

    const affectedLoanIds = new Set([
      ...changes.map(c => c.loanId),
      ...feeChanges.map(c => c.loanId),
    ]);

    // Calculate totals by currency
    const byCurrency = new Map<string, {
      loanCount: number;
      beforeInterest: number;
      afterInterest: number;
      beforeFees: number;
      afterFees: number;
      beforeNet: number;
      afterNet: number;
      avgRateBefore: number;
      avgRateAfter: number;
    }>();

    for (const loanId of affectedLoanIds) {
      const loan = loans.find(l => l.id === loanId);
      if (!loan) continue;

      const preview = previews.get(loanId);
      const existing = byCurrency.get(loan.currency) || {
        loanCount: 0,
        beforeInterest: 0,
        afterInterest: 0,
        beforeFees: 0,
        afterFees: 0,
        beforeNet: 0,
        afterNet: 0,
        avgRateBefore: 0,
        avgRateAfter: 0,
      };

      existing.loanCount++;
      // Use loan's actual values for "before" (consistent with group header)
      existing.beforeInterest += loan.interestAmount;
      existing.afterInterest += preview?.interestAmount ?? loan.interestAmount;
      existing.beforeFees += loan.totalFees;
      existing.afterFees += preview?.totalFees ?? loan.totalFees;
      existing.beforeNet += loan.netProceeds;
      existing.afterNet += preview?.netProceeds ?? loan.netProceeds;
      existing.avgRateBefore += loan.pricing.effectiveRate;
      existing.avgRateAfter += preview?.effectiveRate ?? loan.pricing.effectiveRate;

      byCurrency.set(loan.currency, existing);
    }

    // Calculate averages
    for (const [, data] of byCurrency) {
      data.avgRateBefore /= data.loanCount;
      data.avgRateAfter /= data.loanCount;
    }

    return {
      totalChanges: changes.length + feeChanges.length,
      loanCount: affectedLoanIds.size,
      rateChanges: rateChanges.length,
      feeAdds: feeAdds.length,
      feeUpdates: feeUpdates.length,
      feeDeletes: feeDeletes.length,
      totalFeeChanges: feeAdds.length + feeUpdates.length + feeDeletes.length,
      byCurrency: Array.from(byCurrency.entries()),
    };
  }, [changes, feeChanges, loans, previews]);

  if (!hasChanges()) {
    return null;
  }

  return (
    <div className="border-b bg-amber-50/80 dark:bg-amber-950/20">
      {/* Compact Row */}
      <div className="px-4 py-2 flex items-center gap-4">
        {/* Pulsing indicator */}
        <div className="relative flex-shrink-0">
          <div className="absolute inset-0 bg-amber-500 rounded-full animate-ping opacity-30" />
          <div className="relative w-2 h-2 bg-amber-500 rounded-full" />
        </div>

        {/* Summary chips */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Loans affected */}
          <span className="text-sm font-medium text-amber-900 dark:text-amber-100">
            {summary.loanCount} loan{summary.loanCount !== 1 ? 's' : ''} modified
          </span>

          <span className="text-amber-300">|</span>

          {/* Rate changes */}
          {summary.rateChanges > 0 && (
            <div className="flex items-center gap-1 px-2 py-0.5 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 rounded text-xs font-medium">
              <Percent className="h-3 w-3" />
              {summary.rateChanges} rate{summary.rateChanges !== 1 ? 's' : ''}
            </div>
          )}

          {/* Fee adds */}
          {summary.feeAdds > 0 && (
            <div className="flex items-center gap-1 px-2 py-0.5 bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 rounded text-xs font-medium">
              <Plus className="h-3 w-3" />
              {summary.feeAdds} fee{summary.feeAdds !== 1 ? 's' : ''}
            </div>
          )}

          {/* Fee removes */}
          {summary.feeDeletes > 0 && (
            <div className="flex items-center gap-1 px-2 py-0.5 bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 rounded text-xs font-medium">
              <Minus className="h-3 w-3" />
              {summary.feeDeletes} fee{summary.feeDeletes !== 1 ? 's' : ''}
            </div>
          )}

          {/* Fee updates */}
          {summary.feeUpdates > 0 && (
            <div className="flex items-center gap-1 px-2 py-0.5 bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 rounded text-xs font-medium">
              <Receipt className="h-3 w-3" />
              {summary.feeUpdates} updated
            </div>
          )}

          <span className="text-amber-300">|</span>

          {/* Net impact per currency */}
          {summary.byCurrency.map(([currency, data]) => {
            const netDelta = data.afterNet - data.beforeNet;
            const isPositive = netDelta >= 0;
            return (
              <div
                key={currency}
                className={`flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${
                  isPositive
                    ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300'
                    : 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300'
                }`}
              >
                {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                <span className="font-medium">{currency}</span>
                <span className="font-mono">{isPositive ? '+' : ''}{formatCurrency(netDelta, currency)}</span>
              </div>
            );
          })}
        </div>

        {/* Expand toggle */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="p-1 hover:bg-amber-200/50 rounded text-amber-600 ml-auto"
        >
          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs text-amber-700 hover:text-amber-900 hover:bg-amber-200/50"
            onClick={onRevert}
            disabled={saving}
          >
            <Undo2 className="h-3 w-3 mr-1" />
            Revert
          </Button>
          <Button
            size="sm"
            className="h-7 text-xs bg-amber-600 hover:bg-amber-700 text-white"
            onClick={onSave}
            disabled={saving}
          >
            {saving ? (
              <div className="h-3 w-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <Save className="h-3 w-3 mr-1" />
                Save
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Expanded Breakdown */}
      {isExpanded && (
        <div className="px-4 pb-3 border-t border-amber-200/50 dark:border-amber-800/30">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-3">
            {summary.byCurrency.map(([currency, data]) => (
              <CurrencyBreakdown key={currency} currency={currency} data={data} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Currency breakdown card
function CurrencyBreakdown({
  currency,
  data,
}: {
  currency: string;
  data: {
    loanCount: number;
    beforeInterest: number;
    afterInterest: number;
    beforeFees: number;
    afterFees: number;
    beforeNet: number;
    afterNet: number;
    avgRateBefore: number;
    avgRateAfter: number;
  };
}) {
  const rateDelta = data.avgRateAfter - data.avgRateBefore;
  const interestDelta = data.afterInterest - data.beforeInterest;
  const feesDelta = data.afterFees - data.beforeFees;
  const netDelta = data.afterNet - data.beforeNet;

  return (
    <div className="bg-white dark:bg-slate-900 rounded-lg border p-3 text-sm">
      {/* Header */}
      <div className="flex items-center justify-between mb-3 pb-2 border-b">
        <div className="flex items-center gap-2">
          <span className="font-bold">{currency}</span>
          <span className="text-xs text-muted-foreground">({data.loanCount} loans)</span>
        </div>
        <DeltaBadge value={netDelta} format={(v) => formatCurrency(v, currency)} />
      </div>

      {/* Breakdown rows */}
      <div className="space-y-2">
        <BreakdownRow
          label="Avg Rate"
          before={formatPercent(data.avgRateBefore)}
          after={formatPercent(data.avgRateAfter)}
          delta={rateDelta}
          formatDelta={(v) => `${v > 0 ? '+' : ''}${(v * 100).toFixed(2)}%`}
          icon={<Percent className="h-3 w-3" />}
        />
        <BreakdownRow
          label="Interest"
          before={formatCurrency(data.beforeInterest, currency)}
          after={formatCurrency(data.afterInterest, currency)}
          delta={interestDelta}
          formatDelta={(v) => `${v > 0 ? '+' : ''}${formatCurrency(v, currency)}`}
          icon={<DollarSign className="h-3 w-3" />}
        />
        <BreakdownRow
          label="Fees"
          before={formatCurrency(data.beforeFees, currency)}
          after={formatCurrency(data.afterFees, currency)}
          delta={feesDelta}
          formatDelta={(v) => `${v > 0 ? '+' : ''}${formatCurrency(v, currency)}`}
          icon={<Receipt className="h-3 w-3" />}
        />
        <div className="pt-2 border-t">
          <BreakdownRow
            label="Net Proceeds"
            before={formatCurrency(data.beforeNet, currency)}
            after={formatCurrency(data.afterNet, currency)}
            delta={netDelta}
            formatDelta={(v) => `${v > 0 ? '+' : ''}${formatCurrency(v, currency)}`}
            bold
          />
        </div>
      </div>
    </div>
  );
}

// Single breakdown row
function BreakdownRow({
  label,
  before,
  after,
  delta,
  formatDelta,
  icon,
  bold,
}: {
  label: string;
  before: string;
  after: string;
  delta: number;
  formatDelta: (v: number) => string;
  icon?: React.ReactNode;
  bold?: boolean;
}) {
  const isPositive = delta > 0;
  const isNegative = delta < 0;
  const isZero = Math.abs(delta) < 0.0001;

  return (
    <div className={`flex items-center gap-2 ${bold ? 'font-semibold' : ''}`}>
      {icon && <span className="text-muted-foreground">{icon}</span>}
      <span className="text-muted-foreground w-20">{label}</span>
      {!isZero ? (
        <>
          <span className="font-mono text-xs text-muted-foreground line-through">{before}</span>
          <span className="text-muted-foreground">→</span>
          <span className="font-mono text-xs">{after}</span>
        </>
      ) : (
        <span className="font-mono text-xs">{after}</span>
      )}
      {!isZero && (
        <span
          className={`ml-auto font-mono text-xs ${
            isPositive ? 'text-green-600' : isNegative ? 'text-red-600' : 'text-muted-foreground'
          }`}
        >
          {formatDelta(delta)}
        </span>
      )}
    </div>
  );
}

// Delta badge
function DeltaBadge({
  value,
  format,
}: {
  value: number;
  format: (v: number) => string;
}) {
  const isPositive = value >= 0;
  return (
    <div
      className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${
        isPositive
          ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
          : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
      }`}
    >
      {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
      <span>{isPositive ? '+' : ''}{format(value)}</span>
    </div>
  );
}

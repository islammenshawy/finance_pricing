import { useState } from 'react';
import type { SnapshotChanges, SnapshotCurrencySummary, SnapshotCurrencyDelta } from '@loan-pricing/shared';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, formatPercent } from '@/lib/utils';
import {
  ChevronLeft,
  ChevronRight,
  History,
  Plus,
  Trash2,
  Edit3,
  Percent,
  DollarSign,
  TrendingUp,
  TrendingDown,
  FileText,
} from 'lucide-react';

interface SnapshotChangesPanelProps {
  timestamp: Date | string;
  userName: string;
  changeCount: number;
  description?: string;
  summary: Record<string, SnapshotCurrencySummary>;
  delta: Record<string, SnapshotCurrencyDelta> | null;
  changes: SnapshotChanges;
  onExit: () => void;
}

function ActionIcon({ action }: { action: string }) {
  switch (action) {
    case 'added':
      return <Plus className="h-3 w-3 text-green-600 flex-shrink-0" />;
    case 'deleted':
      return <Trash2 className="h-3 w-3 text-red-600 flex-shrink-0" />;
    case 'modified':
      return <Edit3 className="h-3 w-3 text-amber-600 flex-shrink-0" />;
    default:
      return null;
  }
}

function DeltaValue({ value, positive = true }: { value: number; positive?: boolean }) {
  if (Math.abs(value) < 0.01) return null;
  const isUp = value > 0;
  const Icon = isUp ? TrendingUp : TrendingDown;
  // For net proceeds, positive is good. For fees/interest, it depends on context
  const colorClass = (isUp === positive) ? 'text-green-600' : 'text-red-600';

  return (
    <span className={`flex items-center gap-0.5 ${colorClass}`}>
      <Icon className="h-3 w-3" />
    </span>
  );
}

export function SnapshotChangesPanel({
  timestamp,
  userName,
  changeCount,
  description,
  summary,
  delta,
  changes,
  onExit,
}: SnapshotChangesPanelProps) {
  const [collapsed, setCollapsed] = useState(false);

  const formattedDate = new Date(timestamp).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

  const hasFeeChanges = changes?.fees && changes.fees.length > 0;
  const hasRateChanges = changes?.rates && changes.rates.length > 0;
  const hasInvoiceChanges = changes?.invoices && changes.invoices.length > 0;
  const hasStatusChanges = changes?.statuses && changes.statuses.length > 0;
  const hasAnyChanges = hasFeeChanges || hasRateChanges || hasInvoiceChanges || hasStatusChanges;

  // Collapsed state
  if (collapsed) {
    return (
      <aside className="w-12 border-l bg-slate-100/50 dark:bg-slate-800/50 flex flex-col items-center py-3 gap-3">
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={() => setCollapsed(false)}
          title="Expand panel"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <History className="h-4 w-4 text-muted-foreground" />
        <span className="text-[10px] text-muted-foreground [writing-mode:vertical-rl] rotate-180">
          snapshot
        </span>
      </aside>
    );
  }

  return (
    <aside className="w-80 border-l bg-card flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b bg-slate-100/50 dark:bg-slate-800/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="h-4 w-4 text-slate-600 dark:text-slate-400" />
            <h2 className="font-semibold text-slate-800 dark:text-slate-200">Snapshot</h2>
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
        <div className="text-xs text-muted-foreground mt-1">
          {formattedDate} by {userName}
        </div>
        {description && (
          <div className="text-sm text-foreground mt-2 italic">"{description}"</div>
        )}
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-auto p-4 space-y-4">
        {/* Summary by currency */}
        {Object.entries(summary).map(([currency, currencySummary]) => {
          const currencyDelta = delta?.[currency];
          return (
            <div key={currency} className="rounded-lg border bg-card p-3">
              <div className="flex items-center justify-between mb-3">
                <span className="font-semibold">{currency}</span>
                <Badge variant="secondary">{currencySummary.loanCount} loans</Badge>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground text-xs">Net Proceeds</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-medium">
                      {formatCurrency(currencySummary.netProceeds, currency)}
                    </span>
                    {currencyDelta && (
                      <DeltaValue value={currencyDelta.netProceedsChange} positive={true} />
                    )}
                  </div>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground text-xs">Total Fees</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-medium">
                      {formatCurrency(currencySummary.totalFees, currency)}
                    </span>
                    {currencyDelta && (
                      <DeltaValue value={currencyDelta.feesChange} positive={false} />
                    )}
                  </div>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground text-xs">Interest</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-medium">
                      {formatCurrency(currencySummary.totalInterest, currency)}
                    </span>
                    {currencyDelta && (
                      <DeltaValue value={currencyDelta.interestChange} positive={false} />
                    )}
                  </div>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground text-xs">Avg Rate</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-medium">
                      {formatPercent(currencySummary.avgRate)}
                    </span>
                    {currencyDelta && currencyDelta.avgRateChange !== 0 && (
                      <span className={`text-xs ${currencyDelta.avgRateChange > 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {currencyDelta.avgRateChange > 0 ? '+' : ''}{currencyDelta.avgRateChange.toFixed(0)}bp
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {/* Detailed Changes */}
        {hasAnyChanges && (
          <div className="rounded-lg border bg-card p-3">
            <div className="flex items-center justify-between mb-3">
              <span className="font-semibold">Changes Made</span>
              <Badge variant="secondary">{changeCount}</Badge>
            </div>

            <div className="space-y-3">
              {/* Fee Changes */}
              {hasFeeChanges && (
                <div className="space-y-1.5">
                  <div className="text-xs text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                    <DollarSign className="h-3 w-3" />
                    Fees ({changes.fees.length})
                  </div>
                  {changes.fees.map((fee, idx) => (
                    <div key={`fee-${idx}`} className="flex items-start gap-2 text-xs py-1 border-b border-dashed last:border-0">
                      <ActionIcon action={fee.action} />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{fee.feeName}</div>
                        <div className="text-muted-foreground truncate">
                          Loan {fee.loanNumber}
                        </div>
                      </div>
                      <div className="text-right">
                        {fee.action === 'modified' && (
                          <div className="font-mono">
                            <span className="text-muted-foreground line-through">
                              {formatCurrency(fee.oldAmount || 0, fee.currency)}
                            </span>
                            <br />
                            <span className="text-amber-600">
                              {formatCurrency(fee.newAmount || 0, fee.currency)}
                            </span>
                          </div>
                        )}
                        {fee.action === 'deleted' && (
                          <span className="text-red-600 font-mono">
                            -{formatCurrency(fee.oldAmount || 0, fee.currency)}
                          </span>
                        )}
                        {fee.action === 'added' && fee.newAmount && (
                          <span className="text-green-600 font-mono">
                            +{formatCurrency(fee.newAmount, fee.currency)}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Rate Changes */}
              {hasRateChanges && (
                <div className="space-y-1.5">
                  <div className="text-xs text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                    <Percent className="h-3 w-3" />
                    Rates ({changes.rates.length})
                  </div>
                  {changes.rates.map((rate, idx) => (
                    <div key={`rate-${idx}`} className="flex items-start gap-2 text-xs py-1 border-b border-dashed last:border-0">
                      <ActionIcon action={rate.action} />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium">{rate.loanNumber}</div>
                        <div className="text-muted-foreground capitalize">{rate.field}</div>
                      </div>
                      <div className="text-right font-mono">
                        <span className="text-muted-foreground line-through">
                          {(rate.oldValue * 100).toFixed(2)}%
                        </span>
                        <br />
                        <span className="text-amber-600">
                          {(rate.newValue * 100).toFixed(2)}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Invoice Changes */}
              {hasInvoiceChanges && (
                <div className="space-y-1.5">
                  <div className="text-xs text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                    <FileText className="h-3 w-3" />
                    Invoices ({changes.invoices.length})
                  </div>
                  {changes.invoices.map((invoice, idx) => (
                    <div key={`inv-${idx}`} className="flex items-start gap-2 text-xs py-1 border-b border-dashed last:border-0">
                      <ActionIcon action={invoice.action} />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{invoice.invoiceNumber}</div>
                        {invoice.action === 'moved' && (
                          <div className="text-muted-foreground">
                            {invoice.sourceLoanNumber} → {invoice.targetLoanNumber}
                          </div>
                        )}
                      </div>
                      <span className="font-mono">
                        {formatCurrency(invoice.amount, invoice.currency)}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Status Changes */}
              {hasStatusChanges && (
                <div className="space-y-1.5">
                  <div className="text-xs text-muted-foreground uppercase tracking-wide">
                    Status Changes ({changes.statuses.length})
                  </div>
                  {changes.statuses.map((status, idx) => (
                    <div key={`status-${idx}`} className="flex items-start gap-2 text-xs py-1 border-b border-dashed last:border-0">
                      <ActionIcon action={status.action} />
                      <div className="flex-1">
                        <div className="font-medium">{status.loanNumber}</div>
                        <div className="text-muted-foreground capitalize">{status.field}</div>
                      </div>
                      <div className="text-right">
                        <span className="text-muted-foreground line-through">{status.oldValue}</span>
                        <br />
                        <span className="text-amber-600">{status.newValue}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {!hasAnyChanges && (
          <div className="text-center py-4 text-muted-foreground text-sm">
            No detailed change information available
          </div>
        )}
      </div>

      {/* Exit button */}
      <div className="p-4 border-t bg-muted/30">
        <Button variant="outline" onClick={onExit} className="w-full">
          Exit Playback
        </Button>
      </div>
    </aside>
  );
}

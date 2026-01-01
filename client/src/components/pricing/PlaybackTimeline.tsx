import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getSnapshots } from '@/lib/api';
import { usePlayback } from '@/hooks/usePlayback';
import { formatCurrency, formatPercent } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  ChevronDown,
  ChevronRight,
  History,
  Clock,
  User,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  Minus,
  Play,
} from 'lucide-react';
import type { SnapshotSummary, SnapshotCurrencySummary, SnapshotChanges } from '@loan-pricing/shared';
import { Plus, Trash2, Edit3, Percent, DollarSign } from 'lucide-react';

interface PlaybackTimelineProps {
  customerId: string;
}

function formatDate(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function formatDateShort(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function formatDelta(value: number, currency?: string, isBasisPoints = false): string {
  if (Math.abs(value) < 0.01) return '—';
  const sign = value > 0 ? '+' : '';
  if (isBasisPoints) {
    return `${sign}${value.toFixed(0)}bp`;
  }
  if (currency) {
    return `${sign}${formatCurrency(value, currency)}`;
  }
  return `${sign}${value.toFixed(2)}`;
}

function DeltaIndicator({ value, currency, isBasisPoints = false }: { value: number; currency?: string; isBasisPoints?: boolean }) {
  if (Math.abs(value) < 0.01) {
    return <Minus className="h-3 w-3 text-muted-foreground" />;
  }
  const isPositive = value > 0;
  const Icon = isPositive ? TrendingUp : TrendingDown;
  // For net proceeds, positive is good (green). For fees/interest, higher means more cost (red)
  const colorClass = isPositive ? 'text-green-600' : 'text-red-600';

  return (
    <span className={`flex items-center gap-0.5 ${colorClass}`}>
      <Icon className="h-3 w-3" />
      <span className="text-xs font-medium">{formatDelta(value, currency, isBasisPoints)}</span>
    </span>
  );
}

function ActionIcon({ action }: { action: string }) {
  switch (action) {
    case 'added':
      return <Plus className="h-3 w-3 text-green-600" />;
    case 'deleted':
      return <Trash2 className="h-3 w-3 text-red-600" />;
    case 'modified':
      return <Edit3 className="h-3 w-3 text-amber-600" />;
    default:
      return null;
  }
}

function ChangesList({ changes }: { changes?: SnapshotChanges }) {
  if (!changes) return null;

  const hasFeeChanges = changes.fees && changes.fees.length > 0;
  const hasRateChanges = changes.rates && changes.rates.length > 0;
  const hasInvoiceChanges = changes.invoices && changes.invoices.length > 0;

  if (!hasFeeChanges && !hasRateChanges && !hasInvoiceChanges) {
    return null;
  }

  return (
    <div className="border-t p-3 space-y-2">
      <div className="text-xs font-medium text-muted-foreground flex items-center gap-1">
        <Edit3 className="h-3 w-3" />
        Changes
      </div>

      {/* Fee Changes */}
      {hasFeeChanges && (
        <div className="space-y-1">
          <div className="text-[10px] text-muted-foreground uppercase tracking-wide flex items-center gap-1">
            <DollarSign className="h-2.5 w-2.5" />
            Fees
          </div>
          {changes.fees.slice(0, 5).map((fee, idx) => (
            <div key={`fee-${idx}`} className="flex items-center gap-2 text-xs">
              <ActionIcon action={fee.action} />
              <span className="truncate flex-1" title={`${fee.feeName} - Loan ${fee.loanNumber}`}>
                {fee.feeName}
              </span>
              {fee.action === 'modified' && (
                <span className="text-muted-foreground font-mono text-[10px]">
                  {formatCurrency(fee.oldAmount || 0, fee.currency)} → {formatCurrency(fee.newAmount || 0, fee.currency)}
                </span>
              )}
              {fee.action === 'deleted' && (
                <span className="text-red-600 font-mono text-[10px]">
                  -{formatCurrency(fee.oldAmount || 0, fee.currency)}
                </span>
              )}
              {fee.action === 'added' && fee.newAmount && (
                <span className="text-green-600 font-mono text-[10px]">
                  +{formatCurrency(fee.newAmount, fee.currency)}
                </span>
              )}
            </div>
          ))}
          {changes.fees.length > 5 && (
            <div className="text-[10px] text-muted-foreground">
              +{changes.fees.length - 5} more fee changes
            </div>
          )}
        </div>
      )}

      {/* Rate Changes */}
      {hasRateChanges && (
        <div className="space-y-1">
          <div className="text-[10px] text-muted-foreground uppercase tracking-wide flex items-center gap-1">
            <Percent className="h-2.5 w-2.5" />
            Rates
          </div>
          {changes.rates.slice(0, 5).map((rate, idx) => (
            <div key={`rate-${idx}`} className="flex items-center gap-2 text-xs">
              <ActionIcon action={rate.action} />
              <span className="truncate flex-1" title={`${rate.field} - Loan ${rate.loanNumber}`}>
                {rate.loanNumber} {rate.field}
              </span>
              <span className="text-muted-foreground font-mono text-[10px]">
                {(rate.oldValue * 100).toFixed(2)}% → {(rate.newValue * 100).toFixed(2)}%
              </span>
            </div>
          ))}
          {changes.rates.length > 5 && (
            <div className="text-[10px] text-muted-foreground">
              +{changes.rates.length - 5} more rate changes
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function SnapshotDot({
  snapshot,
  nextSnapshot,
  isLast,
  onView,
  isActive,
  isPlaybackMode,
}: {
  snapshot: SnapshotSummary;
  nextSnapshot?: SnapshotSummary;
  isLast: boolean;
  onView: () => void;
  isActive: boolean;
  isPlaybackMode: boolean;
}) {
  const [open, setOpen] = useState(false);

  // For connector: use the NEXT snapshot's delta (what changed FROM this snapshot TO the next)
  // The next snapshot's delta shows what changed compared to its previous (which is this snapshot)
  const connectorDelta = nextSnapshot?.delta;
  const connectorChanges = nextSnapshot?.changes;

  // Get the currency with the largest absolute change for the connector
  const mainCurrency = useMemo(() => {
    if (!connectorDelta) {
      return Object.keys(snapshot.summary).includes('USD') ? 'USD' : Object.keys(snapshot.summary)[0];
    }

    // Find currency with largest absolute netProceedsChange
    let maxCurrency = 'USD';
    let maxChange = 0;

    for (const [currency, d] of Object.entries(connectorDelta)) {
      const absChange = Math.abs(d?.netProceedsChange ?? 0);
      if (absChange > maxChange) {
        maxChange = absChange;
        maxCurrency = currency;
      }
    }

    // Fallback to USD if no changes found
    return maxChange > 0 ? maxCurrency : (Object.keys(snapshot.summary).includes('USD') ? 'USD' : Object.keys(snapshot.summary)[0]);
  }, [connectorDelta, snapshot.summary]);

  const delta = connectorDelta?.[mainCurrency];

  return (
    <div className="flex items-center relative">
      {/* Glass playhead effect when this is the active snapshot in playback */}
      {isActive && isPlaybackMode && (
        <div className="absolute -inset-x-1.5 -inset-y-1.5 bg-gradient-to-b from-amber-400/20 via-amber-300/30 to-amber-400/20 rounded-lg border border-amber-400/50 backdrop-blur-sm z-0 animate-pulse" />
      )}

      {/* Dot with popover */}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            className={`relative z-10 w-4 h-4 rounded-full border-2 transition-all ${
              isActive && isPlaybackMode
                ? 'bg-amber-500 border-amber-600 ring-4 ring-amber-400/50 scale-125'
                : isActive
                ? 'bg-primary border-primary ring-2 ring-primary/30'
                : 'bg-background border-slate-400 hover:border-primary hover:scale-110'
            }`}
            title={formatDate(snapshot.timestamp)}
          />
        </PopoverTrigger>
        <PopoverContent className="w-64 p-0" align="center" side="top" sideOffset={8} collisionPadding={20}>
          {/* View button at top - always visible */}
          <div className="p-2 border-b bg-muted/30">
            <Button
              size="sm"
              className="w-full"
              onClick={() => {
                setOpen(false);
                onView();
              }}
            >
              View Snapshot
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>

          {/* Header info */}
          <div className="p-3 border-b">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Clock className="h-4 w-4 text-muted-foreground" />
              {formatDate(snapshot.timestamp)}
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
              <User className="h-3 w-3" />
              {snapshot.userName}
              <span>•</span>
              {snapshot.changeCount} changes
            </div>
            {snapshot.description && (
              <div className="mt-2 text-sm text-foreground italic">
                "{snapshot.description}"
              </div>
            )}
          </div>

          {/* Currency details - scrollable */}
          <div className="p-3 space-y-2 max-h-48 overflow-y-auto">
            {Object.entries(snapshot.summary).map(([currency, summaryData]) => {
              const summary = summaryData as SnapshotCurrencySummary;
              return (
                <div key={currency} className="space-y-1">
                  <div className="text-xs font-medium text-muted-foreground">
                    {currency} ({summary.loanCount} loans)
                  </div>
                  <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-xs">
                    <span className="text-muted-foreground">Net:</span>
                    <span className="font-mono text-right">{formatCurrency(summary.netProceeds, currency)}</span>
                    <span className="text-muted-foreground">Fees:</span>
                    <span className="font-mono text-right">{formatCurrency(summary.totalFees, currency)}</span>
                    <span className="text-muted-foreground">Interest:</span>
                    <span className="font-mono text-right">{formatCurrency(summary.totalInterest, currency)}</span>
                    <span className="text-muted-foreground">Avg Rate:</span>
                    <span className="font-mono text-right">{formatPercent(summary.avgRate)}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Detailed Changes */}
          <ChangesList changes={snapshot.changes} />
        </PopoverContent>
      </Popover>

      {/* Connector line with delta */}
      {!isLast && (
        <div className="flex-1 flex flex-col items-center px-2 min-w-[80px]">
          {/* Delta display between dots */}
          {delta && (
            <div className="text-center space-y-0.5 py-1">
              <div className="flex items-center justify-center gap-1">
                <DeltaIndicator value={delta.netProceedsChange} currency={mainCurrency} />
              </div>
              <div className="text-[10px] text-muted-foreground">
                Fees: {formatDelta(delta.feesChange, mainCurrency)}
              </div>
              <div className="text-[10px] text-muted-foreground">
                {(() => {
                  const rateChanges = connectorChanges?.rates || [];
                  if (rateChanges.length === 0) {
                    return `Rate: ${formatDelta(delta.avgRateChange, undefined, true)}`;
                  }
                  // Show individual rate changes if recorded
                  if (rateChanges.length === 1) {
                    const change = rateChanges[0];
                    const bpChange = (change.newValue - change.oldValue) * 10000;
                    return `Rate: ${bpChange >= 0 ? '+' : ''}${bpChange.toFixed(0)}bp`;
                  }
                  // Multiple rate changes - show count and direction
                  const totalBpChange = rateChanges.reduce((sum, r) => sum + (r.newValue - r.oldValue) * 10000, 0);
                  const avgBpChange = totalBpChange / rateChanges.length;
                  return `Rate: ${rateChanges.length}× (${avgBpChange >= 0 ? '+' : ''}${avgBpChange.toFixed(0)}bp avg)`;
                })()}
              </div>
            </div>
          )}
          {/* Connector line */}
          <div className="w-full h-[2px] bg-slate-300 dark:bg-slate-600" />
        </div>
      )}
    </div>
  );
}

export function PlaybackTimeline({ customerId }: PlaybackTimelineProps) {
  const [expanded, setExpanded] = useState(false);
  const { isPlaybackMode, currentSnapshotId, enterPlayback } = usePlayback();

  const { data, isLoading } = useQuery({
    queryKey: ['snapshots', customerId],
    queryFn: () => getSnapshots(customerId, { limit: 20 }),
    enabled: !!customerId,
    refetchOnWindowFocus: false,
  });

  // Reverse to show oldest on left, newest on right (chronological order)
  const snapshots = [...(data?.snapshots ?? [])].reverse();

  return (
    <div className="border-y border-slate-200 dark:border-slate-700 bg-gradient-to-r from-slate-50 to-white dark:from-slate-900 dark:to-slate-800/50">
      {/* Header */}
      <div
        className={`px-4 py-2 flex items-center justify-between cursor-pointer hover:bg-muted/30 ${
          expanded ? 'border-b border-slate-200 dark:border-slate-700' : ''
        }`}
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3">
          {expanded ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
          <History className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium text-sm">Pricing History</span>

          {snapshots.length > 0 && (
            <Badge variant="outline" className="text-xs">
              {snapshots.length} snapshot{snapshots.length !== 1 ? 's' : ''}
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-3">
          {!expanded && snapshots.length > 0 && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-3 w-3" />
              Last saved: {formatDate(snapshots[snapshots.length - 1].timestamp)}
            </div>
          )}

          {/* Start Playback button - visible when not in playback and there are snapshots */}
          {!isPlaybackMode && snapshots.length > 0 && (
            <Button
              size="sm"
              variant="outline"
              className="h-8 gap-2 border-amber-500 text-amber-600 hover:bg-amber-50 hover:text-amber-700 dark:hover:bg-amber-950"
              onClick={(e) => {
                e.stopPropagation();
                // Start from the latest (most recent) snapshot - last in chronological order
                const latestSnapshot = snapshots[snapshots.length - 1];
                enterPlayback(latestSnapshot.id, snapshots);
              }}
            >
              <Play className="h-3.5 w-3.5" />
              Start Playback
            </Button>
          )}
        </div>
      </div>

      {/* Timeline Content */}
      {expanded && (
        <div className="px-4 py-3">
          {isLoading ? (
            <div className="text-sm text-muted-foreground text-center py-4">
              Loading history...
            </div>
          ) : snapshots.length === 0 ? (
            <div className="text-center py-4">
              <History className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">No snapshots yet</p>
              <p className="text-xs text-muted-foreground">
                Snapshots are created when you save changes
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <div className="flex items-center min-w-max pb-2">
                {/* Snapshots timeline (oldest first after reverse) */}
                {snapshots.map((snapshot: SnapshotSummary, index: number) => (
                  <SnapshotDot
                    key={snapshot.id}
                    snapshot={snapshot}
                    nextSnapshot={index < snapshots.length - 1 ? snapshots[index + 1] : undefined}
                    isLast={index === snapshots.length - 1}
                    onView={() => enterPlayback(snapshot.id, snapshots)}
                    isActive={currentSnapshotId === snapshot.id}
                    isPlaybackMode={isPlaybackMode}
                  />
                ))}

                {/* Current state indicator */}
                <div className="flex items-center ml-2">
                  <div className="w-[2px] h-4 bg-slate-300 dark:bg-slate-600 mr-2" />
                  <div className="flex flex-col items-center">
                    <div className="w-3 h-3 rounded-full bg-emerald-500 border-2 border-emerald-300" />
                    <span className="text-[10px] text-muted-foreground mt-1">Now</span>
                  </div>
                </div>
              </div>

              {/* Timestamps row */}
              <div className="flex items-start min-w-max text-[10px] text-muted-foreground -mt-1">
                {snapshots.map((snapshot: SnapshotSummary, index: number) => (
                  <div
                    key={`ts-${snapshot.id}`}
                    className="flex items-start"
                    style={{ minWidth: index === snapshots.length - 1 ? '16px' : '96px' }}
                  >
                    <span className="transform -translate-x-1/2 text-center">
                      <div>{new Date(snapshot.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>
                      <div className="text-[9px] opacity-70">{new Date(snapshot.timestamp).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</div>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

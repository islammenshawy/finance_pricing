import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import type { Loan, Fee, FeeConfig } from '@loan-pricing/shared';
import { formatCurrency } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, ChevronRight, Pencil } from 'lucide-react';
import { useChangeStore, type FeeChange } from '@/stores/changeStore';
import { useVirtualizer } from '@tanstack/react-virtual';
import type { PreviewData, SortField, SortDirection } from '@/types/pricing';
import { LoanRow, SortableHeader } from './table';

interface LoanPricingTableProps {
  loans: Loan[];
  allLoans?: Loan[];
  groupBy: 'currency' | 'status' | 'pricingStatus' | null;
  feeConfigs: FeeConfig[];
  onPreviewChange: (loanId: string, field: 'baseRate' | 'spread', value: number) => void;
  onAddFee: (loanId: string, feeConfigId: string) => void;
  onUpdateFee: (loanId: string, feeId: string, updates: Partial<Fee>) => void;
  onRemoveFee: (loanId: string, feeId: string) => void;
  onStatusChange?: (loanId: string, status: string, type: 'status' | 'pricingStatus') => void;
  onSplitSuccess?: () => void;
  onInvoiceChange?: () => void;
  previews: Map<string, PreviewData>;
  getPendingFeeAdds: (loanId: string) => FeeChange[];
  isFeeDeleted: (loanId: string, feeId: string) => boolean;
  getFeeUpdates: (loanId: string, feeId: string) => Partial<Fee> | undefined;
  sortField?: SortField;
  sortDirection?: SortDirection;
  onSort?: (field: SortField) => void;
  selectedIds?: Set<string>;
  onSelectionChange?: (ids: Set<string>) => void;
}

interface GroupedLoans {
  [key: string]: Loan[];
}

// Row height constants for virtual scrolling
const ROW_HEIGHT = 44;
const EXPANDED_ROW_HEIGHT = 500;

/**
 * Main loan pricing table with grouping, virtual scrolling, and inline editing
 */
export function LoanPricingTable({
  loans,
  allLoans,
  groupBy,
  feeConfigs,
  onPreviewChange,
  onAddFee,
  onUpdateFee,
  onRemoveFee,
  onStatusChange,
  onSplitSuccess,
  onInvoiceChange,
  previews,
  getPendingFeeAdds,
  isFeeDeleted,
  getFeeUpdates,
  sortField,
  sortDirection,
  onSort,
  selectedIds: controlledSelectedIds,
  onSelectionChange,
}: LoanPricingTableProps) {
  const { isFieldModified, getNewValue, hasChangesForLoan } = useChangeStore();
  const parentRef = useRef<HTMLDivElement>(null);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(() => {
    const initial = new Set<string>(['all']);
    if (groupBy) {
      for (const loan of loans) {
        initial.add(String(loan[groupBy]));
      }
    }
    return initial;
  });
  const [expandedLoans, setExpandedLoans] = useState<Set<string>>(new Set());
  const [internalSelectedIds, setInternalSelectedIds] = useState<Set<string>>(new Set());

  const selectedIds = controlledSelectedIds ?? internalSelectedIds;
  const setSelectedIds = useCallback((newIds: Set<string> | ((prev: Set<string>) => Set<string>)) => {
    const resolved = typeof newIds === 'function' ? newIds(selectedIds) : newIds;
    if (onSelectionChange) {
      onSelectionChange(resolved);
    } else {
      setInternalSelectedIds(resolved);
    }
  }, [selectedIds, onSelectionChange]);

  // Group loans
  const groupedLoans = useMemo(() => {
    const groups: GroupedLoans = {};
    if (groupBy) {
      for (const loan of loans) {
        const key = String(loan[groupBy]);
        if (!groups[key]) groups[key] = [];
        groups[key].push(loan);
      }
    } else {
      groups['all'] = loans;
    }
    return groups;
  }, [loans, groupBy]);

  // Flatten for virtual scrolling
  const flatItems = useMemo(() => {
    const items: Array<{ type: 'group-header' | 'column-header' | 'loan'; data: unknown }> = [];
    for (const [groupKey, groupLoans] of Object.entries(groupedLoans)) {
      if (groupBy) {
        items.push({ type: 'group-header', data: { groupKey, groupLoans } });
      }
      if (expandedGroups.has(groupKey) || !groupBy) {
        if (groupBy) {
          items.push({ type: 'column-header', data: { groupKey, groupLoans } });
        }
        for (const loan of groupLoans) {
          items.push({ type: 'loan', data: loan });
        }
      }
    }
    return items;
  }, [groupedLoans, groupBy, expandedGroups]);

  // Virtual scrolling setup
  const virtualizer = useVirtualizer({
    count: flatItems.length,
    getScrollElement: () => parentRef.current,
    estimateSize: (index: number) => {
      const item = flatItems[index];
      if (item.type === 'group-header') return 52;
      if (item.type === 'column-header') return 36;
      const loan = item.data as Loan;
      if (expandedLoans.has(loan.id)) return EXPANDED_ROW_HEIGHT;
      const hasChanges = previews.has(loan.id) || hasChangesForLoan(loan.id);
      return hasChanges ? 56 : ROW_HEIGHT;
    },
    overscan: 5,
    measureElement: (element) => element.getBoundingClientRect().height,
  });

  useEffect(() => {
    virtualizer.measure();
  }, [expandedLoans, previews, virtualizer]);

  const toggleGroup = useCallback((key: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const toggleLoanExpanded = useCallback((id: string) => {
    setExpandedLoans((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, [setSelectedIds]);

  const toggleSelectAll = useCallback((groupLoans: Loan[]) => {
    const allSelected = groupLoans.every((l) => selectedIds.has(l.id));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      for (const loan of groupLoans) {
        if (allSelected) next.delete(loan.id);
        else next.add(loan.id);
      }
      return next;
    });
  }, [selectedIds, setSelectedIds]);

  // Calculate group totals
  const getGroupStats = useCallback((groupLoans: Loan[]) => {
    const groupTotal = groupLoans.reduce((sum, l) => sum + l.totalAmount, 0);
    const groupFees = groupLoans.reduce((sum, l) => sum + l.totalFees, 0);
    const groupInterest = groupLoans.reduce((sum, l) => sum + l.interestAmount, 0);
    const currency = groupLoans[0]?.currency || 'USD';
    const loansWithChanges = groupLoans.filter((l) => hasChangesForLoan(l.id));

    let previewFees = groupFees;
    let previewInterest = groupInterest;
    let previewNet = groupLoans.reduce((sum, l) => sum + l.netProceeds, 0);
    const originalNet = previewNet;

    for (const loan of groupLoans) {
      const preview = previews.get(loan.id);
      if (preview) {
        previewFees += (preview.totalFees - loan.totalFees);
        previewInterest += (preview.interestAmount - loan.interestAmount);
        previewNet += (preview.netProceeds - loan.netProceeds);
      }
    }

    return {
      groupTotal,
      currency,
      loansWithChanges,
      previewFees,
      previewInterest,
      feesDelta: previewFees - groupFees,
      interestDelta: previewInterest - groupInterest,
      netDelta: previewNet - originalNet,
    };
  }, [hasChangesForLoan, previews]);

  return (
    <div ref={parentRef} className="h-full overflow-auto">
      {/* Fixed Header */}
      <div className="sticky top-0 z-20 bg-slate-100 dark:bg-slate-900 border-b-2 border-slate-300 dark:border-slate-600 shadow-md">
        <div className="grid grid-cols-[12px_4px_40px_32px_1fr_1fr_80px_1fr_96px_96px_1fr_1fr_112px_1fr_96px_40px] items-center text-sm h-10">
          <div />
          <div />
          <div className="px-3">
            <input
              type="checkbox"
              checked={loans.length > 0 && loans.every((l) => selectedIds.has(l.id))}
              onChange={() => toggleSelectAll(loans)}
              className="rounded border-slate-300 text-primary focus:ring-primary/20"
            />
          </div>
          <div />
          <SortableHeader label="Loan #" field="loanNumber" currentField={sortField} direction={sortDirection} onSort={onSort} align="left" />
          <div className="px-3 text-left font-medium text-muted-foreground text-xs uppercase tracking-wide">Borrower</div>
          <div className="px-3 text-center font-medium text-muted-foreground text-xs uppercase tracking-wide">Inv.</div>
          <SortableHeader label="Amount" field="totalAmount" currentField={sortField} direction={sortDirection} onSort={onSort} align="right" />
          <div className="px-3 text-right font-medium text-muted-foreground text-xs uppercase tracking-wide">
            <span className="inline-flex items-center gap-1 justify-end">Base<Pencil className="h-2.5 w-2.5 opacity-40" /></span>
          </div>
          <div className="px-3 text-right font-medium text-muted-foreground text-xs uppercase tracking-wide">
            <span className="inline-flex items-center gap-1 justify-end">Spread<Pencil className="h-2.5 w-2.5 opacity-40" /></span>
          </div>
          <SortableHeader label="Eff. Rate" field="effectiveRate" currentField={sortField} direction={sortDirection} onSort={onSort} align="right" />
          <SortableHeader label="Fees" field="totalFees" currentField={sortField} direction={sortDirection} onSort={onSort} align="right" />
          <div className="px-3 text-right font-medium text-muted-foreground text-xs uppercase tracking-wide">Interest</div>
          <SortableHeader label="Net" field="netProceeds" currentField={sortField} direction={sortDirection} onSort={onSort} align="right" />
          <div className="px-3 text-center font-medium text-muted-foreground text-xs uppercase tracking-wide">Status</div>
          <div />
        </div>
      </div>

      {/* Virtualized Content */}
      <div style={{ height: `${virtualizer.getTotalSize()}px`, width: '100%', position: 'relative' }}>
        {virtualizer.getVirtualItems().map((virtualRow) => {
          const item = flatItems[virtualRow.index];

          if (item.type === 'group-header') {
            const { groupKey, groupLoans } = item.data as { groupKey: string; groupLoans: Loan[] };
            const stats = getGroupStats(groupLoans);
            const isExpanded = expandedGroups.has(groupKey);
            const hasGroupChanges = stats.loansWithChanges.length > 0;

            return (
              <div
                key={`group-${groupKey}`}
                data-index={virtualRow.index}
                ref={virtualizer.measureElement}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  transform: `translateY(${virtualRow.start}px)`,
                }}
              >
                <GroupHeader
                  groupKey={groupKey}
                  groupLoans={groupLoans}
                  stats={stats}
                  isExpanded={isExpanded}
                  hasGroupChanges={hasGroupChanges}
                  selectedIds={selectedIds}
                  onToggle={() => toggleGroup(groupKey)}
                  onToggleSelectAll={() => toggleSelectAll(groupLoans)}
                />
              </div>
            );
          }

          if (item.type === 'column-header') {
            return (
              <div
                key={`col-header-${virtualRow.index}`}
                data-index={virtualRow.index}
                ref={virtualizer.measureElement}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  transform: `translateY(${virtualRow.start}px)`,
                }}
              >
                <ColumnHeaderRow />
              </div>
            );
          }

          const loan = item.data as Loan;
          return (
            <div
              key={loan.id}
              data-index={virtualRow.index}
              ref={virtualizer.measureElement}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              <LoanRow
                loan={loan}
                allLoans={allLoans || loans}
                feeConfigs={feeConfigs}
                isSelected={selectedIds.has(loan.id)}
                isExpanded={expandedLoans.has(loan.id)}
                isModified={hasChangesForLoan(loan.id)}
                preview={previews.get(loan.id)}
                isFieldModified={isFieldModified}
                getNewValue={getNewValue}
                onToggleSelect={() => toggleSelect(loan.id)}
                onToggleExpand={() => toggleLoanExpanded(loan.id)}
                onPreviewChange={onPreviewChange}
                onAddFee={onAddFee}
                onUpdateFee={onUpdateFee}
                onRemoveFee={onRemoveFee}
                onStatusChange={onStatusChange}
                onSplitSuccess={onSplitSuccess}
                onInvoiceChange={onInvoiceChange}
                pendingFeeAdds={getPendingFeeAdds(loan.id)}
                isFeeDeleted={(feeId) => isFeeDeleted(loan.id, feeId)}
                getFeeUpdates={(feeId) => getFeeUpdates(loan.id, feeId)}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Group header component
interface GroupHeaderProps {
  groupKey: string;
  groupLoans: Loan[];
  stats: {
    groupTotal: number;
    currency: string;
    loansWithChanges: Loan[];
    previewFees: number;
    previewInterest: number;
    feesDelta: number;
    interestDelta: number;
    netDelta: number;
  };
  isExpanded: boolean;
  hasGroupChanges: boolean;
  selectedIds: Set<string>;
  onToggle: () => void;
  onToggleSelectAll: () => void;
}

function GroupHeader({
  groupKey,
  groupLoans,
  stats,
  isExpanded,
  hasGroupChanges,
  selectedIds,
  onToggle,
  onToggleSelectAll,
}: GroupHeaderProps) {
  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 cursor-pointer border-l-4 border-y bg-gradient-to-b from-slate-100 to-slate-50 dark:from-slate-800 dark:to-slate-900 shadow-sm hover:from-slate-150 hover:to-slate-100 dark:hover:from-slate-750 dark:hover:to-slate-800 ${
        hasGroupChanges ? 'border-l-amber-500 border-y-amber-200 dark:border-y-amber-800' : 'border-l-slate-400 border-y-slate-300 dark:border-y-slate-600'
      }`}
      onClick={onToggle}
    >
      <div onClick={(e) => e.stopPropagation()}>
        <input
          type="checkbox"
          checked={groupLoans.length > 0 && groupLoans.every((l) => selectedIds.has(l.id))}
          ref={(el) => {
            if (el) {
              const someSelected = groupLoans.some((l) => selectedIds.has(l.id));
              const allSelected = groupLoans.every((l) => selectedIds.has(l.id));
              el.indeterminate = someSelected && !allSelected;
            }
          }}
          onChange={onToggleSelectAll}
          className="rounded border-slate-300 text-primary focus:ring-primary/20"
          title={`Select all ${groupLoans.length} loans in ${groupKey}`}
        />
      </div>
      {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
      <span className="font-semibold text-lg">{groupKey}</span>
      <Badge variant="secondary">{groupLoans.length} loans</Badge>
      {hasGroupChanges && (
        <Badge className="bg-amber-500 text-white">{stats.loansWithChanges.length} modified</Badge>
      )}
      <div className="ml-auto flex items-center gap-6 text-sm flex-shrink-0">
        <div className="whitespace-nowrap">
          <span className="text-muted-foreground">Total: </span>
          <span className="font-mono font-semibold">{formatCurrency(stats.groupTotal, stats.currency)}</span>
        </div>
        <div className="whitespace-nowrap">
          <span className="text-muted-foreground">Fees: </span>
          <span className={`font-mono ${stats.feesDelta !== 0 ? 'text-amber-600 font-semibold' : ''}`}>
            {formatCurrency(stats.previewFees, stats.currency)}
          </span>
          {stats.feesDelta !== 0 && (
            <span className={`ml-1 text-xs ${stats.feesDelta > 0 ? 'text-red-600' : 'text-green-600'}`}>
              ({stats.feesDelta > 0 ? '+' : ''}{formatCurrency(stats.feesDelta, stats.currency)})
            </span>
          )}
        </div>
        <div className="whitespace-nowrap">
          <span className="text-muted-foreground">Interest: </span>
          <span className={`font-mono ${stats.interestDelta !== 0 ? 'text-amber-600 font-semibold' : ''}`}>
            {formatCurrency(stats.previewInterest, stats.currency)}
          </span>
          {stats.interestDelta !== 0 && (
            <span className={`ml-1 text-xs ${stats.interestDelta > 0 ? 'text-red-600' : 'text-green-600'}`}>
              ({stats.interestDelta > 0 ? '+' : ''}{formatCurrency(stats.interestDelta, stats.currency)})
            </span>
          )}
        </div>
        {stats.netDelta !== 0 && (
          <div className={`px-2 py-1 rounded ${stats.netDelta > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
            <span className="text-xs font-medium">Net: </span>
            <span className="font-mono font-semibold">
              {stats.netDelta > 0 ? '+' : ''}{formatCurrency(stats.netDelta, stats.currency)}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// Column header row for grouped sections
function ColumnHeaderRow() {
  return (
    <div className="grid grid-cols-[12px_4px_40px_32px_1fr_1fr_80px_1fr_96px_96px_1fr_1fr_112px_1fr_96px_40px] items-center text-xs h-9 bg-slate-50/80 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
      <div />
      <div />
      <div className="px-3" />
      <div />
      <div className="px-3 text-left text-muted-foreground/70 uppercase tracking-wide">Loan #</div>
      <div className="px-3 text-left text-muted-foreground/70 uppercase tracking-wide">Borrower</div>
      <div className="px-3 text-center text-muted-foreground/70 uppercase tracking-wide">Inv.</div>
      <div className="px-3 text-right text-muted-foreground/70 uppercase tracking-wide">Amount</div>
      <div className="px-3 text-right text-muted-foreground/70 uppercase tracking-wide">Base</div>
      <div className="px-3 text-right text-muted-foreground/70 uppercase tracking-wide">Spread</div>
      <div className="px-3 text-right text-muted-foreground/70 uppercase tracking-wide">Eff. Rate</div>
      <div className="px-3 text-right text-muted-foreground/70 uppercase tracking-wide">Fees</div>
      <div className="px-3 text-right text-muted-foreground/70 uppercase tracking-wide">Interest</div>
      <div className="px-3 text-right text-muted-foreground/70 uppercase tracking-wide">Net</div>
      <div className="px-3 text-center text-muted-foreground/70 uppercase tracking-wide">Status</div>
      <div />
    </div>
  );
}

/**
 * @fileoverview Loan Pricing Table - Virtualized Grid with Grouping
 *
 * This is the main table component for displaying and editing loan pricing.
 * It handles large datasets efficiently using virtual scrolling.
 *
 * FEATURES:
 * - Virtual scrolling (handles 1000+ rows)
 * - Grouping by currency, status, or pricing status
 * - Sticky group headers during scroll
 * - Expandable row details
 * - Inline rate editing
 * - Multi-select with checkbox
 * - Real-time preview deltas
 *
 * ARCHITECTURE:
 * ```
 * LoanPricingTable (this file)
 *   ├── GroupHeader - Collapsible group headers
 *   ├── LoanRow - Individual loan row with details
 *   │   ├── EditableRateCell - Base rate/spread editing
 *   │   ├── StatusCell - Status dropdowns
 *   │   └── LoanDetailsPanel - Expanded invoice/fee details
 *   └── SortableHeader - Column headers with sort
 * ```
 *
 * VIRTUAL SCROLLING:
 * Uses @tanstack/react-virtual for efficient rendering.
 * Only visible rows + overscan are rendered.
 *
 * STICKY GROUP HEADERS:
 * When scrolling within a group, the group header sticks to top.
 * Implemented by rendering a separate overlay that tracks scroll position.
 *
 * @module components/pricing/LoanPricingTable
 * @see LoanRow - Individual row component
 * @see LoanDetailsPanel - Expanded details
 * @see useLiveCalculation - Preview calculation hook
 */

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import type { Loan, Fee, FeeConfig } from '@loan-pricing/shared';
import { formatCurrency } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, ChevronRight, Pencil } from 'lucide-react';
import { useChangeStore, type FeeChange } from '@/stores/changeStore';
import { useVirtualizer } from '@tanstack/react-virtual';
import type { PreviewData, SortField, SortDirection } from '@/types/pricing';
import { LoanRow, SortableHeader } from './table';

// ============================================
// TYPE DEFINITIONS
// ============================================

/**
 * Props for the LoanPricingTable component
 */
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
  isNewFee?: (loanId: string, feeId: string) => boolean;
  sortField?: SortField;
  sortDirection?: SortDirection;
  onSort?: (field: SortField) => void;
  selectedIds?: Set<string>;
  onSelectionChange?: (ids: Set<string>) => void;
  readOnly?: boolean;
}

interface GroupedLoans {
  [key: string]: Loan[];
}

// Base row height estimate - actual heights measured dynamically by virtualizer
const ROW_HEIGHT = 44;

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
  isNewFee,
  sortField,
  sortDirection,
  onSort,
  selectedIds: controlledSelectedIds,
  onSelectionChange,
  readOnly = false,
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
        for (const loan of groupLoans) {
          items.push({ type: 'loan', data: loan });
        }
      }
    }
    return items;
  }, [groupedLoans, groupBy, expandedGroups]);

  // Stable key generator for virtual items
  const getItemKey = useCallback((index: number) => {
    const item = flatItems[index];
    if (!item) return `item-${index}`;
    if (item.type === 'group-header') {
      const { groupKey } = item.data as { groupKey: string };
      return `group-${groupKey}`;
    }
    if (item.type === 'column-header') {
      return `col-header-${index}`;
    }
    const loan = item.data as Loan;
    return `loan-${loan.id}`;
  }, [flatItems]);

  // Stable estimateSize function - defined once, never changes
  const estimateSize = useCallback(() => ROW_HEIGHT, []);

  // Virtual scrolling setup
  const virtualizer = useVirtualizer({
    count: flatItems.length,
    getScrollElement: () => parentRef.current,
    estimateSize,
    getItemKey,
    overscan: 5,
  });

  // Only re-measure when list structure changes (expanded rows toggle)
  // NOT when content within rows changes (fee edits, etc.)
  const prevExpandedSize = useRef(expandedLoans.size);
  useEffect(() => {
    if (prevExpandedSize.current !== expandedLoans.size) {
      prevExpandedSize.current = expandedLoans.size;
      // Only measure when rows expand/collapse
      virtualizer.measure();
    }
  }, [expandedLoans.size, virtualizer]);

  // Derive sticky group based on scroll position
  const getStickyGroup = (): string | null => {
    if (!groupBy) return null;
    const scrollOffset = virtualizer.scrollOffset ?? 0;
    const virtualItems = virtualizer.getVirtualItems();
    if (virtualItems.length === 0) return null;

    // Find the group header that should be sticky
    for (const vi of virtualItems) {
      const item = flatItems[vi.index];
      if (item?.type === 'loan') {
        // Walk back to find this loan's group header
        for (let i = vi.index - 1; i >= 0; i--) {
          if (flatItems[i]?.type === 'group-header') {
            const groupKey = (flatItems[i].data as { groupKey: string }).groupKey;
            if (!expandedGroups.has(groupKey)) return null;

            // Find the group header's virtual item to check its position
            const headerVi = virtualItems.find((v) => v.index === i);
            if (headerVi) {
              // Show sticky when original header top is above scroll position
              // Small buffer (2px) to prevent flicker at exact boundary
              return headerVi.start < scrollOffset - 2 ? groupKey : null;
            }
            // Header not in virtual items = scrolled out, show sticky
            return groupKey;
          }
        }
        break;
      }
    }
    return null;
  };
  const stickyGroup = getStickyGroup();

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
    // Include loans with previews (for playback mode) or changeStore changes
    const loansWithChanges = groupLoans.filter((l) => previews.has(l.id) || hasChangesForLoan(l.id));

    let previewFees = groupFees;
    let previewInterest = groupInterest;
    let previewNet = groupLoans.reduce((sum, l) => sum + l.netProceeds, 0);

    // Track original values for delta calculation (for playback mode)
    let originalFees = groupFees;
    let originalInterest = groupInterest;
    let originalNet = previewNet;

    for (const loan of groupLoans) {
      const preview = previews.get(loan.id) as {
        totalFees: number;
        originalTotalFees?: number;
        interestAmount: number;
        originalInterestAmount?: number;
        netProceeds: number;
        originalNetProceeds?: number;
      } | undefined;

      if (preview) {
        // In playback mode, original values are stored separately in the preview
        // Otherwise, the loan values are the originals
        const loanOriginalFees = preview.originalTotalFees ?? loan.totalFees;
        const loanOriginalInterest = preview.originalInterestAmount ?? loan.interestAmount;
        const loanOriginalNet = preview.originalNetProceeds ?? loan.netProceeds;

        // Adjust original totals to use the actual original values
        originalFees += (loanOriginalFees - loan.totalFees);
        originalInterest += (loanOriginalInterest - loan.interestAmount);
        originalNet += (loanOriginalNet - loan.netProceeds);

        // Preview values are always the "new" values
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
      feesDelta: previewFees - originalFees,
      interestDelta: previewInterest - originalInterest,
      netDelta: previewNet - originalNet,
    };
  }, [hasChangesForLoan, previews]);

  // Pre-compute sticky header data (cleaner than IIFE in JSX)
  const stickyHeaderData = stickyGroup && groupedLoans[stickyGroup]
    ? { groupKey: stickyGroup, loans: groupedLoans[stickyGroup], stats: getGroupStats(groupedLoans[stickyGroup]) }
    : null;

  return (
    <div
      ref={parentRef}
      className="h-full overflow-auto"
      style={{ contain: 'strict' }} // Perf: isolate layout/paint
    >
      {/* Fixed Header */}
      <div className="sticky top-0 z-20 bg-slate-100 dark:bg-slate-800 border-b-2 border-slate-300 dark:border-slate-600 shadow-md">
        <div className="grid grid-cols-[12px_4px_40px_32px_1fr_1fr_80px_1fr_96px_96px_1fr_1fr_112px_1fr_96px_40px] items-center h-11 min-w-max">
          <div />
          <div />
          <div className="px-3">
            <input
              type="checkbox"
              checked={loans.length > 0 && loans.every((l) => selectedIds.has(l.id))}
              onChange={() => toggleSelectAll(loans)}
              className="rounded border-slate-400 text-primary focus:ring-primary/20"
            />
          </div>
          <div />
          <SortableHeader label="Loan #" field="loanNumber" currentField={sortField} direction={sortDirection} onSort={onSort} align="left" />
          <div className="px-3 text-left font-semibold text-slate-600 dark:text-slate-300 text-[11px] uppercase tracking-wider">Borrower</div>
          <div className="px-3 text-center font-semibold text-slate-600 dark:text-slate-300 text-[11px] uppercase tracking-wider">Inv.</div>
          <SortableHeader label="Amount" field="totalAmount" currentField={sortField} direction={sortDirection} onSort={onSort} align="right" />
          <div className="px-3 text-right font-semibold text-slate-600 dark:text-slate-300 text-[11px] uppercase tracking-wider">
            <span className="inline-flex items-center gap-1 justify-end">Base<Pencil className="h-2.5 w-2.5 opacity-50" /></span>
          </div>
          <div className="px-3 text-right font-semibold text-slate-600 dark:text-slate-300 text-[11px] uppercase tracking-wider">
            <span className="inline-flex items-center gap-1 justify-end">Spread<Pencil className="h-2.5 w-2.5 opacity-50" /></span>
          </div>
          <SortableHeader label="Eff. Rate" field="effectiveRate" currentField={sortField} direction={sortDirection} onSort={onSort} align="right" />
          <SortableHeader label="Fees" field="totalFees" currentField={sortField} direction={sortDirection} onSort={onSort} align="right" />
          <div className="px-3 text-right font-semibold text-slate-600 dark:text-slate-300 text-[11px] uppercase tracking-wider">Interest</div>
          <SortableHeader label="Net" field="netProceeds" currentField={sortField} direction={sortDirection} onSort={onSort} align="right" />
          <div className="px-3 text-center font-semibold text-slate-600 dark:text-slate-300 text-[11px] uppercase tracking-wider">Status</div>
          <div />
        </div>
      </div>

      {/* Sticky Group Header Overlay - renders outside virtual list */}
      {stickyHeaderData && (
        <div className="sticky top-[44px] z-10 shadow-md">
          <GroupHeader
            groupKey={stickyHeaderData.groupKey}
            groupLoans={stickyHeaderData.loans}
            stats={stickyHeaderData.stats}
            isExpanded={expandedGroups.has(stickyHeaderData.groupKey)}
            hasGroupChanges={stickyHeaderData.stats.loansWithChanges.length > 0}
            selectedIds={selectedIds}
            onToggle={() => toggleGroup(stickyHeaderData.groupKey)}
            onToggleSelectAll={() => toggleSelectAll(stickyHeaderData.loans)}
          />
        </div>
      )}

      {/* Virtualized Content */}
      <div style={{
        height: `${virtualizer.getTotalSize()}px`,
        width: '100%',
        position: 'relative',
        willChange: 'transform', // Perf: hint for GPU acceleration
      }}>
        {virtualizer.getVirtualItems().map((virtualRow) => {
          const item = flatItems[virtualRow.index];

          if (item.type === 'group-header') {
            const { groupKey, groupLoans } = item.data as { groupKey: string; groupLoans: Loan[] };
            const stats = getGroupStats(groupLoans);
            const isExpanded = expandedGroups.has(groupKey);
            const hasGroupChanges = stats.loansWithChanges.length > 0;
            const isSticky = stickyGroup === groupKey;

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
                  // Hide original when sticky overlay is showing
                  visibility: isSticky ? 'hidden' : 'visible',
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
                isNewFee={isNewFee ? (feeId) => isNewFee(loan.id, feeId) : undefined}
                readOnly={readOnly}
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
      className={`flex items-center gap-4 px-4 py-3.5 cursor-pointer border-l-4 border-b-2 bg-gradient-to-r from-slate-100 via-slate-50 to-white dark:from-slate-800 dark:via-slate-850 dark:to-slate-900 shadow-md hover:shadow-lg transition-shadow min-w-max ${
        hasGroupChanges
          ? 'border-l-amber-500 border-b-amber-300 dark:border-b-amber-600'
          : 'border-l-primary border-b-slate-300 dark:border-b-slate-600'
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
      {/* Currency Totals - Clean Typography */}
      <div className="ml-auto flex items-center divide-x divide-slate-300 dark:divide-slate-600 text-sm flex-shrink-0">
        {/* Total Amount - Emphasized */}
        <div className="px-4 text-right">
          <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Total</div>
          <div className="font-mono font-bold text-lg text-foreground leading-tight">
            {formatCurrency(stats.groupTotal, stats.currency)}
          </div>
        </div>

        {/* Fees */}
        <div className="px-4 text-right">
          <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Fees</div>
          <div className={`font-mono font-semibold leading-tight ${stats.feesDelta !== 0 ? 'text-amber-600 dark:text-amber-400' : 'text-foreground'}`}>
            {formatCurrency(stats.previewFees, stats.currency)}
          </div>
          {stats.feesDelta !== 0 && (
            <div className={`text-[10px] font-medium ${stats.feesDelta > 0 ? 'text-red-500' : 'text-green-500'}`}>
              {stats.feesDelta > 0 ? '↑' : '↓'} {formatCurrency(Math.abs(stats.feesDelta), stats.currency)}
            </div>
          )}
        </div>

        {/* Interest */}
        <div className="px-4 text-right">
          <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Interest</div>
          <div className={`font-mono font-semibold leading-tight ${stats.interestDelta !== 0 ? 'text-amber-600 dark:text-amber-400' : 'text-foreground'}`}>
            {formatCurrency(stats.previewInterest, stats.currency)}
          </div>
          {stats.interestDelta !== 0 && (
            <div className={`text-[10px] font-medium ${stats.interestDelta > 0 ? 'text-red-500' : 'text-green-500'}`}>
              {stats.interestDelta > 0 ? '↑' : '↓'} {formatCurrency(Math.abs(stats.interestDelta), stats.currency)}
            </div>
          )}
        </div>

        {/* Net Change - Only when there are changes */}
        {stats.netDelta !== 0 && (
          <div className={`px-4 text-right ${stats.netDelta > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
            <div className="text-[10px] uppercase tracking-wider opacity-70">Net Δ</div>
            <div className="font-mono font-bold text-lg leading-tight">
              {stats.netDelta > 0 ? '+' : ''}{formatCurrency(stats.netDelta, stats.currency)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Column header row for grouped sections
function ColumnHeaderRow() {
  return (
    <div className="grid grid-cols-[12px_4px_40px_32px_1fr_1fr_80px_1fr_96px_96px_1fr_1fr_112px_1fr_96px_40px] items-center h-9 bg-slate-50/80 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700 min-w-max">
      <div />
      <div />
      <div className="px-3" />
      <div />
      <div className="px-3 text-left text-slate-500 dark:text-slate-400 text-[10px] font-semibold uppercase tracking-wider">Loan #</div>
      <div className="px-3 text-left text-slate-500 dark:text-slate-400 text-[10px] font-semibold uppercase tracking-wider">Borrower</div>
      <div className="px-3 text-center text-slate-500 dark:text-slate-400 text-[10px] font-semibold uppercase tracking-wider">Inv.</div>
      <div className="px-3 text-right text-slate-500 dark:text-slate-400 text-[10px] font-semibold uppercase tracking-wider">Amount</div>
      <div className="px-3 text-right text-slate-500 dark:text-slate-400 text-[10px] font-semibold uppercase tracking-wider">Base</div>
      <div className="px-3 text-right text-slate-500 dark:text-slate-400 text-[10px] font-semibold uppercase tracking-wider">Spread</div>
      <div className="px-3 text-right text-slate-500 dark:text-slate-400 text-[10px] font-semibold uppercase tracking-wider">Eff. Rate</div>
      <div className="px-3 text-right text-slate-500 dark:text-slate-400 text-[10px] font-semibold uppercase tracking-wider">Fees</div>
      <div className="px-3 text-right text-slate-500 dark:text-slate-400 text-[10px] font-semibold uppercase tracking-wider">Interest</div>
      <div className="px-3 text-right text-slate-500 dark:text-slate-400 text-[10px] font-semibold uppercase tracking-wider">Net</div>
      <div className="px-3 text-center text-slate-500 dark:text-slate-400 text-[10px] font-semibold uppercase tracking-wider">Status</div>
      <div />
    </div>
  );
}

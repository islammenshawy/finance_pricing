import { useState, useCallback } from 'react';
import type { Fee, LoanStatus, PricingStatus } from '@loan-pricing/shared';
import {
  updateLoan,
  addFeeToLoan,
  updateFee,
  removeFee,
  getFeeConfigs,
  getCustomerWithLoans,
} from '@/lib/api';
import { useQuery } from '@tanstack/react-query';
import { useChangeStore } from '@/stores/changeStore';
import { useLiveCalculation } from '@/hooks/useLiveCalculation';
import { useFilteredLoans } from '@/hooks/useFilteredLoans';
import { useToast } from '@/components/ui/toast';
import { LoanPricingTable } from './LoanPricingTable';
import { LoanPricingCards } from './LoanPricingCards';
import { ImpactSummaryPanel } from './ImpactSummaryPanel';
import { BulkActionBar } from './BulkActionBar';
import { AuditPanel } from './AuditPanel';
import { ChangesOverviewPanel } from './ChangesOverviewPanel';
import { MaturityOverview } from './MaturityOverview';
import { FilterToolbar } from './FilterToolbar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ArrowLeft, RefreshCw, History, LayoutGrid, Table2 } from 'lucide-react';

interface LoanPricingPageProps {
  customerId: string;
  onBack: () => void;
}

type GroupBy = 'currency' | 'status' | 'pricingStatus' | null;
type ViewMode = 'table' | 'cards';
type SortField = 'loanNumber' | 'totalAmount' | 'effectiveRate' | 'totalFees' | 'netProceeds' | null;
type SortDirection = 'asc' | 'desc';

export function LoanPricingPage({ customerId, onBack }: LoanPricingPageProps) {
  const [groupBy, setGroupBy] = useState<GroupBy>('currency');
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [sortField, setSortField] = useState<SortField>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [selectedLoanIds, setSelectedLoanIds] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [auditPanelOpen, setAuditPanelOpen] = useState(false);
  const [showOnlyModified, setShowOnlyModified] = useState(false);
  // maturityFilter now synced with filters.maturityBucket from useFilteredLoans

  const {
    trackChange,
    clearAllChanges,
    changes,
    hasChangesForLoan,
    feeChanges,
    trackFeeAdd,
    trackFeeUpdate,
    trackFeeDelete,
    getPendingFeeAdds,
    isFeeDeleted,
    getFeeUpdates,
  } = useChangeStore();

  const { success: toastSuccess, error: toastError } = useToast();

  // Fetch customer with loans
  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['customer', customerId],
    queryFn: () => getCustomerWithLoans(customerId),
  });

  const customer = data?.customer;
  const loans = data?.loans ?? [];
  const totals = data?.totals ?? {};

  // Use the centralized filtering hook
  const {
    filters,
    setFilter,
    resetFilters,
    filteredLoans: hookFilteredLoans,
    filterCounts,
    hasActiveFilters,
  } = useFilteredLoans(loans);

  // Pass loans to hook for optimistic calculations (instant UI updates)
  const { previews, calculatePreview, recalculateForFeeChanges, clearAllPreviews } = useLiveCalculation({ loans });

  // Fetch fee configs
  const { data: feeConfigs = [] } = useQuery({
    queryKey: ['feeConfigs'],
    queryFn: getFeeConfigs,
  });

  // Count modified loans
  const modifiedLoanCount = loans.filter((loan) => hasChangesForLoan(loan.id)).length;

  // Additional filter: show only modified loans
  const filteredLoans = showOnlyModified
    ? hookFilteredLoans.filter((loan) => hasChangesForLoan(loan.id))
    : hookFilteredLoans;

  // Apply sorting
  const sortedLoans = sortField
    ? [...filteredLoans].sort((a, b) => {
        let aVal: number | string;
        let bVal: number | string;

        switch (sortField) {
          case 'loanNumber':
            aVal = a.loanNumber;
            bVal = b.loanNumber;
            break;
          case 'totalAmount':
            aVal = a.totalAmount;
            bVal = b.totalAmount;
            break;
          case 'effectiveRate':
            aVal = a.pricing.effectiveRate;
            bVal = b.pricing.effectiveRate;
            break;
          case 'totalFees':
            aVal = a.totalFees;
            bVal = b.totalFees;
            break;
          case 'netProceeds':
            aVal = a.netProceeds;
            bVal = b.netProceeds;
            break;
          default:
            return 0;
        }

        if (typeof aVal === 'string') {
          return sortDirection === 'asc'
            ? aVal.localeCompare(bVal as string)
            : (bVal as string).localeCompare(aVal);
        }
        return sortDirection === 'asc' ? aVal - (bVal as number) : (bVal as number) - aVal;
      })
    : filteredLoans;

  // Toggle sort
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Get selected loan objects
  const selectedLoans = loans.filter((l) => selectedLoanIds.has(l.id));

  // Helper to get current pricing values including pending changes
  const getPendingPricing = useCallback(
    (loanId: string, loan: typeof loans[0]) => {
      const loanChanges = changes.filter((c) => c.loanId === loanId);
      const baseRateChange = loanChanges.find((c) => c.fieldPath === 'pricing.baseRate');
      const spreadChange = loanChanges.find((c) => c.fieldPath === 'pricing.spread');

      return {
        baseRate: baseRateChange ? (baseRateChange.newValue as number) : loan.pricing.baseRate,
        spread: spreadChange ? (spreadChange.newValue as number) : loan.pricing.spread,
      };
    },
    [changes]
  );

  // Handle rate change (for live preview)
  const handlePreviewChange = useCallback(
    (loanId: string, field: 'baseRate' | 'spread', value: number) => {
      const loan = loans.find((l) => l.id === loanId);
      if (!loan) return;

      // Track the change
      trackChange(
        loanId,
        `pricing.${field}`,
        field === 'baseRate' ? 'Base Rate' : 'Spread',
        loan.pricing[field],
        value
      );

      // Calculate preview - include ALL pending rate changes
      const pendingPricing = getPendingPricing(loanId, loan);
      const currentPricing = {
        baseRate: field === 'baseRate' ? value : pendingPricing.baseRate,
        spread: field === 'spread' ? value : pendingPricing.spread,
      };
      calculatePreview(loanId, currentPricing);
    },
    [loans, trackChange, calculatePreview, getPendingPricing]
  );

  // Handle bulk rate application
  const handleBulkApplyRate = useCallback(
    async (field: 'baseRate' | 'spread', value: number) => {
      const unlockedLoans = selectedLoans.filter((l) => l.pricingStatus !== 'locked');

      for (const loan of unlockedLoans) {
        trackChange(
          loan.id,
          `pricing.${field}`,
          field === 'baseRate' ? 'Base Rate' : 'Spread',
          loan.pricing[field],
          value
        );
      }

      // Batch preview
      const changes = unlockedLoans.map((loan) => ({
        loanId: loan.id,
        pricing: {
          baseRate: field === 'baseRate' ? value : loan.pricing.baseRate,
          spread: field === 'spread' ? value : loan.pricing.spread,
        },
      }));

      // Calculate previews for each changed loan
      for (const change of changes) {
        calculatePreview(change.loanId, change.pricing);
      }
    },
    [selectedLoans, trackChange, calculatePreview]
  );

  // Handle add fee to single loan (staged, not saved immediately)
  const handleAddFee = useCallback(
    (loanId: string, feeConfigId: string) => {
      const config = feeConfigs.find((c) => c.id === feeConfigId);
      if (config) {
        trackFeeAdd(loanId, feeConfigId, config.name);
        // Trigger recalculation with new fee
        recalculateForFeeChanges(loanId);
      }
    },
    [feeConfigs, trackFeeAdd, recalculateForFeeChanges]
  );

  // Handle update fee (staged, not saved immediately)
  const handleUpdateFee = useCallback(
    (loanId: string, feeId: string, updates: Partial<Fee>) => {
      const loan = loans.find((l) => l.id === loanId);
      const fee = loan?.fees.find((f) => f.id === feeId);
      if (fee) {
        trackFeeUpdate(loanId, feeId, fee, updates);
        // Trigger recalculation with updated fee
        recalculateForFeeChanges(loanId);
      }
    },
    [loans, trackFeeUpdate, recalculateForFeeChanges]
  );

  // Handle remove fee (staged, not saved immediately)
  const handleRemoveFee = useCallback(
    (loanId: string, feeId: string) => {
      const loan = loans.find((l) => l.id === loanId);
      const fee = loan?.fees.find((f) => f.id === feeId);
      if (fee) {
        trackFeeDelete(loanId, feeId, fee);
        // Trigger recalculation without deleted fee
        recalculateForFeeChanges(loanId);
      }
    },
    [loans, trackFeeDelete, recalculateForFeeChanges]
  );

  // Handle bulk add fee - reuses single-loan handler
  const handleBulkAddFee = useCallback(
    (feeConfigId: string) => {
      const unlockedLoans = selectedLoans.filter((l) => l.pricingStatus !== 'locked');
      for (const loan of unlockedLoans) {
        // Check if loan already has this fee (saved or pending)
        const hasSavedFee = loan.fees.some((f) => f.feeConfigId === feeConfigId);
        const hasPendingFee = getPendingFeeAdds(loan.id).some((f) => f.feeConfigId === feeConfigId);

        if (!hasSavedFee && !hasPendingFee) {
          handleAddFee(loan.id, feeConfigId);
        }
      }
    },
    [selectedLoans, handleAddFee, getPendingFeeAdds]
  );

  // Handle single loan status change
  const handleStatusChange = useCallback(
    async (loanId: string, status: string, type: 'status' | 'pricingStatus') => {
      try {
        await updateLoan(loanId, { [type]: status });
        refetch();
      } catch (error) {
        console.error(`Failed to update ${type} for loan ${loanId}:`, error);
      }
    },
    [refetch]
  );

  // Handle bulk status change
  const handleBulkChangeStatus = useCallback(
    async (status: LoanStatus) => {
      const unlockedLoans = selectedLoans.filter((l) => l.pricingStatus !== 'locked');

      for (const loan of unlockedLoans) {
        try {
          await updateLoan(loan.id, { status });
        } catch (error) {
          console.error(`Failed to update status for loan ${loan.id}:`, error);
        }
      }

      refetch();
      setSelectedLoanIds(new Set());
    },
    [selectedLoans, refetch]
  );

  // Handle bulk pricing status change
  const handleBulkChangePricingStatus = useCallback(
    async (pricingStatus: PricingStatus) => {
      const targetLoans = pricingStatus === 'locked'
        ? selectedLoans.filter((l) => l.pricingStatus !== 'locked')
        : selectedLoans;

      for (const loan of targetLoans) {
        try {
          await updateLoan(loan.id, { pricingStatus });
        } catch (error) {
          console.error(`Failed to update pricing status for loan ${loan.id}:`, error);
        }
      }

      refetch();
      setSelectedLoanIds(new Set());
    },
    [selectedLoans, refetch]
  );

  // Save all changes (rates and fees)
  const handleSaveAll = useCallback(async () => {
    setSaving(true);
    try {
      // Group rate changes by loan
      const changesByLoan = new Map<string, typeof changes>();
      for (const change of changes) {
        const existing = changesByLoan.get(change.loanId) || [];
        existing.push(change);
        changesByLoan.set(change.loanId, existing);
      }

      // Update rate changes for each loan
      for (const [loanId, loanChanges] of changesByLoan) {
        const pricingUpdates: Record<string, unknown> = {};
        for (const change of loanChanges) {
          if (change.fieldPath.startsWith('pricing.')) {
            const key = change.fieldPath.replace('pricing.', '');
            pricingUpdates[key] = change.newValue;
          }
        }

        if (Object.keys(pricingUpdates).length > 0) {
          await updateLoan(loanId, { pricing: pricingUpdates });
        }
      }

      // Process fee changes
      for (const feeChange of feeChanges) {
        if (feeChange.type === 'add' && feeChange.feeConfigId) {
          await addFeeToLoan(feeChange.loanId, { feeConfigId: feeChange.feeConfigId });
        } else if (feeChange.type === 'update' && feeChange.feeId && feeChange.updates) {
          await updateFee(feeChange.loanId, feeChange.feeId, feeChange.updates);
        } else if (feeChange.type === 'delete' && feeChange.feeId) {
          await removeFee(feeChange.loanId, feeChange.feeId);
        }
      }

      clearAllChanges();
      clearAllPreviews();
      refetch();
      toastSuccess(`Successfully saved ${changes.length + feeChanges.length} changes`);
    } catch (error) {
      console.error('Failed to save changes:', error);
      toastError('Failed to save changes. Please try again.');
    } finally {
      setSaving(false);
    }
  }, [changes, feeChanges, clearAllChanges, clearAllPreviews, refetch, toastSuccess, toastError]);

  // Revert all changes
  const handleRevertAll = useCallback(() => {
    clearAllChanges();
    clearAllPreviews();
  }, [clearAllChanges, clearAllPreviews]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-destructive">Customer not found</div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <header className="border-b bg-card px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={onBack}>
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back
            </Button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-semibold">{customer.name}</h1>
                <Badge variant="outline">{customer.code}</Badge>
                {customer.creditRating && (
                  <Badge variant="secondary">{customer.creditRating}</Badge>
                )}
              </div>
              <div className="text-sm text-muted-foreground">
                {customer.country} • {customer.industry}
              </div>
            </div>
          </div>

          {/* Portfolio Summary - with right padding for theme toggle */}
          <div className="flex items-center gap-6 pr-12">
            {Object.entries(totals).map(([currency, t]) => (
              <div key={currency} className="text-right">
                <div className="text-xs text-muted-foreground">{currency}</div>
                <div className="font-mono font-semibold">
                  {t.totalAmount.toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      </header>

      {/* Modern Filter Toolbar */}
      <div className="border-b bg-muted/30 px-4 py-3">
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <FilterToolbar
              filters={filters}
              setFilter={setFilter}
              resetFilters={resetFilters}
              filterCounts={filterCounts}
              hasActiveFilters={hasActiveFilters}
            />
          </div>

          {/* Additional Controls */}
          <div className="flex items-center gap-2 border-l pl-4">
            {/* Group By */}
            <Select value={groupBy || 'none'} onValueChange={(v) => setGroupBy(v === 'none' ? null : v as GroupBy)}>
              <SelectTrigger className="w-32 h-9">
                <SelectValue placeholder="Group by..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No Grouping</SelectItem>
                <SelectItem value="currency">Currency</SelectItem>
                <SelectItem value="status">Status</SelectItem>
                <SelectItem value="pricingStatus">Pricing Status</SelectItem>
              </SelectContent>
            </Select>

            {/* Modified loans filter */}
            {modifiedLoanCount > 0 && (
              <Button
                variant={showOnlyModified ? 'default' : 'outline'}
                size="sm"
                onClick={() => setShowOnlyModified(!showOnlyModified)}
                className={`h-9 ${showOnlyModified ? 'bg-amber-500 hover:bg-amber-600' : 'border-amber-500 text-amber-600 hover:bg-amber-50'}`}
              >
                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-amber-500 text-white text-xs font-bold mr-2">
                  {modifiedLoanCount}
                </span>
                {showOnlyModified ? 'Show All' : 'Modified'}
              </Button>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isFetching}
              className="h-9"
            >
              <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setAuditPanelOpen(true)}
              className="h-9"
            >
              <History className="h-4 w-4" />
            </Button>

            {/* View Mode Toggle */}
            <div className="flex items-center border rounded-md">
              <Button
                variant={viewMode === 'table' ? 'default' : 'ghost'}
                size="sm"
                className="h-9 rounded-r-none"
                onClick={() => setViewMode('table')}
              >
                <Table2 className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'cards' ? 'default' : 'ghost'}
                size="sm"
                className="h-9 rounded-l-none"
                onClick={() => setViewMode('cards')}
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Maturity Overview - collapsible timeline */}
      <MaturityOverview
        loans={loans}
        selectedBucket={filters.maturityBucket}
        onFilterByMaturity={(bucket) => setFilter('maturityBucket', bucket)}
      />

      {/* Changes Overview Panel - integrated view with visual bars */}
      <ChangesOverviewPanel
        loans={loans}
        previews={previews}
        onSave={handleSaveAll}
        onRevert={handleRevertAll}
        saving={saving}
      />

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Table or Cards View */}
        <div className="flex-1 overflow-hidden">
          {viewMode === 'table' ? (
            <LoanPricingTable
              loans={sortedLoans}
              allLoans={loans}
              groupBy={groupBy}
              feeConfigs={feeConfigs}
              onPreviewChange={handlePreviewChange}
              onAddFee={handleAddFee}
              onUpdateFee={handleUpdateFee}
              onRemoveFee={handleRemoveFee}
              onSplitSuccess={() => refetch()}
              onInvoiceChange={() => refetch()}
              previews={previews}
              getPendingFeeAdds={getPendingFeeAdds}
              isFeeDeleted={isFeeDeleted}
              getFeeUpdates={getFeeUpdates}
              sortField={sortField}
              sortDirection={sortDirection}
              onSort={handleSort}
              onStatusChange={handleStatusChange}
              selectedIds={selectedLoanIds}
              onSelectionChange={setSelectedLoanIds}
            />
          ) : (
            <LoanPricingCards
              loans={sortedLoans}
              feeConfigs={feeConfigs}
              onPreviewChange={handlePreviewChange}
              onAddFee={handleAddFee}
              onUpdateFee={handleUpdateFee}
              onRemoveFee={handleRemoveFee}
              onSplitSuccess={() => refetch()}
              previews={previews}
              getPendingFeeAdds={getPendingFeeAdds}
              isFeeDeleted={isFeeDeleted}
              getFeeUpdates={getFeeUpdates}
            />
          )}
        </div>

        {/* Impact Summary Panel */}
        <ImpactSummaryPanel
          loans={loans}
          previews={previews}
          onSave={handleSaveAll}
          onRevert={handleRevertAll}
          saving={saving}
        />
      </div>

      {/* Bulk Action Bar */}
      {selectedLoans.length > 0 && (
        <BulkActionBar
          selectedLoans={selectedLoans}
          feeConfigs={feeConfigs}
          onApplyRate={handleBulkApplyRate}
          onAddFee={handleBulkAddFee}
          onChangeStatus={handleBulkChangeStatus}
          onChangePricingStatus={handleBulkChangePricingStatus}
          onClearSelection={() => setSelectedLoanIds(new Set())}
          getPendingFeeAdds={getPendingFeeAdds}
        />
      )}

      {/* Global Audit Panel */}
      <AuditPanel
        loans={loans}
        isOpen={auditPanelOpen}
        onClose={() => setAuditPanelOpen(false)}
      />

    </div>
  );
}

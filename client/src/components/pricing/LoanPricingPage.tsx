import { useState, useCallback, useMemo, useEffect } from 'react';
import type {
  Fee,
  LoanStatus,
  PricingStatus,
  SnapshotChanges,
} from '@loan-pricing/shared';
import {
  updateLoan,
  addFeeToLoan,
  updateFee,
  removeFee,
  getFeeConfigs,
  getCustomerWithLoans,
  createSnapshot,
} from '@/lib/api';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useChangeStore, type FeeChange } from '@/stores/changeStore';
import { useLiveCalculation } from '@/hooks/useLiveCalculation';
import { useFilteredLoans } from '@/hooks/useFilteredLoans';
import { usePlayback } from '@/hooks/usePlayback';
import { useToast } from '@/components/ui/toast';
import { LoanPricingTable } from './LoanPricingTable';
import { LoanPricingCards } from './LoanPricingCards';
import { ImpactSummaryPanel } from './ImpactSummaryPanel';
import { SnapshotChangesPanel } from './SnapshotChangesPanel';
import { BulkActionBar } from './BulkActionBar';
import { AuditPanel } from './AuditPanel';
import { ChangesOverviewPanel } from './ChangesOverviewPanel';
import { MaturityOverview } from './MaturityOverview';
import { PlaybackTimeline } from './PlaybackTimeline';
import { PlaybackOverlay } from './PlaybackOverlay';
import { SaveChangesDialog } from './SaveChangesDialog';
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
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [auditPanelOpen, setAuditPanelOpen] = useState(false);
  const [showOnlyModified, setShowOnlyModified] = useState(false);
  // maturityFilter now synced with filters.maturityBucket from useFilteredLoans

  const queryClient = useQueryClient();

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

  // Playback mode state
  const {
    isPlaybackMode,
    snapshotLoans,
    previousSnapshotLoans,
    snapshotSummary,
    currentSnapshotIndex,
    allSnapshots,
    hasPrevious,
    hasNext,
    exitPlayback,
    goToPrevious,
    goToNext,
  } = usePlayback();

  // Playback filter state - default to showing only changes
  const [showPlaybackChangedOnly, setShowPlaybackChangedOnly] = useState(true);

  // Enable "show only changes" filter when entering playback mode
  useEffect(() => {
    if (isPlaybackMode) {
      setShowPlaybackChangedOnly(true);
    }
  }, [isPlaybackMode]);

  // Compute playback previews by comparing current vs previous snapshot
  const playbackPreviews = useMemo(() => {
    if (!isPlaybackMode || !snapshotLoans || !previousSnapshotLoans) {
      return new Map();
    }

    const previews = new Map<string, {
      effectiveRate: number;
      originalEffectiveRate: number;
      baseRate: number;
      originalBaseRate: number;
      spread: number;
      originalSpread: number;
      interestAmount: number;
      originalInterestAmount: number;
      totalFees: number;
      originalTotalFees: number;
      netProceeds: number;
      originalNetProceeds: number;
    }>();

    // Create lookup map for previous loans
    const previousLoansMap = new Map(previousSnapshotLoans.map(loan => [loan.id, loan]));

    // Compare each loan in current snapshot with previous
    for (const loan of snapshotLoans) {
      const prevLoan = previousLoansMap.get(loan.id);

      if (prevLoan) {
        // Check if anything changed
        const baseRateChanged = loan.pricing.baseRate !== prevLoan.pricing.baseRate;
        const spreadChanged = loan.pricing.spread !== prevLoan.pricing.spread;
        const rateChanged = loan.pricing.effectiveRate !== prevLoan.pricing.effectiveRate;
        const feesChanged = loan.totalFees !== prevLoan.totalFees;
        const interestChanged = loan.interestAmount !== prevLoan.interestAmount;
        const netChanged = loan.netProceeds !== prevLoan.netProceeds;

        if (baseRateChanged || spreadChanged || rateChanged || feesChanged || interestChanged || netChanged) {
          previews.set(loan.id, {
            effectiveRate: loan.pricing.effectiveRate,
            originalEffectiveRate: prevLoan.pricing.effectiveRate,
            baseRate: loan.pricing.baseRate,
            originalBaseRate: prevLoan.pricing.baseRate,
            spread: loan.pricing.spread,
            originalSpread: prevLoan.pricing.spread,
            interestAmount: loan.interestAmount,
            originalInterestAmount: prevLoan.interestAmount,
            totalFees: loan.totalFees,
            originalTotalFees: prevLoan.totalFees,
            netProceeds: loan.netProceeds,
            originalNetProceeds: prevLoan.netProceeds,
          });
        }
      }
    }

    return previews;
  }, [isPlaybackMode, snapshotLoans, previousSnapshotLoans]);

  // Playback-specific fee change detection (compares current vs previous snapshot)
  const playbackFeeChanges = useMemo(() => {
    if (!isPlaybackMode || !snapshotLoans || !previousSnapshotLoans) {
      return {
        addedFees: new Map<string, Set<string>>(), // loanId -> Set of feeIds that were added
        deletedFees: new Map<string, Set<string>>(), // loanId -> Set of feeIds that were deleted
        modifiedFees: new Map<string, Map<string, { oldAmount: number; newAmount: number }>>(), // loanId -> feeId -> amounts
      };
    }

    const previousLoansMap = new Map(previousSnapshotLoans.map(loan => [loan.id, loan]));
    const addedFees = new Map<string, Set<string>>();
    const deletedFees = new Map<string, Set<string>>();
    const modifiedFees = new Map<string, Map<string, { oldAmount: number; newAmount: number }>>();

    for (const loan of snapshotLoans) {
      const prevLoan = previousLoansMap.get(loan.id);
      if (!prevLoan) continue;

      const currentFeeIds = new Set(loan.fees.map(f => f.id));
      const prevFeeIds = new Set(prevLoan.fees.map(f => f.id));
      const prevFeeMap = new Map(prevLoan.fees.map(f => [f.id, f]));
      const currentFeeMap = new Map(loan.fees.map(f => [f.id, f]));

      // Find added fees (in current but not in previous)
      const added = new Set<string>();
      for (const feeId of currentFeeIds) {
        if (!prevFeeIds.has(feeId)) {
          added.add(feeId);
        }
      }
      if (added.size > 0) addedFees.set(loan.id, added);

      // Find deleted fees (in previous but not in current)
      const deleted = new Set<string>();
      for (const feeId of prevFeeIds) {
        if (!currentFeeIds.has(feeId)) {
          deleted.add(feeId);
        }
      }
      if (deleted.size > 0) deletedFees.set(loan.id, deleted);

      // Find modified fees (in both but different amount)
      const modified = new Map<string, { oldAmount: number; newAmount: number }>();
      for (const feeId of currentFeeIds) {
        if (prevFeeIds.has(feeId)) {
          const currentFee = currentFeeMap.get(feeId)!;
          const prevFee = prevFeeMap.get(feeId)!;
          if (currentFee.calculatedAmount !== prevFee.calculatedAmount) {
            modified.set(feeId, {
              oldAmount: prevFee.calculatedAmount,
              newAmount: currentFee.calculatedAmount,
            });
          }
        }
      }
      if (modified.size > 0) modifiedFees.set(loan.id, modified);
    }

    return { addedFees, deletedFees, modifiedFees };
  }, [isPlaybackMode, snapshotLoans, previousSnapshotLoans]);

  // Playback fee change helper functions
  const playbackGetPendingFeeAdds = useCallback((loanId: string): FeeChange[] => {
    const added = playbackFeeChanges.addedFees.get(loanId);
    if (!added) return [];

    const loan = snapshotLoans?.find(l => l.id === loanId);
    if (!loan) return [];

    return Array.from(added).map(feeId => {
      const fee = loan.fees.find(f => f.id === feeId);
      return {
        id: `playback-add-${feeId}`,
        loanId,
        type: 'add' as const,
        feeId,
        feeConfigId: fee?.feeConfigId,
        feeName: fee?.name || 'Unknown Fee',
        timestamp: new Date().toISOString(),
      };
    });
  }, [playbackFeeChanges.addedFees, snapshotLoans]);

  const playbackIsFeeDeleted = useCallback((_loanId: string, _feeId: string): boolean => {
    // In playback, we show fees from current snapshot, so deleted fees won't appear
    // Deleted fees from previous snapshot aren't shown in current
    return false;
  }, []);

  const playbackGetFeeUpdates = useCallback((loanId: string, feeId: string): Partial<Fee> | undefined => {
    const modified = playbackFeeChanges.modifiedFees.get(loanId);
    if (!modified) return undefined;

    const change = modified.get(feeId);
    if (!change) return undefined;

    // Return the new amount as an "update" to trigger the amber highlighting
    return { calculatedAmount: change.newAmount };
  }, [playbackFeeChanges.modifiedFees]);

  const playbackIsNewFee = useCallback((loanId: string, feeId: string): boolean => {
    const added = playbackFeeChanges.addedFees.get(loanId);
    return added?.has(feeId) ?? false;
  }, [playbackFeeChanges.addedFees]);

  // Get loan IDs with recorded changes (the source of truth for what changed)
  const recordedChangeLoanIds = useMemo(() => {
    const changedLoanIds = new Set<string>();
    const changes = snapshotSummary?.changes;
    if (changes) {
      changes.fees?.forEach(f => changedLoanIds.add(f.loanId));
      changes.rates?.forEach(r => changedLoanIds.add(r.loanId));
      changes.invoices?.forEach(i => {
        if (i.loanId) changedLoanIds.add(i.loanId);
        if (i.sourceLoanId) changedLoanIds.add(i.sourceLoanId);
        if (i.targetLoanId) changedLoanIds.add(i.targetLoanId);
      });
      changes.statuses?.forEach(s => changedLoanIds.add(s.loanId));
    }
    return changedLoanIds;
  }, [snapshotSummary?.changes]);

  // Filter playback loans to show only changed ones if filter is enabled
  const playbackFilteredLoans = useMemo(() => {
    if (!isPlaybackMode || !snapshotLoans) return [];
    if (!showPlaybackChangedOnly) return snapshotLoans;

    // Use ONLY recorded changes as the source of truth - not calculated deltas
    // Calculated deltas can include floating-point differences or computed field changes
    return snapshotLoans.filter(loan => recordedChangeLoanIds.has(loan.id));
  }, [isPlaybackMode, snapshotLoans, showPlaybackChangedOnly, recordedChangeLoanIds]);

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

  // Open save dialog
  const handleOpenSaveDialog = useCallback(() => {
    setSaveDialogOpen(true);
  }, []);

  // Build detailed snapshot changes from current change state
  const buildSnapshotChanges = useCallback((): SnapshotChanges => {
    const snapshotChanges: SnapshotChanges = {
      fees: [],
      rates: [],
      invoices: [],
      statuses: [],
    };

    // Build fee change details
    for (const feeChange of feeChanges) {
      const loan = loans.find((l) => l.id === feeChange.loanId);
      if (!loan) continue;

      if (feeChange.type === 'add') {
        snapshotChanges.fees.push({
          action: 'added',
          loanId: feeChange.loanId,
          loanNumber: loan.loanNumber,
          feeId: feeChange.feeConfigId || '',
          feeName: feeChange.feeName,
          feeCode: feeChange.feeConfigId || '',
          currency: loan.currency,
          newAmount: 0, // Will be calculated by server
        });
      } else if (feeChange.type === 'delete' && feeChange.originalFee) {
        snapshotChanges.fees.push({
          action: 'deleted',
          loanId: feeChange.loanId,
          loanNumber: loan.loanNumber,
          feeId: feeChange.feeId || '',
          feeName: feeChange.feeName,
          feeCode: feeChange.originalFee.code,
          currency: loan.currency,
          oldAmount: feeChange.originalFee.calculatedAmount,
        });
      } else if (feeChange.type === 'update' && feeChange.originalFee && feeChange.updates) {
        snapshotChanges.fees.push({
          action: 'modified',
          loanId: feeChange.loanId,
          loanNumber: loan.loanNumber,
          feeId: feeChange.feeId || '',
          feeName: feeChange.feeName,
          feeCode: feeChange.originalFee.code,
          currency: loan.currency,
          oldAmount: feeChange.originalFee.calculatedAmount,
          newAmount: feeChange.updates.calculatedAmount ?? feeChange.originalFee.calculatedAmount,
        });
      }
    }

    // Build rate change details
    for (const change of changes) {
      const loan = loans.find((l) => l.id === change.loanId);
      if (!loan) continue;

      // Only process pricing field changes
      if (change.fieldPath === 'pricing.baseRate' || change.fieldPath === 'pricing.spread') {
        const field = change.fieldPath === 'pricing.baseRate' ? 'baseRate' : 'spread';
        const oldValue = change.originalValue as number;
        const newValue = change.newValue as number;

        // Calculate effective rates
        const otherField = field === 'baseRate' ? 'spread' : 'baseRate';
        const otherValue = loan.pricing[otherField];
        const oldEffectiveRate = field === 'baseRate' ? oldValue + otherValue : otherValue + oldValue;
        const newEffectiveRate = field === 'baseRate' ? newValue + otherValue : otherValue + newValue;

        snapshotChanges.rates.push({
          action: 'modified',
          loanId: change.loanId,
          loanNumber: loan.loanNumber,
          currency: loan.currency,
          field,
          oldValue,
          newValue,
          oldEffectiveRate,
          newEffectiveRate,
        });
      }
    }

    return snapshotChanges;
  }, [changes, feeChanges, loans]);

  // Save all changes (rates and fees)
  const handleSaveAll = useCallback(async (description?: string) => {
    setSaveDialogOpen(false);
    setSaving(true);
    const changeCount = changes.length + feeChanges.length;

    // Build snapshot changes before making any API calls
    const snapshotChanges = buildSnapshotChanges();

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

      // Refetch to get updated loan data
      const { data: updatedData } = await refetch();

      // Create snapshot with updated loan data and detailed changes
      if (updatedData?.loans && changeCount > 0) {
        try {
          await createSnapshot({
            customerId,
            loans: updatedData.loans,
            changes: snapshotChanges,
            changeCount,
            description,
          });
          // Refresh timeline
          queryClient.invalidateQueries({ queryKey: ['snapshots', customerId] });
        } catch (snapshotError) {
          console.error('Failed to create snapshot:', snapshotError);
          // Don't fail the save if snapshot fails
        }
      }

      clearAllChanges();
      clearAllPreviews();
      toastSuccess(`Successfully saved ${changeCount} changes`);
    } catch (error) {
      console.error('Failed to save changes:', error);
      toastError('Failed to save changes. Please try again.');
    } finally {
      setSaving(false);
    }
  }, [changes, feeChanges, clearAllChanges, clearAllPreviews, refetch, toastSuccess, toastError, customerId, queryClient, buildSnapshotChanges]);

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
    <div className={`h-full flex flex-col transition-all duration-300 ${isPlaybackMode ? 'playback-mode playback-vignette' : ''}`}>
      {/* Header */}
      <header className={`border-b bg-card px-4 py-3 transition-colors ${isPlaybackMode ? 'bg-slate-100 dark:bg-slate-900' : ''}`}>
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

      {/* Playback Overlay - shows when viewing a snapshot */}
      {isPlaybackMode && snapshotSummary && (
        <PlaybackOverlay
          snapshot={snapshotSummary}
          snapshotIndex={currentSnapshotIndex}
          totalSnapshots={allSnapshots.length}
          onExit={exitPlayback}
          onPrevious={goToPrevious}
          onNext={goToNext}
          hasPrevious={hasPrevious}
          hasNext={hasNext}
          showChangedOnly={showPlaybackChangedOnly}
          onToggleChangedOnly={() => setShowPlaybackChangedOnly(v => !v)}
          changedCount={recordedChangeLoanIds.size}
        />
      )}

      {/* Maturity Overview - collapsible timeline */}
      <div className={isPlaybackMode ? 'playback-muted playback-panel-overlay' : ''}>
        <MaturityOverview
          loans={isPlaybackMode && snapshotLoans ? snapshotLoans : loans}
          selectedBucket={filters.maturityBucket}
          onFilterByMaturity={(bucket) => setFilter('maturityBucket', bucket)}
        />
      </div>

      {/* Playback Timeline - shows pricing history snapshots */}
      <div className={isPlaybackMode ? 'playback-muted playback-panel-overlay' : ''}>
        <PlaybackTimeline customerId={customerId} />
      </div>

      {/* Filter Toolbar - moved below pricing history */}
      <div className={`border-b bg-muted/30 px-4 py-3 ${isPlaybackMode ? 'playback-muted' : ''}`}>
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

      {/* Changes Overview Panel - integrated view with visual bars */}
      {!isPlaybackMode && (
        <ChangesOverviewPanel
          loans={loans}
          previews={previews}
          onSave={handleOpenSaveDialog}
          onRevert={handleRevertAll}
          saving={saving}
        />
      )}

      {/* Main content */}
      <div className={`flex-1 flex overflow-hidden relative ${isPlaybackMode ? 'playback-grain' : ''}`}>
        {/* Table or Cards View */}
        <div className="flex-1 overflow-hidden">
          {viewMode === 'table' ? (
            <LoanPricingTable
              loans={isPlaybackMode ? playbackFilteredLoans : sortedLoans}
              allLoans={isPlaybackMode && snapshotLoans ? snapshotLoans : loans}
              groupBy={groupBy}
              feeConfigs={feeConfigs}
              onPreviewChange={isPlaybackMode ? () => {} : handlePreviewChange}
              onAddFee={isPlaybackMode ? () => {} : handleAddFee}
              onUpdateFee={isPlaybackMode ? () => {} : handleUpdateFee}
              onRemoveFee={isPlaybackMode ? () => {} : handleRemoveFee}
              onSplitSuccess={isPlaybackMode ? () => {} : () => refetch()}
              onInvoiceChange={isPlaybackMode ? () => {} : () => refetch()}
              previews={isPlaybackMode ? playbackPreviews : previews}
              getPendingFeeAdds={isPlaybackMode ? playbackGetPendingFeeAdds : getPendingFeeAdds}
              isFeeDeleted={isPlaybackMode ? playbackIsFeeDeleted : isFeeDeleted}
              getFeeUpdates={isPlaybackMode ? playbackGetFeeUpdates : getFeeUpdates}
              isNewFee={isPlaybackMode ? playbackIsNewFee : undefined}
              sortField={sortField}
              sortDirection={sortDirection}
              onSort={handleSort}
              onStatusChange={isPlaybackMode ? undefined : handleStatusChange}
              selectedIds={isPlaybackMode ? new Set() : selectedLoanIds}
              onSelectionChange={isPlaybackMode ? () => {} : setSelectedLoanIds}
              readOnly={isPlaybackMode}
            />
          ) : (
            <LoanPricingCards
              loans={isPlaybackMode ? playbackFilteredLoans : sortedLoans}
              feeConfigs={feeConfigs}
              onPreviewChange={isPlaybackMode ? () => {} : handlePreviewChange}
              onAddFee={isPlaybackMode ? () => {} : handleAddFee}
              onUpdateFee={isPlaybackMode ? () => {} : handleUpdateFee}
              onRemoveFee={isPlaybackMode ? () => {} : handleRemoveFee}
              onSplitSuccess={isPlaybackMode ? () => {} : () => refetch()}
              previews={isPlaybackMode ? playbackPreviews : previews}
              getPendingFeeAdds={isPlaybackMode ? playbackGetPendingFeeAdds : getPendingFeeAdds}
              isFeeDeleted={isPlaybackMode ? playbackIsFeeDeleted : isFeeDeleted}
              getFeeUpdates={isPlaybackMode ? playbackGetFeeUpdates : getFeeUpdates}
            />
          )}
        </div>

        {/* Impact Summary Panel - swap for Snapshot panel in playback mode */}
        {isPlaybackMode && snapshotSummary ? (
          <SnapshotChangesPanel
            timestamp={snapshotSummary.timestamp}
            userName={snapshotSummary.userName}
            changeCount={snapshotSummary.changeCount}
            description={snapshotSummary.description}
            summary={snapshotSummary.summary}
            delta={snapshotSummary.delta}
            changes={snapshotSummary.changes || { fees: [], rates: [], invoices: [], statuses: [] }}
            onExit={exitPlayback}
          />
        ) : (
          <ImpactSummaryPanel
            loans={loans}
            previews={previews}
            onSave={handleOpenSaveDialog}
            onRevert={handleRevertAll}
            saving={saving}
          />
        )}
      </div>

      {/* Bulk Action Bar - hidden in playback mode */}
      {!isPlaybackMode && selectedLoans.length > 0 && (
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

      {/* Save Changes Dialog */}
      <SaveChangesDialog
        isOpen={saveDialogOpen}
        changeCount={changes.length + feeChanges.length}
        saving={saving}
        onClose={() => setSaveDialogOpen(false)}
        onSave={handleSaveAll}
      />
    </div>
  );
}

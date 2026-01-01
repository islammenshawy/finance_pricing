/**
 * @fileoverview Live Calculation Hook - Real-time Pricing Preview
 *
 * This hook manages real-time calculation previews as users edit loan pricing.
 * It provides immediate feedback without saving to the database.
 *
 * ARCHITECTURE:
 * ```
 * User edits rate → trackChange() → calculatePreview() → API call → Update preview state
 *                                          ↓
 *                                    [150ms debounce]
 * ```
 *
 * KEY FEATURES:
 * - Debounced API calls (default 150ms) to avoid overwhelming the server
 * - Merges pricing changes with fee changes for accurate previews
 * - Supports batch operations for bulk editing
 * - Automatic cleanup of pending requests on unmount
 *
 * USAGE:
 * @example
 * const { previews, calculatePreview, recalculateForFeeChanges } = useLiveCalculation({ loans });
 *
 * // When user edits a rate:
 * calculatePreview(loanId, { baseRate: 0.06 });
 *
 * // When user modifies fees:
 * recalculateForFeeChanges(loanId);
 *
 * // Access preview for a loan:
 * const preview = previews.get(loanId);
 *
 * @module hooks/useLiveCalculation
 * @see api.previewFullLoanState - Backend API for preview calculations
 * @see useChangeStore - State store for tracking pending changes
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { previewFullLoanState, previewPricing, type FeeChangesPreview } from '@/lib/api';
import type { LoanPricing, Loan } from '@loan-pricing/shared';
import { useChangeStore } from '@/stores/changeStore';

// ============================================
// TYPE DEFINITIONS
// ============================================

/**
 * Result of a pricing preview calculation.
 * Contains both current and original values for comparison.
 */
export interface PreviewResult {
  /** Current effective rate after changes */
  effectiveRate: number;
  /** Current interest amount after changes */
  interestAmount: number;
  /** Current total fees after changes */
  totalFees: number;
  /** Original total fees before changes (for delta display) */
  originalTotalFees?: number;
  /** Current net proceeds after changes */
  netProceeds: number;
  /** Original net proceeds before changes (for delta display) */
  originalNetProceeds?: number;
}

/**
 * Configuration options for the hook
 */
interface UseLiveCalculationOptions {
  /** Debounce delay in milliseconds (default: 150) */
  debounceMs?: number;
  /** Array of loans for reference data */
  loans?: Loan[];
}

// ============================================
// MAIN HOOK
// ============================================

/**
 * Hook for managing live calculation previews.
 *
 * @param options - Configuration options
 * @returns Object with preview state and control methods
 */
export function useLiveCalculation(options: UseLiveCalculationOptions = {}) {
  const { debounceMs = 150, loans = [] } = options;

  const [previews, setPreviews] = useState<Map<string, PreviewResult>>(new Map());
  const pendingRequests = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const loansRef = useRef<Loan[]>(loans);

  // Keep loans ref updated
  useEffect(() => {
    loansRef.current = loans;
  }, [loans]);

  // Build fee changes for a loan from the store
  const getFeeChangesForLoan = useCallback((loanId: string): FeeChangesPreview | undefined => {
    const { feeChanges } = useChangeStore.getState();
    const loanFeeChanges = feeChanges.filter((c) => c.loanId === loanId);
    if (loanFeeChanges.length === 0) return undefined;

    const adds = loanFeeChanges
      .filter((c) => c.type === 'add' && c.feeConfigId)
      .map((c) => ({ feeConfigId: c.feeConfigId! }));

    const updates = loanFeeChanges
      .filter((c) => c.type === 'update' && c.feeId && c.updates?.calculatedAmount !== undefined)
      .map((c) => ({ feeId: c.feeId!, calculatedAmount: c.updates!.calculatedAmount! }));

    const deletes = loanFeeChanges
      .filter((c) => c.type === 'delete' && c.feeId)
      .map((c) => ({ feeId: c.feeId! }));

    return {
      adds: adds.length > 0 ? adds : undefined,
      updates: updates.length > 0 ? updates : undefined,
      deletes: deletes.length > 0 ? deletes : undefined,
    };
  }, []);

  // Get pending pricing changes from the store, merged with loan's current values
  const getPendingPricingForLoan = useCallback((loanId: string): Partial<LoanPricing> | undefined => {
    const { changes } = useChangeStore.getState();
    const loanChanges = changes.filter((c) => c.loanId === loanId);

    const baseRateChange = loanChanges.find((c) => c.fieldPath === 'pricing.baseRate');
    const spreadChange = loanChanges.find((c) => c.fieldPath === 'pricing.spread');

    // No rate changes pending
    if (!baseRateChange && !spreadChange) return undefined;

    // Get current loan values for unchanged fields
    const loan = loansRef.current.find((l) => l.id === loanId);
    if (!loan) return undefined;

    // Always return COMPLETE pricing - use pending changes or current loan values
    return {
      baseRate: baseRateChange ? (baseRateChange.newValue as number) : loan.pricing.baseRate,
      spread: spreadChange ? (spreadChange.newValue as number) : loan.pricing.spread,
    };
  }, []);

  const calculatePreview = useCallback(
    async (loanId: string, pricing?: Partial<LoanPricing>) => {
      // Clear any pending request for this loan
      const existing = pendingRequests.current.get(loanId);
      if (existing) {
        clearTimeout(existing);
      }

      // Debounce the API call - no loading state, values update silently
      const timeoutId = setTimeout(async () => {
        try {
          const feeChanges = getFeeChangesForLoan(loanId);
          // Merge passed pricing with any pending pricing changes from the store
          const pendingPricing = getPendingPricingForLoan(loanId);
          const mergedPricing = pricing || pendingPricing
            ? { ...pendingPricing, ...pricing }
            : undefined;
          const result = await previewFullLoanState(loanId, mergedPricing, feeChanges);

          // Silently update with backend result
          setPreviews((prev) => {
            const next = new Map(prev);
            next.set(loanId, {
              effectiveRate: result.effectiveRate,
              interestAmount: result.interestAmount,
              totalFees: result.totalFees,
              originalTotalFees: result.originalTotalFees,
              netProceeds: result.netProceeds,
              originalNetProceeds: result.originalNetProceeds,
            });
            return next;
          });
        } catch (error) {
          console.error('Preview calculation failed:', error);
        } finally {
          pendingRequests.current.delete(loanId);
        }
      }, debounceMs);

      pendingRequests.current.set(loanId, timeoutId);
    },
    [debounceMs, getFeeChangesForLoan, getPendingPricingForLoan]
  );

  // Trigger preview when fee changes occur
  const recalculateForFeeChanges = useCallback((loanId: string) => {
    calculatePreview(loanId, undefined);
  }, [calculatePreview]);

  const clearPreview = useCallback((loanId: string) => {
    // Clear pending request
    const existing = pendingRequests.current.get(loanId);
    if (existing) {
      clearTimeout(existing);
      pendingRequests.current.delete(loanId);
    }

    // Remove from previews
    setPreviews((prev) => {
      const next = new Map(prev);
      next.delete(loanId);
      return next;
    });
  }, []);

  const clearAllPreviews = useCallback(() => {
    // Clear all pending requests
    for (const timeout of pendingRequests.current.values()) {
      clearTimeout(timeout);
    }
    pendingRequests.current.clear();
    setPreviews(new Map());
  }, []);

  const getPreview = useCallback(
    (loanId: string): PreviewResult | undefined => {
      return previews.get(loanId);
    },
    [previews]
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      for (const timeout of pendingRequests.current.values()) {
        clearTimeout(timeout);
      }
    };
  }, []);

  return {
    previews,
    calculatePreview,
    recalculateForFeeChanges,
    clearPreview,
    clearAllPreviews,
    getPreview,
  };
}

// Batch preview for bulk operations
export async function batchPreviewPricing(
  changes: Array<{ loanId: string; pricing: Partial<LoanPricing> }>
): Promise<Map<string, PreviewResult>> {
  const results = await Promise.all(
    changes.map(async ({ loanId, pricing }) => {
      try {
        const result = await previewPricing(loanId, pricing);
        return { loanId, result };
      } catch {
        return null;
      }
    })
  );

  const previewMap = new Map<string, PreviewResult>();
  for (const item of results) {
    if (item) {
      previewMap.set(item.loanId, {
        effectiveRate: item.result.effectiveRate,
        interestAmount: item.result.interestAmount,
        totalFees: item.result.totalFees,
        netProceeds: item.result.netProceeds,
      });
    }
  }

  return previewMap;
}

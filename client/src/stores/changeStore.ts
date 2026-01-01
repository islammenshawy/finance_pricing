/**
 * @fileoverview Change Store - Unified State Management Hook
 *
 * This module provides a unified interface for tracking unsaved changes
 * to loans. It wraps Redux actions with a convenient hook-based API.
 *
 * ARCHITECTURE:
 * - All state is stored in Redux (see changeSlice.ts)
 * - This hook provides a clean API that abstracts Redux dispatch/select
 * - Components use useChangeStore() instead of direct Redux access
 * - The static getState() method enables non-React code to access state
 *
 * CHANGE TYPES:
 * 1. Rate Changes - Modifications to baseRate, spread, etc.
 * 2. Fee Changes - Add, update, or delete fees
 *
 * USAGE:
 * @example
 * // In a React component
 * const { trackChange, hasChanges, isFieldModified } = useChangeStore();
 *
 * // Track a rate change
 * trackChange(loanId, 'pricing.baseRate', 'Base Rate', 0.05, 0.06);
 *
 * // Check if field is modified
 * if (isFieldModified(loanId, 'pricing.baseRate')) { ... }
 *
 * @example
 * // Access state outside React (e.g., in useLiveCalculation)
 * const { feeChanges } = useChangeStore.getState();
 *
 * @module stores/changeStore
 * @see changeSlice - Redux slice containing the actual state and reducers
 */

import { useSelector, useDispatch } from 'react-redux';
import { useCallback } from 'react';
import type { Fee } from '@loan-pricing/shared';
import {
  trackChange as trackChangeAction,
  revertChange as revertChangeAction,
  revertAllForLoan as revertAllForLoanAction,
  clearAllChanges as clearAllChangesAction,
  trackFeeAdd as trackFeeAddAction,
  trackFeeUpdate as trackFeeUpdateAction,
  trackFeeDelete as trackFeeDeleteAction,
  revertFeeChange as revertFeeChangeAction,
  selectChanges,
  selectFeeChanges,
} from './changeSlice';

// Re-export types for backwards compatibility
export type { Change, FeeChange } from './changeSlice';

/**
 * Unified hook for tracking loan changes.
 *
 * Provides methods for:
 * - Tracking rate/pricing changes
 * - Tracking fee additions, updates, deletions
 * - Querying change state
 * - Reverting changes
 *
 * @returns Object containing state and action methods
 */
export function useChangeStore() {
  const dispatch = useDispatch();
  const changes = useSelector(selectChanges);
  const feeChanges = useSelector(selectFeeChanges);

  // ============================================
  // RATE/PRICING CHANGE ACTIONS
  // ============================================

  /**
   * Track a pricing field change (e.g., baseRate, spread)
   * @param loanId - The loan being modified
   * @param fieldPath - Dot-notation path (e.g., 'pricing.baseRate')
   * @param fieldLabel - Human-readable label for UI display
   * @param originalValue - Value before change
   * @param newValue - Value after change
   */
  const trackChange = useCallback(
    (loanId: string, fieldPath: string, fieldLabel: string, originalValue: unknown, newValue: unknown) => {
      dispatch(trackChangeAction({ loanId, fieldPath, fieldLabel, originalValue, newValue }));
    },
    [dispatch]
  );

  const revertChange = useCallback(
    (changeId: string) => {
      dispatch(revertChangeAction(changeId));
    },
    [dispatch]
  );

  const revertAllForLoan = useCallback(
    (loanId: string) => {
      dispatch(revertAllForLoanAction(loanId));
    },
    [dispatch]
  );

  const clearAllChanges = useCallback(() => {
    dispatch(clearAllChangesAction());
  }, [dispatch]);

  const hasChanges = useCallback(() => {
    return changes.length > 0 || feeChanges.length > 0;
  }, [changes, feeChanges]);

  const hasChangesForLoan = useCallback(
    (loanId: string) => {
      return changes.some((c) => c.loanId === loanId) || feeChanges.some((c) => c.loanId === loanId);
    },
    [changes, feeChanges]
  );

  const isFieldModified = useCallback(
    (loanId: string, fieldPath: string) => {
      return changes.some((c) => c.loanId === loanId && c.fieldPath === fieldPath);
    },
    [changes]
  );

  const getOriginalValue = useCallback(
    (loanId: string, fieldPath: string) => {
      const change = changes.find((c) => c.loanId === loanId && c.fieldPath === fieldPath);
      return change?.originalValue;
    },
    [changes]
  );

  const getNewValue = useCallback(
    (loanId: string, fieldPath: string) => {
      const change = changes.find((c) => c.loanId === loanId && c.fieldPath === fieldPath);
      return change?.newValue;
    },
    [changes]
  );

  const getChangesForLoan = useCallback(
    (loanId: string) => {
      return changes.filter((c) => c.loanId === loanId);
    },
    [changes]
  );

  // ============================================
  // FEE CHANGE ACTIONS
  // ============================================

  /**
   * Track a new fee being added to a loan
   * @param loanId - The loan to add fee to
   * @param feeConfigId - The fee config template ID
   * @param feeName - Display name for the fee
   */
  const trackFeeAdd = useCallback(
    (loanId: string, feeConfigId: string, feeName: string) => {
      dispatch(trackFeeAddAction({ loanId, feeConfigId, feeName }));
    },
    [dispatch]
  );

  const trackFeeUpdate = useCallback(
    (loanId: string, feeId: string, originalFee: Fee, updates: Partial<Fee>) => {
      dispatch(trackFeeUpdateAction({ loanId, feeId, originalFee, updates }));
    },
    [dispatch]
  );

  const trackFeeDelete = useCallback(
    (loanId: string, feeId: string, originalFee: Fee) => {
      dispatch(trackFeeDeleteAction({ loanId, feeId, originalFee }));
    },
    [dispatch]
  );

  const revertFeeChange = useCallback(
    (changeId: string) => {
      dispatch(revertFeeChangeAction(changeId));
    },
    [dispatch]
  );

  const getFeeChangesForLoan = useCallback(
    (loanId: string) => {
      return feeChanges.filter((c) => c.loanId === loanId);
    },
    [feeChanges]
  );

  const getPendingFeeAdds = useCallback(
    (loanId: string) => {
      return feeChanges.filter((c) => c.loanId === loanId && c.type === 'add');
    },
    [feeChanges]
  );

  const getPendingFeeDeletes = useCallback(
    (loanId: string) => {
      return feeChanges.filter((c) => c.loanId === loanId && c.type === 'delete');
    },
    [feeChanges]
  );

  const getPendingFeeUpdates = useCallback(
    (loanId: string) => {
      return feeChanges.filter((c) => c.loanId === loanId && c.type === 'update');
    },
    [feeChanges]
  );

  const isFeeDeleted = useCallback(
    (loanId: string, feeId: string) => {
      return feeChanges.some((c) => c.loanId === loanId && c.feeId === feeId && c.type === 'delete');
    },
    [feeChanges]
  );

  const getFeeUpdates = useCallback(
    (loanId: string, feeId: string) => {
      const change = feeChanges.find((c) => c.loanId === loanId && c.feeId === feeId && c.type === 'update');
      return change?.updates;
    },
    [feeChanges]
  );

  return {
    // State
    changes,
    feeChanges,

    // Rate change actions
    trackChange,
    revertChange,
    revertAllForLoan,
    clearAllChanges,
    hasChanges,
    hasChangesForLoan,
    isFieldModified,
    getOriginalValue,
    getNewValue,
    getChangesForLoan,

    // Fee change actions
    trackFeeAdd,
    trackFeeUpdate,
    trackFeeDelete,
    revertFeeChange,
    getFeeChangesForLoan,
    getPendingFeeAdds,
    getPendingFeeDeletes,
    getPendingFeeUpdates,
    isFeeDeleted,
    getFeeUpdates,
  };
}

// For components that need direct store access (like useChangeStore.getState())
// We provide a helper that works with Redux
import { store } from './store';

// Static method replacement for useChangeStore.getState()
useChangeStore.getState = () => {
  const state = store.getState();
  return {
    changes: state.changes.changes,
    feeChanges: state.changes.feeChanges,
  };
};

/**
 * @fileoverview Hooks MFE Export
 *
 * Reusable React hooks that can be consumed by other MFEs.
 * These hooks provide state management and business logic.
 *
 * @module mfe/hooks
 *
 * @example Using Change Store
 * ```tsx
 * import { useChangeStore } from 'loanPricing/hooks';
 *
 * function MyComponent() {
 *   const { trackChange, hasChanges, clearAllChanges } = useChangeStore();
 *
 *   const handleEdit = (field, value) => {
 *     trackChange(entityId, field, 'Field Name', oldValue, value);
 *   };
 * }
 * ```
 *
 * @example Using Live Calculation
 * ```tsx
 * import { useLiveCalculation } from 'loanPricing/hooks';
 *
 * function PricingEditor({ loans }) {
 *   const { previews, calculatePreview, clearAllPreviews } = useLiveCalculation({ loans });
 *
 *   const handleRateChange = (loanId, newRate) => {
 *     calculatePreview(loanId, { baseRate: newRate });
 *   };
 * }
 * ```
 */

// =============================================================================
// STATE MANAGEMENT HOOKS
// =============================================================================

export { useChangeStore } from '@/stores/changeStore';
export type { Change, FeeChange } from '@/stores/changeStore';

// =============================================================================
// CALCULATION HOOKS
// =============================================================================

export { useLiveCalculation, batchPreviewPricing } from '@/hooks/useLiveCalculation';
export type { PreviewResult } from '@/hooks/useLiveCalculation';

// =============================================================================
// FILTERING HOOKS
// =============================================================================

export { useFilteredLoans } from '@/hooks/useFilteredLoans';
export type { LoanFilters, UseFilteredLoansReturn } from '@/hooks/useFilteredLoans';

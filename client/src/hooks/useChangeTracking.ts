import { useCallback } from 'react';
import { useChangeStore } from '@/stores/changeStore';
import { updateLoan } from '@/lib/api';
import { useQueryClient } from '@tanstack/react-query';

export function useChangeTracking(loanId: string | undefined) {
  const queryClient = useQueryClient();
  const {
    trackChange,
    revertChange,
    revertAllForLoan,
    getChangesForLoan,
    hasChangesForLoan,
    isFieldModified,
    getOriginalValue,
  } = useChangeStore();

  const track = useCallback(
    (
      fieldPath: string,
      fieldLabel: string,
      originalValue: unknown,
      currentValue: unknown
    ) => {
      if (!loanId) return;
      trackChange(loanId, fieldPath, fieldLabel, originalValue, currentValue);
    },
    [loanId, trackChange]
  );

  const revert = useCallback(
    (changeId: string) => {
      revertChange(changeId);
    },
    [revertChange]
  );

  const revertAll = useCallback(() => {
    if (!loanId) return;
    revertAllForLoan(loanId);
  }, [loanId, revertAllForLoan]);

  const changes = loanId ? getChangesForLoan(loanId) : [];
  const hasUnsavedChanges = loanId ? hasChangesForLoan(loanId) : false;

  const checkFieldModified = useCallback(
    (fieldPath: string) => {
      if (!loanId) return false;
      return isFieldModified(loanId, fieldPath);
    },
    [loanId, isFieldModified]
  );

  const getOriginal = useCallback(
    (fieldPath: string) => {
      if (!loanId) return undefined;
      return getOriginalValue(loanId, fieldPath);
    },
    [loanId, getOriginalValue]
  );

  // Build update request from changes
  const buildUpdateRequest = useCallback(() => {
    const request: Record<string, unknown> = { pricing: {} };

    for (const change of changes) {
      const { fieldPath, newValue } = change;

      if (fieldPath.startsWith('pricing.')) {
        const key = fieldPath.replace('pricing.', '');
        (request.pricing as Record<string, unknown>)[key] = newValue;
      } else if (fieldPath === 'startDate' || fieldPath === 'maturityDate') {
        request[fieldPath] = newValue;
      }
    }

    // Clean up empty pricing object
    if (Object.keys(request.pricing as object).length === 0) {
      delete request.pricing;
    }

    return request;
  }, [changes]);

  // Save all changes
  const saveChanges = useCallback(async () => {
    if (!loanId || changes.length === 0) return;

    const request = buildUpdateRequest();

    if (Object.keys(request).length === 0) return;

    await updateLoan(loanId, request);

    // Invalidate and refetch
    queryClient.invalidateQueries({ queryKey: ['loan', loanId] });
    queryClient.invalidateQueries({ queryKey: ['loans'] });

    // Clear changes after successful save
    revertAll();
  }, [loanId, changes, buildUpdateRequest, queryClient, revertAll]);

  return {
    trackChange: track,
    revertChange: revert,
    revertAll,
    changes,
    hasChanges: hasUnsavedChanges,
    isFieldModified: checkFieldModified,
    getOriginalValue: getOriginal,
    saveChanges,
  };
}

import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { Fee } from '@loan-pricing/shared';

export interface Change {
  id: string;
  loanId: string;
  fieldPath: string;
  fieldLabel: string;
  originalValue: unknown;
  newValue: unknown;
  timestamp: string; // Serialized date for Redux
}

export interface FeeChange {
  id: string;
  loanId: string;
  type: 'add' | 'update' | 'delete';
  feeId?: string;
  feeConfigId?: string;
  feeName: string;
  originalFee?: Fee;
  updates?: Partial<Fee>;
  timestamp: string; // Serialized date for Redux
}

interface ChangeState {
  changes: Change[];
  feeChanges: FeeChange[];
  changeIdCounter: number;
  feeChangeIdCounter: number;
}

const initialState: ChangeState = {
  changes: [],
  feeChanges: [],
  changeIdCounter: 0,
  feeChangeIdCounter: 0,
};

// Payload types
interface TrackChangePayload {
  loanId: string;
  fieldPath: string;
  fieldLabel: string;
  originalValue: unknown;
  newValue: unknown;
}

interface TrackFeeAddPayload {
  loanId: string;
  feeConfigId: string;
  feeName: string;
}

interface TrackFeeUpdatePayload {
  loanId: string;
  feeId: string;
  originalFee: Fee;
  updates: Partial<Fee>;
}

interface TrackFeeDeletePayload {
  loanId: string;
  feeId: string;
  originalFee: Fee;
}

const changeSlice = createSlice({
  name: 'changes',
  initialState,
  reducers: {
    trackChange: (state, action: PayloadAction<TrackChangePayload>) => {
      const { loanId, fieldPath, fieldLabel, originalValue, newValue } = action.payload;

      // If reverting to original value, remove the change
      if (JSON.stringify(originalValue) === JSON.stringify(newValue)) {
        state.changes = state.changes.filter(
          (c) => !(c.loanId === loanId && c.fieldPath === fieldPath)
        );
        return;
      }

      // Find existing change for this field
      const existingIndex = state.changes.findIndex(
        (c) => c.loanId === loanId && c.fieldPath === fieldPath
      );

      state.changeIdCounter += 1;
      const change: Change = {
        id: `change-${state.changeIdCounter}`,
        loanId,
        fieldPath,
        fieldLabel,
        originalValue,
        newValue,
        timestamp: new Date().toISOString(),
      };

      if (existingIndex >= 0) {
        state.changes[existingIndex] = change;
      } else {
        state.changes.push(change);
      }
    },

    revertChange: (state, action: PayloadAction<string>) => {
      state.changes = state.changes.filter((c) => c.id !== action.payload);
    },

    revertAllForLoan: (state, action: PayloadAction<string>) => {
      state.changes = state.changes.filter((c) => c.loanId !== action.payload);
    },

    clearAllChanges: (state) => {
      state.changes = [];
      state.feeChanges = [];
    },

    trackFeeAdd: (state, action: PayloadAction<TrackFeeAddPayload>) => {
      const { loanId, feeConfigId, feeName } = action.payload;
      state.feeChangeIdCounter += 1;
      state.feeChanges.push({
        id: `fee-change-${state.feeChangeIdCounter}`,
        loanId,
        type: 'add',
        feeConfigId,
        feeName,
        timestamp: new Date().toISOString(),
      });
    },

    trackFeeUpdate: (state, action: PayloadAction<TrackFeeUpdatePayload>) => {
      const { loanId, feeId, originalFee, updates } = action.payload;

      // Find existing update for this fee
      const existingIndex = state.feeChanges.findIndex(
        (c) => c.loanId === loanId && c.feeId === feeId && c.type === 'update'
      );

      state.feeChangeIdCounter += 1;
      const change: FeeChange = {
        id: `fee-change-${state.feeChangeIdCounter}`,
        loanId,
        type: 'update',
        feeId,
        feeName: originalFee.name,
        originalFee,
        updates,
        timestamp: new Date().toISOString(),
      };

      if (existingIndex >= 0) {
        state.feeChanges[existingIndex] = change;
      } else {
        state.feeChanges.push(change);
      }
    },

    trackFeeDelete: (state, action: PayloadAction<TrackFeeDeletePayload>) => {
      const { loanId, feeId, originalFee } = action.payload;

      // If there's a pending add for this fee config, just remove the add
      const pendingAddIndex = state.feeChanges.findIndex(
        (c) => c.loanId === loanId && c.type === 'add' && c.feeConfigId === originalFee.feeConfigId
      );

      if (pendingAddIndex >= 0) {
        state.feeChanges.splice(pendingAddIndex, 1);
        return;
      }

      // Otherwise, track as delete
      state.feeChangeIdCounter += 1;
      state.feeChanges.push({
        id: `fee-change-${state.feeChangeIdCounter}`,
        loanId,
        type: 'delete',
        feeId,
        feeName: originalFee.name,
        originalFee,
        timestamp: new Date().toISOString(),
      });
    },

    revertFeeChange: (state, action: PayloadAction<string>) => {
      state.feeChanges = state.feeChanges.filter((c) => c.id !== action.payload);
    },
  },
});

export const {
  trackChange,
  revertChange,
  revertAllForLoan,
  clearAllChanges,
  trackFeeAdd,
  trackFeeUpdate,
  trackFeeDelete,
  revertFeeChange,
} = changeSlice.actions;

export default changeSlice.reducer;

// Selectors
export const selectChanges = (state: { changes: ChangeState }) => state.changes.changes;
export const selectFeeChanges = (state: { changes: ChangeState }) => state.changes.feeChanges;

export const selectHasChanges = (state: { changes: ChangeState }) =>
  state.changes.changes.length > 0 || state.changes.feeChanges.length > 0;

export const selectHasChangesForLoan = (state: { changes: ChangeState }, loanId: string) =>
  state.changes.changes.some((c) => c.loanId === loanId) ||
  state.changes.feeChanges.some((c) => c.loanId === loanId);

export const selectIsFieldModified = (state: { changes: ChangeState }, loanId: string, fieldPath: string) =>
  state.changes.changes.some((c) => c.loanId === loanId && c.fieldPath === fieldPath);

export const selectOriginalValue = (state: { changes: ChangeState }, loanId: string, fieldPath: string) => {
  const change = state.changes.changes.find((c) => c.loanId === loanId && c.fieldPath === fieldPath);
  return change?.originalValue;
};

export const selectNewValue = (state: { changes: ChangeState }, loanId: string, fieldPath: string) => {
  const change = state.changes.changes.find((c) => c.loanId === loanId && c.fieldPath === fieldPath);
  return change?.newValue;
};

export const selectChangesForLoan = (state: { changes: ChangeState }, loanId: string) =>
  state.changes.changes.filter((c) => c.loanId === loanId);

export const selectFeeChangesForLoan = (state: { changes: ChangeState }, loanId: string) =>
  state.changes.feeChanges.filter((c) => c.loanId === loanId);

export const selectPendingFeeAdds = (state: { changes: ChangeState }, loanId: string) =>
  state.changes.feeChanges.filter((c) => c.loanId === loanId && c.type === 'add');

export const selectPendingFeeDeletes = (state: { changes: ChangeState }, loanId: string) =>
  state.changes.feeChanges.filter((c) => c.loanId === loanId && c.type === 'delete');

export const selectPendingFeeUpdates = (state: { changes: ChangeState }, loanId: string) =>
  state.changes.feeChanges.filter((c) => c.loanId === loanId && c.type === 'update');

export const selectIsFeeDeleted = (state: { changes: ChangeState }, loanId: string, feeId: string) =>
  state.changes.feeChanges.some((c) => c.loanId === loanId && c.feeId === feeId && c.type === 'delete');

export const selectFeeUpdates = (state: { changes: ChangeState }, loanId: string, feeId: string) => {
  const change = state.changes.feeChanges.find(
    (c) => c.loanId === loanId && c.feeId === feeId && c.type === 'update'
  );
  return change?.updates;
};

import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { Loan, SnapshotSummary } from '@loan-pricing/shared';

interface PlaybackState {
  isPlaybackMode: boolean;
  currentSnapshotId: string | null;
  currentSnapshotIndex: number;
  snapshotLoans: Loan[] | null;
  previousSnapshotLoans: Loan[] | null;
  snapshotSummary: SnapshotSummary | null;
  previousSnapshotSummary: SnapshotSummary | null;
  allSnapshots: SnapshotSummary[];
  isLoading: boolean;
  error: string | null;
}

const initialState: PlaybackState = {
  isPlaybackMode: false,
  currentSnapshotId: null,
  currentSnapshotIndex: 0,
  snapshotLoans: null,
  previousSnapshotLoans: null,
  snapshotSummary: null,
  previousSnapshotSummary: null,
  allSnapshots: [],
  isLoading: false,
  error: null,
};

interface EnterPlaybackPayload {
  snapshotId: string;
  snapshotIndex: number;
  loans: Loan[];
  previousLoans: Loan[] | null;
  summary: SnapshotSummary;
  previousSummary: SnapshotSummary | null;
  allSnapshots: SnapshotSummary[];
}

const playbackSlice = createSlice({
  name: 'playback',
  initialState,
  reducers: {
    setPlaybackLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
      if (action.payload) {
        state.error = null;
      }
    },

    enterPlayback: (state, action: PayloadAction<EnterPlaybackPayload>) => {
      state.isPlaybackMode = true;
      state.currentSnapshotId = action.payload.snapshotId;
      state.currentSnapshotIndex = action.payload.snapshotIndex;
      state.snapshotLoans = action.payload.loans;
      state.previousSnapshotLoans = action.payload.previousLoans;
      state.snapshotSummary = action.payload.summary;
      state.previousSnapshotSummary = action.payload.previousSummary;
      state.allSnapshots = action.payload.allSnapshots;
      state.isLoading = false;
      state.error = null;
    },

    exitPlayback: (state) => {
      state.isPlaybackMode = false;
      state.currentSnapshotId = null;
      state.currentSnapshotIndex = 0;
      state.snapshotLoans = null;
      state.previousSnapshotLoans = null;
      state.snapshotSummary = null;
      state.previousSnapshotSummary = null;
      state.allSnapshots = [];
      state.isLoading = false;
      state.error = null;
    },

    setPlaybackError: (state, action: PayloadAction<string>) => {
      state.error = action.payload;
      state.isLoading = false;
    },
  },
});

export const {
  setPlaybackLoading,
  enterPlayback,
  exitPlayback,
  setPlaybackError,
} = playbackSlice.actions;

export default playbackSlice.reducer;

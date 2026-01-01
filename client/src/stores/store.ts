import { configureStore } from '@reduxjs/toolkit';
import changeReducer from './changeSlice';
import playbackReducer from './playbackSlice';

export const store = configureStore({
  reducer: {
    changes: changeReducer,
    playback: playbackReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore these action types
        ignoredActions: ['changes/trackFeeUpdate', 'changes/trackFeeDelete', 'playback/enterPlayback'],
        // Ignore these field paths in all actions
        ignoredActionPaths: ['payload.originalFee', 'payload.updates', 'payload.loans', 'payload.summary', 'payload.previousSummary'],
        // Ignore these paths in the state
        ignoredPaths: ['changes.feeChanges', 'playback.snapshotLoans', 'playback.snapshotSummary', 'playback.previousSnapshotSummary'],
      },
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

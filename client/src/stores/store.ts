import { configureStore } from '@reduxjs/toolkit';
import changeReducer from './changeSlice';

export const store = configureStore({
  reducer: {
    changes: changeReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore these action types
        ignoredActions: ['changes/trackFeeUpdate', 'changes/trackFeeDelete'],
        // Ignore these field paths in all actions
        ignoredActionPaths: ['payload.originalFee', 'payload.updates'],
        // Ignore these paths in the state
        ignoredPaths: ['changes.feeChanges'],
      },
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

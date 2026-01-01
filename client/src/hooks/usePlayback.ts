import { useCallback, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import type { RootState } from '@/stores/store';
import {
  enterPlayback as enterPlaybackAction,
  exitPlayback as exitPlaybackAction,
  setPlaybackLoading,
  setPlaybackError,
} from '@/stores/playbackSlice';
import { getSnapshot } from '@/lib/api';
import type { SnapshotSummary } from '@loan-pricing/shared';

/**
 * Hook for managing playback mode state and actions
 */
export function usePlayback() {
  const dispatch = useDispatch();

  const isPlaybackMode = useSelector((state: RootState) => state.playback.isPlaybackMode);
  const snapshotLoans = useSelector((state: RootState) => state.playback.snapshotLoans);
  const previousSnapshotLoans = useSelector((state: RootState) => state.playback.previousSnapshotLoans);
  const snapshotSummary = useSelector((state: RootState) => state.playback.snapshotSummary);
  const previousSnapshotSummary = useSelector((state: RootState) => state.playback.previousSnapshotSummary);
  const currentSnapshotId = useSelector((state: RootState) => state.playback.currentSnapshotId);
  const currentSnapshotIndex = useSelector((state: RootState) => state.playback.currentSnapshotIndex);
  const allSnapshots = useSelector((state: RootState) => state.playback.allSnapshots);
  const isLoading = useSelector((state: RootState) => state.playback.isLoading);
  const error = useSelector((state: RootState) => state.playback.error);

  /**
   * Load a snapshot by index (internal helper)
   * Note: snapshots array is in chronological order (oldest first at index 0)
   */
  const loadSnapshotByIndex = useCallback(
    async (index: number, snapshots: SnapshotSummary[]) => {
      if (index < 0 || index >= snapshots.length) return;

      dispatch(setPlaybackLoading(true));

      try {
        const snapshotSummary = snapshots[index];
        const snapshot = await getSnapshot(snapshotSummary.id);

        // Get previous snapshot for delta comparison
        // Snapshots are in chronological order (oldest first), so previous = lower index
        const previousSnapshotSummary = index > 0
          ? snapshots[index - 1]
          : null;

        // Fetch previous snapshot's loans if it exists
        let previousLoans: typeof snapshot.loans | null = null;
        if (previousSnapshotSummary) {
          const prevSnapshot = await getSnapshot(previousSnapshotSummary.id);
          previousLoans = prevSnapshot.loans;
        }

        dispatch(
          enterPlaybackAction({
            snapshotId: snapshotSummary.id,
            snapshotIndex: index,
            loans: snapshot.loans,
            previousLoans,
            summary: {
              id: snapshot.id,
              customerId: snapshot.customerId,
              timestamp: snapshot.timestamp,
              userId: snapshot.userId,
              userName: snapshot.userName,
              summary: snapshot.summary,
              delta: snapshot.delta,
              changes: snapshot.changes || { fees: [], rates: [], invoices: [], statuses: [] },
              changeCount: snapshot.changeCount,
              description: snapshot.description,
            },
            previousSummary: previousSnapshotSummary,
            allSnapshots: snapshots,
          })
        );
      } catch (err) {
        dispatch(setPlaybackError(err instanceof Error ? err.message : 'Failed to load snapshot'));
      }
    },
    [dispatch]
  );

  /**
   * Enter playback mode for a specific snapshot
   */
  const enterPlayback = useCallback(
    async (snapshotId: string, snapshots: SnapshotSummary[]) => {
      const index = snapshots.findIndex((s) => s.id === snapshotId);
      await loadSnapshotByIndex(index, snapshots);
    },
    [loadSnapshotByIndex]
  );

  /**
   * Navigate to previous (older) snapshot
   * Snapshots are in chronological order (oldest first), so previous = lower index
   */
  const goToPrevious = useCallback(async () => {
    if (currentSnapshotIndex > 0) {
      await loadSnapshotByIndex(currentSnapshotIndex - 1, allSnapshots);
    }
  }, [currentSnapshotIndex, allSnapshots, loadSnapshotByIndex]);

  /**
   * Navigate to next (newer) snapshot
   * Snapshots are in chronological order (oldest first), so next = higher index
   */
  const goToNext = useCallback(async () => {
    if (currentSnapshotIndex < allSnapshots.length - 1) {
      await loadSnapshotByIndex(currentSnapshotIndex + 1, allSnapshots);
    }
  }, [currentSnapshotIndex, allSnapshots, loadSnapshotByIndex]);

  /**
   * Exit playback mode and return to live data
   */
  const exitPlayback = useCallback(() => {
    dispatch(exitPlaybackAction());
  }, [dispatch]);

  /**
   * Set up Escape key handler for exiting playback
   */
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isPlaybackMode) {
        exitPlayback();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaybackMode, exitPlayback]);

  // Computed navigation state (chronological order: oldest first at index 0)
  const hasPrevious = currentSnapshotIndex > 0;  // Can go to older (lower index)
  const hasNext = currentSnapshotIndex < allSnapshots.length - 1;  // Can go to newer (higher index)

  return {
    // State
    isPlaybackMode,
    snapshotLoans,
    previousSnapshotLoans,
    snapshotSummary,
    previousSnapshotSummary,
    currentSnapshotId,
    currentSnapshotIndex,
    allSnapshots,
    isLoading,
    error,
    hasPrevious,
    hasNext,

    // Actions
    enterPlayback,
    exitPlayback,
    goToPrevious,
    goToNext,
  };
}

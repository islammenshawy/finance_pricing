import { Button } from '@/components/ui/button';
import { X, ChevronLeft, ChevronRight, Filter, Rewind } from 'lucide-react';
import type { SnapshotSummary } from '@loan-pricing/shared';

interface PlaybackOverlayProps {
  snapshot: SnapshotSummary;
  snapshotIndex: number;
  totalSnapshots: number;
  onExit: () => void;
  onPrevious?: () => void;
  onNext?: () => void;
  hasPrevious?: boolean;
  hasNext?: boolean;
  showChangedOnly: boolean;
  onToggleChangedOnly: () => void;
  changedCount: number;
}

function formatTime(date: Date | string): string {
  return new Date(date).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });
}

function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

export function PlaybackOverlay({
  snapshot,
  snapshotIndex,
  totalSnapshots,
  onExit,
  onPrevious,
  onNext,
  hasPrevious = false,
  hasNext = false,
  showChangedOnly,
  onToggleChangedOnly,
  changedCount,
}: PlaybackOverlayProps) {
  return (
    <div className="sticky top-0 z-50">
      {/* Frosted glass bar */}
      <div className="bg-slate-900/80 backdrop-blur-xl border-b border-white/10 shadow-2xl">
        <div className="px-4 py-2 flex items-center justify-between">

          {/* Left: Mode indicator + timestamp */}
          <div className="flex items-center gap-4">
            {/* Animated rewind icon */}
            <div className="relative">
              <div className="absolute inset-0 bg-amber-500/20 rounded-full blur-md animate-pulse" />
              <div className="relative flex items-center justify-center w-8 h-8 bg-gradient-to-br from-amber-400 to-amber-600 rounded-full shadow-lg">
                <Rewind className="h-4 w-4 text-white" />
              </div>
            </div>

            {/* Timestamp block */}
            <div className="flex flex-col">
              <div className="flex items-baseline gap-2">
                <span className="text-lg font-semibold text-white tabular-nums">
                  {formatTime(snapshot.timestamp)}
                </span>
                <span className="text-sm text-slate-400">
                  {formatDate(snapshot.timestamp)}
                </span>
              </div>
              <span className="text-xs text-slate-500">
                by {snapshot.userName} · {snapshot.changeCount} changes
              </span>
            </div>
          </div>

          {/* Center: Navigation */}
          <div className="flex items-center">
            {/* Previous button (go back/left on timeline) */}
            <button
              className={`group flex items-center gap-2 px-4 py-2 rounded-l-lg border transition-all ${
                hasNext
                  ? 'border-slate-700 hover:border-slate-600 hover:bg-slate-800/50 text-slate-300 hover:text-white'
                  : 'border-slate-800 text-slate-700 cursor-not-allowed'
              }`}
              disabled={!hasNext}
              onClick={onNext}
            >
              <ChevronLeft className="h-4 w-4" />
              <span className="text-sm font-medium">Previous</span>
            </button>

            {/* Current position */}
            <div className="flex items-center gap-3 px-5 py-2 bg-slate-800/80 border-y border-slate-700">
              <span className="text-sm font-mono text-white">
                {snapshotIndex + 1}
              </span>
              <span className="text-slate-600">/</span>
              <span className="text-sm font-mono text-slate-500">
                {totalSnapshots}
              </span>
            </div>

            {/* Next button (go forward/right on timeline) */}
            <button
              className={`group flex items-center gap-2 px-4 py-2 rounded-r-lg border transition-all ${
                hasPrevious
                  ? 'border-slate-700 hover:border-slate-600 hover:bg-slate-800/50 text-slate-300 hover:text-white'
                  : 'border-slate-800 text-slate-700 cursor-not-allowed'
              }`}
              disabled={!hasPrevious}
              onClick={onPrevious}
            >
              <span className="text-sm font-medium">Next</span>
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2">
            {/* Filter toggle */}
            <button
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-all ${
                showChangedOnly
                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                  : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'
              }`}
              onClick={onToggleChangedOnly}
            >
              <Filter className="h-3.5 w-3.5" />
              <span>{changedCount}</span>
            </button>

            {/* Divider */}
            <div className="w-px h-6 bg-slate-700" />

            {/* Exit - Prominent */}
            <Button
              size="default"
              className="h-10 px-5 bg-white hover:bg-slate-100 text-slate-900 font-semibold shadow-lg border-0"
              onClick={onExit}
            >
              <X className="h-4 w-4 mr-2" />
              Exit Playback
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * @fileoverview Column Pinning Feature
 *
 * Allows pinning columns to the left or right edge of the grid.
 * Pinned columns stay visible while scrolling horizontally.
 *
 * @module grid/features/ColumnPinning
 */

import { useState, useCallback, useMemo } from 'react';
import { Pin, PinOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import type { ColumnDef, ColumnPinPosition } from '../types';

// =============================================================================
// TYPES
// =============================================================================

export interface UseColumnPinningOptions {
  /** Column definitions */
  columns: ColumnDef<unknown>[];

  /** Initial pinned state */
  initialPinned?: Record<string, ColumnPinPosition>;

  /** Called when pinning changes */
  onPinChange?: (columnId: string, position: ColumnPinPosition) => void;
}

export interface UseColumnPinningReturn {
  /** Current pinned state */
  pinnedColumns: Record<string, ColumnPinPosition>;

  /** Pin a column */
  pinColumn: (columnId: string, position: ColumnPinPosition) => void;

  /** Unpin a column */
  unpinColumn: (columnId: string) => void;

  /** Check if column is pinned */
  isColumnPinned: (columnId: string) => boolean;

  /** Get pin position for column */
  getPinPosition: (columnId: string) => ColumnPinPosition;

  /** Get columns split by pin position */
  getColumnsByPosition: () => {
    left: ColumnDef<unknown>[];
    center: ColumnDef<unknown>[];
    right: ColumnDef<unknown>[];
  };

  /** Calculate left offset for pinned columns */
  getLeftPinnedWidth: () => number;

  /** Calculate right offset for pinned columns */
  getRightPinnedWidth: () => number;
}

// =============================================================================
// HOOK
// =============================================================================

/**
 * Hook for managing column pinning state
 */
export function useColumnPinning({
  columns,
  initialPinned = {},
  onPinChange,
}: UseColumnPinningOptions): UseColumnPinningReturn {
  // Merge initial pinned from column definitions
  const getInitialPinned = useCallback(() => {
    const pinned: Record<string, ColumnPinPosition> = { ...initialPinned };
    columns.forEach((col) => {
      if (col.pinned && pinned[col.id] === undefined) {
        pinned[col.id] = col.pinned;
      }
    });
    return pinned;
  }, [columns, initialPinned]);

  const [pinnedColumns, setPinnedColumns] = useState<Record<string, ColumnPinPosition>>(getInitialPinned);

  const pinColumn = useCallback((columnId: string, position: ColumnPinPosition) => {
    setPinnedColumns((prev) => ({
      ...prev,
      [columnId]: position,
    }));
    onPinChange?.(columnId, position);
  }, [onPinChange]);

  const unpinColumn = useCallback((columnId: string) => {
    setPinnedColumns((prev) => {
      const next = { ...prev };
      delete next[columnId];
      return next;
    });
    onPinChange?.(columnId, null);
  }, [onPinChange]);

  const isColumnPinned = useCallback((columnId: string) => {
    return pinnedColumns[columnId] !== undefined && pinnedColumns[columnId] !== null;
  }, [pinnedColumns]);

  const getPinPosition = useCallback((columnId: string) => {
    return pinnedColumns[columnId] ?? null;
  }, [pinnedColumns]);

  const getColumnsByPosition = useCallback(() => {
    const left: ColumnDef<unknown>[] = [];
    const center: ColumnDef<unknown>[] = [];
    const right: ColumnDef<unknown>[] = [];

    columns.forEach((col) => {
      const position = pinnedColumns[col.id];
      if (position === 'left') {
        left.push(col);
      } else if (position === 'right') {
        right.push(col);
      } else {
        center.push(col);
      }
    });

    return { left, center, right };
  }, [columns, pinnedColumns]);

  const getLeftPinnedWidth = useCallback(() => {
    return columns
      .filter((col) => pinnedColumns[col.id] === 'left')
      .reduce((sum, col) => sum + (typeof col.width === 'number' ? col.width : 150), 0);
  }, [columns, pinnedColumns]);

  const getRightPinnedWidth = useCallback(() => {
    return columns
      .filter((col) => pinnedColumns[col.id] === 'right')
      .reduce((sum, col) => sum + (typeof col.width === 'number' ? col.width : 150), 0);
  }, [columns, pinnedColumns]);

  return {
    pinnedColumns,
    pinColumn,
    unpinColumn,
    isColumnPinned,
    getPinPosition,
    getColumnsByPosition,
    getLeftPinnedWidth,
    getRightPinnedWidth,
  };
}

// =============================================================================
// COMPONENTS
// =============================================================================

interface ColumnPinButtonProps {
  columnId: string;
  currentPosition: ColumnPinPosition;
  onPin: (position: ColumnPinPosition) => void;
  onUnpin: () => void;
}

/**
 * Pin/unpin button for column header
 */
export function ColumnPinButton({
  columnId,
  currentPosition,
  onPin,
  onUnpin,
}: ColumnPinButtonProps) {
  const isPinned = currentPosition !== null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            'h-6 w-6 p-0',
            isPinned && 'text-primary'
          )}
        >
          {isPinned ? (
            <Pin className="h-3 w-3 fill-current" />
          ) : (
            <Pin className="h-3 w-3" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuItem
          onClick={() => onPin('left')}
          className={cn(currentPosition === 'left' && 'bg-muted')}
        >
          <Pin className="h-4 w-4 mr-2 -rotate-90" />
          Pin to Left
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => onPin('right')}
          className={cn(currentPosition === 'right' && 'bg-muted')}
        >
          <Pin className="h-4 w-4 mr-2 rotate-90" />
          Pin to Right
        </DropdownMenuItem>
        {isPinned && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onUnpin}>
              <PinOff className="h-4 w-4 mr-2" />
              Unpin
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/**
 * Get styles for pinned columns
 */
export function getPinnedColumnStyles(
  position: ColumnPinPosition,
  leftOffset: number,
  rightOffset: number
): React.CSSProperties {
  if (position === 'left') {
    return {
      position: 'sticky',
      left: leftOffset,
      zIndex: 1,
      backgroundColor: 'inherit',
    };
  }

  if (position === 'right') {
    return {
      position: 'sticky',
      right: rightOffset,
      zIndex: 1,
      backgroundColor: 'inherit',
    };
  }

  return {};
}

export default ColumnPinButton;

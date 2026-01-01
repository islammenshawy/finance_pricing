/**
 * @fileoverview Range Selection Feature
 *
 * Excel-like range selection for grid cells.
 * Features:
 * - Click and drag to select cell ranges
 * - Shift+click to extend selection
 * - Ctrl/Cmd+click for multi-range selection
 * - Keyboard navigation (arrow keys, Shift+arrows)
 * - Copy selected range to clipboard
 *
 * @module grid/features/RangeSelection
 */

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { cn } from '@/lib/utils';

// =============================================================================
// TYPES
// =============================================================================

export interface CellPosition {
  rowIndex: number;
  columnIndex: number;
}

export interface CellRange {
  start: CellPosition;
  end: CellPosition;
}

export interface UseRangeSelectionOptions {
  /** Total number of rows */
  rowCount: number;

  /** Total number of columns */
  columnCount: number;

  /** Called when selection changes */
  onSelectionChange?: (ranges: CellRange[]) => void;

  /** Called when cells are copied */
  onCopy?: (ranges: CellRange[]) => void;

  /** Enable multi-range selection with Ctrl/Cmd */
  enableMultiRange?: boolean;

  /** Enable range selection */
  enabled?: boolean;
}

export interface UseRangeSelectionReturn {
  /** Currently selected ranges */
  selectedRanges: CellRange[];

  /** Active cell (focus) */
  activeCell: CellPosition | null;

  /** Whether currently dragging */
  isDragging: boolean;

  /** Check if cell is in selection */
  isCellSelected: (rowIndex: number, columnIndex: number) => boolean;

  /** Check if cell is the active cell */
  isCellActive: (rowIndex: number, columnIndex: number) => boolean;

  /** Get selection state for styling */
  getCellSelectionState: (rowIndex: number, columnIndex: number) => CellSelectionState;

  /** Handle mouse down on cell */
  handleCellMouseDown: (rowIndex: number, columnIndex: number, event: React.MouseEvent) => void;

  /** Handle mouse enter on cell (during drag) */
  handleCellMouseEnter: (rowIndex: number, columnIndex: number) => void;

  /** Handle mouse up */
  handleMouseUp: () => void;

  /** Handle keyboard navigation */
  handleKeyDown: (event: React.KeyboardEvent) => void;

  /** Clear selection */
  clearSelection: () => void;

  /** Select all cells */
  selectAll: () => void;

  /** Get selected cell values */
  getSelectedCells: () => CellPosition[];

  /** Copy selection to clipboard */
  copyToClipboard: <TRow>(
    data: TRow[],
    columns: { accessor?: (row: TRow) => unknown }[]
  ) => void;
}

export interface CellSelectionState {
  isSelected: boolean;
  isActive: boolean;
  isRangeStart: boolean;
  isRangeEnd: boolean;
  isTopEdge: boolean;
  isBottomEdge: boolean;
  isLeftEdge: boolean;
  isRightEdge: boolean;
}

// =============================================================================
// UTILITIES
// =============================================================================

function normalizeRange(range: CellRange): CellRange {
  return {
    start: {
      rowIndex: Math.min(range.start.rowIndex, range.end.rowIndex),
      columnIndex: Math.min(range.start.columnIndex, range.end.columnIndex),
    },
    end: {
      rowIndex: Math.max(range.start.rowIndex, range.end.rowIndex),
      columnIndex: Math.max(range.start.columnIndex, range.end.columnIndex),
    },
  };
}

function isCellInRange(
  rowIndex: number,
  columnIndex: number,
  range: CellRange
): boolean {
  const normalized = normalizeRange(range);
  return (
    rowIndex >= normalized.start.rowIndex &&
    rowIndex <= normalized.end.rowIndex &&
    columnIndex >= normalized.start.columnIndex &&
    columnIndex <= normalized.end.columnIndex
  );
}

function isCellInRanges(
  rowIndex: number,
  columnIndex: number,
  ranges: CellRange[]
): boolean {
  return ranges.some((range) => isCellInRange(rowIndex, columnIndex, range));
}

// =============================================================================
// HOOK
// =============================================================================

export function useRangeSelection({
  rowCount,
  columnCount,
  onSelectionChange,
  onCopy,
  enableMultiRange = true,
  enabled = true,
}: UseRangeSelectionOptions): UseRangeSelectionReturn {
  const [selectedRanges, setSelectedRanges] = useState<CellRange[]>([]);
  const [activeCell, setActiveCell] = useState<CellPosition | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<CellPosition | null>(null);

  // Update callback when selection changes
  useEffect(() => {
    onSelectionChange?.(selectedRanges);
  }, [selectedRanges, onSelectionChange]);

  const isCellSelected = useCallback(
    (rowIndex: number, columnIndex: number) => {
      if (!enabled) return false;
      return isCellInRanges(rowIndex, columnIndex, selectedRanges);
    },
    [selectedRanges, enabled]
  );

  const isCellActive = useCallback(
    (rowIndex: number, columnIndex: number) => {
      if (!enabled || !activeCell) return false;
      return activeCell.rowIndex === rowIndex && activeCell.columnIndex === columnIndex;
    },
    [activeCell, enabled]
  );

  const getCellSelectionState = useCallback(
    (rowIndex: number, columnIndex: number): CellSelectionState => {
      if (!enabled) {
        return {
          isSelected: false,
          isActive: false,
          isRangeStart: false,
          isRangeEnd: false,
          isTopEdge: false,
          isBottomEdge: false,
          isLeftEdge: false,
          isRightEdge: false,
        };
      }

      const isSelected = isCellInRanges(rowIndex, columnIndex, selectedRanges);
      const isActive = activeCell?.rowIndex === rowIndex && activeCell?.columnIndex === columnIndex;

      // Check edges for border styling
      let isTopEdge = false;
      let isBottomEdge = false;
      let isLeftEdge = false;
      let isRightEdge = false;
      let isRangeStart = false;
      let isRangeEnd = false;

      if (isSelected) {
        for (const range of selectedRanges) {
          const normalized = normalizeRange(range);
          if (isCellInRange(rowIndex, columnIndex, normalized)) {
            // Check if this cell is at the edge of this range
            if (rowIndex === normalized.start.rowIndex) isTopEdge = true;
            if (rowIndex === normalized.end.rowIndex) isBottomEdge = true;
            if (columnIndex === normalized.start.columnIndex) isLeftEdge = true;
            if (columnIndex === normalized.end.columnIndex) isRightEdge = true;

            // Check if range start/end
            if (
              rowIndex === range.start.rowIndex &&
              columnIndex === range.start.columnIndex
            ) {
              isRangeStart = true;
            }
            if (
              rowIndex === range.end.rowIndex &&
              columnIndex === range.end.columnIndex
            ) {
              isRangeEnd = true;
            }
          }
        }
      }

      return {
        isSelected,
        isActive,
        isRangeStart,
        isRangeEnd,
        isTopEdge,
        isBottomEdge,
        isLeftEdge,
        isRightEdge,
      };
    },
    [selectedRanges, activeCell, enabled]
  );

  const handleCellMouseDown = useCallback(
    (rowIndex: number, columnIndex: number, event: React.MouseEvent) => {
      if (!enabled) return;

      const position: CellPosition = { rowIndex, columnIndex };
      setActiveCell(position);
      dragStartRef.current = position;
      setIsDragging(true);

      if (event.shiftKey && activeCell) {
        // Extend selection from active cell
        const newRange: CellRange = { start: activeCell, end: position };
        if (event.ctrlKey || event.metaKey) {
          setSelectedRanges((prev) => [...prev, newRange]);
        } else {
          setSelectedRanges([newRange]);
        }
      } else if ((event.ctrlKey || event.metaKey) && enableMultiRange) {
        // Add new range (multi-select)
        setSelectedRanges((prev) => [...prev, { start: position, end: position }]);
      } else {
        // Start new selection
        setSelectedRanges([{ start: position, end: position }]);
      }
    },
    [enabled, activeCell, enableMultiRange]
  );

  const handleCellMouseEnter = useCallback(
    (rowIndex: number, columnIndex: number) => {
      if (!enabled || !isDragging || !dragStartRef.current) return;

      const position: CellPosition = { rowIndex, columnIndex };

      setSelectedRanges((prev) => {
        if (prev.length === 0) return prev;
        const newRanges = [...prev];
        newRanges[newRanges.length - 1] = {
          start: dragStartRef.current!,
          end: position,
        };
        return newRanges;
      });
    },
    [enabled, isDragging]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    dragStartRef.current = null;
  }, []);

  // Global mouse up listener
  useEffect(() => {
    if (!isDragging) return;

    const handleGlobalMouseUp = () => {
      setIsDragging(false);
      dragStartRef.current = null;
    };

    document.addEventListener('mouseup', handleGlobalMouseUp);
    return () => document.removeEventListener('mouseup', handleGlobalMouseUp);
  }, [isDragging]);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (!enabled || !activeCell) return;

      const { key, shiftKey, ctrlKey, metaKey } = event;

      // Copy: Ctrl/Cmd + C
      if ((ctrlKey || metaKey) && key === 'c') {
        onCopy?.(selectedRanges);
        return;
      }

      // Select all: Ctrl/Cmd + A
      if ((ctrlKey || metaKey) && key === 'a') {
        event.preventDefault();
        setSelectedRanges([
          {
            start: { rowIndex: 0, columnIndex: 0 },
            end: { rowIndex: rowCount - 1, columnIndex: columnCount - 1 },
          },
        ]);
        return;
      }

      // Arrow key navigation
      let newRow = activeCell.rowIndex;
      let newCol = activeCell.columnIndex;

      switch (key) {
        case 'ArrowUp':
          newRow = Math.max(0, newRow - 1);
          break;
        case 'ArrowDown':
          newRow = Math.min(rowCount - 1, newRow + 1);
          break;
        case 'ArrowLeft':
          newCol = Math.max(0, newCol - 1);
          break;
        case 'ArrowRight':
          newCol = Math.min(columnCount - 1, newCol + 1);
          break;
        case 'Home':
          if (ctrlKey || metaKey) {
            newRow = 0;
          }
          newCol = 0;
          break;
        case 'End':
          if (ctrlKey || metaKey) {
            newRow = rowCount - 1;
          }
          newCol = columnCount - 1;
          break;
        case 'Escape':
          setSelectedRanges([]);
          setActiveCell(null);
          return;
        default:
          return;
      }

      event.preventDefault();

      const newPosition: CellPosition = { rowIndex: newRow, columnIndex: newCol };
      setActiveCell(newPosition);

      if (shiftKey) {
        // Extend selection
        setSelectedRanges((prev) => {
          if (prev.length === 0) {
            return [{ start: activeCell, end: newPosition }];
          }
          const newRanges = [...prev];
          newRanges[newRanges.length - 1] = {
            ...newRanges[newRanges.length - 1],
            end: newPosition,
          };
          return newRanges;
        });
      } else {
        // Move selection
        setSelectedRanges([{ start: newPosition, end: newPosition }]);
      }
    },
    [enabled, activeCell, rowCount, columnCount, selectedRanges, onCopy]
  );

  const clearSelection = useCallback(() => {
    setSelectedRanges([]);
    setActiveCell(null);
  }, []);

  const selectAll = useCallback(() => {
    if (!enabled || rowCount === 0 || columnCount === 0) return;
    setSelectedRanges([
      {
        start: { rowIndex: 0, columnIndex: 0 },
        end: { rowIndex: rowCount - 1, columnIndex: columnCount - 1 },
      },
    ]);
    setActiveCell({ rowIndex: 0, columnIndex: 0 });
  }, [enabled, rowCount, columnCount]);

  const getSelectedCells = useCallback((): CellPosition[] => {
    const cells: CellPosition[] = [];
    const seen = new Set<string>();

    for (const range of selectedRanges) {
      const normalized = normalizeRange(range);
      for (let row = normalized.start.rowIndex; row <= normalized.end.rowIndex; row++) {
        for (let col = normalized.start.columnIndex; col <= normalized.end.columnIndex; col++) {
          const key = `${row}:${col}`;
          if (!seen.has(key)) {
            seen.add(key);
            cells.push({ rowIndex: row, columnIndex: col });
          }
        }
      }
    }

    return cells;
  }, [selectedRanges]);

  const copyToClipboard = useCallback(
    <TRow,>(
      data: TRow[],
      columns: { accessor?: (row: TRow) => unknown }[]
    ) => {
      if (selectedRanges.length === 0) return;

      const lines: string[] = [];

      // Get the bounds of all selected ranges
      for (const range of selectedRanges) {
        const normalized = normalizeRange(range);
        for (let row = normalized.start.rowIndex; row <= normalized.end.rowIndex; row++) {
          const rowData = data[row];
          if (!rowData) continue;

          const cells: string[] = [];
          for (let col = normalized.start.columnIndex; col <= normalized.end.columnIndex; col++) {
            const column = columns[col];
            if (!column) continue;

            const value = column.accessor ? column.accessor(rowData) : '';
            cells.push(String(value ?? ''));
          }
          lines.push(cells.join('\t'));
        }
      }

      const text = lines.join('\n');
      navigator.clipboard.writeText(text);
      onCopy?.(selectedRanges);
    },
    [selectedRanges, onCopy]
  );

  return {
    selectedRanges,
    activeCell,
    isDragging,
    isCellSelected,
    isCellActive,
    getCellSelectionState,
    handleCellMouseDown,
    handleCellMouseEnter,
    handleMouseUp,
    handleKeyDown,
    clearSelection,
    selectAll,
    getSelectedCells,
    copyToClipboard,
  };
}

// =============================================================================
// COMPONENTS
// =============================================================================

interface SelectionOverlayProps {
  selectionState: CellSelectionState;
  className?: string;
}

/**
 * Overlay component for cell selection styling
 */
export function SelectionOverlay({
  selectionState,
  className,
}: SelectionOverlayProps) {
  if (!selectionState.isSelected) return null;

  return (
    <div
      className={cn(
        'absolute inset-0 pointer-events-none',
        'bg-primary/10',
        selectionState.isActive && 'ring-2 ring-primary ring-inset',
        className
      )}
      style={{
        borderTop: selectionState.isTopEdge ? '2px solid hsl(var(--primary))' : undefined,
        borderBottom: selectionState.isBottomEdge ? '2px solid hsl(var(--primary))' : undefined,
        borderLeft: selectionState.isLeftEdge ? '2px solid hsl(var(--primary))' : undefined,
        borderRight: selectionState.isRightEdge ? '2px solid hsl(var(--primary))' : undefined,
      }}
    />
  );
}

/**
 * Get cell className based on selection state
 */
export function getSelectionClassName(state: CellSelectionState): string {
  return cn(
    state.isSelected && 'bg-primary/5',
    state.isActive && 'ring-2 ring-primary ring-inset z-10'
  );
}

/**
 * Get cell styles based on selection state
 */
export function getSelectionStyles(state: CellSelectionState): React.CSSProperties {
  if (!state.isSelected) return {};

  return {
    borderTopWidth: state.isTopEdge ? 2 : undefined,
    borderBottomWidth: state.isBottomEdge ? 2 : undefined,
    borderLeftWidth: state.isLeftEdge ? 2 : undefined,
    borderRightWidth: state.isRightEdge ? 2 : undefined,
    borderColor: state.isSelected ? 'hsl(var(--primary))' : undefined,
    borderStyle: 'solid',
  };
}

export default useRangeSelection;

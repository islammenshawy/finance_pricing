/**
 * @fileoverview Grid Keyboard Navigation Hook
 *
 * Provides keyboard navigation for the DataGrid component.
 *
 * ## Keyboard Mappings
 *
 * | Key | Action |
 * |-----|--------|
 * | `↑` Arrow Up | Move focus to row above |
 * | `↓` Arrow Down | Move focus to row below |
 * | `←` Arrow Left | Move focus to cell left (cell mode) |
 * | `→` Arrow Right | Move focus to cell right (cell mode) |
 * | `Tab` | Move to next cell/row |
 * | `Shift+Tab` | Move to previous cell/row |
 * | `Enter` | Expand row / Start editing / Select row |
 * | `Escape` | Collapse row / Cancel editing |
 * | `Space` | Toggle row selection |
 * | `Home` | Go to first row |
 * | `End` | Go to last row |
 * | `Ctrl+Home` | Go to first cell |
 * | `Ctrl+End` | Go to last cell |
 * | `Page Up` | Scroll up one page |
 * | `Page Down` | Scroll down one page |
 * | `Ctrl+A` | Select all rows (multi-select mode) |
 *
 * @example
 * ```tsx
 * const { focusedRowIndex, focusedColIndex, handleKeyDown } = useGridKeyboard({
 *   rowCount: data.length,
 *   columnCount: columns.length,
 *   onRowSelect: handleSelect,
 *   onRowExpand: handleExpand,
 * });
 * ```
 */

import { useState, useCallback, useRef, useEffect } from 'react';

export interface GridKeyboardOptions<TRow> {
  /** Total number of rows */
  rowCount: number;

  /** Total number of columns */
  columnCount: number;

  /** Enable keyboard navigation */
  enabled?: boolean;

  /**
   * Tab navigation behavior
   * - 'cell': Tab moves between cells
   * - 'row': Tab moves between rows
   * @default 'row'
   */
  tabBehavior?: 'cell' | 'row';

  /** Callback when row should be selected */
  onRowSelect?: (rowIndex: number) => void;

  /** Callback to select all rows */
  onSelectAll?: () => void;

  /** Callback when row should be expanded/collapsed */
  onRowExpand?: (rowIndex: number) => void;

  /** Callback when cell editing should start */
  onCellEdit?: (rowIndex: number, colIndex: number) => void;

  /** Callback when editing should be cancelled */
  onEditCancel?: () => void;

  /** Get row data by index */
  getRowByIndex?: (index: number) => TRow | undefined;

  /** Selection mode */
  selectionMode?: 'none' | 'single' | 'multiple';

  /** Reference to the scroll container */
  containerRef?: React.RefObject<HTMLDivElement>;

  /** Row height for scroll calculations */
  rowHeight?: number;

  /** Visible rows count for page up/down */
  visibleRowCount?: number;
}

export interface GridKeyboardState {
  /** Currently focused row index (-1 if none) */
  focusedRowIndex: number;

  /** Currently focused column index (-1 if none) */
  focusedColIndex: number;

  /** Whether a cell is being edited */
  isEditing: boolean;
}

export interface GridKeyboardReturn extends GridKeyboardState {
  /** Handle keydown event on the grid container */
  handleKeyDown: (event: React.KeyboardEvent) => void;

  /** Set focused row programmatically */
  setFocusedRow: (index: number) => void;

  /** Set focused cell programmatically */
  setFocusedCell: (rowIndex: number, colIndex: number) => void;

  /** Clear focus */
  clearFocus: () => void;

  /** Start editing mode */
  startEditing: () => void;

  /** Stop editing mode */
  stopEditing: () => void;

  /** Check if a specific row is focused */
  isRowFocused: (rowIndex: number) => boolean;

  /** Check if a specific cell is focused */
  isCellFocused: (rowIndex: number, colIndex: number) => boolean;

  /** Get props to spread on a row element */
  getRowProps: (rowIndex: number) => {
    tabIndex: number;
    'aria-selected': boolean;
    'data-focused': boolean;
    onFocus: () => void;
  };
}

/**
 * Hook for grid keyboard navigation
 */
export function useGridKeyboard<TRow>({
  rowCount,
  columnCount,
  enabled = true,
  tabBehavior = 'row',
  onRowSelect,
  onSelectAll,
  onRowExpand,
  onCellEdit,
  onEditCancel,
  selectionMode = 'none',
  containerRef,
  rowHeight = 44,
  visibleRowCount = 10,
}: GridKeyboardOptions<TRow>): GridKeyboardReturn {
  const [focusedRowIndex, setFocusedRowIndex] = useState(-1);
  const [focusedColIndex, setFocusedColIndex] = useState(-1);
  const [isEditing, setIsEditing] = useState(false);

  // Keep track of last focused element for restoration
  const lastFocusedRef = useRef<{ row: number; col: number }>({ row: -1, col: -1 });

  // Scroll row into view
  const scrollToRow = useCallback(
    (rowIndex: number) => {
      if (!containerRef?.current) return;

      const container = containerRef.current;
      const rowTop = rowIndex * rowHeight;
      const rowBottom = rowTop + rowHeight;
      const scrollTop = container.scrollTop;
      const viewportHeight = container.clientHeight;

      if (rowTop < scrollTop) {
        container.scrollTop = rowTop;
      } else if (rowBottom > scrollTop + viewportHeight) {
        container.scrollTop = rowBottom - viewportHeight;
      }
    },
    [containerRef, rowHeight]
  );

  // Move focus to a specific row
  const setFocusedRow = useCallback(
    (index: number) => {
      if (index < 0) index = 0;
      if (index >= rowCount) index = rowCount - 1;
      if (index < 0) return; // Empty grid

      setFocusedRowIndex(index);
      lastFocusedRef.current.row = index;
      scrollToRow(index);
    },
    [rowCount, scrollToRow]
  );

  // Move focus to a specific cell
  const setFocusedCell = useCallback(
    (rowIndex: number, colIndex: number) => {
      if (rowIndex < 0) rowIndex = 0;
      if (rowIndex >= rowCount) rowIndex = rowCount - 1;
      if (colIndex < 0) colIndex = 0;
      if (colIndex >= columnCount) colIndex = columnCount - 1;
      if (rowIndex < 0 || colIndex < 0) return;

      setFocusedRowIndex(rowIndex);
      setFocusedColIndex(colIndex);
      lastFocusedRef.current = { row: rowIndex, col: colIndex };
      scrollToRow(rowIndex);
    },
    [rowCount, columnCount, scrollToRow]
  );

  // Clear focus
  const clearFocus = useCallback(() => {
    setFocusedRowIndex(-1);
    setFocusedColIndex(-1);
    setIsEditing(false);
  }, []);

  // Start/stop editing
  const startEditing = useCallback(() => setIsEditing(true), []);
  const stopEditing = useCallback(() => setIsEditing(false), []);

  // Handle keyboard events
  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (!enabled) return;

      const { key, ctrlKey, metaKey, shiftKey } = event;
      const isCtrl = ctrlKey || metaKey;

      // If editing, only handle Escape
      if (isEditing) {
        if (key === 'Escape') {
          event.preventDefault();
          setIsEditing(false);
          onEditCancel?.();
        }
        return;
      }

      // Initialize focus if not set
      if (focusedRowIndex === -1 && rowCount > 0) {
        if (['ArrowDown', 'ArrowUp', 'Home', 'End', 'Enter', ' '].includes(key)) {
          event.preventDefault();
          setFocusedRow(0);
          return;
        }
      }

      switch (key) {
        case 'ArrowDown':
          event.preventDefault();
          setFocusedRow(focusedRowIndex + 1);
          break;

        case 'ArrowUp':
          event.preventDefault();
          setFocusedRow(focusedRowIndex - 1);
          break;

        case 'ArrowRight':
          event.preventDefault();
          if (tabBehavior === 'cell') {
            setFocusedCell(focusedRowIndex, focusedColIndex + 1);
          }
          break;

        case 'ArrowLeft':
          event.preventDefault();
          if (tabBehavior === 'cell') {
            setFocusedCell(focusedRowIndex, focusedColIndex - 1);
          }
          break;

        case 'Tab':
          event.preventDefault();
          if (tabBehavior === 'cell') {
            if (shiftKey) {
              // Previous cell
              if (focusedColIndex > 0) {
                setFocusedCell(focusedRowIndex, focusedColIndex - 1);
              } else if (focusedRowIndex > 0) {
                setFocusedCell(focusedRowIndex - 1, columnCount - 1);
              }
            } else {
              // Next cell
              if (focusedColIndex < columnCount - 1) {
                setFocusedCell(focusedRowIndex, focusedColIndex + 1);
              } else if (focusedRowIndex < rowCount - 1) {
                setFocusedCell(focusedRowIndex + 1, 0);
              }
            }
          } else {
            // Row mode
            if (shiftKey) {
              setFocusedRow(focusedRowIndex - 1);
            } else {
              setFocusedRow(focusedRowIndex + 1);
            }
          }
          break;

        case 'Enter':
          event.preventDefault();
          if (tabBehavior === 'cell' && focusedColIndex >= 0) {
            // Start editing cell
            setIsEditing(true);
            onCellEdit?.(focusedRowIndex, focusedColIndex);
          } else {
            // Expand/collapse row or select
            onRowExpand?.(focusedRowIndex);
          }
          break;

        case ' ': // Space
          event.preventDefault();
          if (selectionMode !== 'none') {
            onRowSelect?.(focusedRowIndex);
          }
          break;

        case 'Escape':
          event.preventDefault();
          if (isEditing) {
            setIsEditing(false);
            onEditCancel?.();
          } else {
            clearFocus();
          }
          break;

        case 'Home':
          event.preventDefault();
          if (isCtrl && tabBehavior === 'cell') {
            setFocusedCell(0, 0);
          } else {
            setFocusedRow(0);
          }
          break;

        case 'End':
          event.preventDefault();
          if (isCtrl && tabBehavior === 'cell') {
            setFocusedCell(rowCount - 1, columnCount - 1);
          } else {
            setFocusedRow(rowCount - 1);
          }
          break;

        case 'PageUp':
          event.preventDefault();
          setFocusedRow(Math.max(0, focusedRowIndex - visibleRowCount));
          break;

        case 'PageDown':
          event.preventDefault();
          setFocusedRow(Math.min(rowCount - 1, focusedRowIndex + visibleRowCount));
          break;

        case 'a':
        case 'A':
          if (isCtrl && selectionMode === 'multiple') {
            event.preventDefault();
            onSelectAll?.();
          }
          break;
      }
    },
    [
      enabled,
      isEditing,
      focusedRowIndex,
      focusedColIndex,
      rowCount,
      columnCount,
      tabBehavior,
      selectionMode,
      visibleRowCount,
      setFocusedRow,
      setFocusedCell,
      clearFocus,
      onRowSelect,
      onSelectAll,
      onRowExpand,
      onCellEdit,
      onEditCancel,
    ]
  );

  // Check focus states
  const isRowFocused = useCallback(
    (rowIndex: number) => focusedRowIndex === rowIndex,
    [focusedRowIndex]
  );

  const isCellFocused = useCallback(
    (rowIndex: number, colIndex: number) =>
      focusedRowIndex === rowIndex && focusedColIndex === colIndex,
    [focusedRowIndex, focusedColIndex]
  );

  // Get props to spread on row elements
  const getRowProps = useCallback(
    (rowIndex: number) => ({
      tabIndex: rowIndex === focusedRowIndex ? 0 : -1,
      'aria-selected': rowIndex === focusedRowIndex,
      'data-focused': rowIndex === focusedRowIndex,
      onFocus: () => setFocusedRow(rowIndex),
    }),
    [focusedRowIndex, setFocusedRow]
  );

  return {
    focusedRowIndex,
    focusedColIndex,
    isEditing,
    handleKeyDown,
    setFocusedRow,
    setFocusedCell,
    clearFocus,
    startEditing,
    stopEditing,
    isRowFocused,
    isCellFocused,
    getRowProps,
  };
}

export default useGridKeyboard;

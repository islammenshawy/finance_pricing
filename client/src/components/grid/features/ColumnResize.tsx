/**
 * @fileoverview Column Resize Feature
 *
 * Provides drag-to-resize functionality for grid columns.
 * Supports min/max width constraints and resize events.
 *
 * @module grid/features/ColumnResize
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';

// =============================================================================
// TYPES
// =============================================================================

export interface ColumnResizeProps {
  /** Column ID being resized */
  columnId: string;

  /** Current column width */
  currentWidth: number;

  /** Minimum allowed width */
  minWidth?: number;

  /** Maximum allowed width */
  maxWidth?: number;

  /** Called during resize with new width */
  onResize: (columnId: string, width: number) => void;

  /** Called when resize completes */
  onResizeEnd?: (columnId: string, width: number) => void;

  /** Disabled state */
  disabled?: boolean;
}

export interface UseColumnResizeOptions {
  /** Initial column widths */
  initialWidths?: Record<string, number>;

  /** Column definitions with min/max constraints */
  columns: Array<{
    id: string;
    width?: number | string;
    minWidth?: number;
    maxWidth?: number;
    resizable?: boolean;
  }>;

  /** Called when any column width changes */
  onColumnResize?: (columnId: string, width: number) => void;
}

export interface UseColumnResizeReturn {
  /** Current column widths */
  columnWidths: Record<string, number>;

  /** Update a single column width */
  setColumnWidth: (columnId: string, width: number) => void;

  /** Reset all widths to initial values */
  resetWidths: () => void;

  /** Get props for resize handle */
  getResizeHandleProps: (columnId: string) => ColumnResizeProps;
}

// =============================================================================
// HOOK
// =============================================================================

/**
 * Hook for managing column resize state
 */
export function useColumnResize({
  initialWidths = {},
  columns,
  onColumnResize,
}: UseColumnResizeOptions): UseColumnResizeReturn {
  // Calculate initial widths from column definitions
  const getInitialWidths = useCallback(() => {
    const widths: Record<string, number> = { ...initialWidths };

    columns.forEach((col) => {
      if (widths[col.id] === undefined) {
        if (typeof col.width === 'number') {
          widths[col.id] = col.width;
        } else {
          // Default width for flexible columns
          widths[col.id] = 150;
        }
      }
    });

    return widths;
  }, [columns, initialWidths]);

  const [columnWidths, setColumnWidths] = useState<Record<string, number>>(getInitialWidths);

  const setColumnWidth = useCallback((columnId: string, width: number) => {
    const column = columns.find((c) => c.id === columnId);
    const minWidth = column?.minWidth ?? 50;
    const maxWidth = column?.maxWidth ?? 1000;

    const constrainedWidth = Math.max(minWidth, Math.min(maxWidth, width));

    setColumnWidths((prev) => ({
      ...prev,
      [columnId]: constrainedWidth,
    }));

    onColumnResize?.(columnId, constrainedWidth);
  }, [columns, onColumnResize]);

  const resetWidths = useCallback(() => {
    setColumnWidths(getInitialWidths());
  }, [getInitialWidths]);

  const getResizeHandleProps = useCallback((columnId: string): ColumnResizeProps => {
    const column = columns.find((c) => c.id === columnId);
    return {
      columnId,
      currentWidth: columnWidths[columnId] ?? 150,
      minWidth: column?.minWidth ?? 50,
      maxWidth: column?.maxWidth ?? 1000,
      onResize: setColumnWidth,
      disabled: column?.resizable === false,
    };
  }, [columns, columnWidths, setColumnWidth]);

  return {
    columnWidths,
    setColumnWidth,
    resetWidths,
    getResizeHandleProps,
  };
}

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * Draggable resize handle for column headers
 */
export function ColumnResizeHandle({
  columnId,
  currentWidth,
  minWidth = 50,
  maxWidth = 1000,
  onResize,
  onResizeEnd,
  disabled = false,
}: ColumnResizeProps) {
  const [isDragging, setIsDragging] = useState(false);
  const startXRef = useRef(0);
  const startWidthRef = useRef(0);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (disabled) return;

    e.preventDefault();
    e.stopPropagation();

    setIsDragging(true);
    startXRef.current = e.clientX;
    startWidthRef.current = currentWidth;
  }, [disabled, currentWidth]);

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const delta = e.clientX - startXRef.current;
      const newWidth = Math.max(minWidth, Math.min(maxWidth, startWidthRef.current + delta));
      onResize(columnId, newWidth);
    };

    const handleMouseUp = (e: MouseEvent) => {
      setIsDragging(false);
      const delta = e.clientX - startXRef.current;
      const finalWidth = Math.max(minWidth, Math.min(maxWidth, startWidthRef.current + delta));
      onResizeEnd?.(columnId, finalWidth);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, columnId, minWidth, maxWidth, onResize, onResizeEnd]);

  if (disabled) return null;

  return (
    <div
      className={cn(
        'absolute right-0 top-0 h-full w-1 cursor-col-resize group',
        'hover:bg-primary/50 active:bg-primary',
        isDragging && 'bg-primary'
      )}
      onMouseDown={handleMouseDown}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Visual indicator on hover */}
      <div
        className={cn(
          'absolute right-0 top-1/2 -translate-y-1/2 w-0.5 h-4 rounded-full',
          'bg-slate-300 dark:bg-slate-600 group-hover:bg-primary',
          isDragging && 'bg-primary h-full'
        )}
      />
    </div>
  );
}

/**
 * Double-click to auto-fit column width
 */
export function useAutoFitColumn(
  columnId: string,
  data: unknown[],
  accessor?: (row: unknown) => unknown,
  onResize?: (columnId: string, width: number) => void
) {
  const autoFit = useCallback(() => {
    if (!accessor || !onResize) return;

    // Create a temporary element to measure text
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.font = '14px system-ui, sans-serif';

    let maxWidth = 80; // Minimum width

    data.forEach((row) => {
      const value = accessor(row);
      const text = String(value ?? '');
      const width = ctx.measureText(text).width + 32; // Add padding
      maxWidth = Math.max(maxWidth, width);
    });

    onResize(columnId, Math.min(maxWidth, 400)); // Cap at 400px
  }, [columnId, data, accessor, onResize]);

  return autoFit;
}

export default ColumnResizeHandle;

/**
 * @fileoverview Grid Pagination Component
 *
 * Provides pagination controls for the grid with:
 * - Page navigation (first, previous, next, last)
 * - Page size selector
 * - Page info display
 * - Go to page input
 *
 * @module grid/features/Pagination
 */

import { useState, useCallback, useMemo } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { PaginationConfig } from '../types';

// =============================================================================
// TYPES
// =============================================================================

export interface UsePaginationOptions {
  /** Total number of items */
  totalItems: number;

  /** Pagination configuration */
  config?: PaginationConfig;

  /** Controlled current page (0-indexed) */
  currentPage?: number;

  /** Controlled page size */
  pageSize?: number;

  /** Called when page changes */
  onPageChange?: (page: number) => void;

  /** Called when page size changes */
  onPageSizeChange?: (pageSize: number) => void;
}

export interface UsePaginationReturn {
  /** Current page (0-indexed) */
  currentPage: number;

  /** Current page size */
  pageSize: number;

  /** Total number of pages */
  totalPages: number;

  /** Start index (0-indexed) */
  startIndex: number;

  /** End index (exclusive) */
  endIndex: number;

  /** Items on current page */
  pageItems: <T>(items: T[]) => T[];

  /** Go to specific page */
  goToPage: (page: number) => void;

  /** Go to first page */
  goToFirstPage: () => void;

  /** Go to last page */
  goToLastPage: () => void;

  /** Go to previous page */
  goToPreviousPage: () => void;

  /** Go to next page */
  goToNextPage: () => void;

  /** Change page size */
  changePageSize: (size: number) => void;

  /** Check if can go to previous page */
  canGoPrevious: boolean;

  /** Check if can go to next page */
  canGoNext: boolean;
}

// =============================================================================
// HOOK
// =============================================================================

/**
 * Hook for managing pagination state
 */
export function usePagination({
  totalItems,
  config,
  currentPage: controlledPage,
  pageSize: controlledPageSize,
  onPageChange,
  onPageSizeChange,
}: UsePaginationOptions): UsePaginationReturn {
  const defaultPageSize = config?.pageSize ?? 25;

  const [internalPage, setInternalPage] = useState(0);
  const [internalPageSize, setInternalPageSize] = useState(defaultPageSize);

  // Use controlled or internal state
  const currentPage = controlledPage ?? internalPage;
  const pageSize = controlledPageSize ?? internalPageSize;

  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const startIndex = currentPage * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);

  const goToPage = useCallback((page: number) => {
    const validPage = Math.max(0, Math.min(page, totalPages - 1));
    if (controlledPage === undefined) {
      setInternalPage(validPage);
    }
    onPageChange?.(validPage);
  }, [totalPages, controlledPage, onPageChange]);

  const goToFirstPage = useCallback(() => goToPage(0), [goToPage]);
  const goToLastPage = useCallback(() => goToPage(totalPages - 1), [goToPage, totalPages]);
  const goToPreviousPage = useCallback(() => goToPage(currentPage - 1), [goToPage, currentPage]);
  const goToNextPage = useCallback(() => goToPage(currentPage + 1), [goToPage, currentPage]);

  const changePageSize = useCallback((size: number) => {
    if (controlledPageSize === undefined) {
      setInternalPageSize(size);
    }
    onPageSizeChange?.(size);

    // Reset to first page when changing page size
    if (controlledPage === undefined) {
      setInternalPage(0);
    }
    onPageChange?.(0);
  }, [controlledPageSize, controlledPage, onPageSizeChange, onPageChange]);

  const pageItems = useCallback(<T,>(items: T[]): T[] => {
    return items.slice(startIndex, endIndex);
  }, [startIndex, endIndex]);

  const canGoPrevious = currentPage > 0;
  const canGoNext = currentPage < totalPages - 1;

  return {
    currentPage,
    pageSize,
    totalPages,
    startIndex,
    endIndex,
    pageItems,
    goToPage,
    goToFirstPage,
    goToLastPage,
    goToPreviousPage,
    goToNextPage,
    changePageSize,
    canGoPrevious,
    canGoNext,
  };
}

// =============================================================================
// COMPONENTS
// =============================================================================

interface PaginationControlsProps {
  /** Total number of items */
  totalItems: number;

  /** Current page (0-indexed) */
  currentPage: number;

  /** Current page size */
  pageSize: number;

  /** Total pages */
  totalPages: number;

  /** Called when page changes */
  onPageChange: (page: number) => void;

  /** Called when page size changes */
  onPageSizeChange?: (size: number) => void;

  /** Page size options */
  pageSizeOptions?: number[];

  /** Show page size selector */
  showPageSizeSelector?: boolean;

  /** Show go to page input */
  showGoToPage?: boolean;

  /** Custom class name */
  className?: string;
}

/**
 * Pagination controls component
 */
export function PaginationControls({
  totalItems,
  currentPage,
  pageSize,
  totalPages,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 25, 50, 100],
  showPageSizeSelector = true,
  showGoToPage = false,
  className,
}: PaginationControlsProps) {
  const [goToValue, setGoToValue] = useState('');

  const handleGoToPage = () => {
    const page = parseInt(goToValue, 10);
    if (!isNaN(page) && page >= 1 && page <= totalPages) {
      onPageChange(page - 1);
      setGoToValue('');
    }
  };

  const startItem = currentPage * pageSize + 1;
  const endItem = Math.min((currentPage + 1) * pageSize, totalItems);

  const canGoPrevious = currentPage > 0;
  const canGoNext = currentPage < totalPages - 1;

  return (
    <div className={cn(
      'flex items-center justify-between gap-4 px-4 py-3 border-t bg-slate-50/50 dark:bg-slate-900/50',
      className
    )}>
      {/* Left: Page info */}
      <div className="flex items-center gap-4 text-sm text-muted-foreground">
        <span>
          Showing <span className="font-medium text-foreground">{startItem}</span>
          {' - '}
          <span className="font-medium text-foreground">{endItem}</span>
          {' of '}
          <span className="font-medium text-foreground">{totalItems}</span>
        </span>

        {/* Page size selector */}
        {showPageSizeSelector && onPageSizeChange && (
          <div className="flex items-center gap-2">
            <span>Rows per page:</span>
            <Select
              value={String(pageSize)}
              onValueChange={(value) => onPageSizeChange(parseInt(value, 10))}
            >
              <SelectTrigger className="h-8 w-[70px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {pageSizeOptions.map((size) => (
                  <SelectItem key={size} value={String(size)}>
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* Right: Navigation */}
      <div className="flex items-center gap-2">
        {/* Go to page */}
        {showGoToPage && (
          <div className="flex items-center gap-2 mr-4">
            <span className="text-sm text-muted-foreground">Go to:</span>
            <Input
              type="number"
              min={1}
              max={totalPages}
              value={goToValue}
              onChange={(e) => setGoToValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleGoToPage()}
              className="h-8 w-16 text-sm"
              placeholder={String(currentPage + 1)}
            />
          </div>
        )}

        {/* Page info */}
        <span className="text-sm text-muted-foreground min-w-[100px] text-center">
          Page {currentPage + 1} of {totalPages}
        </span>

        {/* Navigation buttons */}
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => onPageChange(0)}
            disabled={!canGoPrevious}
            title="First page"
          >
            <ChevronsLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => onPageChange(currentPage - 1)}
            disabled={!canGoPrevious}
            title="Previous page"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => onPageChange(currentPage + 1)}
            disabled={!canGoNext}
            title="Next page"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => onPageChange(totalPages - 1)}
            disabled={!canGoNext}
            title="Last page"
          >
            <ChevronsRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

/**
 * Compact pagination for limited space
 */
export function CompactPagination({
  currentPage,
  totalPages,
  onPageChange,
  className,
}: {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
}) {
  const canGoPrevious = currentPage > 0;
  const canGoNext = currentPage < totalPages - 1;

  return (
    <div className={cn('flex items-center gap-1', className)}>
      <Button
        variant="ghost"
        size="sm"
        className="h-7 w-7 p-0"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={!canGoPrevious}
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <span className="text-xs text-muted-foreground min-w-[60px] text-center">
        {currentPage + 1} / {totalPages}
      </span>
      <Button
        variant="ghost"
        size="sm"
        className="h-7 w-7 p-0"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={!canGoNext}
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}

export default PaginationControls;

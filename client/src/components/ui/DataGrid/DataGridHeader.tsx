import { memo, useCallback, useRef, useEffect } from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Column, HeaderProps } from './types';

interface DataGridHeaderProps<T> {
  columns: Column<T>[];
  gridTemplateColumns: string;
  selectable: boolean;
  expandable: boolean;
  selectedKeys: Set<string>;
  totalRows: number;
  onSelectAll?: (selected: boolean) => void;
  sortField?: string;
  sortDirection?: 'asc' | 'desc';
  onSort?: (field: string, direction: 'asc' | 'desc') => void;
  bordered: boolean;
}

function DataGridHeaderInner<T>({
  columns,
  gridTemplateColumns,
  selectable,
  expandable,
  selectedKeys,
  totalRows,
  onSelectAll,
  sortField,
  sortDirection,
  onSort,
  bordered,
}: DataGridHeaderProps<T>) {
  const checkboxRef = useRef<HTMLInputElement>(null);
  const allSelected = totalRows > 0 && selectedKeys.size === totalRows;
  const someSelected = selectedKeys.size > 0 && selectedKeys.size < totalRows;

  // Handle indeterminate state for checkbox
  useEffect(() => {
    if (checkboxRef.current) {
      checkboxRef.current.indeterminate = someSelected;
    }
  }, [someSelected]);

  const handleSelectAll = useCallback(() => {
    onSelectAll?.(!allSelected);
  }, [allSelected, onSelectAll]);

  const handleSort = useCallback(
    (columnId: string) => {
      if (!onSort) return;
      const newDirection =
        sortField === columnId && sortDirection === 'asc' ? 'desc' : 'asc';
      onSort(columnId, newDirection);
    },
    [sortField, sortDirection, onSort]
  );

  return (
    <div
      className={cn(
        'grid bg-muted/50 border-b border-border sticky top-0 z-10',
        bordered && 'border-x'
      )}
      style={{ gridTemplateColumns }}
      role="row"
    >
      {/* Selection checkbox column */}
      {selectable && (
        <div className="flex items-center justify-center px-3 py-2 border-r border-border">
          <input
            ref={checkboxRef}
            type="checkbox"
            checked={allSelected}
            onChange={handleSelectAll}
            aria-label="Select all rows"
            className="h-4 w-4 rounded border-border text-primary focus:ring-primary/20"
          />
        </div>
      )}

      {/* Expansion column */}
      {expandable && (
        <div className="flex items-center justify-center px-3 py-2 border-r border-border w-10" />
      )}

      {/* Data columns */}
      {columns.map((column) => {
        const isSortable = column.sortable && onSort;
        const isSorted = sortField === column.id;
        const headerProps: HeaderProps = {
          column: column as Column<unknown>,
          sortField,
          sortDirection,
          onSort: isSortable ? () => handleSort(column.id) : undefined,
        };

        const headerContent =
          typeof column.header === 'function'
            ? column.header(headerProps)
            : column.header;

        return (
          <div
            key={column.id}
            className={cn(
              'flex items-center px-3 py-2 text-sm font-medium text-muted-foreground',
              column.align === 'center' && 'justify-center',
              column.align === 'right' && 'justify-end',
              isSortable && 'cursor-pointer hover:bg-muted select-none',
              bordered && 'border-r border-border last:border-r-0'
            )}
            onClick={isSortable ? () => handleSort(column.id) : undefined}
            role="columnheader"
            aria-sort={
              isSorted
                ? sortDirection === 'asc'
                  ? 'ascending'
                  : 'descending'
                : undefined
            }
          >
            <span className="truncate">{headerContent}</span>
            {isSortable && (
              <span className="ml-1 flex-shrink-0">
                {isSorted ? (
                  sortDirection === 'asc' ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )
                ) : (
                  <ChevronUp className="h-4 w-4 opacity-0 group-hover:opacity-30" />
                )}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

export const DataGridHeader = memo(DataGridHeaderInner) as typeof DataGridHeaderInner;

import { memo, useCallback, ReactNode } from 'react';
import { ChevronRight, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Column } from './types';
import { DataGridCell } from './DataGridCell';

interface DataGridRowProps<T> {
  row: T;
  rowKey: string;
  rowIndex: number;
  columns: Column<T>[];
  gridTemplateColumns: string;
  selectable: boolean;
  isSelected: boolean;
  onSelect?: (key: string, selected: boolean) => void;
  expandable: boolean;
  isExpanded: boolean;
  onExpand?: (key: string, expanded: boolean) => void;
  renderExpandedRow?: (row: T) => ReactNode;
  rowClassName?: string;
  onClick?: () => void;
  onDoubleClick?: () => void;
  bordered: boolean;
  hoverable: boolean;
  style?: React.CSSProperties;
}

function DataGridRowInner<T>({
  row,
  rowKey,
  rowIndex,
  columns,
  gridTemplateColumns,
  selectable,
  isSelected,
  onSelect,
  expandable,
  isExpanded,
  onExpand,
  renderExpandedRow,
  rowClassName,
  onClick,
  onDoubleClick,
  bordered,
  hoverable,
  style,
}: DataGridRowProps<T>) {
  const handleSelect = useCallback(() => {
    onSelect?.(rowKey, !isSelected);
  }, [rowKey, isSelected, onSelect]);

  const handleExpand = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onExpand?.(rowKey, !isExpanded);
    },
    [rowKey, isExpanded, onExpand]
  );

  return (
    <>
      <div
        className={cn(
          'grid border-b border-border',
          isSelected && 'bg-primary/10',
          hoverable && !isSelected && 'hover:bg-muted/30',
          bordered && 'border-x',
          onClick && 'cursor-pointer',
          rowClassName
        )}
        style={{ ...style, gridTemplateColumns }}
        role="row"
        aria-selected={isSelected}
        onClick={onClick}
        onDoubleClick={onDoubleClick}
      >
        {/* Selection checkbox */}
        {selectable && (
          <div
            className={cn(
              'flex items-center justify-center px-3 py-2',
              bordered && 'border-r border-border'
            )}
            onClick={(e) => e.stopPropagation()}
          >
            <input
              type="checkbox"
              checked={isSelected}
              onChange={handleSelect}
              aria-label={`Select row ${rowIndex + 1}`}
              className="h-4 w-4 rounded border-border text-primary focus:ring-primary/20"
            />
          </div>
        )}

        {/* Expansion toggle */}
        {expandable && (
          <div
            className={cn(
              'flex items-center justify-center px-2 py-2 w-10',
              bordered && 'border-r border-border'
            )}
          >
            <button
              onClick={handleExpand}
              className="p-1 rounded hover:bg-muted transition-colors"
              aria-expanded={isExpanded}
              aria-label={isExpanded ? 'Collapse row' : 'Expand row'}
            >
              {isExpanded ? (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              )}
            </button>
          </div>
        )}

        {/* Data cells */}
        {columns.map((column) => (
          <DataGridCell
            key={column.id}
            align={column.align}
            className={cn(
              column.className,
              bordered && 'border-r border-border last:border-r-0'
            )}
          >
            {column.cell(row, rowIndex)}
          </DataGridCell>
        ))}
      </div>

      {/* Expanded content */}
      {expandable && isExpanded && renderExpandedRow && (
        <div
          className={cn(
            'border-b border-border bg-muted/50',
            bordered && 'border-x'
          )}
          role="row"
        >
          {renderExpandedRow(row)}
        </div>
      )}
    </>
  );
}

export const DataGridRow = memo(DataGridRowInner) as typeof DataGridRowInner;

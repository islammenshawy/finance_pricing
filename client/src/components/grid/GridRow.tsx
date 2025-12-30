import type { ReactNode, CSSProperties, MouseEvent } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import type { ColumnDef, SelectionConfig, ExpansionConfig } from './types';

interface GridRowProps<TRow> {
  row: TRow;
  rowId: string;
  rowIndex: number;
  columns: ColumnDef<TRow>[];
  columnTemplate: string;
  isSelected: boolean;
  isExpanded: boolean;
  isDisabled: boolean;
  isSelectable: boolean;
  selection?: SelectionConfig;
  expansion?: ExpansionConfig<TRow>;
  showGridLines: boolean;
  stripedRows: boolean;
  rowClassName?: string;
  rowStyle?: CSSProperties;
  onSelect: () => void;
  onToggleExpand: () => void;
  onClick: (e: MouseEvent) => void;
  onDoubleClick: (e: MouseEvent) => void;
  onCellChange: (columnId: string, newValue: unknown, oldValue: unknown) => void;
}

/**
 * Individual grid row with cells, selection, and expansion
 */
export function GridRow<TRow>({
  row,
  rowId,
  rowIndex,
  columns,
  columnTemplate,
  isSelected,
  isExpanded,
  isDisabled,
  isSelectable,
  selection,
  expansion,
  showGridLines,
  stripedRows,
  rowClassName,
  rowStyle,
  onSelect,
  onToggleExpand,
  onClick,
  onDoubleClick,
  onCellChange,
}: GridRowProps<TRow>) {
  const showCheckbox = selection?.showCheckbox && selection.mode !== 'none';
  const showExpandIcon = expansion?.enabled && expansion.showExpandIcon !== false;

  // Row styling
  const baseClasses = 'transition-colors border-b';
  const selectedClasses = isSelected
    ? 'bg-blue-50 dark:bg-blue-950/40 border-l-2 border-l-blue-500'
    : 'border-l-2 border-l-transparent';
  const stripedClasses = stripedRows && rowIndex % 2 === 1 ? 'bg-muted/30' : '';
  const hoverClasses = !isDisabled ? 'hover:bg-muted/30' : '';
  const disabledClasses = isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer';
  const gridLineClasses = showGridLines ? 'divide-x' : '';

  return (
    <div className={baseClasses}>
      {/* Main Row */}
      <div
        className={`grid items-center min-h-[44px] py-1 ${selectedClasses} ${stripedClasses} ${hoverClasses} ${disabledClasses} ${gridLineClasses} ${rowClassName || ''}`}
        style={{ gridTemplateColumns: columnTemplate, ...rowStyle }}
        role="row"
        aria-selected={isSelected}
        aria-disabled={isDisabled}
        onClick={(e) => {
          if (!isDisabled) onClick(e);
        }}
        onDoubleClick={(e) => {
          if (!isDisabled) onDoubleClick(e);
        }}
        data-testid={`grid-row-${rowId}`}
      >
        {/* Checkbox cell */}
        {showCheckbox && (
          <div
            className="px-3 flex justify-center"
            role="gridcell"
            onClick={(e) => e.stopPropagation()}
          >
            <input
              type="checkbox"
              checked={isSelected}
              onChange={onSelect}
              disabled={isDisabled || !isSelectable}
              className="rounded border-slate-300 text-primary focus:ring-primary/20"
              aria-label={`Select row ${rowId}`}
            />
          </div>
        )}

        {/* Expand icon cell */}
        {showExpandIcon && (
          <div
            className="px-2 flex justify-center"
            role="gridcell"
            onClick={(e) => {
              e.stopPropagation();
              if (!isDisabled) onToggleExpand();
            }}
          >
            {isExpanded ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground cursor-pointer" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground cursor-pointer" />
            )}
          </div>
        )}

        {/* Data cells */}
        {columns.map((column) => {
          const alignClass = column.align === 'right' ? 'text-right' : column.align === 'center' ? 'text-center' : 'text-left';

          return (
            <div
              key={column.id}
              className={`px-3 ${alignClass} ${column.className || ''}`}
              role="gridcell"
              onClick={(e) => {
                // Allow cell-level click handling without triggering row click
                // if the cell has interactive elements
              }}
            >
              {column.cell ? (
                column.cell(row, rowIndex)
              ) : column.accessor ? (
                <span className="truncate">{String(column.accessor(row) ?? '')}</span>
              ) : null}
            </div>
          );
        })}
      </div>

      {/* Expanded Content */}
      {isExpanded && expansion?.expandedContent && (
        <div
          className={`border-t ${isSelected ? 'border-l-2 border-l-blue-500 bg-slate-50 dark:bg-slate-900/50' : 'border-l-2 border-l-slate-300'}`}
          role="row"
        >
          {expansion.expandedContent(row)}
        </div>
      )}
    </div>
  );
}

import { ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react';
import type { ColumnDef, SelectionConfig, ExpansionConfig, SortDirection } from './types';

interface GridHeaderProps<TRow> {
  columns: ColumnDef<TRow>[];
  columnTemplate: string;
  selection?: SelectionConfig;
  expansion?: ExpansionConfig<TRow>;
  sortColumn: string | null;
  sortDirection: SortDirection;
  sortable: boolean;
  onSort: (columnId: string) => void;
  onSelectAll: () => void;
  allSelected: boolean;
  someSelected: boolean;
}

/**
 * Grid header row with sortable columns
 */
export function GridHeader<TRow>({
  columns,
  columnTemplate,
  selection,
  expansion,
  sortColumn,
  sortDirection,
  sortable,
  onSort,
  onSelectAll,
  allSelected,
  someSelected,
}: GridHeaderProps<TRow>) {
  return (
    <div
      className="sticky top-0 z-20 bg-slate-100 dark:bg-slate-900 border-b-2 border-slate-300 dark:border-slate-600 shadow-sm"
      role="row"
    >
      <div
        className="grid items-center text-sm h-10"
        style={{ gridTemplateColumns: columnTemplate }}
      >
        {/* Checkbox column */}
        {selection?.showCheckbox && selection.mode === 'multiple' && (
          <div className="px-3 flex justify-center" role="columnheader">
            <input
              type="checkbox"
              checked={allSelected}
              ref={(el) => {
                if (el) el.indeterminate = someSelected && !allSelected;
              }}
              onChange={onSelectAll}
              className="rounded border-slate-300 text-primary focus:ring-primary/20"
              aria-label="Select all rows"
            />
          </div>
        )}

        {/* Expand icon spacer */}
        {expansion?.enabled && expansion.showExpandIcon !== false && (
          <div className="px-2" role="columnheader" />
        )}

        {/* Data columns */}
        {columns.map((column) => {
          const isSorted = sortColumn === column.id;
          const canSort = sortable && column.sortable !== false;
          const alignClass = column.align === 'right' ? 'justify-end' : column.align === 'center' ? 'justify-center' : 'justify-start';

          return (
            <div
              key={column.id}
              className={`px-3 flex ${alignClass} ${column.className || ''}`}
              role="columnheader"
              aria-sort={isSorted ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'}
            >
              {column.headerCell ? (
                column.headerCell()
              ) : canSort ? (
                <button
                  className={`inline-flex items-center gap-1 text-xs uppercase tracking-wide font-medium transition-colors hover:text-foreground ${
                    isSorted ? 'text-foreground' : 'text-muted-foreground'
                  }`}
                  onClick={() => onSort(column.id)}
                >
                  {column.header}
                  {isSorted ? (
                    sortDirection === 'asc' ? (
                      <ArrowUp className="h-3 w-3" />
                    ) : (
                      <ArrowDown className="h-3 w-3" />
                    )
                  ) : (
                    <ArrowUpDown className="h-3 w-3 opacity-30" />
                  )}
                </button>
              ) : (
                <span className="text-xs uppercase tracking-wide font-medium text-muted-foreground">
                  {column.header}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

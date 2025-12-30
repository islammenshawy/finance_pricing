import type { ReactNode } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';

interface GridGroupHeaderProps<TRow> {
  groupKey: string;
  rows: TRow[];
  isExpanded: boolean;
  onToggle: () => void;
  selectedIds: Set<string>;
  getRowId: (row: TRow) => string;
  onSelectAll: () => void;
  showCheckbox?: boolean;
  customRenderer?: (groupKey: string, rows: TRow[]) => ReactNode;
}

/**
 * Group header row for grouped data grids
 */
export function GridGroupHeader<TRow>({
  groupKey,
  rows,
  isExpanded,
  onToggle,
  selectedIds,
  getRowId,
  onSelectAll,
  showCheckbox,
  customRenderer,
}: GridGroupHeaderProps<TRow>) {
  const selectedCount = rows.filter((r) => selectedIds.has(getRowId(r))).length;
  const allSelected = selectedCount === rows.length && rows.length > 0;
  const someSelected = selectedCount > 0 && selectedCount < rows.length;

  return (
    <div
      className="flex items-center gap-2 px-3 py-2 bg-slate-200 dark:bg-slate-800 border-b cursor-pointer hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors"
      onClick={onToggle}
      role="row"
      aria-expanded={isExpanded}
    >
      {/* Checkbox for group selection */}
      {showCheckbox && (
        <div
          className="flex items-center"
          onClick={(e) => {
            e.stopPropagation();
            onSelectAll();
          }}
        >
          <input
            type="checkbox"
            checked={allSelected}
            ref={(el) => {
              if (el) el.indeterminate = someSelected;
            }}
            onChange={onSelectAll}
            className="rounded border-slate-300 text-primary focus:ring-primary/20"
            aria-label={`Select all in ${groupKey}`}
          />
        </div>
      )}

      {/* Expand/collapse icon */}
      <div className="flex items-center">
        {isExpanded ? (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        )}
      </div>

      {/* Group header content */}
      {customRenderer ? (
        customRenderer(groupKey, rows)
      ) : (
        <div className="flex items-center gap-3 flex-1">
          <span className="font-medium text-sm">{groupKey}</span>
          <span className="text-xs text-muted-foreground">
            ({rows.length} {rows.length === 1 ? 'item' : 'items'})
          </span>
          {selectedCount > 0 && (
            <span className="text-xs text-blue-600 dark:text-blue-400">
              {selectedCount} selected
            </span>
          )}
        </div>
      )}
    </div>
  );
}

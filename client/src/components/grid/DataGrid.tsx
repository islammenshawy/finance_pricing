import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { ChevronDown, ChevronRight } from 'lucide-react';
import type {
  DataGridProps,
  ColumnDef,
  SortDirection,
  GridState,
} from './types';
import { GridHeader } from './GridHeader';
import { GridRow } from './GridRow';
import { GridGroupHeader } from './GridGroupHeader';

/**
 * Generic, reusable DataGrid component with grouping, virtual scrolling,
 * selection, sorting, and expandable rows.
 *
 * @template TRow - The row data type
 *
 * @example
 * ```tsx
 * interface User {
 *   id: string;
 *   name: string;
 *   email: string;
 * }
 *
 * const columns: ColumnDef<User>[] = [
 *   { id: 'name', header: 'Name', accessor: (row) => row.name },
 *   { id: 'email', header: 'Email', accessor: (row) => row.email },
 * ];
 *
 * <DataGrid
 *   data={users}
 *   columns={columns}
 *   getRowId={(user) => user.id}
 *   selection={{ mode: 'multiple', showCheckbox: true }}
 * />
 * ```
 */
export function DataGrid<TRow>({
  data,
  columns,
  getRowId,
  groupBy,
  selection = { mode: 'none' },
  expansion,
  virtualScroll = { enabled: true, rowHeight: 44 },
  sortable = true,
  defaultSortColumn,
  defaultSortDirection = 'asc',
  rowStyling,
  className = '',
  style,
  showGridLines = false,
  stripedRows = false,
  stickyHeader = true,
  state: controlledState,
  events = {},
  loading = false,
  loadingComponent,
  emptyComponent,
  headerContent,
  footerContent,
  ariaLabel = 'Data grid',
}: DataGridProps<TRow>) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Internal state (used when not controlled)
  const [internalSelectedIds, setInternalSelectedIds] = useState<Set<string>>(new Set());
  const [internalExpandedIds, setInternalExpandedIds] = useState<Set<string>>(new Set());
  const [internalExpandedGroups, setInternalExpandedGroups] = useState<Set<string>>(() => {
    if (groupBy?.defaultExpanded !== false) {
      const keys = new Set<string>();
      data.forEach((row) => {
        const key = getGroupKey(row, groupBy);
        if (key) keys.add(key);
      });
      return keys;
    }
    return new Set();
  });
  const [internalSortColumn, setInternalSortColumn] = useState<string | null>(defaultSortColumn ?? null);
  const [internalSortDirection, setInternalSortDirection] = useState<SortDirection>(defaultSortDirection);

  // Use controlled or internal state
  const selectedIds = controlledState?.selectedIds ?? internalSelectedIds;
  const expandedIds = controlledState?.expandedIds ?? internalExpandedIds;
  const expandedGroups = controlledState?.expandedGroups ?? internalExpandedGroups;
  const sortColumn = controlledState?.sortColumn ?? internalSortColumn;
  const sortDirection = controlledState?.sortDirection ?? internalSortDirection;

  // Get group key for a row
  function getGroupKey(row: TRow, config: typeof groupBy): string {
    if (!config) return 'all';
    if (config.getGroupKey) return config.getGroupKey(row);
    if (typeof config.field === 'function') return config.field(row);
    return String(row[config.field as keyof TRow]);
  }

  // Group data
  const groupedData = useMemo(() => {
    const groups = new Map<string, TRow[]>();

    if (!groupBy) {
      groups.set('all', data);
      return groups;
    }

    data.forEach((row) => {
      const key = getGroupKey(row, groupBy);
      const existing = groups.get(key) || [];
      existing.push(row);
      groups.set(key, existing);
    });

    return groups;
  }, [data, groupBy]);

  // Sort data within groups
  const sortedGroupedData = useMemo(() => {
    if (!sortColumn) return groupedData;

    const column = columns.find((c) => c.id === sortColumn);
    if (!column?.accessor) return groupedData;

    const sorted = new Map<string, TRow[]>();
    groupedData.forEach((rows, key) => {
      const sortedRows = [...rows].sort((a, b) => {
        const aVal = column.accessor!(a);
        const bVal = column.accessor!(b);

        if (aVal === bVal) return 0;
        if (aVal === null || aVal === undefined) return 1;
        if (bVal === null || bVal === undefined) return -1;

        const comparison = aVal < bVal ? -1 : 1;
        return sortDirection === 'asc' ? comparison : -comparison;
      });
      sorted.set(key, sortedRows);
    });

    return sorted;
  }, [groupedData, sortColumn, sortDirection, columns]);

  // Flatten for virtual scrolling
  type FlatItem =
    | { type: 'group-header'; groupKey: string; rows: TRow[] }
    | { type: 'row'; row: TRow; groupKey: string };

  const flatItems = useMemo(() => {
    const items: FlatItem[] = [];

    sortedGroupedData.forEach((rows, groupKey) => {
      if (groupBy) {
        items.push({ type: 'group-header', groupKey, rows });
      }

      const isGroupExpanded = !groupBy || expandedGroups.has(groupKey);
      if (isGroupExpanded) {
        rows.forEach((row) => {
          items.push({ type: 'row', row, groupKey });
        });
      }
    });

    return items;
  }, [sortedGroupedData, groupBy, expandedGroups]);

  // Virtual scrolling
  const virtualizer = useVirtualizer({
    count: flatItems.length,
    getScrollElement: () => containerRef.current,
    estimateSize: (index) => {
      const item = flatItems[index];
      if (item.type === 'group-header') return 52;
      const row = item.row;
      const rowId = getRowId(row);
      if (expandedIds.has(rowId)) {
        return virtualScroll.expandedRowHeight ?? 400;
      }
      return virtualScroll.rowHeight;
    },
    overscan: virtualScroll.overscan ?? 5,
    measureElement: (element) => element.getBoundingClientRect().height,
  });

  // Re-measure when expansion changes
  useEffect(() => {
    virtualizer.measure();
  }, [expandedIds, virtualizer]);

  // Selection handlers
  const handleSelectRow = useCallback((row: TRow) => {
    const rowId = getRowId(row);
    const newSelected = new Set(selectedIds);

    if (selection.mode === 'single') {
      newSelected.clear();
      newSelected.add(rowId);
    } else if (selection.mode === 'multiple') {
      if (newSelected.has(rowId)) {
        newSelected.delete(rowId);
      } else {
        newSelected.add(rowId);
      }
    }

    if (!controlledState?.selectedIds) {
      setInternalSelectedIds(newSelected);
    }

    const selectedRows = data.filter((r) => newSelected.has(getRowId(r)));
    events.onSelectionChange?.(selectedRows, newSelected);
  }, [selectedIds, selection.mode, controlledState, events, data, getRowId]);

  const handleSelectAll = useCallback((rows: TRow[]) => {
    const rowIds = rows.map(getRowId);
    const allSelected = rowIds.every((id) => selectedIds.has(id));

    const newSelected = new Set(selectedIds);
    if (allSelected) {
      rowIds.forEach((id) => newSelected.delete(id));
    } else {
      rowIds.forEach((id) => newSelected.add(id));
    }

    if (!controlledState?.selectedIds) {
      setInternalSelectedIds(newSelected);
    }

    const selectedRows = data.filter((r) => newSelected.has(getRowId(r)));
    events.onSelectionChange?.(selectedRows, newSelected);
  }, [selectedIds, controlledState, events, data, getRowId]);

  // Sort handler
  const handleSort = useCallback((columnId: string) => {
    let newDirection: SortDirection = 'asc';
    let newColumn: string | null = columnId;

    if (sortColumn === columnId) {
      if (sortDirection === 'asc') {
        newDirection = 'desc';
      } else {
        newColumn = null;
      }
    }

    if (!controlledState?.sortColumn) {
      setInternalSortColumn(newColumn);
      setInternalSortDirection(newDirection);
    }

    events.onSortChange?.(newColumn, newDirection);
  }, [sortColumn, sortDirection, controlledState, events]);

  // Expansion handlers
  const handleToggleRowExpand = useCallback((row: TRow) => {
    const rowId = getRowId(row);
    const newExpanded = new Set(expandedIds);

    if (newExpanded.has(rowId)) {
      newExpanded.delete(rowId);
      events.onRowExpand?.(row, false);
    } else {
      if (!expansion?.allowMultiple) {
        newExpanded.clear();
      }
      newExpanded.add(rowId);
      events.onRowExpand?.(row, true);
    }

    if (!controlledState?.expandedIds) {
      setInternalExpandedIds(newExpanded);
    }
  }, [expandedIds, expansion, controlledState, events, getRowId]);

  const handleToggleGroupExpand = useCallback((groupKey: string) => {
    const newExpanded = new Set(expandedGroups);

    if (newExpanded.has(groupKey)) {
      newExpanded.delete(groupKey);
      events.onGroupExpand?.(groupKey, false);
    } else {
      newExpanded.add(groupKey);
      events.onGroupExpand?.(groupKey, true);
    }

    if (!controlledState?.expandedGroups) {
      setInternalExpandedGroups(newExpanded);
    }
  }, [expandedGroups, controlledState, events]);

  // Row click handler
  const handleRowClick = useCallback((row: TRow, event: React.MouseEvent) => {
    events.onRowClick?.(row, event);
  }, [events]);

  const handleRowDoubleClick = useCallback((row: TRow, event: React.MouseEvent) => {
    events.onRowDoubleClick?.(row, event);
  }, [events]);

  // Cell change handler
  const handleCellChange = useCallback((row: TRow, columnId: string, newValue: unknown, oldValue: unknown) => {
    events.onCellChange?.(row, columnId, newValue, oldValue);
  }, [events]);

  // Calculate column template
  const columnTemplate = useMemo(() => {
    const parts: string[] = [];

    if (selection.showCheckbox) {
      parts.push('40px'); // Checkbox column
    }

    if (expansion?.showExpandIcon !== false && expansion?.enabled) {
      parts.push('32px'); // Expand icon column
    }

    columns.forEach((col) => {
      if (col.width) {
        parts.push(typeof col.width === 'number' ? `${col.width}px` : col.width);
      } else {
        parts.push('1fr');
      }
    });

    return parts.join(' ');
  }, [columns, selection.showCheckbox, expansion]);

  // Loading state
  if (loading && loadingComponent) {
    return <div className={className} style={style}>{loadingComponent}</div>;
  }

  // Empty state
  if (!loading && data.length === 0 && emptyComponent) {
    return <div className={className} style={style}>{emptyComponent}</div>;
  }

  return (
    <div
      ref={containerRef}
      className={`h-full overflow-auto ${className}`}
      style={style}
      role="grid"
      aria-label={ariaLabel}
    >
      {headerContent}

      {/* Sticky Header */}
      {stickyHeader && (
        <GridHeader
          columns={columns}
          columnTemplate={columnTemplate}
          selection={selection}
          expansion={expansion}
          sortColumn={sortColumn}
          sortDirection={sortDirection}
          sortable={sortable}
          onSort={handleSort}
          onSelectAll={() => handleSelectAll(data)}
          allSelected={data.length > 0 && data.every((r) => selectedIds.has(getRowId(r)))}
          someSelected={data.some((r) => selectedIds.has(getRowId(r)))}
        />
      )}

      {/* Virtualized Content */}
      <div
        style={{
          height: virtualScroll.enabled ? `${virtualizer.getTotalSize()}px` : 'auto',
          width: '100%',
          position: 'relative',
        }}
      >
        {(virtualScroll.enabled ? virtualizer.getVirtualItems() : flatItems.map((_, i) => ({ index: i, start: 0 }))).map((virtualRow) => {
          const item = flatItems[virtualRow.index];

          if (item.type === 'group-header') {
            return (
              <div
                key={`group-${item.groupKey}`}
                data-index={virtualRow.index}
                ref={virtualScroll.enabled ? virtualizer.measureElement : undefined}
                style={virtualScroll.enabled ? {
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  transform: `translateY(${virtualRow.start}px)`,
                } : undefined}
              >
                <GridGroupHeader
                  groupKey={item.groupKey}
                  rows={item.rows}
                  isExpanded={expandedGroups.has(item.groupKey)}
                  onToggle={() => handleToggleGroupExpand(item.groupKey)}
                  selectedIds={selectedIds}
                  getRowId={getRowId}
                  onSelectAll={() => handleSelectAll(item.rows)}
                  showCheckbox={selection.showCheckbox && selection.mode === 'multiple'}
                  customRenderer={groupBy?.headerRenderer}
                />
              </div>
            );
          }

          const row = item.row;
          const rowId = getRowId(row);
          const isSelected = selectedIds.has(rowId);
          const isExpanded = expandedIds.has(rowId);
          const isDisabled = rowStyling?.isRowDisabled?.(row) ?? false;
          const isSelectable = rowStyling?.isRowSelectable?.(row) ?? true;

          return (
            <div
              key={rowId}
              data-index={virtualRow.index}
              ref={virtualScroll.enabled ? virtualizer.measureElement : undefined}
              style={virtualScroll.enabled ? {
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                transform: `translateY(${virtualRow.start}px)`,
              } : undefined}
            >
              <GridRow
                row={row}
                rowId={rowId}
                rowIndex={virtualRow.index}
                columns={columns}
                columnTemplate={columnTemplate}
                isSelected={isSelected}
                isExpanded={isExpanded}
                isDisabled={isDisabled}
                isSelectable={isSelectable}
                selection={selection}
                expansion={expansion}
                showGridLines={showGridLines}
                stripedRows={stripedRows}
                rowClassName={rowStyling?.getRowClassName?.(row, virtualRow.index)}
                rowStyle={rowStyling?.getRowStyle?.(row, virtualRow.index)}
                onSelect={() => handleSelectRow(row)}
                onToggleExpand={() => handleToggleRowExpand(row)}
                onClick={(e) => handleRowClick(row, e)}
                onDoubleClick={(e) => handleRowDoubleClick(row, e)}
                onCellChange={(columnId, newValue, oldValue) => handleCellChange(row, columnId, newValue, oldValue)}
              />
            </div>
          );
        })}
      </div>

      {footerContent}
    </div>
  );
}

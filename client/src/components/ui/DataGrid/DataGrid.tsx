import { useMemo, useCallback } from 'react';
import { cn } from '@/lib/utils';
import type { DataGridProps } from './types';
import { DataGridHeader } from './DataGridHeader';
import { StandardBody } from './StandardBody';
import { VirtualBody } from './VirtualBody';

// Default values
const DEFAULT_VIRTUALIZE_THRESHOLD = 50;
const DEFAULT_ROW_HEIGHT = 44;
const DEFAULT_OVERSCAN = 5;

export function DataGrid<T>({
  // Required
  data,
  columns,
  getRowKey,
  // Virtual scrolling
  virtualizeThreshold = DEFAULT_VIRTUALIZE_THRESHOLD,
  rowHeight = DEFAULT_ROW_HEIGHT,
  overscan = DEFAULT_OVERSCAN,
  // Selection
  selectable = false,
  selectedKeys = new Set(),
  onSelectionChange,
  // Expansion
  expandable = false,
  expandedKeys = new Set(),
  onExpansionChange,
  renderExpandedRow,
  // Sorting
  sortField,
  sortDirection,
  onSort,
  // Grouping
  groupBy,
  renderGroupHeader,
  collapsedGroups = new Set(),
  onGroupCollapseChange,
  // Styling
  className,
  rowClassName,
  height,
  bordered = false,
  striped: _striped = false, // TODO: implement striped rows
  hoverable = true,
  // Footer
  renderFooter,
  // Empty state
  emptyMessage = 'No data available',
  // Event handlers
  onRowClick,
  onRowDoubleClick,
}: DataGridProps<T>) {
  // Calculate grid template columns
  const gridTemplateColumns = useMemo(() => {
    const parts: string[] = [];

    // Selection column
    if (selectable) {
      parts.push('40px');
    }

    // Expansion column
    if (expandable) {
      parts.push('40px');
    }

    // Data columns
    for (const column of columns) {
      if (column.width !== undefined) {
        parts.push(
          typeof column.width === 'number' ? `${column.width}px` : column.width
        );
      } else if (column.minWidth) {
        parts.push(`minmax(${column.minWidth}px, 1fr)`);
      } else {
        parts.push('1fr');
      }
    }

    return parts.join(' ');
  }, [columns, selectable, expandable]);

  // Group data if groupBy is provided
  const groupedData = useMemo(() => {
    if (!groupBy) return null;

    const groups = new Map<string, T[]>();
    for (const item of data) {
      const groupKey = groupBy(item);
      if (!groups.has(groupKey)) {
        groups.set(groupKey, []);
      }
      groups.get(groupKey)!.push(item);
    }
    return groups;
  }, [data, groupBy]);

  // Flatten grouped data with headers
  const displayData = useMemo(() => {
    if (!groupedData || !renderGroupHeader) {
      return data;
    }

    const result: T[] = [];
    for (const [_groupKey, items] of groupedData) {
      if (!collapsedGroups.has(_groupKey)) {
        result.push(...items);
      }
    }
    return result;
  }, [groupedData, renderGroupHeader, collapsedGroups, data]);

  // Determine if virtualization should be enabled
  const shouldVirtualize = displayData.length > virtualizeThreshold;

  // Selection handlers
  const handleSelect = useCallback(
    (key: string, selected: boolean) => {
      if (!onSelectionChange) return;
      const newSelected = new Set(selectedKeys);
      if (selected) {
        newSelected.add(key);
      } else {
        newSelected.delete(key);
      }
      onSelectionChange(newSelected);
    },
    [selectedKeys, onSelectionChange]
  );

  const handleSelectAll = useCallback(
    (selected: boolean) => {
      if (!onSelectionChange) return;
      if (selected) {
        const allKeys = new Set(displayData.map(getRowKey));
        onSelectionChange(allKeys);
      } else {
        onSelectionChange(new Set());
      }
    },
    [displayData, getRowKey, onSelectionChange]
  );

  // Expansion handlers
  const handleExpand = useCallback(
    (key: string, expanded: boolean) => {
      if (!onExpansionChange) return;
      const newExpanded = new Set(expandedKeys);
      if (expanded) {
        newExpanded.add(key);
      } else {
        newExpanded.delete(key);
      }
      onExpansionChange(newExpanded);
    },
    [expandedKeys, onExpansionChange]
  );

  // Render group headers with collapse functionality
  const renderGroupHeaders = useCallback(() => {
    if (!groupedData || !renderGroupHeader) return null;

    return Array.from(groupedData.entries()).map(([groupKey, rows]) => {
      const isCollapsed = collapsedGroups.has(groupKey);
      return (
        <div
          key={`group-${groupKey}`}
          className={cn(
            'grid border-b border-border bg-muted cursor-pointer hover:bg-muted/80',
            bordered && 'border-x'
          )}
          style={{ gridTemplateColumns }}
          onClick={() => onGroupCollapseChange?.(groupKey, !isCollapsed)}
          role="row"
          aria-expanded={!isCollapsed}
        >
          <div
            className="col-span-full px-3 py-2"
            style={{ gridColumn: '1 / -1' }}
          >
            {renderGroupHeader(groupKey, rows)}
          </div>
        </div>
      );
    });
  }, [
    groupedData,
    renderGroupHeader,
    collapsedGroups,
    onGroupCollapseChange,
    gridTemplateColumns,
    bordered,
  ]);

  // Body component props
  const bodyProps = {
    data: displayData,
    columns,
    getRowKey,
    gridTemplateColumns,
    selectable,
    selectedKeys,
    onSelect: handleSelect,
    expandable,
    expandedKeys,
    onExpand: handleExpand,
    renderExpandedRow,
    rowClassName,
    onRowClick,
    onRowDoubleClick,
    bordered,
    hoverable,
  };

  return (
    <div
      className={cn(
        'flex flex-col bg-card rounded-lg overflow-hidden',
        bordered && 'border border-border',
        className
      )}
      style={{ height }}
      role="grid"
    >
      {/* Header */}
      <DataGridHeader
        columns={columns}
        gridTemplateColumns={gridTemplateColumns}
        selectable={selectable}
        expandable={expandable}
        selectedKeys={selectedKeys}
        totalRows={displayData.length}
        onSelectAll={handleSelectAll}
        sortField={sortField}
        sortDirection={sortDirection}
        onSort={onSort}
        bordered={bordered}
      />

      {/* Group headers (if grouping enabled) */}
      {groupedData && renderGroupHeader && renderGroupHeaders()}

      {/* Body - conditionally virtualized */}
      {displayData.length === 0 ? (
        <div className="flex items-center justify-center py-12 text-muted-foreground">
          {emptyMessage}
        </div>
      ) : shouldVirtualize ? (
        <VirtualBody {...bodyProps} rowHeight={rowHeight} overscan={overscan} />
      ) : (
        <StandardBody {...bodyProps} />
      )}

      {/* Footer */}
      {renderFooter && (
        <div
          className={cn(
            'border-t border-border bg-muted/30',
            bordered && 'border-x border-b'
          )}
        >
          {renderFooter()}
        </div>
      )}
    </div>
  );
}

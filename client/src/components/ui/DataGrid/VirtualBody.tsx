import { memo, useCallback, useRef, ReactNode } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { cn } from '@/lib/utils';
import type { Column } from './types';
import { DataGridRow } from './DataGridRow';

interface VirtualBodyProps<T> {
  data: T[];
  columns: Column<T>[];
  getRowKey: (row: T) => string;
  gridTemplateColumns: string;
  rowHeight: number;
  overscan: number;
  selectable: boolean;
  selectedKeys: Set<string>;
  onSelect?: (key: string, selected: boolean) => void;
  expandable: boolean;
  expandedKeys: Set<string>;
  onExpand?: (key: string, expanded: boolean) => void;
  renderExpandedRow?: (row: T) => ReactNode;
  rowClassName?: string | ((row: T, index: number) => string);
  onRowClick?: (row: T, index: number) => void;
  onRowDoubleClick?: (row: T, index: number) => void;
  bordered: boolean;
  hoverable: boolean;
}

function VirtualBodyInner<T>({
  data,
  columns,
  getRowKey,
  gridTemplateColumns,
  rowHeight,
  overscan,
  selectable,
  selectedKeys,
  onSelect,
  expandable,
  expandedKeys,
  onExpand,
  renderExpandedRow,
  rowClassName,
  onRowClick,
  onRowDoubleClick,
  bordered,
  hoverable,
}: VirtualBodyProps<T>) {
  const parentRef = useRef<HTMLDivElement>(null);

  const getRowClassName = useCallback(
    (row: T, index: number): string | undefined => {
      if (!rowClassName) return undefined;
      if (typeof rowClassName === 'function') {
        return rowClassName(row, index);
      }
      return rowClassName;
    },
    [rowClassName]
  );

  // Calculate row height including expanded content
  const estimateSize = useCallback(
    (index: number) => {
      const row = data[index];
      const key = getRowKey(row);
      const isExpanded = expandedKeys.has(key);
      // Base row height + estimated expanded content height
      return isExpanded ? rowHeight * 4 : rowHeight;
    },
    [data, getRowKey, expandedKeys, rowHeight]
  );

  const virtualizer = useVirtualizer({
    count: data.length,
    getScrollElement: () => parentRef.current,
    estimateSize,
    overscan,
    getItemKey: (index) => getRowKey(data[index]),
  });

  const virtualItems = virtualizer.getVirtualItems();

  return (
    <div
      ref={parentRef}
      className={cn('flex-1 overflow-auto')}
      role="rowgroup"
    >
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualItems.map((virtualRow) => {
          const row = data[virtualRow.index];
          const key = getRowKey(row);
          return (
            <div
              key={key}
              data-index={virtualRow.index}
              ref={virtualizer.measureElement}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              <DataGridRow
                row={row}
                rowKey={key}
                rowIndex={virtualRow.index}
                columns={columns}
                gridTemplateColumns={gridTemplateColumns}
                selectable={selectable}
                isSelected={selectedKeys.has(key)}
                onSelect={onSelect}
                expandable={expandable}
                isExpanded={expandedKeys.has(key)}
                onExpand={onExpand}
                renderExpandedRow={renderExpandedRow}
                rowClassName={getRowClassName(row, virtualRow.index)}
                onClick={
                  onRowClick
                    ? () => onRowClick(row, virtualRow.index)
                    : undefined
                }
                onDoubleClick={
                  onRowDoubleClick
                    ? () => onRowDoubleClick(row, virtualRow.index)
                    : undefined
                }
                bordered={bordered}
                hoverable={hoverable}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

export const VirtualBody = memo(VirtualBodyInner) as typeof VirtualBodyInner;

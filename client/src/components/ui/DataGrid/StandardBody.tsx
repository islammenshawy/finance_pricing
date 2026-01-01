import { memo, useCallback, ReactNode } from 'react';
import { cn } from '@/lib/utils';
import type { Column } from './types';
import { DataGridRow } from './DataGridRow';

interface StandardBodyProps<T> {
  data: T[];
  columns: Column<T>[];
  getRowKey: (row: T) => string;
  gridTemplateColumns: string;
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

function StandardBodyInner<T>({
  data,
  columns,
  getRowKey,
  gridTemplateColumns,
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
}: StandardBodyProps<T>) {
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

  return (
    <div className={cn('flex-1 overflow-auto')} role="rowgroup">
      {data.map((row, index) => {
        const key = getRowKey(row);
        return (
          <DataGridRow
            key={key}
            row={row}
            rowKey={key}
            rowIndex={index}
            columns={columns}
            gridTemplateColumns={gridTemplateColumns}
            selectable={selectable}
            isSelected={selectedKeys.has(key)}
            onSelect={onSelect}
            expandable={expandable}
            isExpanded={expandedKeys.has(key)}
            onExpand={onExpand}
            renderExpandedRow={renderExpandedRow}
            rowClassName={getRowClassName(row, index)}
            onClick={onRowClick ? () => onRowClick(row, index) : undefined}
            onDoubleClick={
              onRowDoubleClick ? () => onRowDoubleClick(row, index) : undefined
            }
            bordered={bordered}
            hoverable={hoverable}
          />
        );
      })}
    </div>
  );
}

export const StandardBody = memo(StandardBodyInner) as typeof StandardBodyInner;

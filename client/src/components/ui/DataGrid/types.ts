import { ReactNode } from 'react';

/**
 * Header props passed to header render functions
 */
export interface HeaderProps {
  column: Column<unknown>;
  sortField?: string;
  sortDirection?: 'asc' | 'desc';
  onSort?: (field: string) => void;
}

/**
 * Column definition for DataGrid
 */
export interface Column<T> {
  /** Unique identifier for the column */
  id: string;
  /** Header content - can be string, ReactNode, or render function */
  header: ReactNode | ((props: HeaderProps) => ReactNode);
  /** Cell renderer function */
  cell: (row: T, rowIndex: number) => ReactNode;
  /** Column width - CSS value (e.g., '100px', '1fr') or number (px) */
  width?: string | number;
  /** Minimum width in pixels */
  minWidth?: number;
  /** Text alignment within cells */
  align?: 'left' | 'center' | 'right';
  /** Whether column is sortable */
  sortable?: boolean;
  /** Sort key - property name or function to extract sort value */
  sortKey?: keyof T | ((row: T) => unknown);
  /** Additional CSS class for this column's cells */
  className?: string;
}

/**
 * DataGrid component props
 */
export interface DataGridProps<T> {
  // Required
  /** Array of data items to display */
  data: T[];
  /** Column definitions */
  columns: Column<T>[];
  /** Function to get unique key for each row */
  getRowKey: (row: T) => string;

  // Virtual scrolling
  /** Number of items threshold to enable virtualization (default: 50) */
  virtualizeThreshold?: number;
  /** Row height in pixels for virtual scrolling (default: 44) */
  rowHeight?: number;
  /** Number of rows to render outside viewport (default: 5) */
  overscan?: number;

  // Selection
  /** Enable row selection with checkboxes */
  selectable?: boolean;
  /** Set of selected row keys */
  selectedKeys?: Set<string>;
  /** Callback when selection changes */
  onSelectionChange?: (keys: Set<string>) => void;

  // Expansion
  /** Enable row expansion */
  expandable?: boolean;
  /** Set of expanded row keys */
  expandedKeys?: Set<string>;
  /** Callback when expansion changes */
  onExpansionChange?: (keys: Set<string>) => void;
  /** Render function for expanded row content */
  renderExpandedRow?: (row: T) => ReactNode;

  // Sorting
  /** Current sort field */
  sortField?: string;
  /** Current sort direction */
  sortDirection?: 'asc' | 'desc';
  /** Callback when sort changes */
  onSort?: (field: string, direction: 'asc' | 'desc') => void;

  // Grouping
  /** Function to determine group key for each row */
  groupBy?: (row: T) => string;
  /** Render function for group headers */
  renderGroupHeader?: (groupKey: string, rows: T[]) => ReactNode;
  /** Set of collapsed group keys */
  collapsedGroups?: Set<string>;
  /** Callback when group collapse state changes */
  onGroupCollapseChange?: (groupKey: string, collapsed: boolean) => void;

  // Styling
  /** Additional CSS class for the grid container */
  className?: string;
  /** CSS class for rows - string or function for conditional styling */
  rowClassName?: string | ((row: T, index: number) => string);
  /** Height of the grid container (required for virtual scrolling) */
  height?: string | number;
  /** Whether to show borders between rows */
  bordered?: boolean;
  /** Whether to show alternating row colors */
  striped?: boolean;
  /** Whether rows are hoverable */
  hoverable?: boolean;

  // Footer
  /** Render function for footer content */
  renderFooter?: () => ReactNode;

  // Empty state
  /** Content to display when data is empty */
  emptyMessage?: ReactNode;

  // Event handlers
  /** Callback when a row is clicked */
  onRowClick?: (row: T, index: number) => void;
  /** Callback when a row is double-clicked */
  onRowDoubleClick?: (row: T, index: number) => void;
}

/**
 * Internal row item used for rendering (includes group headers)
 */
export type RowItem<T> =
  | { type: 'row'; data: T; key: string; index: number }
  | { type: 'group-header'; groupKey: string; rows: T[] };

/**
 * Context for DataGrid internal components
 */
export interface DataGridContextValue<T> {
  columns: Column<T>[];
  getRowKey: (row: T) => string;
  selectable: boolean;
  selectedKeys: Set<string>;
  onSelectionChange?: (keys: Set<string>) => void;
  expandable: boolean;
  expandedKeys: Set<string>;
  onExpansionChange?: (keys: Set<string>) => void;
  renderExpandedRow?: (row: T) => ReactNode;
  sortField?: string;
  sortDirection?: 'asc' | 'desc';
  onSort?: (field: string, direction: 'asc' | 'desc') => void;
  rowClassName?: string | ((row: T, index: number) => string);
  onRowClick?: (row: T, index: number) => void;
  onRowDoubleClick?: (row: T, index: number) => void;
  bordered: boolean;
  hoverable: boolean;
  gridTemplateColumns: string;
}

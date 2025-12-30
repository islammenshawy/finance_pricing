import type { ReactNode } from 'react';

/**
 * Column alignment options
 */
export type ColumnAlign = 'left' | 'center' | 'right';

/**
 * Sort direction
 */
export type SortDirection = 'asc' | 'desc';

/**
 * Column definition for the grid
 * @template TRow - The row data type
 */
export interface ColumnDef<TRow> {
  /** Unique column identifier */
  id: string;
  /** Column header label */
  header: string;
  /** Column width (CSS value or number for pixels) */
  width?: string | number;
  /** Minimum column width */
  minWidth?: number;
  /** Maximum column width */
  maxWidth?: number;
  /** Column alignment */
  align?: ColumnAlign;
  /** Whether the column is sortable */
  sortable?: boolean;
  /** Whether the column is resizable */
  resizable?: boolean;
  /** Whether the column is visible by default */
  visible?: boolean;
  /** Whether the column can be hidden */
  hideable?: boolean;
  /** Custom cell renderer */
  cell?: (row: TRow, rowIndex: number) => ReactNode;
  /** Value accessor for sorting/filtering */
  accessor?: (row: TRow) => unknown;
  /** Custom header renderer */
  headerCell?: () => ReactNode;
  /** CSS class for the column */
  className?: string;
  /** Whether this column is sticky */
  sticky?: 'left' | 'right';
}

/**
 * Group configuration for grouping rows
 * @template TRow - The row data type
 */
export interface GroupConfig<TRow> {
  /** Field to group by */
  field: keyof TRow | ((row: TRow) => string);
  /** Custom group header renderer */
  headerRenderer?: (groupKey: string, rows: TRow[]) => ReactNode;
  /** Whether groups are collapsible */
  collapsible?: boolean;
  /** Whether groups start expanded */
  defaultExpanded?: boolean;
  /** Custom group key getter */
  getGroupKey?: (row: TRow) => string;
}

/**
 * Selection configuration
 */
export interface SelectionConfig {
  /** Selection mode */
  mode: 'none' | 'single' | 'multiple';
  /** Whether to show checkbox column */
  showCheckbox?: boolean;
  /** Whether header has select all checkbox */
  showSelectAll?: boolean;
  /** Checkbox column position */
  checkboxPosition?: 'left' | 'right';
}

/**
 * Row expansion configuration
 * @template TRow - The row data type
 */
export interface ExpansionConfig<TRow> {
  /** Whether rows are expandable */
  enabled: boolean;
  /** Custom expanded content renderer */
  expandedContent: (row: TRow) => ReactNode;
  /** Whether multiple rows can be expanded at once */
  allowMultiple?: boolean;
  /** Whether to show expand icon */
  showExpandIcon?: boolean;
  /** Expand icon position */
  expandIconPosition?: 'left' | 'right';
}

/**
 * Virtual scrolling configuration
 */
export interface VirtualScrollConfig {
  /** Enable virtual scrolling */
  enabled: boolean;
  /** Estimated row height for virtualization */
  rowHeight: number;
  /** Expanded row height */
  expandedRowHeight?: number;
  /** Overscan count (rows to render outside visible area) */
  overscan?: number;
}

/**
 * Grid event handlers
 * @template TRow - The row data type
 */
export interface GridEvents<TRow> {
  /** Called when row selection changes */
  onSelectionChange?: (selectedRows: TRow[], selectedIds: Set<string>) => void;
  /** Called when a row is clicked */
  onRowClick?: (row: TRow, event: React.MouseEvent) => void;
  /** Called when a row is double-clicked */
  onRowDoubleClick?: (row: TRow, event: React.MouseEvent) => void;
  /** Called when sort changes */
  onSortChange?: (columnId: string | null, direction: SortDirection) => void;
  /** Called when a row is expanded/collapsed */
  onRowExpand?: (row: TRow, expanded: boolean) => void;
  /** Called when a group is expanded/collapsed */
  onGroupExpand?: (groupKey: string, expanded: boolean) => void;
  /** Called when a cell value changes (for editable cells) */
  onCellChange?: (row: TRow, columnId: string, newValue: unknown, oldValue: unknown) => void;
  /** Called when column visibility changes */
  onColumnVisibilityChange?: (columnId: string, visible: boolean) => void;
  /** Called when column order changes */
  onColumnOrderChange?: (columnIds: string[]) => void;
  /** Called when column width changes */
  onColumnResize?: (columnId: string, width: number) => void;
}

/**
 * Row styling configuration
 * @template TRow - The row data type
 */
export interface RowStyling<TRow> {
  /** Custom row class name */
  getRowClassName?: (row: TRow, index: number) => string;
  /** Custom row style */
  getRowStyle?: (row: TRow, index: number) => React.CSSProperties;
  /** Whether the row is disabled */
  isRowDisabled?: (row: TRow) => boolean;
  /** Whether the row is selectable */
  isRowSelectable?: (row: TRow) => boolean;
}

/**
 * Grid state (can be controlled externally)
 */
export interface GridState {
  /** Currently selected row IDs */
  selectedIds?: Set<string>;
  /** Currently expanded row IDs */
  expandedIds?: Set<string>;
  /** Currently expanded group keys */
  expandedGroups?: Set<string>;
  /** Current sort column */
  sortColumn?: string | null;
  /** Current sort direction */
  sortDirection?: SortDirection;
  /** Column visibility */
  columnVisibility?: Record<string, boolean>;
  /** Column order */
  columnOrder?: string[];
}

/**
 * Main DataGrid props
 * @template TRow - The row data type
 */
export interface DataGridProps<TRow> {
  /** Row data array */
  data: TRow[];
  /** Column definitions */
  columns: ColumnDef<TRow>[];
  /** Function to get unique row ID */
  getRowId: (row: TRow) => string;

  // Grouping
  /** Group configuration */
  groupBy?: GroupConfig<TRow> | null;

  // Selection
  /** Selection configuration */
  selection?: SelectionConfig;

  // Expansion
  /** Row expansion configuration */
  expansion?: ExpansionConfig<TRow>;

  // Virtual scrolling
  /** Virtual scroll configuration */
  virtualScroll?: VirtualScrollConfig;

  // Sorting
  /** Whether sorting is enabled */
  sortable?: boolean;
  /** Default sort column */
  defaultSortColumn?: string;
  /** Default sort direction */
  defaultSortDirection?: SortDirection;

  // Styling
  /** Row styling configuration */
  rowStyling?: RowStyling<TRow>;
  /** Grid container class name */
  className?: string;
  /** Grid container style */
  style?: React.CSSProperties;
  /** Whether to show grid lines */
  showGridLines?: boolean;
  /** Whether to stripe alternate rows */
  stripedRows?: boolean;
  /** Whether header is sticky */
  stickyHeader?: boolean;

  // State (controlled mode)
  /** Controlled grid state */
  state?: GridState;

  // Events
  /** Event handlers */
  events?: GridEvents<TRow>;

  // Loading/Empty states
  /** Whether data is loading */
  loading?: boolean;
  /** Custom loading component */
  loadingComponent?: ReactNode;
  /** Custom empty state component */
  emptyComponent?: ReactNode;

  // Header/Footer
  /** Custom header content (above column headers) */
  headerContent?: ReactNode;
  /** Custom footer content */
  footerContent?: ReactNode;

  // Accessibility
  /** Accessible label for the grid */
  ariaLabel?: string;
}

/**
 * Group header props passed to custom group header renderer
 */
export interface GroupHeaderProps<TRow> {
  groupKey: string;
  rows: TRow[];
  isExpanded: boolean;
  onToggle: () => void;
  selectedCount: number;
  totalCount: number;
}

/**
 * Cell props passed to custom cell renderers
 */
export interface CellProps<TRow, TValue = unknown> {
  row: TRow;
  value: TValue;
  rowIndex: number;
  columnId: string;
  isSelected: boolean;
  isExpanded: boolean;
  onChange?: (newValue: TValue) => void;
}

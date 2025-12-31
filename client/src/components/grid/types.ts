/**
 * @fileoverview DataGrid Type Definitions
 *
 * This file contains all TypeScript interfaces and types for the DataGrid component.
 * The DataGrid is a highly configurable, AG-Grid-like component that supports:
 * - Virtual scrolling for large datasets
 * - Column resizing, reordering, and pinning
 * - Row selection (single/multiple)
 * - Row grouping with aggregations
 * - Inline cell editing
 * - Sorting and filtering
 * - Custom cell renderers
 * - Keyboard navigation
 *
 * @example Basic Usage
 * ```tsx
 * import { DataGrid, type ColumnDef } from '@/components/grid';
 *
 * interface User {
 *   id: string;
 *   name: string;
 *   email: string;
 *   status: 'active' | 'inactive';
 * }
 *
 * const columns: ColumnDef<User>[] = [
 *   { id: 'name', header: 'Name', accessor: (row) => row.name, sortable: true },
 *   { id: 'email', header: 'Email', accessor: (row) => row.email },
 *   {
 *     id: 'status',
 *     header: 'Status',
 *     cell: (row) => <StatusBadge status={row.status} />
 *   },
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

import type { ReactNode, CSSProperties } from 'react';

// =============================================================================
// COLUMN TYPES
// =============================================================================

/**
 * Column alignment options for cell content
 */
export type ColumnAlign = 'left' | 'center' | 'right';

/**
 * Column pin position - allows freezing columns to left or right edge
 */
export type ColumnPinPosition = 'left' | 'right' | null;

/**
 * Filter type for column filtering
 */
export type FilterType = 'text' | 'number' | 'date' | 'select' | 'boolean' | 'custom';

/**
 * Cell editor type for inline editing
 */
export type EditorType = 'text' | 'number' | 'select' | 'date' | 'checkbox' | 'custom';

/**
 * Sort direction for column sorting
 */
export type SortDirection = 'asc' | 'desc';

/**
 * Column filter configuration
 * @template TRow - The row data type
 *
 * @example Text Filter
 * ```tsx
 * filter: {
 *   type: 'text',
 *   placeholder: 'Search...',
 *   filterFn: (row, filterValue) => row.name.toLowerCase().includes(filterValue.toLowerCase())
 * }
 * ```
 *
 * @example Select Filter
 * ```tsx
 * filter: {
 *   type: 'select',
 *   options: [
 *     { label: 'Active', value: 'active' },
 *     { label: 'Inactive', value: 'inactive' }
 *   ]
 * }
 * ```
 */
export interface ColumnFilter<TRow> {
  /** Filter input type */
  type: FilterType;
  /** Placeholder text for filter input */
  placeholder?: string;
  /** Options for select filter type */
  options?: Array<{ label: string; value: string | number | boolean }>;
  /** Custom filter function - return true to include row */
  filterFn?: (row: TRow, filterValue: unknown) => boolean;
  /** Debounce delay in ms for filter input (default: 300) */
  debounceMs?: number;
}

/**
 * Cell editor configuration for inline editing
 * @template TRow - The row data type
 * @template TValue - The cell value type
 *
 * @example Number Editor
 * ```tsx
 * editor: {
 *   type: 'number',
 *   min: 0,
 *   max: 100,
 *   step: 0.01,
 *   onSave: async (row, newValue) => {
 *     await api.updateUser(row.id, { score: newValue });
 *   }
 * }
 * ```
 *
 * @example Select Editor
 * ```tsx
 * editor: {
 *   type: 'select',
 *   options: [
 *     { label: 'Active', value: 'active' },
 *     { label: 'Inactive', value: 'inactive' }
 *   ]
 * }
 * ```
 */
export interface CellEditor<TRow, TValue = unknown> {
  /** Editor input type */
  type: EditorType;
  /** Options for select editor */
  options?: Array<{ label: string; value: TValue }>;
  /** Min value for number editor */
  min?: number;
  /** Max value for number editor */
  max?: number;
  /** Step for number editor */
  step?: number;
  /** Custom editor component */
  component?: (props: CellEditorProps<TRow, TValue>) => ReactNode;
  /** Validation function - return error message or null */
  validate?: (value: TValue, row: TRow) => string | null;
  /** Called when edit is saved - can be async for API calls */
  onSave?: (row: TRow, newValue: TValue, oldValue: TValue) => void | Promise<void>;
  /** Called when edit is cancelled */
  onCancel?: (row: TRow) => void;
}

/**
 * Props passed to custom cell editor components
 */
export interface CellEditorProps<TRow, TValue = unknown> {
  row: TRow;
  value: TValue;
  onChange: (value: TValue) => void;
  onSave: () => void;
  onCancel: () => void;
  column: ColumnDef<TRow>;
}

/**
 * Column definition - the main configuration for each grid column
 * @template TRow - The row data type
 *
 * @example Complete Column Definition
 * ```tsx
 * const column: ColumnDef<User> = {
 *   id: 'salary',
 *   header: 'Annual Salary',
 *   accessor: (row) => row.salary,
 *   width: 150,
 *   minWidth: 100,
 *   maxWidth: 300,
 *   align: 'right',
 *   sortable: true,
 *   resizable: true,
 *   pinned: 'left',
 *   cell: (row) => formatCurrency(row.salary),
 *   editor: {
 *     type: 'number',
 *     min: 0,
 *     onSave: async (row, value) => await updateSalary(row.id, value)
 *   },
 *   filter: {
 *     type: 'number',
 *     placeholder: 'Min salary...'
 *   },
 *   aggregation: 'sum',
 *   cellClassName: (row) => row.salary > 100000 ? 'text-green-600' : '',
 * };
 * ```
 */
export interface ColumnDef<TRow> {
  /** Unique column identifier - must be unique across all columns */
  id: string;

  /** Column header label displayed in header row */
  header: string;

  /**
   * Column width - can be number (pixels) or string (CSS value like '1fr', '20%')
   * @default '1fr' (flexible)
   */
  width?: string | number;

  /** Minimum column width in pixels when resizing */
  minWidth?: number;

  /** Maximum column width in pixels when resizing */
  maxWidth?: number;

  /**
   * Cell content alignment
   * @default 'left'
   */
  align?: ColumnAlign;

  /**
   * Whether column is sortable
   * @default true (inherits from grid sortable prop)
   */
  sortable?: boolean;

  /**
   * Whether column is resizable by dragging
   * @default true
   */
  resizable?: boolean;

  /**
   * Whether column is visible
   * @default true
   */
  visible?: boolean;

  /**
   * Whether column can be hidden via column menu
   * @default true
   */
  hideable?: boolean;

  /**
   * Whether column can be reordered via drag and drop
   * @default true
   */
  reorderable?: boolean;

  /**
   * Pin column to left or right edge (frozen column)
   * @default null (not pinned)
   */
  pinned?: ColumnPinPosition;

  /**
   * Custom cell renderer function
   * Use this for custom formatting, icons, badges, etc.
   *
   * @example
   * ```tsx
   * cell: (row, rowIndex) => (
   *   <div className="flex items-center gap-2">
   *     <Avatar src={row.avatar} />
   *     <span>{row.name}</span>
   *   </div>
   * )
   * ```
   */
  cell?: (row: TRow, rowIndex: number) => ReactNode;

  /**
   * Value accessor for sorting, filtering, and default cell display
   * Required if using sorting/filtering without custom cell renderer
   *
   * @example
   * ```tsx
   * accessor: (row) => row.user.profile.displayName
   * ```
   */
  accessor?: (row: TRow) => unknown;

  /**
   * Custom header renderer - use for complex headers with icons, tooltips, etc.
   *
   * @example
   * ```tsx
   * headerCell: () => (
   *   <div className="flex items-center gap-1">
   *     <DollarIcon />
   *     <span>Revenue</span>
   *     <Tooltip content="Total revenue in USD" />
   *   </div>
   * )
   * ```
   */
  headerCell?: () => ReactNode;

  /** CSS class for all cells in this column */
  className?: string;

  /**
   * Dynamic CSS class based on row data
   *
   * @example
   * ```tsx
   * cellClassName: (row) => row.isOverdue ? 'bg-red-100' : ''
   * ```
   */
  cellClassName?: (row: TRow, rowIndex: number) => string;

  /**
   * Dynamic cell style based on row data
   *
   * @example
   * ```tsx
   * cellStyle: (row) => ({ color: row.trend > 0 ? 'green' : 'red' })
   * ```
   */
  cellStyle?: (row: TRow, rowIndex: number) => CSSProperties;

  /**
   * Column filter configuration
   * @see ColumnFilter
   */
  filter?: ColumnFilter<TRow>;

  /**
   * Cell editor configuration for inline editing
   * @see CellEditor
   */
  editor?: CellEditor<TRow>;

  /**
   * Aggregation function for grouped rows
   * Built-in: 'sum', 'avg', 'min', 'max', 'count', 'first', 'last'
   * Or provide custom function
   */
  aggregation?: 'sum' | 'avg' | 'min' | 'max' | 'count' | 'first' | 'last' | ((values: unknown[]) => unknown);

  /**
   * Format aggregated value for display in group header
   *
   * @example
   * ```tsx
   * aggregationFormatter: (value) => `Total: ${formatCurrency(value)}`
   * ```
   */
  aggregationFormatter?: (value: unknown) => ReactNode;

  /**
   * Tooltip content for column header
   */
  headerTooltip?: string;

  /**
   * Custom comparator for sorting
   * Return negative if a < b, positive if a > b, 0 if equal
   *
   * @example
   * ```tsx
   * comparator: (a, b) => a.lastName.localeCompare(b.lastName)
   * ```
   */
  comparator?: (a: TRow, b: TRow) => number;
}

// =============================================================================
// GROUPING TYPES
// =============================================================================

/**
 * Group configuration for row grouping
 * @template TRow - The row data type
 *
 * @example Group by Status with Custom Header
 * ```tsx
 * groupBy: {
 *   field: 'status',
 *   headerRenderer: (groupKey, rows) => (
 *     <div className="flex items-center gap-2">
 *       <StatusIcon status={groupKey} />
 *       <span>{groupKey}</span>
 *       <Badge>{rows.length} items</Badge>
 *       <span className="ml-auto">
 *         Total: {formatCurrency(rows.reduce((sum, r) => sum + r.amount, 0))}
 *       </span>
 *     </div>
 *   ),
 *   defaultExpanded: true,
 *   collapsible: true,
 * }
 * ```
 *
 * @example Group by Computed Field
 * ```tsx
 * groupBy: {
 *   field: (row) => row.date.getFullYear().toString(),
 *   getGroupKey: (row) => `year-${row.date.getFullYear()}`,
 * }
 * ```
 */
export interface GroupConfig<TRow> {
  /**
   * Field to group by - can be a key of TRow or a function
   *
   * @example Field name: `field: 'category'`
   * @example Function: `field: (row) => row.date.toLocaleDateString()`
   */
  field: keyof TRow | ((row: TRow) => string);

  /**
   * Custom group header renderer
   * Receives the group key and all rows in the group
   */
  headerRenderer?: (groupKey: string, rows: TRow[]) => ReactNode;

  /**
   * Whether groups can be collapsed
   * @default true
   */
  collapsible?: boolean;

  /**
   * Whether groups start expanded
   * @default true
   */
  defaultExpanded?: boolean;

  /**
   * Custom function to generate group key
   * Useful when field value needs transformation
   */
  getGroupKey?: (row: TRow) => string;

  /**
   * Custom sort function for group order
   * Return negative if a < b, positive if a > b, 0 if equal
   */
  groupSort?: (a: string, b: string) => number;

  /**
   * Show aggregated values in group header
   * @default true
   */
  showAggregations?: boolean;
}

// =============================================================================
// SELECTION TYPES
// =============================================================================

/**
 * Selection configuration
 *
 * @example Multiple Selection with Checkbox
 * ```tsx
 * selection: {
 *   mode: 'multiple',
 *   showCheckbox: true,
 *   showSelectAll: true,
 *   checkboxPosition: 'left',
 * }
 * ```
 *
 * @example Single Selection (Radio-style)
 * ```tsx
 * selection: {
 *   mode: 'single',
 *   showCheckbox: true,
 * }
 * ```
 */
export interface SelectionConfig {
  /**
   * Selection mode
   * - 'none': No selection allowed
   * - 'single': Only one row can be selected
   * - 'multiple': Multiple rows can be selected
   * @default 'none'
   */
  mode: 'none' | 'single' | 'multiple';

  /**
   * Show checkbox column for selection
   * @default false
   */
  showCheckbox?: boolean;

  /**
   * Show "select all" checkbox in header (only for multiple mode)
   * @default true
   */
  showSelectAll?: boolean;

  /**
   * Checkbox column position
   * @default 'left'
   */
  checkboxPosition?: 'left' | 'right';

  /**
   * Allow selection by clicking anywhere on the row
   * @default true
   */
  rowClickSelects?: boolean;

  /**
   * Preserve selection when data changes
   * @default true
   */
  preserveSelection?: boolean;
}

// =============================================================================
// EXPANSION TYPES
// =============================================================================

/**
 * Row expansion configuration
 * @template TRow - The row data type
 *
 * @example Expandable Row with Detail Panel
 * ```tsx
 * expansion: {
 *   enabled: true,
 *   expandedContent: (row) => (
 *     <div className="p-4 bg-muted">
 *       <h4>Order Details</h4>
 *       <OrderItemsTable items={row.items} />
 *       <OrderSummary order={row} />
 *     </div>
 *   ),
 *   allowMultiple: false,
 *   showExpandIcon: true,
 *   expandOnRowClick: false,
 * }
 * ```
 */
export interface ExpansionConfig<TRow> {
  /**
   * Enable row expansion
   * @default false
   */
  enabled: boolean;

  /**
   * Custom expanded content renderer
   * This is the content shown when a row is expanded
   */
  expandedContent: (row: TRow) => ReactNode;

  /**
   * Allow multiple rows to be expanded at once
   * @default true
   */
  allowMultiple?: boolean;

  /**
   * Show expand/collapse icon
   * @default true
   */
  showExpandIcon?: boolean;

  /**
   * Expand icon position
   * @default 'left'
   */
  expandIconPosition?: 'left' | 'right';

  /**
   * Expand row when clicking anywhere on the row
   * @default true
   */
  expandOnRowClick?: boolean;

  /**
   * Determine if a row is expandable
   * Return false to disable expansion for specific rows
   *
   * @example
   * ```tsx
   * isRowExpandable: (row) => row.items.length > 0
   * ```
   */
  isRowExpandable?: (row: TRow) => boolean;
}

// =============================================================================
// VIRTUAL SCROLLING TYPES
// =============================================================================

/**
 * Virtual scrolling configuration
 *
 * @example Basic Virtual Scrolling
 * ```tsx
 * virtualScroll: {
 *   enabled: true,
 *   rowHeight: 48,
 *   overscan: 10,
 * }
 * ```
 *
 * @example With Variable Row Heights
 * ```tsx
 * virtualScroll: {
 *   enabled: true,
 *   rowHeight: 48,
 *   expandedRowHeight: 300,
 *   overscan: 5,
 * }
 * ```
 */
export interface VirtualScrollConfig {
  /**
   * Enable virtual scrolling (recommended for 100+ rows)
   * @default true
   */
  enabled: boolean;

  /**
   * Estimated row height in pixels
   * Used for initial calculations before measurement
   * @default 44
   */
  rowHeight: number;

  /**
   * Height for expanded rows
   * @default 400
   */
  expandedRowHeight?: number;

  /**
   * Number of rows to render outside visible area
   * Higher values = smoother scrolling, more memory
   * @default 5
   */
  overscan?: number;
}

// =============================================================================
// PAGINATION TYPES
// =============================================================================

/**
 * Pagination configuration
 *
 * @example Client-side Pagination
 * ```tsx
 * pagination: {
 *   enabled: true,
 *   pageSize: 25,
 *   pageSizeOptions: [10, 25, 50, 100],
 *   showPageSizeSelector: true,
 * }
 * ```
 *
 * @example Server-side Pagination
 * ```tsx
 * pagination: {
 *   enabled: true,
 *   pageSize: 25,
 *   totalRows: serverData.total,
 *   currentPage: page,
 *   onPageChange: (page) => fetchPage(page),
 * }
 * ```
 */
export interface PaginationConfig {
  /**
   * Enable pagination
   * @default false (use virtual scrolling instead)
   */
  enabled: boolean;

  /**
   * Number of rows per page
   * @default 25
   */
  pageSize: number;

  /**
   * Available page size options
   * @default [10, 25, 50, 100]
   */
  pageSizeOptions?: number[];

  /**
   * Show page size selector dropdown
   * @default true
   */
  showPageSizeSelector?: boolean;

  /**
   * Total number of rows (for server-side pagination)
   * If not provided, calculated from data length
   */
  totalRows?: number;

  /**
   * Current page (0-indexed, for controlled mode)
   */
  currentPage?: number;

  /**
   * Callback when page changes
   */
  onPageChange?: (page: number) => void;

  /**
   * Callback when page size changes
   */
  onPageSizeChange?: (pageSize: number) => void;
}

// =============================================================================
// EVENT TYPES
// =============================================================================

/**
 * Grid event handlers
 * @template TRow - The row data type
 *
 * @example Complete Event Handling
 * ```tsx
 * events: {
 *   onSelectionChange: (rows, ids) => {
 *     setSelectedIds(ids);
 *     console.log(`Selected ${rows.length} rows`);
 *   },
 *   onRowClick: (row, event) => {
 *     if (event.ctrlKey) {
 *       openInNewTab(row.id);
 *     } else {
 *       navigateTo(row.id);
 *     }
 *   },
 *   onRowDoubleClick: (row) => openEditDialog(row),
 *   onSortChange: (column, direction) => {
 *     setSortState({ column, direction });
 *   },
 *   onCellChange: async (row, columnId, newValue, oldValue) => {
 *     await updateField(row.id, columnId, newValue);
 *     showToast('Saved!');
 *   },
 *   onColumnResize: (columnId, width) => {
 *     saveColumnWidth(columnId, width);
 *   },
 * }
 * ```
 */
export interface GridEvents<TRow> {
  /** Called when row selection changes */
  onSelectionChange?: (selectedRows: TRow[], selectedIds: Set<string>) => void;

  /** Called when a row is clicked */
  onRowClick?: (row: TRow, event: React.MouseEvent) => void;

  /** Called when a row is double-clicked */
  onRowDoubleClick?: (row: TRow, event: React.MouseEvent) => void;

  /** Called when a row is right-clicked (for context menu) */
  onRowContextMenu?: (row: TRow, event: React.MouseEvent) => void;

  /** Called when sort changes */
  onSortChange?: (columnId: string | null, direction: SortDirection) => void;

  /** Called when a row is expanded/collapsed */
  onRowExpand?: (row: TRow, expanded: boolean) => void;

  /** Called when a group is expanded/collapsed */
  onGroupExpand?: (groupKey: string, expanded: boolean) => void;

  /** Called when a cell value changes (for editable cells) */
  onCellChange?: (row: TRow, columnId: string, newValue: unknown, oldValue: unknown) => void;

  /** Called when cell editing starts */
  onCellEditStart?: (row: TRow, columnId: string) => void;

  /** Called when cell editing ends */
  onCellEditEnd?: (row: TRow, columnId: string, saved: boolean) => void;

  /** Called when column visibility changes */
  onColumnVisibilityChange?: (columnId: string, visible: boolean) => void;

  /** Called when column order changes (drag and drop) */
  onColumnOrderChange?: (columnIds: string[]) => void;

  /** Called when column width changes (resize) */
  onColumnResize?: (columnId: string, width: number) => void;

  /** Called when column is pinned/unpinned */
  onColumnPin?: (columnId: string, position: ColumnPinPosition) => void;

  /** Called when filter changes */
  onFilterChange?: (filters: Record<string, unknown>) => void;

  /** Called when data is needed (for server-side operations) */
  onDataRequest?: (params: DataRequestParams) => void;
}

/**
 * Parameters for server-side data requests
 */
export interface DataRequestParams {
  /** Current page (0-indexed) */
  page: number;
  /** Number of rows per page */
  pageSize: number;
  /** Current sort column */
  sortColumn: string | null;
  /** Current sort direction */
  sortDirection: SortDirection;
  /** Current filter values */
  filters: Record<string, unknown>;
  /** Search query (if global search is enabled) */
  searchQuery?: string;
}

// =============================================================================
// STYLING TYPES
// =============================================================================

/**
 * Row styling configuration
 * @template TRow - The row data type
 *
 * @example Dynamic Row Styling
 * ```tsx
 * rowStyling: {
 *   getRowClassName: (row, index) => {
 *     if (row.isError) return 'bg-red-50';
 *     if (row.isWarning) return 'bg-yellow-50';
 *     return index % 2 === 0 ? 'bg-white' : 'bg-gray-50';
 *   },
 *   getRowStyle: (row) => ({
 *     borderLeft: `4px solid ${row.priorityColor}`,
 *   }),
 *   isRowDisabled: (row) => row.status === 'archived',
 *   isRowSelectable: (row) => row.status !== 'locked',
 * }
 * ```
 */
export interface RowStyling<TRow> {
  /**
   * Dynamic row class name
   * Called for each row to determine CSS classes
   */
  getRowClassName?: (row: TRow, index: number) => string;

  /**
   * Dynamic row style
   * Called for each row to determine inline styles
   */
  getRowStyle?: (row: TRow, index: number) => CSSProperties;

  /**
   * Determine if a row is disabled (non-interactive)
   */
  isRowDisabled?: (row: TRow) => boolean;

  /**
   * Determine if a row can be selected
   */
  isRowSelectable?: (row: TRow) => boolean;

  /**
   * Row height override for specific rows
   * Useful for rows with variable content
   */
  getRowHeight?: (row: TRow) => number;
}

// =============================================================================
// STATE TYPES
// =============================================================================

/**
 * Grid state (for controlled mode)
 *
 * @example Controlled Grid State
 * ```tsx
 * const [gridState, setGridState] = useState<GridState>({
 *   selectedIds: new Set(),
 *   expandedIds: new Set(),
 *   sortColumn: 'name',
 *   sortDirection: 'asc',
 *   columnVisibility: { email: false },
 *   columnOrder: ['name', 'status', 'email'],
 * });
 *
 * <DataGrid
 *   data={data}
 *   columns={columns}
 *   state={gridState}
 *   events={{
 *     onSelectionChange: (_, ids) => setGridState(s => ({ ...s, selectedIds: ids })),
 *     onSortChange: (col, dir) => setGridState(s => ({ ...s, sortColumn: col, sortDirection: dir })),
 *   }}
 * />
 * ```
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

  /** Column visibility state */
  columnVisibility?: Record<string, boolean>;

  /** Column order (array of column IDs) */
  columnOrder?: string[];

  /** Column widths */
  columnWidths?: Record<string, number>;

  /** Pinned columns */
  pinnedColumns?: Record<string, ColumnPinPosition>;

  /** Current filter values */
  filters?: Record<string, unknown>;

  /** Current page (for pagination) */
  currentPage?: number;

  /** Current page size (for pagination) */
  pageSize?: number;
}

// =============================================================================
// MAIN PROPS TYPE
// =============================================================================

/**
 * Main DataGrid component props
 * @template TRow - The row data type
 *
 * @example Minimal Usage
 * ```tsx
 * <DataGrid
 *   data={users}
 *   columns={columns}
 *   getRowId={(user) => user.id}
 * />
 * ```
 *
 * @example Full Featured Grid
 * ```tsx
 * <DataGrid
 *   data={loans}
 *   columns={loanColumns}
 *   getRowId={(loan) => loan.id}
 *
 *   // Grouping
 *   groupBy={{
 *     field: 'currency',
 *     headerRenderer: (currency, rows) => (
 *       <GroupHeader currency={currency} total={sum(rows, 'amount')} />
 *     ),
 *   }}
 *
 *   // Selection
 *   selection={{
 *     mode: 'multiple',
 *     showCheckbox: true,
 *   }}
 *
 *   // Expansion
 *   expansion={{
 *     enabled: true,
 *     expandedContent: (loan) => <LoanDetails loan={loan} />,
 *   }}
 *
 *   // Virtual scrolling (for large datasets)
 *   virtualScroll={{
 *     enabled: true,
 *     rowHeight: 48,
 *   }}
 *
 *   // Sorting
 *   sortable={true}
 *   defaultSortColumn="loanNumber"
 *   defaultSortDirection="asc"
 *
 *   // Styling
 *   stripedRows={true}
 *   showGridLines={true}
 *   rowStyling={{
 *     isRowDisabled: (loan) => loan.status === 'closed',
 *   }}
 *
 *   // Events
 *   events={{
 *     onSelectionChange: handleSelectionChange,
 *     onCellChange: handleCellEdit,
 *     onRowDoubleClick: handleRowDoubleClick,
 *   }}
 *
 *   // Controlled state
 *   state={gridState}
 *
 *   // Loading/Empty states
 *   loading={isLoading}
 *   loadingComponent={<Spinner />}
 *   emptyComponent={<EmptyState message="No loans found" />}
 * />
 * ```
 */
export interface DataGridProps<TRow> {
  // === DATA ===
  /** Row data array */
  data: TRow[];

  /** Column definitions */
  columns: ColumnDef<TRow>[];

  /**
   * Function to get unique row ID
   * IMPORTANT: Must return stable, unique ID for each row
   */
  getRowId: (row: TRow) => string;

  // === GROUPING ===
  /** Group configuration (set to null to disable grouping) */
  groupBy?: GroupConfig<TRow> | null;

  // === SELECTION ===
  /** Selection configuration */
  selection?: SelectionConfig;

  // === EXPANSION ===
  /** Row expansion configuration */
  expansion?: ExpansionConfig<TRow>;

  // === VIRTUAL SCROLLING ===
  /** Virtual scroll configuration */
  virtualScroll?: VirtualScrollConfig;

  // === PAGINATION ===
  /** Pagination configuration (alternative to virtual scrolling) */
  pagination?: PaginationConfig;

  // === SORTING ===
  /** Enable sorting globally */
  sortable?: boolean;

  /** Default sort column */
  defaultSortColumn?: string;

  /** Default sort direction */
  defaultSortDirection?: SortDirection;

  /** Enable multi-column sorting */
  multiSort?: boolean;

  // === FILTERING ===
  /** Enable column filters */
  filterable?: boolean;

  // === TOOLBAR ===
  /**
   * Toolbar configuration including search, quick filters, actions, export
   * @see ToolbarConfig
   */
  toolbar?: ToolbarConfig<TRow>;

  /**
   * Toolbar state (for controlled mode)
   */
  toolbarState?: ToolbarState;

  /**
   * Toolbar event handlers
   */
  toolbarEvents?: ToolbarEvents<TRow>;

  /**
   * @deprecated Use toolbar.search.enabled instead
   * Enable global search box
   */
  showGlobalSearch?: boolean;

  /**
   * @deprecated Use toolbar.search.placeholder instead
   * Global search placeholder
   */
  globalSearchPlaceholder?: string;

  // === STYLING ===
  /** Row styling configuration */
  rowStyling?: RowStyling<TRow>;

  /** Grid container class name */
  className?: string;

  /** Grid container style */
  style?: CSSProperties;

  /** Show grid lines between cells */
  showGridLines?: boolean;

  /** Alternate row colors (zebra stripes) */
  stripedRows?: boolean;

  /** Make header sticky when scrolling */
  stickyHeader?: boolean;

  /** Compact mode (reduced padding) */
  compact?: boolean;

  /** Grid density */
  density?: 'compact' | 'standard' | 'comfortable';

  // === STATE (CONTROLLED MODE) ===
  /** Controlled grid state */
  state?: GridState;

  // === EVENTS ===
  /** Event handlers */
  events?: GridEvents<TRow>;

  // === LOADING/EMPTY STATES ===
  /** Show loading state */
  loading?: boolean;

  /** Custom loading component */
  loadingComponent?: ReactNode;

  /** Custom empty state component */
  emptyComponent?: ReactNode;

  /** Custom error component */
  errorComponent?: ReactNode;

  // === HEADER/FOOTER ===
  /** Custom header content (above column headers) */
  headerContent?: ReactNode;

  /** Custom footer content */
  footerContent?: ReactNode;

  /** Show column menu (visibility, pinning, etc.) */
  showColumnMenu?: boolean;

  // === ACCESSIBILITY ===
  /** Accessible label for the grid */
  ariaLabel?: string;

  // === KEYBOARD NAVIGATION ===
  /** Enable keyboard navigation */
  keyboardNavigation?: boolean;

  /** Tab behavior: 'cell' navigates cells, 'row' navigates rows */
  tabBehavior?: 'cell' | 'row';
}

// =============================================================================
// HELPER TYPES
// =============================================================================

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
  aggregations?: Record<string, unknown>;
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
  isEditing: boolean;
  onChange?: (newValue: TValue) => void;
  startEdit?: () => void;
  stopEdit?: (save: boolean) => void;
}

/**
 * Context menu item configuration
 */
export interface ContextMenuItem<TRow> {
  id: string;
  label: string;
  icon?: ReactNode;
  disabled?: boolean | ((row: TRow) => boolean);
  onClick: (row: TRow) => void;
  divider?: boolean;
}

/**
 * Column menu configuration
 */
export interface ColumnMenuConfig {
  showHide?: boolean;
  showPin?: boolean;
  showFilter?: boolean;
  showSort?: boolean;
  customItems?: Array<{
    id: string;
    label: string;
    onClick: (columnId: string) => void;
  }>;
}

// =============================================================================
// TOOLBAR TYPES
// =============================================================================

/**
 * Search bar configuration for the grid toolbar
 *
 * @example Basic Search
 * ```tsx
 * search: {
 *   enabled: true,
 *   placeholder: 'Search loans...',
 *   debounceMs: 300,
 * }
 * ```
 *
 * @example Advanced Search with Server-side
 * ```tsx
 * search: {
 *   enabled: true,
 *   placeholder: 'Search by loan number, customer...',
 *   debounceMs: 500,
 *   minLength: 2,
 *   serverSide: true,
 *   onSearch: async (query) => {
 *     const results = await api.searchLoans(query);
 *     setFilteredData(results);
 *   },
 *   showClearButton: true,
 *   searchIcon: <SearchIcon className="w-4 h-4" />,
 * }
 * ```
 *
 * @example Search with Column Selection
 * ```tsx
 * search: {
 *   enabled: true,
 *   searchableColumns: ['loanNumber', 'customerName', 'status'],
 *   columnSelector: true,
 *   defaultSearchColumn: 'all',
 * }
 * ```
 */
export interface SearchConfig {
  /**
   * Enable search functionality
   * @default false
   */
  enabled: boolean;

  /**
   * Search input placeholder text
   * @default 'Search...'
   */
  placeholder?: string;

  /**
   * Debounce delay in milliseconds before triggering search
   * @default 300
   */
  debounceMs?: number;

  /**
   * Minimum characters required before search triggers
   * @default 1
   */
  minLength?: number;

  /**
   * Custom search icon element
   * @default Lucide Search icon
   */
  searchIcon?: ReactNode;

  /**
   * Show clear button when input has value
   * @default true
   */
  showClearButton?: boolean;

  /**
   * Show keyboard shortcut hint (e.g., "⌘K")
   * @default false
   */
  showShortcutHint?: boolean;

  /**
   * Keyboard shortcut to focus search (e.g., 'k' for Cmd+K / Ctrl+K)
   * @default 'k'
   */
  shortcutKey?: string;

  /**
   * Search position in toolbar
   * @default 'left'
   */
  position?: 'left' | 'center' | 'right';

  /**
   * Search input width
   * @default 250
   */
  width?: number | string;

  /**
   * Expand search input on focus
   * @default false
   */
  expandOnFocus?: boolean;

  /**
   * Expanded width when expandOnFocus is true
   * @default 400
   */
  expandedWidth?: number | string;

  /**
   * Use server-side search (disables client-side filtering)
   * When true, onSearch callback handles filtering
   * @default false
   */
  serverSide?: boolean;

  /**
   * Custom search handler (required for server-side search)
   * For client-side, this is called in addition to built-in filtering
   */
  onSearch?: (query: string) => void | Promise<void>;

  /**
   * Called when search is cleared
   */
  onClear?: () => void;

  /**
   * Columns to search in (client-side search)
   * If not specified, searches all string/number columns
   */
  searchableColumns?: string[];

  /**
   * Show column selector dropdown to filter search scope
   * @default false
   */
  columnSelector?: boolean;

  /**
   * Default search column when columnSelector is enabled
   * @default 'all'
   */
  defaultSearchColumn?: string | 'all';

  /**
   * Custom filter function for client-side search
   * Override default string matching behavior
   *
   * @example
   * ```tsx
   * filterFn: (row, query, columns) => {
   *   const q = query.toLowerCase();
   *   return row.name.toLowerCase().includes(q) ||
   *          row.tags.some(tag => tag.toLowerCase().includes(q));
   * }
   * ```
   */
  filterFn?: <TRow>(row: TRow, query: string, searchableColumns: string[]) => boolean;

  /**
   * Highlight matching text in cells
   * @default false
   */
  highlightMatches?: boolean;

  /**
   * CSS class for search container
   */
  className?: string;

  /**
   * CSS class for search input
   */
  inputClassName?: string;

  /**
   * Auto focus search input on mount
   * @default false
   */
  autoFocus?: boolean;
}

/**
 * Quick filter configuration for toolbar
 *
 * @example Status Filter Buttons
 * ```tsx
 * quickFilters: [
 *   { id: 'all', label: 'All', filter: () => true, default: true },
 *   { id: 'active', label: 'Active', filter: (row) => row.status === 'active' },
 *   { id: 'pending', label: 'Pending', filter: (row) => row.status === 'pending', badge: 5 },
 *   { id: 'closed', label: 'Closed', filter: (row) => row.status === 'closed' },
 * ]
 * ```
 */
export interface QuickFilter<TRow> {
  /** Unique filter identifier */
  id: string;

  /** Display label */
  label: string;

  /**
   * Filter function - return true to include row
   * For server-side filtering, this is used for display only
   */
  filter: (row: TRow) => boolean;

  /** Icon to display before label */
  icon?: ReactNode;

  /**
   * Badge count to show (e.g., number of matching items)
   * Can be a number or a function that receives all data
   */
  badge?: number | ((data: TRow[]) => number);

  /**
   * Whether this filter is selected by default
   * @default false
   */
  default?: boolean;

  /** Custom class for this filter button */
  className?: string;

  /** Tooltip text */
  tooltip?: string;

  /**
   * Hide this filter when condition is met
   */
  hidden?: boolean | ((data: TRow[]) => boolean);
}

/**
 * Toolbar action button configuration
 *
 * @example Export and Add Buttons
 * ```tsx
 * actions: [
 *   {
 *     id: 'add',
 *     label: 'Add Loan',
 *     icon: <PlusIcon />,
 *     variant: 'primary',
 *     onClick: () => openAddDialog(),
 *   },
 *   {
 *     id: 'export',
 *     label: 'Export',
 *     icon: <DownloadIcon />,
 *     variant: 'outline',
 *     onClick: () => exportToCSV(data),
 *   },
 *   {
 *     id: 'bulk-delete',
 *     label: 'Delete Selected',
 *     icon: <TrashIcon />,
 *     variant: 'destructive',
 *     showWhen: 'hasSelection',
 *     onClick: (selectedRows) => deleteRows(selectedRows),
 *   },
 * ]
 * ```
 */
export interface ToolbarAction<TRow> {
  /** Unique action identifier */
  id: string;

  /** Button label */
  label: string;

  /** Button icon */
  icon?: ReactNode;

  /**
   * Button visual variant
   * @default 'outline'
   */
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive';

  /**
   * Button size
   * @default 'default'
   */
  size?: 'sm' | 'default' | 'lg';

  /**
   * When to show this action
   * - 'always': Always visible
   * - 'hasSelection': Only when rows are selected
   * - 'noSelection': Only when no rows are selected
   * - Function: Custom visibility logic
   * @default 'always'
   */
  showWhen?: 'always' | 'hasSelection' | 'noSelection' | ((selectedRows: TRow[], data: TRow[]) => boolean);

  /**
   * Click handler
   * Receives selected rows (empty array if none selected)
   */
  onClick: (selectedRows: TRow[], data: TRow[]) => void;

  /** Disable button */
  disabled?: boolean | ((selectedRows: TRow[], data: TRow[]) => boolean);

  /** Tooltip text */
  tooltip?: string;

  /** Show loading spinner */
  loading?: boolean;

  /** Dropdown menu items (makes this a dropdown button) */
  dropdown?: Array<{
    id: string;
    label: string;
    icon?: ReactNode;
    onClick: (selectedRows: TRow[], data: TRow[]) => void;
    disabled?: boolean;
    divider?: boolean;
  }>;

  /** Position in toolbar */
  position?: 'left' | 'right';

  /** Custom class for this button */
  className?: string;
}

/**
 * Export configuration
 *
 * @example CSV and Excel Export
 * ```tsx
 * export: {
 *   enabled: true,
 *   formats: ['csv', 'excel', 'json'],
 *   filename: 'loans-export',
 *   includeHeaders: true,
 *   visibleColumnsOnly: true,
 *   onExport: (format, data, columns) => {
 *     // Custom export logic
 *   },
 * }
 * ```
 */
export interface ExportConfig<TRow> {
  /**
   * Enable export functionality
   * @default false
   */
  enabled: boolean;

  /**
   * Available export formats
   * @default ['csv']
   */
  formats?: Array<'csv' | 'excel' | 'json' | 'pdf'>;

  /**
   * Base filename (without extension)
   * @default 'export'
   */
  filename?: string | (() => string);

  /**
   * Include column headers in export
   * @default true
   */
  includeHeaders?: boolean;

  /**
   * Only export visible columns
   * @default true
   */
  visibleColumnsOnly?: boolean;

  /**
   * Only export selected rows (when rows are selected)
   * @default false
   */
  selectedRowsOnly?: boolean;

  /**
   * Custom export handler (overrides default export)
   */
  onExport?: (format: string, data: TRow[], columns: ColumnDef<TRow>[]) => void;

  /**
   * Show in toolbar as button or dropdown
   * @default 'dropdown'
   */
  display?: 'button' | 'dropdown';

  /**
   * Export button label
   * @default 'Export'
   */
  label?: string;

  /**
   * Export button icon
   */
  icon?: ReactNode;
}

/**
 * Column visibility toggle configuration
 */
export interface ColumnToggleConfig {
  /**
   * Enable column visibility toggle
   * @default false
   */
  enabled: boolean;

  /**
   * Show as button that opens dropdown
   * @default 'dropdown'
   */
  display?: 'dropdown' | 'panel';

  /**
   * Button label
   * @default 'Columns'
   */
  label?: string;

  /**
   * Button icon
   */
  icon?: ReactNode;

  /**
   * Show search in column list (for many columns)
   * @default false
   */
  searchable?: boolean;

  /**
   * Allow reordering columns via drag and drop
   * @default false
   */
  reorderable?: boolean;

  /**
   * Show "Reset" button to restore defaults
   * @default true
   */
  showReset?: boolean;
}

/**
 * Density selector configuration
 */
export interface DensityConfig {
  /**
   * Enable density selector
   * @default false
   */
  enabled: boolean;

  /**
   * Available density options
   * @default ['compact', 'standard', 'comfortable']
   */
  options?: Array<'compact' | 'standard' | 'comfortable'>;

  /**
   * Default density
   * @default 'standard'
   */
  defaultDensity?: 'compact' | 'standard' | 'comfortable';

  /**
   * Show labels or just icons
   * @default false
   */
  showLabels?: boolean;
}

/**
 * Full toolbar configuration
 * @template TRow - The row data type
 *
 * @example Complete Toolbar
 * ```tsx
 * toolbar: {
 *   enabled: true,
 *   position: 'top',
 *
 *   // Search
 *   search: {
 *     enabled: true,
 *     placeholder: 'Search loans...',
 *     debounceMs: 300,
 *     showClearButton: true,
 *   },
 *
 *   // Quick Filters
 *   quickFilters: [
 *     { id: 'all', label: 'All', filter: () => true, default: true },
 *     { id: 'active', label: 'Active', filter: (row) => row.status === 'active' },
 *   ],
 *
 *   // Action Buttons
 *   actions: [
 *     { id: 'add', label: 'Add', icon: <PlusIcon />, onClick: () => {} },
 *   ],
 *
 *   // Export
 *   export: {
 *     enabled: true,
 *     formats: ['csv', 'excel'],
 *   },
 *
 *   // Column Toggle
 *   columnToggle: {
 *     enabled: true,
 *   },
 *
 *   // Density Selector
 *   density: {
 *     enabled: true,
 *   },
 *
 *   // Custom Content
 *   leftContent: <Badge>Beta</Badge>,
 *   rightContent: <RefreshButton />,
 * }
 * ```
 */
export interface ToolbarConfig<TRow> {
  /**
   * Enable toolbar
   * @default true
   */
  enabled?: boolean;

  /**
   * Toolbar position
   * @default 'top'
   */
  position?: 'top' | 'bottom' | 'both';

  /**
   * Search configuration
   */
  search?: SearchConfig;

  /**
   * Quick filter buttons
   */
  quickFilters?: QuickFilter<TRow>[];

  /**
   * Allow multiple quick filters to be active
   * @default false
   */
  multipleQuickFilters?: boolean;

  /**
   * Action buttons
   */
  actions?: ToolbarAction<TRow>[];

  /**
   * Export configuration
   */
  export?: ExportConfig<TRow>;

  /**
   * Column visibility toggle
   */
  columnToggle?: ColumnToggleConfig;

  /**
   * Density selector
   */
  density?: DensityConfig;

  /**
   * Custom content on the left side of toolbar
   */
  leftContent?: ReactNode;

  /**
   * Custom content in the center of toolbar
   */
  centerContent?: ReactNode;

  /**
   * Custom content on the right side of toolbar
   */
  rightContent?: ReactNode;

  /**
   * Show row count (e.g., "Showing 25 of 100 rows")
   * @default true
   */
  showRowCount?: boolean;

  /**
   * Show selected count when rows are selected
   * @default true
   */
  showSelectedCount?: boolean;

  /**
   * Custom row count formatter
   *
   * @example
   * ```tsx
   * rowCountFormatter: (visible, total, selected) =>
   *   selected > 0
   *     ? `${selected} selected of ${total}`
   *     : `${visible} of ${total} loans`
   * ```
   */
  rowCountFormatter?: (visibleCount: number, totalCount: number, selectedCount: number) => string;

  /**
   * Sticky toolbar (stays visible when scrolling)
   * @default false
   */
  sticky?: boolean;

  /**
   * Toolbar height
   * @default 'auto'
   */
  height?: number | 'auto';

  /**
   * Toolbar padding
   * @default 'standard'
   */
  padding?: 'none' | 'sm' | 'standard' | 'lg';

  /**
   * Toolbar background
   * @default 'default'
   */
  background?: 'default' | 'transparent' | 'muted';

  /**
   * Show divider between toolbar and grid
   * @default true
   */
  showDivider?: boolean;

  /**
   * CSS class for toolbar container
   */
  className?: string;
}

/**
 * Toolbar state (for controlled mode)
 */
export interface ToolbarState {
  /** Current search query */
  searchQuery?: string;

  /** Active quick filter ID */
  activeQuickFilter?: string;

  /** Active quick filter IDs (when multipleQuickFilters is true) */
  activeQuickFilters?: string[];

  /** Current density setting */
  density?: 'compact' | 'standard' | 'comfortable';
}

/**
 * Toolbar event handlers
 */
export interface ToolbarEvents<TRow> {
  /** Called when search query changes */
  onSearchChange?: (query: string) => void;

  /** Called when quick filter changes */
  onQuickFilterChange?: (filterId: string | null) => void;

  /** Called when multiple quick filters change */
  onQuickFiltersChange?: (filterIds: string[]) => void;

  /** Called when density changes */
  onDensityChange?: (density: 'compact' | 'standard' | 'comfortable') => void;

  /** Called when column visibility changes via toolbar */
  onColumnVisibilityChange?: (columnId: string, visible: boolean) => void;

  /** Called when export is triggered */
  onExport?: (format: string, data: TRow[]) => void;
}

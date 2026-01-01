/**
 * @fileoverview Grid Components MFE Export
 *
 * Reusable data grid components with virtual scrolling, grouping,
 * selection, and inline editing capabilities.
 *
 * @module mfe/grid
 *
 * @example Basic Grid
 * ```tsx
 * import { DataGrid, GridToolbar } from 'loanPricing/grid';
 *
 * const columns = [
 *   { id: 'name', header: 'Name', accessor: (row) => row.name },
 *   { id: 'amount', header: 'Amount', accessor: (row) => row.amount, align: 'right' },
 * ];
 *
 * <DataGrid
 *   data={items}
 *   columns={columns}
 *   getRowKey={(row) => row.id}
 * />
 * ```
 *
 * @example With Toolbar and Virtual Scrolling
 * ```tsx
 * import { DataGrid, GridToolbar, CurrencyCell } from 'loanPricing/grid';
 *
 * <div className="h-[600px]">
 *   <GridToolbar
 *     config={{
 *       search: { enabled: true },
 *       quickFilters: [...],
 *     }}
 *     data={data}
 *     columns={columns}
 *   />
 *   <DataGrid
 *     data={filteredData}
 *     columns={columns}
 *     getRowKey={(row) => row.id}
 *     virtualScroll={{ enabled: true, rowHeight: 44 }}
 *     selection={{ enabled: true, mode: 'multiple' }}
 *   />
 * </div>
 * ```
 */

// =============================================================================
// MAIN GRID COMPONENT
// =============================================================================

export { DataGrid } from '@/components/grid/DataGrid';

// =============================================================================
// GRID SUB-COMPONENTS
// =============================================================================

export { GridHeader } from '@/components/grid/GridHeader';
export { GridRow } from '@/components/grid/GridRow';
export { GridGroupHeader } from '@/components/grid/GridGroupHeader';
export { GridToolbar } from '@/components/grid/GridToolbar';
export type { GridToolbarProps } from '@/components/grid/GridToolbar';
export { CollapsibleDataSection } from '@/components/grid/CollapsibleDataSection';
export type { CollapsibleDataSectionProps, SectionSearchConfig } from '@/components/grid/CollapsibleDataSection';

// =============================================================================
// REUSABLE CELL RENDERERS
// =============================================================================

export {
  EditableTextCell,
  EditableNumberCell,
  StatusBadgeCell,
  pricingStatusMap,
  CurrencyCell,
  CurrencyChangeCell,
  ActionCell,
  IconButtonCell,
} from '@/components/grid/cells';

// =============================================================================
// KEYBOARD NAVIGATION
// =============================================================================

export { useGridKeyboard } from '@/components/grid/useGridKeyboard';
export type { GridKeyboardOptions, GridKeyboardState, GridKeyboardReturn } from '@/components/grid/useGridKeyboard';

// =============================================================================
// TYPES - All exported for TypeScript consumers
// =============================================================================

export type {
  // Column configuration
  ColumnDef,
  ColumnAlign,
  ColumnPinPosition,
  FilterType,
  EditorType,
  SortDirection,
  ColumnFilter,
  CellEditor,
  CellEditorProps,

  // Grouping
  GroupConfig,

  // Selection
  SelectionConfig,

  // Expansion
  ExpansionConfig,

  // Virtual scrolling
  VirtualScrollConfig,

  // Pagination
  PaginationConfig,

  // Events
  GridEvents,
  DataRequestParams,

  // Styling
  RowStyling,

  // State
  GridState,

  // Main props
  DataGridProps,

  // Helpers
  GroupHeaderProps,
  CellProps,
  ContextMenuItem,
  ColumnMenuConfig,

  // Toolbar
  SearchConfig,
  QuickFilter,
  ToolbarAction,
  ExportConfig,
  ColumnToggleConfig,
  DensityConfig,
  ToolbarConfig,
  ToolbarState,
  ToolbarEvents,

  // Keyboard
  KeyboardConfig,
  KeyboardAction,
  KeyBinding,
} from '@/components/grid/types';

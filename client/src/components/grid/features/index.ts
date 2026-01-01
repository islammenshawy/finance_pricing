/**
 * @fileoverview Grid Features Barrel Export
 *
 * All grid features are exported from here.
 * Each feature can be lazy-loaded individually for optimal bundle size.
 *
 * @module grid/features
 */

// Column Resizing
export {
  useColumnResize,
  ColumnResizeHandle,
  type UseColumnResizeOptions,
  type UseColumnResizeReturn,
} from './ColumnResize';

// Cell Editing
export {
  useCellEditing,
  TextEditor,
  NumberEditor,
  SelectEditor,
  DateEditor,
  CheckboxEditor,
  InlineEditor,
  type CellEditorProps,
  type UseCellEditingOptions,
  type UseCellEditingReturn,
} from './CellEditor';

// Column Filtering
export {
  useColumnFilters,
  ColumnFilterButton,
  FilterBar,
  ActiveFilters,
  TEXT_OPERATORS,
  NUMBER_OPERATORS,
  DATE_OPERATORS,
  type FilterValue,
  type FilterOperator,
  type UseColumnFiltersOptions,
  type UseColumnFiltersReturn,
} from './ColumnFilter';

// Export
export {
  useExport,
  exportToCSV,
  exportToExcel,
  exportToJSON,
  exportToPDF,
  ExportButton,
  type ExportFormat,
  type ExportOptions,
  type UseExportOptions,
  type UseExportReturn,
} from './Export';

// Column Pinning
export {
  useColumnPinning,
  ColumnPinButton,
  getPinnedColumnStyles,
  type UseColumnPinningOptions,
  type UseColumnPinningReturn,
} from './ColumnPinning';

// Pagination
export {
  usePagination,
  PaginationControls,
  CompactPagination,
  type UsePaginationOptions,
  type UsePaginationReturn,
} from './Pagination';

// Context Menu
export {
  useContextMenu,
  ContextMenu,
  createRowContextMenuItems,
  createCellContextMenuItems,
  createColumnContextMenuItems,
  type ContextMenuItem,
  type ContextMenuContext,
  type UseContextMenuOptions,
  type UseContextMenuReturn,
} from './ContextMenu';

// Range Selection
export {
  useRangeSelection,
  SelectionOverlay,
  getSelectionClassName,
  getSelectionStyles,
  type CellPosition,
  type CellRange,
  type CellSelectionState,
  type UseRangeSelectionOptions,
  type UseRangeSelectionReturn,
} from './RangeSelection';

// Main DataGrid component
export { DataGrid } from './DataGrid';

// Sub-components (for advanced customization)
export { GridHeader } from './GridHeader';
export { GridRow } from './GridRow';
export { GridGroupHeader } from './GridGroupHeader';
export { GridToolbar } from './GridToolbar';

// Reusable cell renderers
export {
  EditableTextCell,
  EditableNumberCell,
  StatusBadgeCell,
  pricingStatusMap,
  CurrencyCell,
  CurrencyChangeCell,
  ActionCell,
  IconButtonCell,
} from './cells';

// Types - export all for MFE consumers
export type {
  // Column types
  ColumnDef,
  ColumnAlign,
  ColumnPinPosition,
  FilterType,
  EditorType,
  SortDirection,
  ColumnFilter,
  CellEditor,
  CellEditorProps,

  // Grouping types
  GroupConfig,

  // Selection types
  SelectionConfig,

  // Expansion types
  ExpansionConfig,

  // Virtual scroll types
  VirtualScrollConfig,

  // Pagination types
  PaginationConfig,

  // Event types
  GridEvents,
  DataRequestParams,

  // Styling types
  RowStyling,

  // State types
  GridState,

  // Main props
  DataGridProps,

  // Helper types
  GroupHeaderProps,
  CellProps,
  ContextMenuItem,
  ColumnMenuConfig,

  // Toolbar types
  SearchConfig,
  QuickFilter,
  ToolbarAction,
  ExportConfig,
  ColumnToggleConfig,
  DensityConfig,
  ToolbarConfig,
  ToolbarState,
  ToolbarEvents,
} from './types';

// Toolbar component props
export type { GridToolbarProps } from './GridToolbar';

// Keyboard navigation
export { useGridKeyboard } from './useGridKeyboard';
export type { GridKeyboardOptions, GridKeyboardState, GridKeyboardReturn } from './useGridKeyboard';
export type { KeyboardConfig, KeyboardAction, KeyBinding } from './types';

// Collapsible section for nested data (invoices, line items, etc.)
export { CollapsibleDataSection } from './CollapsibleDataSection';
export type { CollapsibleDataSectionProps, SectionSearchConfig } from './CollapsibleDataSection';

// =============================================================================
// MODULAR FEATURES (Tree-shakeable, lazy-loadable)
// =============================================================================

// Features - each can be imported individually for optimal bundle size
export * from './features';

// Module System - for dynamic feature loading
export {
  moduleLoaders,
  modulePresets,
  loadGridModules,
  estimateBundleSize,
  getEnabledModules,
  LazyComponents,
  type GridModuleName,
  type GridModuleConfig,
  type GridModules,
  type LoadedModule,
} from './modules';

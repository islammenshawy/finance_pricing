/**
 * @fileoverview Grid Module System
 *
 * Provides a modular architecture for the DataGrid component.
 * Features are loaded on-demand to minimize initial bundle size.
 *
 * This is a key differentiator from AG-Grid:
 * - AG-Grid Community: ~300KB minified
 * - AG-Grid Enterprise: ~1MB+ minified
 * - Our Grid Core: ~15KB minified
 * - Each feature module: 2-8KB minified
 *
 * Usage:
 * ```tsx
 * import { DataGrid, useGridModules } from '@/components/grid';
 *
 * // Load only the features you need
 * const modules = useGridModules({
 *   editing: true,
 *   filtering: true,
 *   export: ['csv', 'excel'],
 * });
 *
 * <DataGrid modules={modules} ... />
 * ```
 *
 * @module grid/modules
 */

import { lazy, Suspense, ComponentType } from 'react';

// =============================================================================
// TYPES
// =============================================================================

export type GridModuleName =
  | 'columnResize'
  | 'cellEditing'
  | 'columnFilters'
  | 'export'
  | 'columnPinning'
  | 'pagination'
  | 'contextMenu'
  | 'rangeSelection';

export interface GridModuleConfig {
  /** Enable column resizing */
  columnResize?: boolean;

  /** Enable cell editing */
  cellEditing?: boolean;

  /** Enable column filters */
  columnFilters?: boolean;

  /** Enable export - true for all formats, or array of specific formats */
  export?: boolean | ('csv' | 'excel' | 'json' | 'pdf')[];

  /** Enable column pinning */
  columnPinning?: boolean;

  /** Enable pagination */
  pagination?: boolean;

  /** Enable context menu */
  contextMenu?: boolean;

  /** Enable range selection */
  rangeSelection?: boolean;
}

export interface LoadedModule<T = unknown> {
  name: GridModuleName;
  component?: ComponentType<T>;
  hook?: (...args: unknown[]) => unknown;
  utils?: Record<string, unknown>;
}

export interface GridModules {
  /** Loaded modules */
  modules: Map<GridModuleName, LoadedModule>;

  /** Check if module is loaded */
  isLoaded: (name: GridModuleName) => boolean;

  /** Get module by name */
  getModule: <T>(name: GridModuleName) => LoadedModule<T> | undefined;

  /** Module configuration */
  config: GridModuleConfig;
}

// =============================================================================
// MODULE LOADERS (Lazy imports for tree-shaking)
// =============================================================================

/**
 * Lazy module loaders - each returns only the necessary exports
 * This enables tree-shaking of unused features
 */
export const moduleLoaders = {
  columnResize: () => import('../features/ColumnResize').then((m) => ({
    name: 'columnResize' as const,
    hook: m.useColumnResize,
    component: m.ColumnResizeHandle,
  })),

  cellEditing: () => import('../features/CellEditor').then((m) => ({
    name: 'cellEditing' as const,
    hook: m.useCellEditing,
    component: m.InlineEditor,
    utils: {
      TextEditor: m.TextEditor,
      NumberEditor: m.NumberEditor,
      SelectEditor: m.SelectEditor,
      DateEditor: m.DateEditor,
      CheckboxEditor: m.CheckboxEditor,
    },
  })),

  columnFilters: () => import('../features/ColumnFilter').then((m) => ({
    name: 'columnFilters' as const,
    hook: m.useColumnFilters,
    component: m.ColumnFilterButton,
    utils: {
      FilterBar: m.FilterBar,
      ActiveFilters: m.ActiveFilters,
      TEXT_OPERATORS: m.TEXT_OPERATORS,
      NUMBER_OPERATORS: m.NUMBER_OPERATORS,
      DATE_OPERATORS: m.DATE_OPERATORS,
    },
  })),

  export: () => import('../features/Export').then((m) => ({
    name: 'export' as const,
    hook: m.useExport,
    component: m.ExportButton,
    utils: {
      exportToCSV: m.exportToCSV,
      exportToExcel: m.exportToExcel,
      exportToJSON: m.exportToJSON,
      exportToPDF: m.exportToPDF,
    },
  })),

  columnPinning: () => import('../features/ColumnPinning').then((m) => ({
    name: 'columnPinning' as const,
    hook: m.useColumnPinning,
    component: m.ColumnPinButton,
    utils: {
      getPinnedColumnStyles: m.getPinnedColumnStyles,
    },
  })),

  pagination: () => import('../features/Pagination').then((m) => ({
    name: 'pagination' as const,
    hook: m.usePagination,
    component: m.PaginationControls,
    utils: {
      CompactPagination: m.CompactPagination,
    },
  })),

  contextMenu: () => import('../features/ContextMenu').then((m) => ({
    name: 'contextMenu' as const,
    hook: m.useContextMenu,
    component: m.ContextMenu,
    utils: {
      createRowContextMenuItems: m.createRowContextMenuItems,
      createCellContextMenuItems: m.createCellContextMenuItems,
      createColumnContextMenuItems: m.createColumnContextMenuItems,
    },
  })),

  rangeSelection: () => import('../features/RangeSelection').then((m) => ({
    name: 'rangeSelection' as const,
    hook: m.useRangeSelection,
    component: m.SelectionOverlay,
    utils: {
      getSelectionClassName: m.getSelectionClassName,
      getSelectionStyles: m.getSelectionStyles,
    },
  })),
};

// =============================================================================
// PRESETS
// =============================================================================

/**
 * Module presets for common use cases
 */
export const modulePresets = {
  /** Minimal - just display, no features */
  minimal: {} as GridModuleConfig,

  /** Basic - common features for simple grids */
  basic: {
    pagination: true,
    columnResize: true,
  } as GridModuleConfig,

  /** Standard - good balance of features */
  standard: {
    columnResize: true,
    columnFilters: true,
    pagination: true,
    export: ['csv'],
  } as GridModuleConfig,

  /** Advanced - all editing features */
  advanced: {
    columnResize: true,
    cellEditing: true,
    columnFilters: true,
    columnPinning: true,
    pagination: true,
    export: ['csv', 'excel'],
    contextMenu: true,
  } as GridModuleConfig,

  /** Full - all features */
  full: {
    columnResize: true,
    cellEditing: true,
    columnFilters: true,
    columnPinning: true,
    pagination: true,
    export: true,
    contextMenu: true,
    rangeSelection: true,
  } as GridModuleConfig,

  /** Excel-like - spreadsheet experience */
  spreadsheet: {
    columnResize: true,
    cellEditing: true,
    rangeSelection: true,
    contextMenu: true,
    export: ['csv', 'excel'],
  } as GridModuleConfig,
};

// =============================================================================
// HOOK
// =============================================================================

/**
 * Hook to load grid modules asynchronously
 *
 * @example
 * ```tsx
 * const modules = await loadGridModules({
 *   editing: true,
 *   filtering: true,
 * });
 * ```
 */
export async function loadGridModules(
  config: GridModuleConfig
): Promise<GridModules> {
  const modules = new Map<GridModuleName, LoadedModule>();

  const loadPromises: Promise<void>[] = [];

  // Load enabled modules
  for (const [key, value] of Object.entries(config)) {
    if (value && key in moduleLoaders) {
      const moduleName = key as GridModuleName;
      const loader = moduleLoaders[moduleName];

      loadPromises.push(
        loader().then((module) => {
          modules.set(moduleName, module);
        })
      );
    }
  }

  await Promise.all(loadPromises);

  return {
    modules,
    config,
    isLoaded: (name) => modules.has(name),
    getModule: (name) => modules.get(name),
  };
}

/**
 * Get estimated bundle size for a module configuration
 * (Approximate sizes in KB, minified + gzipped)
 */
export function estimateBundleSize(config: GridModuleConfig): {
  core: number;
  features: number;
  total: number;
  breakdown: Record<string, number>;
} {
  const sizes: Record<GridModuleName, number> = {
    columnResize: 1.2,
    cellEditing: 3.5,
    columnFilters: 4.2,
    export: 2.8,
    columnPinning: 1.5,
    pagination: 1.8,
    contextMenu: 2.4,
    rangeSelection: 2.1,
  };

  const core = 8; // Core grid size
  let features = 0;
  const breakdown: Record<string, number> = { core };

  for (const [key, value] of Object.entries(config)) {
    if (value && key in sizes) {
      const size = sizes[key as GridModuleName];
      features += size;
      breakdown[key] = size;
    }
  }

  return {
    core,
    features,
    total: core + features,
    breakdown,
  };
}

/**
 * Get list of enabled modules from config
 */
export function getEnabledModules(config: GridModuleConfig): GridModuleName[] {
  const modules: GridModuleName[] = [];

  for (const [key, value] of Object.entries(config)) {
    if (value && key in moduleLoaders) {
      modules.push(key as GridModuleName);
    }
  }

  return modules;
}

// =============================================================================
// LAZY COMPONENTS
// =============================================================================

/**
 * Lazy-loaded components for code splitting
 */
export const LazyComponents = {
  ColumnResizeHandle: lazy(() =>
    import('../features/ColumnResize').then((m) => ({
      default: m.ColumnResizeHandle,
    }))
  ),

  InlineEditor: lazy(() =>
    import('../features/CellEditor').then((m) => ({
      default: m.InlineEditor,
    }))
  ),

  ColumnFilterButton: lazy(() =>
    import('../features/ColumnFilter').then((m) => ({
      default: m.ColumnFilterButton,
    }))
  ),

  ExportButton: lazy(() =>
    import('../features/Export').then((m) => ({
      default: m.ExportButton,
    }))
  ),

  ColumnPinButton: lazy(() =>
    import('../features/ColumnPinning').then((m) => ({
      default: m.ColumnPinButton,
    }))
  ),

  PaginationControls: lazy(() =>
    import('../features/Pagination').then((m) => ({
      default: m.PaginationControls,
    }))
  ),

  ContextMenu: lazy(() =>
    import('../features/ContextMenu').then((m) => ({
      default: m.ContextMenu,
    }))
  ),

  SelectionOverlay: lazy(() =>
    import('../features/RangeSelection').then((m) => ({
      default: m.SelectionOverlay,
    }))
  ),
};

export default {
  moduleLoaders,
  modulePresets,
  loadGridModules,
  estimateBundleSize,
  getEnabledModules,
  LazyComponents,
};

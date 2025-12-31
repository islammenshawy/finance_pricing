/**
 * @fileoverview GridToolbar Component
 *
 * A configurable toolbar for the DataGrid component that includes:
 * - Search bar with debouncing and keyboard shortcuts
 * - Quick filter buttons
 * - Action buttons (with selection awareness)
 * - Export dropdown
 * - Column visibility toggle
 * - Density selector
 * - Row count display
 *
 * @example Basic Toolbar with Search
 * ```tsx
 * <GridToolbar
 *   config={{
 *     search: { enabled: true, placeholder: 'Search...' },
 *   }}
 *   data={data}
 *   columns={columns}
 *   onSearchChange={handleSearch}
 * />
 * ```
 *
 * @example Full Featured Toolbar
 * ```tsx
 * <GridToolbar
 *   config={{
 *     search: { enabled: true, placeholder: 'Search loans...' },
 *     quickFilters: [
 *       { id: 'all', label: 'All', filter: () => true, default: true },
 *       { id: 'active', label: 'Active', filter: (r) => r.status === 'active' },
 *     ],
 *     actions: [
 *       { id: 'add', label: 'Add', icon: <Plus />, onClick: () => {} },
 *     ],
 *     export: { enabled: true, formats: ['csv', 'excel'] },
 *     columnToggle: { enabled: true },
 *     density: { enabled: true },
 *   }}
 *   data={data}
 *   columns={columns}
 *   selectedRows={selectedRows}
 *   visibleRowCount={filteredData.length}
 * />
 * ```
 */

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Search, X, ChevronDown, Download, Columns, LayoutGrid, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem,
} from '@/components/ui/dropdown-menu';
import type {
  ToolbarConfig,
  ToolbarState,
  ToolbarEvents,
  ColumnDef,
  SearchConfig,
  QuickFilter,
  ToolbarAction,
  ExportConfig,
  ColumnToggleConfig,
  DensityConfig,
} from './types';

// =============================================================================
// COMPONENT PROPS
// =============================================================================

export interface GridToolbarProps<TRow> {
  /** Toolbar configuration */
  config: ToolbarConfig<TRow>;

  /** Grid data */
  data: TRow[];

  /** Column definitions */
  columns: ColumnDef<TRow>[];

  /** Currently selected rows */
  selectedRows?: TRow[];

  /** Number of visible rows after filtering */
  visibleRowCount?: number;

  /** Controlled toolbar state */
  state?: ToolbarState;

  /** Event handlers */
  events?: ToolbarEvents<TRow>;

  /** Column visibility state */
  columnVisibility?: Record<string, boolean>;

  /** Current density */
  currentDensity?: 'compact' | 'standard' | 'comfortable';

  /** Callback when search query changes */
  onSearchChange?: (query: string) => void;

  /** Callback when quick filter changes */
  onQuickFilterChange?: (filterId: string | null) => void;

  /** Callback when column visibility changes */
  onColumnVisibilityChange?: (columnId: string, visible: boolean) => void;

  /** Callback when density changes */
  onDensityChange?: (density: 'compact' | 'standard' | 'comfortable') => void;

  /** Callback when export is triggered */
  onExport?: (format: string) => void;
}

// =============================================================================
// SEARCH BAR COMPONENT
// =============================================================================

interface SearchBarProps {
  config: SearchConfig;
  value: string;
  onChange: (value: string) => void;
}

/**
 * Search bar component with debouncing and keyboard shortcuts
 */
function SearchBar({ config, value, onChange }: SearchBarProps) {
  const [localValue, setLocalValue] = useState(value);
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<NodeJS.Timeout>();

  // Sync external value changes
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  // Handle keyboard shortcut
  useEffect(() => {
    if (!config.showShortcutHint) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const key = config.shortcutKey || 'k';
      if ((e.metaKey || e.ctrlKey) && e.key === key) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [config.showShortcutHint, config.shortcutKey]);

  // Debounced search
  const handleChange = useCallback(
    (newValue: string) => {
      setLocalValue(newValue);

      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }

      const minLength = config.minLength ?? 1;
      if (newValue.length >= minLength || newValue.length === 0) {
        debounceRef.current = setTimeout(() => {
          onChange(newValue);
          config.onSearch?.(newValue);
        }, config.debounceMs ?? 300);
      }
    },
    [onChange, config]
  );

  const handleClear = useCallback(() => {
    setLocalValue('');
    onChange('');
    config.onClear?.();
    inputRef.current?.focus();
  }, [onChange, config]);

  // Calculate width
  const width = useMemo(() => {
    if (config.expandOnFocus && isFocused) {
      return config.expandedWidth ?? 400;
    }
    return config.width ?? 250;
  }, [config.expandOnFocus, config.expandedWidth, config.width, isFocused]);

  return (
    <div
      className={cn('relative flex items-center transition-all duration-200', config.className)}
      style={{ width: typeof width === 'number' ? `${width}px` : width }}
    >
      <div className="absolute left-3 text-muted-foreground pointer-events-none">
        {config.searchIcon || <Search className="h-4 w-4" />}
      </div>
      <Input
        ref={inputRef}
        type="text"
        value={localValue}
        onChange={(e) => handleChange(e.target.value)}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        placeholder={config.placeholder ?? 'Search...'}
        className={cn('pl-9 pr-8', config.inputClassName)}
        autoFocus={config.autoFocus}
      />
      {config.showClearButton !== false && localValue && (
        <button
          type="button"
          onClick={handleClear}
          className="absolute right-2 text-muted-foreground hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      )}
      {config.showShortcutHint && !localValue && (
        <div className="absolute right-2 text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
          ⌘{(config.shortcutKey ?? 'K').toUpperCase()}
        </div>
      )}
    </div>
  );
}

// =============================================================================
// QUICK FILTERS COMPONENT
// =============================================================================

interface QuickFiltersProps<TRow> {
  filters: QuickFilter<TRow>[];
  activeFilter: string | null;
  data: TRow[];
  onChange: (filterId: string | null) => void;
}

/**
 * Quick filter buttons component
 */
function QuickFilters<TRow>({ filters, activeFilter, data, onChange }: QuickFiltersProps<TRow>) {
  const visibleFilters = useMemo(
    () =>
      filters.filter((f) => {
        if (typeof f.hidden === 'function') return !f.hidden(data);
        return !f.hidden;
      }),
    [filters, data]
  );

  return (
    <div className="flex items-center gap-1">
      {visibleFilters.map((filter) => {
        const isActive = activeFilter === filter.id;
        const badge = typeof filter.badge === 'function' ? filter.badge(data) : filter.badge;

        return (
          <Button
            key={filter.id}
            variant={isActive ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => onChange(isActive ? null : filter.id)}
            className={cn('gap-1.5', filter.className)}
            title={filter.tooltip}
          >
            {filter.icon}
            <span>{filter.label}</span>
            {badge !== undefined && (
              <span
                className={cn(
                  'ml-1 text-xs px-1.5 py-0.5 rounded-full',
                  isActive ? 'bg-primary/20' : 'bg-muted'
                )}
              >
                {badge}
              </span>
            )}
          </Button>
        );
      })}
    </div>
  );
}

// =============================================================================
// ACTION BUTTONS COMPONENT
// =============================================================================

interface ActionButtonsProps<TRow> {
  actions: ToolbarAction<TRow>[];
  selectedRows: TRow[];
  data: TRow[];
  position: 'left' | 'right';
}

/**
 * Action buttons component with selection awareness
 */
function ActionButtons<TRow>({ actions, selectedRows, data, position }: ActionButtonsProps<TRow>) {
  const visibleActions = useMemo(
    () =>
      actions
        .filter((a) => (a.position ?? 'right') === position)
        .filter((action) => {
          const showWhen = action.showWhen ?? 'always';
          if (showWhen === 'always') return true;
          if (showWhen === 'hasSelection') return selectedRows.length > 0;
          if (showWhen === 'noSelection') return selectedRows.length === 0;
          if (typeof showWhen === 'function') return showWhen(selectedRows, data);
          return true;
        }),
    [actions, selectedRows, data, position]
  );

  if (visibleActions.length === 0) return null;

  return (
    <div className="flex items-center gap-2">
      {visibleActions.map((action) => {
        const isDisabled =
          typeof action.disabled === 'function'
            ? action.disabled(selectedRows, data)
            : action.disabled;

        // Dropdown button
        if (action.dropdown) {
          return (
            <DropdownMenu key={action.id}>
              <DropdownMenuTrigger asChild>
                <Button
                  variant={action.variant === 'primary' ? 'default' : action.variant ?? 'outline'}
                  size={action.size ?? 'default'}
                  disabled={isDisabled || action.loading}
                  className={cn('gap-1.5', action.className)}
                  title={action.tooltip}
                >
                  {action.icon}
                  <span>{action.label}</span>
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {action.dropdown.map((item, idx) =>
                  item.divider ? (
                    <DropdownMenuSeparator key={`divider-${idx}`} />
                  ) : (
                    <DropdownMenuItem
                      key={item.id}
                      onClick={() => item.onClick(selectedRows, data)}
                      disabled={item.disabled}
                      className="gap-2"
                    >
                      {item.icon}
                      {item.label}
                    </DropdownMenuItem>
                  )
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          );
        }

        // Regular button
        return (
          <Button
            key={action.id}
            variant={action.variant === 'primary' ? 'default' : action.variant ?? 'outline'}
            size={action.size ?? 'default'}
            onClick={() => action.onClick(selectedRows, data)}
            disabled={isDisabled || action.loading}
            className={cn('gap-1.5', action.className)}
            title={action.tooltip}
          >
            {action.icon}
            <span>{action.label}</span>
          </Button>
        );
      })}
    </div>
  );
}

// =============================================================================
// EXPORT BUTTON COMPONENT
// =============================================================================

interface ExportButtonProps<TRow> {
  config: ExportConfig<TRow>;
  data: TRow[];
  columns: ColumnDef<TRow>[];
  onExport: (format: string) => void;
}

/**
 * Export button/dropdown component
 */
function ExportButton<TRow>({ config, onExport }: ExportButtonProps<TRow>) {
  const formats = config.formats ?? ['csv'];

  if (config.display === 'button' && formats.length === 1) {
    return (
      <Button variant="outline" size="sm" onClick={() => onExport(formats[0])} className="gap-1.5">
        {config.icon || <Download className="h-4 w-4" />}
        <span>{config.label ?? 'Export'}</span>
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          {config.icon || <Download className="h-4 w-4" />}
          <span>{config.label ?? 'Export'}</span>
          <ChevronDown className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {formats.map((format) => (
          <DropdownMenuItem key={format} onClick={() => onExport(format)}>
            Export as {format.toUpperCase()}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// =============================================================================
// COLUMN TOGGLE COMPONENT
// =============================================================================

interface ColumnToggleProps<TRow> {
  config: ColumnToggleConfig;
  columns: ColumnDef<TRow>[];
  visibility: Record<string, boolean>;
  onChange: (columnId: string, visible: boolean) => void;
}

/**
 * Column visibility toggle dropdown
 */
function ColumnToggle<TRow>({ config, columns, visibility, onChange }: ColumnToggleProps<TRow>) {
  const toggleableColumns = useMemo(
    () => columns.filter((col) => col.hideable !== false),
    [columns]
  );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          {config.icon || <Columns className="h-4 w-4" />}
          <span>{config.label ?? 'Columns'}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        {toggleableColumns.map((col) => (
          <DropdownMenuCheckboxItem
            key={col.id}
            checked={visibility[col.id] !== false}
            onCheckedChange={(checked: boolean) => onChange(col.id, checked)}
          >
            {col.header}
          </DropdownMenuCheckboxItem>
        ))}
        {config.showReset !== false && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => {
                toggleableColumns.forEach((col) => onChange(col.id, true));
              }}
            >
              Reset to default
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// =============================================================================
// DENSITY SELECTOR COMPONENT
// =============================================================================

interface DensitySelectorProps {
  config: DensityConfig;
  current: 'compact' | 'standard' | 'comfortable';
  onChange: (density: 'compact' | 'standard' | 'comfortable') => void;
}

/**
 * Density selector component
 */
function DensitySelector({ config, current, onChange }: DensitySelectorProps) {
  const options = config.options ?? ['compact', 'standard', 'comfortable'];

  const labels: Record<string, string> = {
    compact: 'Compact',
    standard: 'Standard',
    comfortable: 'Comfortable',
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <LayoutGrid className="h-4 w-4" />
          {config.showLabels && <span>{labels[current]}</span>}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {options.map((option) => (
          <DropdownMenuItem
            key={option}
            onClick={() => onChange(option)}
            className="flex items-center gap-2"
          >
            {current === option && <Check className="h-4 w-4" />}
            <span className={current !== option ? 'ml-6' : ''}>{labels[option]}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// =============================================================================
// MAIN TOOLBAR COMPONENT
// =============================================================================

/**
 * GridToolbar - A configurable toolbar component for the DataGrid
 *
 * @template TRow - The row data type
 *
 * @example
 * ```tsx
 * <GridToolbar
 *   config={{
 *     search: { enabled: true },
 *     quickFilters: [...],
 *     actions: [...],
 *   }}
 *   data={data}
 *   columns={columns}
 *   selectedRows={selectedRows}
 * />
 * ```
 */
export function GridToolbar<TRow>({
  config,
  data,
  columns,
  selectedRows = [],
  visibleRowCount,
  state,
  events,
  columnVisibility = {},
  currentDensity = 'standard',
  onSearchChange,
  onQuickFilterChange,
  onColumnVisibilityChange,
  onDensityChange,
  onExport,
}: GridToolbarProps<TRow>) {
  // Internal state for uncontrolled mode
  const [searchQuery, setSearchQuery] = useState(state?.searchQuery ?? '');
  const [activeQuickFilter, setActiveQuickFilter] = useState<string | null>(
    state?.activeQuickFilter ??
      config.quickFilters?.find((f) => f.default)?.id ??
      null
  );

  // Use controlled values if provided
  const effectiveSearchQuery = state?.searchQuery ?? searchQuery;
  const effectiveActiveFilter = state?.activeQuickFilter ?? activeQuickFilter;

  // Handle search change
  const handleSearchChange = useCallback(
    (query: string) => {
      setSearchQuery(query);
      onSearchChange?.(query);
      events?.onSearchChange?.(query);
    },
    [onSearchChange, events]
  );

  // Handle quick filter change
  const handleQuickFilterChange = useCallback(
    (filterId: string | null) => {
      setActiveQuickFilter(filterId);
      onQuickFilterChange?.(filterId);
      events?.onQuickFilterChange?.(filterId);
    },
    [onQuickFilterChange, events]
  );

  // Handle column visibility change
  const handleColumnVisibilityChange = useCallback(
    (columnId: string, visible: boolean) => {
      onColumnVisibilityChange?.(columnId, visible);
      events?.onColumnVisibilityChange?.(columnId, visible);
    },
    [onColumnVisibilityChange, events]
  );

  // Handle density change
  const handleDensityChange = useCallback(
    (density: 'compact' | 'standard' | 'comfortable') => {
      onDensityChange?.(density);
      events?.onDensityChange?.(density);
    },
    [onDensityChange, events]
  );

  // Handle export
  const handleExport = useCallback(
    (format: string) => {
      onExport?.(format);
      events?.onExport?.(format, data);
    },
    [onExport, events, data]
  );

  // Row count display
  const rowCountText = useMemo(() => {
    if (config.showRowCount === false) return null;

    const visible = visibleRowCount ?? data.length;
    const total = data.length;
    const selected = selectedRows.length;

    if (config.rowCountFormatter) {
      return config.rowCountFormatter(visible, total, selected);
    }

    if (selected > 0 && config.showSelectedCount !== false) {
      return `${selected} selected`;
    }

    if (visible !== total) {
      return `${visible} of ${total}`;
    }

    return `${total} rows`;
  }, [config, data.length, visibleRowCount, selectedRows.length]);

  // Background class
  const bgClass = useMemo(() => {
    switch (config.background) {
      case 'transparent':
        return 'bg-transparent';
      case 'muted':
        return 'bg-muted';
      default:
        return 'bg-background';
    }
  }, [config.background]);

  // Padding class
  const paddingClass = useMemo(() => {
    switch (config.padding) {
      case 'none':
        return 'p-0';
      case 'sm':
        return 'p-2';
      case 'lg':
        return 'p-6';
      default:
        return 'p-4';
    }
  }, [config.padding]);

  if (config.enabled === false) return null;

  return (
    <div
      className={cn(
        'flex flex-wrap items-center gap-4',
        bgClass,
        paddingClass,
        config.sticky && 'sticky top-0 z-10',
        config.showDivider !== false && 'border-b',
        config.className
      )}
      style={{ height: config.height !== 'auto' ? config.height : undefined }}
    >
      {/* Left section */}
      <div className="flex items-center gap-3 flex-1">
        {/* Custom left content */}
        {config.leftContent}

        {/* Search bar */}
        {config.search?.enabled && (
          <SearchBar
            config={config.search}
            value={effectiveSearchQuery}
            onChange={handleSearchChange}
          />
        )}

        {/* Quick filters */}
        {config.quickFilters && config.quickFilters.length > 0 && (
          <QuickFilters
            filters={config.quickFilters}
            activeFilter={effectiveActiveFilter}
            data={data}
            onChange={handleQuickFilterChange}
          />
        )}

        {/* Left-positioned actions */}
        {config.actions && (
          <ActionButtons
            actions={config.actions}
            selectedRows={selectedRows}
            data={data}
            position="left"
          />
        )}
      </div>

      {/* Center section */}
      {config.centerContent && <div className="flex items-center">{config.centerContent}</div>}

      {/* Right section */}
      <div className="flex items-center gap-2">
        {/* Row count */}
        {rowCountText && <span className="text-sm text-muted-foreground mr-2">{rowCountText}</span>}

        {/* Right-positioned actions */}
        {config.actions && (
          <ActionButtons
            actions={config.actions}
            selectedRows={selectedRows}
            data={data}
            position="right"
          />
        )}

        {/* Export */}
        {config.export?.enabled && (
          <ExportButton
            config={config.export}
            data={data}
            columns={columns}
            onExport={handleExport}
          />
        )}

        {/* Column toggle */}
        {config.columnToggle?.enabled && (
          <ColumnToggle
            config={config.columnToggle}
            columns={columns}
            visibility={columnVisibility}
            onChange={handleColumnVisibilityChange}
          />
        )}

        {/* Density selector */}
        {config.density?.enabled && (
          <DensitySelector
            config={config.density}
            current={currentDensity}
            onChange={handleDensityChange}
          />
        )}

        {/* Custom right content */}
        {config.rightContent}
      </div>
    </div>
  );
}

export default GridToolbar;

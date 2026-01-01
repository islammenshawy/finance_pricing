/**
 * @fileoverview Collapsible Data Section Component
 *
 * A reusable component for displaying nested data (invoices, fees, line items)
 * within expanded rows or detail panels. Provides:
 * - Collapsible header with item count
 * - Scrollable content area with max height
 * - Optional search functionality (uses same patterns as grid toolbar)
 * - Customizable rendering via render props
 *
 * @example Basic Usage
 * ```tsx
 * <CollapsibleDataSection
 *   title="Invoices"
 *   data={invoices}
 *   getItemId={(inv) => inv.id}
 *   search={{ fields: ['invoiceNumber', 'debtorName'] }}
 *   renderItem={(invoice) => <InvoiceRow invoice={invoice} />}
 * />
 * ```
 *
 * @example With Table Header
 * ```tsx
 * <CollapsibleDataSection
 *   title="Fees"
 *   data={fees}
 *   getItemId={(fee) => fee.id}
 *   defaultExpanded={true}
 *   maxHeight={200}
 *   renderHeader={() => (
 *     <div className="grid grid-cols-3 font-medium">
 *       <span>Name</span>
 *       <span>Code</span>
 *       <span className="text-right">Amount</span>
 *     </div>
 *   )}
 *   renderItem={(fee) => (
 *     <div className="grid grid-cols-3">
 *       <span>{fee.name}</span>
 *       <span>{fee.code}</span>
 *       <span className="text-right">{formatCurrency(fee.amount)}</span>
 *     </div>
 *   )}
 * />
 * ```
 */

import { useState, useMemo, useCallback, useRef, useEffect, ReactNode } from 'react';
import { ChevronDown, ChevronRight, Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Search configuration for collapsible sections.
 * Reuses patterns from grid SearchConfig but simplified for section use.
 *
 * @example
 * ```tsx
 * search={{
 *   enabled: true,
 *   fields: ['name', 'code', 'description'],
 *   placeholder: 'Search fees...',
 *   debounceMs: 200,
 * }}
 * ```
 */
export interface SectionSearchConfig<T = unknown> {
  /**
   * Enable search functionality
   * @default false (when passed as object, defaults to true)
   */
  enabled?: boolean;

  /**
   * Fields to search in (supports dot notation for nested properties)
   * @example ['name', 'customer.name', 'invoiceNumber']
   */
  fields?: string[];

  /**
   * Custom filter function - overrides field-based search
   */
  filterFn?: (item: T, query: string) => boolean;

  /**
   * Search input placeholder
   * @default 'Search...'
   */
  placeholder?: string;

  /**
   * Debounce delay in milliseconds
   * @default 200
   */
  debounceMs?: number;

  /**
   * Highlight matching text in rendered items
   * @default false
   */
  highlightMatches?: boolean;

  /**
   * Keyboard shortcut to focus search (Ctrl/Cmd + key)
   * @example 'f' for Ctrl+F / Cmd+F
   */
  shortcutKey?: string;

  /**
   * Minimum characters before search triggers
   * @default 1
   */
  minLength?: number;

  /**
   * Show clear button
   * @default true
   */
  showClearButton?: boolean;
}

/**
 * Context passed to renderItem for additional functionality
 */
export interface RenderItemContext {
  /** Whether this item matches the current search */
  isHighlighted: boolean;
  /** Current search query (for custom highlighting) */
  searchQuery: string;
  /** Index in the filtered list */
  filteredIndex: number;
  /** Index in the original data array */
  originalIndex: number;
}

/**
 * Props for the CollapsibleDataSection component
 */
export interface CollapsibleDataSectionProps<T> {
  /** Section header title */
  title: string;

  /** Data array to display */
  data: T[];

  /** Function to extract unique ID from each item */
  getItemId: (item: T) => string;

  /**
   * Render function for each item
   * @param item - The data item
   * @param index - Index in filtered list
   * @param context - Additional context (search query, highlighting)
   */
  renderItem: (item: T, index: number, context: RenderItemContext) => ReactNode;

  /**
   * Search configuration
   * - `false` or omitted: no search
   * - `true`: basic search (requires fields in data to be strings)
   * - `object`: full search configuration
   */
  search?: boolean | SectionSearchConfig<T>;

  /**
   * Initial expanded state (uncontrolled)
   * @default false
   */
  defaultExpanded?: boolean;

  /**
   * Controlled expanded state
   */
  expanded?: boolean;

  /**
   * Callback when expanded state changes
   */
  onExpandedChange?: (expanded: boolean) => void;

  /**
   * Maximum height before scrolling (in pixels)
   * @default 300
   */
  maxHeight?: number;

  /**
   * Show item count in header
   * @default true
   */
  showCount?: boolean;

  /**
   * Extra content in header (after title and count)
   * @example <Badge variant="secondary">{formatCurrency(total)}</Badge>
   */
  headerExtra?: ReactNode;

  /**
   * Action buttons in header (right side)
   * @example <Button size="sm" onClick={handleAdd}>Add</Button>
   */
  headerActions?: ReactNode;

  /**
   * Render function for column headers (shown above items)
   */
  renderHeader?: () => ReactNode;

  /**
   * Show border around the section
   * @default true
   */
  bordered?: boolean;

  /**
   * Message shown when data is empty
   * @default 'No items'
   */
  emptyMessage?: string;

  /**
   * Message shown when search returns no results
   * @default 'No matching items'
   */
  emptySearchMessage?: string;

  /**
   * Additional CSS class for the container
   */
  className?: string;

  /**
   * Additional CSS class for the content area
   */
  contentClassName?: string;

  /**
   * ID for accessibility
   */
  id?: string;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get nested property value using dot notation
 */
function getNestedValue(obj: unknown, path: string): unknown {
  return path.split('.').reduce((current, key) => {
    if (current && typeof current === 'object' && key in current) {
      return (current as Record<string, unknown>)[key];
    }
    return undefined;
  }, obj);
}

/**
 * Default search filter function
 */
function defaultFilterFn<T>(item: T, query: string, fields?: string[]): boolean {
  const lowerQuery = query.toLowerCase();

  if (fields && fields.length > 0) {
    return fields.some((field) => {
      const value = getNestedValue(item, field);
      if (value === null || value === undefined) return false;
      return String(value).toLowerCase().includes(lowerQuery);
    });
  }

  // If no fields specified, search all string values
  const searchAllValues = (obj: unknown): boolean => {
    if (obj === null || obj === undefined) return false;
    if (typeof obj === 'string') return obj.toLowerCase().includes(lowerQuery);
    if (typeof obj === 'number') return String(obj).includes(query);
    if (Array.isArray(obj)) return obj.some(searchAllValues);
    if (typeof obj === 'object') {
      return Object.values(obj as Record<string, unknown>).some(searchAllValues);
    }
    return false;
  };

  return searchAllValues(item);
}

// =============================================================================
// SEARCH INPUT COMPONENT
// =============================================================================

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  showClearButton: boolean;
  onClear: () => void;
  inputRef: React.RefObject<HTMLInputElement>;
}

function SearchInput({
  value,
  onChange,
  placeholder,
  showClearButton,
  onClear,
  inputRef,
}: SearchInputProps) {
  return (
    <div className="relative flex items-center">
      <Search className="absolute left-2 h-3.5 w-3.5 text-muted-foreground" />
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={cn(
          'h-7 w-full rounded border bg-background pl-7 pr-7 text-sm',
          'placeholder:text-muted-foreground',
          'focus:outline-none focus:ring-1 focus:ring-ring'
        )}
      />
      {showClearButton && value && (
        <button
          type="button"
          onClick={onClear}
          className="absolute right-2 text-muted-foreground hover:text-foreground"
          aria-label="Clear search"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

/**
 * Collapsible section for displaying nested data with optional search.
 * Designed for use in expanded row content, detail panels, or sidebars.
 */
export function CollapsibleDataSection<T>({
  title,
  data,
  getItemId,
  renderItem,
  search = false,
  defaultExpanded = false,
  expanded: controlledExpanded,
  onExpandedChange,
  maxHeight = 300,
  showCount = true,
  headerExtra,
  headerActions,
  renderHeader,
  bordered = true,
  emptyMessage = 'No items',
  emptySearchMessage = 'No matching items',
  className,
  contentClassName,
  id,
}: CollapsibleDataSectionProps<T>) {
  // Expanded state (controlled or uncontrolled)
  const [internalExpanded, setInternalExpanded] = useState(defaultExpanded);
  const isExpanded = controlledExpanded ?? internalExpanded;

  const handleExpandedChange = useCallback(
    (newExpanded: boolean) => {
      if (controlledExpanded === undefined) {
        setInternalExpanded(newExpanded);
      }
      onExpandedChange?.(newExpanded);
    },
    [controlledExpanded, onExpandedChange]
  );

  // Parse search config
  const searchConfig = useMemo((): SectionSearchConfig<T> | null => {
    if (!search) return null;
    if (search === true) {
      return { enabled: true };
    }
    return { enabled: true, ...search };
  }, [search]);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Debounce search query
  useEffect(() => {
    const debounceMs = searchConfig?.debounceMs ?? 200;
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [searchQuery, searchConfig?.debounceMs]);

  // Keyboard shortcut for search
  useEffect(() => {
    if (!searchConfig?.shortcutKey) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === searchConfig.shortcutKey) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [searchConfig?.shortcutKey]);

  // Filter data based on search
  const filteredData = useMemo(() => {
    if (!searchConfig?.enabled || !debouncedQuery) {
      return data.map((item, index) => ({ item, originalIndex: index }));
    }

    const minLength = searchConfig.minLength ?? 1;
    if (debouncedQuery.length < minLength) {
      return data.map((item, index) => ({ item, originalIndex: index }));
    }

    const filterFn = searchConfig.filterFn ?? ((item: T, query: string) => defaultFilterFn(item, query, searchConfig.fields));

    return data
      .map((item, index) => ({ item, originalIndex: index }))
      .filter(({ item }) => filterFn(item, debouncedQuery));
  }, [data, searchConfig, debouncedQuery]);

  // Clear search
  const handleClearSearch = useCallback(() => {
    setSearchQuery('');
    setDebouncedQuery('');
  }, []);

  // Generate IDs for accessibility
  const sectionId = id ?? `section-${title.toLowerCase().replace(/\s+/g, '-')}`;
  const contentId = `${sectionId}-content`;

  // Render empty state
  const renderEmptyState = () => {
    const message = debouncedQuery ? emptySearchMessage : emptyMessage;
    return (
      <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
        {message}
      </div>
    );
  };

  return (
    <div
      id={sectionId}
      className={cn(
        'rounded-md',
        bordered && 'border',
        className
      )}
    >
      {/* Header */}
      <div
        className={cn(
          'flex items-center justify-between px-3 py-2',
          bordered && 'border-b',
          'bg-muted/30'
        )}
      >
        <button
          type="button"
          onClick={() => handleExpandedChange(!isExpanded)}
          className="flex items-center gap-2 text-sm font-medium hover:text-foreground"
          aria-expanded={isExpanded}
          aria-controls={contentId}
        >
          {isExpanded ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
          <span>{title}</span>
          {showCount && (
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
              {filteredData.length}
              {debouncedQuery && filteredData.length !== data.length && (
                <span className="text-muted-foreground/60"> / {data.length}</span>
              )}
            </span>
          )}
        </button>

        <div className="flex items-center gap-2">
          {headerExtra}
          {headerActions}
        </div>
      </div>

      {/* Content */}
      {isExpanded && (
        <div id={contentId} role="region" aria-labelledby={sectionId}>
          {/* Search bar */}
          {searchConfig?.enabled && (
            <div className="border-b px-3 py-2">
              <SearchInput
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder={searchConfig.placeholder ?? 'Search...'}
                showClearButton={searchConfig.showClearButton ?? true}
                onClear={handleClearSearch}
                inputRef={searchInputRef as React.RefObject<HTMLInputElement>}
              />
            </div>
          )}

          {/* Column headers */}
          {renderHeader && filteredData.length > 0 && (
            <div className="border-b bg-muted/20 text-xs">
              {renderHeader()}
            </div>
          )}

          {/* Items */}
          <div
            className={cn('overflow-auto', contentClassName)}
            style={{ maxHeight }}
          >
            {filteredData.length === 0 ? (
              renderEmptyState()
            ) : (
              filteredData.map(({ item, originalIndex }, filteredIndex) => (
                <div key={getItemId(item)}>
                  {renderItem(item, filteredIndex, {
                    isHighlighted: Boolean(debouncedQuery),
                    searchQuery: debouncedQuery,
                    filteredIndex,
                    originalIndex,
                  })}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default CollapsibleDataSection;

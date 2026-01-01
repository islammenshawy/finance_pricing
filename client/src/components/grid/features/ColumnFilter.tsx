/**
 * @fileoverview Column Filter Components
 *
 * Provides filtering UI for grid columns with various filter types:
 * - Text filter (contains, equals, starts with, etc.)
 * - Number filter (equals, greater than, less than, between)
 * - Date filter (equals, before, after, between)
 * - Select filter (multi-select from options)
 * - Boolean filter (yes/no/all)
 *
 * @module grid/features/ColumnFilter
 */

import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { Filter, X, Check, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { ColumnFilter as ColumnFilterConfig, FilterType } from '../types';

// =============================================================================
// TYPES
// =============================================================================

export interface FilterValue {
  type: FilterType;
  operator?: string;
  value?: unknown;
  valueTo?: unknown; // For range filters
}

export interface ColumnFilterProps<TRow> {
  /** Column ID */
  columnId: string;

  /** Column header label */
  label: string;

  /** Filter configuration */
  config: ColumnFilterConfig<TRow>;

  /** Current filter value */
  value?: FilterValue;

  /** Called when filter changes */
  onChange: (value: FilterValue | undefined) => void;

  /** Data for generating options */
  data?: TRow[];

  /** Value accessor for the column */
  accessor?: (row: TRow) => unknown;
}

export interface UseColumnFiltersOptions<TRow> {
  /** Column definitions with filter configs */
  columns: Array<{
    id: string;
    filter?: ColumnFilterConfig<TRow>;
    accessor?: (row: TRow) => unknown;
  }>;

  /** Initial filter values */
  initialFilters?: Record<string, FilterValue>;

  /** Called when any filter changes */
  onFilterChange?: (filters: Record<string, FilterValue>) => void;
}

export interface UseColumnFiltersReturn<TRow> {
  /** Current filter values */
  filters: Record<string, FilterValue>;

  /** Set a single filter */
  setFilter: (columnId: string, value: FilterValue | undefined) => void;

  /** Clear all filters */
  clearFilters: () => void;

  /** Clear a single filter */
  clearFilter: (columnId: string) => void;

  /** Check if any filters are active */
  hasActiveFilters: boolean;

  /** Get number of active filters */
  activeFilterCount: number;

  /** Filter data based on current filters */
  filterData: (data: TRow[]) => TRow[];
}

// =============================================================================
// FILTER OPERATORS
// =============================================================================

export const TEXT_OPERATORS = [
  { value: 'contains', label: 'Contains' },
  { value: 'equals', label: 'Equals' },
  { value: 'startsWith', label: 'Starts with' },
  { value: 'endsWith', label: 'Ends with' },
  { value: 'notContains', label: 'Does not contain' },
  { value: 'notEquals', label: 'Does not equal' },
  { value: 'empty', label: 'Is empty' },
  { value: 'notEmpty', label: 'Is not empty' },
];

export const NUMBER_OPERATORS = [
  { value: 'equals', label: 'Equals' },
  { value: 'notEquals', label: 'Not equals' },
  { value: 'greaterThan', label: 'Greater than' },
  { value: 'greaterThanOrEqual', label: 'Greater than or equal' },
  { value: 'lessThan', label: 'Less than' },
  { value: 'lessThanOrEqual', label: 'Less than or equal' },
  { value: 'between', label: 'Between' },
  { value: 'empty', label: 'Is empty' },
  { value: 'notEmpty', label: 'Is not empty' },
];

export const DATE_OPERATORS = [
  { value: 'equals', label: 'Equals' },
  { value: 'before', label: 'Before' },
  { value: 'after', label: 'After' },
  { value: 'between', label: 'Between' },
  { value: 'empty', label: 'Is empty' },
  { value: 'notEmpty', label: 'Is not empty' },
];

// =============================================================================
// HOOK
// =============================================================================

/**
 * Hook for managing column filter state
 */
export function useColumnFilters<TRow>({
  columns,
  initialFilters = {},
  onFilterChange,
}: UseColumnFiltersOptions<TRow>): UseColumnFiltersReturn<TRow> {
  const [filters, setFilters] = useState<Record<string, FilterValue>>(initialFilters);

  const setFilter = useCallback((columnId: string, value: FilterValue | undefined) => {
    setFilters((prev) => {
      const next = { ...prev };
      if (value === undefined) {
        delete next[columnId];
      } else {
        next[columnId] = value;
      }
      onFilterChange?.(next);
      return next;
    });
  }, [onFilterChange]);

  const clearFilters = useCallback(() => {
    setFilters({});
    onFilterChange?.({});
  }, [onFilterChange]);

  const clearFilter = useCallback((columnId: string) => {
    setFilter(columnId, undefined);
  }, [setFilter]);

  const hasActiveFilters = Object.keys(filters).length > 0;
  const activeFilterCount = Object.keys(filters).length;

  // Filter data based on current filters
  const filterData = useCallback((data: TRow[]): TRow[] => {
    if (!hasActiveFilters) return data;

    return data.filter((row) => {
      for (const [columnId, filterValue] of Object.entries(filters)) {
        const column = columns.find((c) => c.id === columnId);
        if (!column) continue;

        const cellValue = column.accessor?.(row);

        // Use custom filter function if provided
        if (column.filter?.filterFn) {
          if (!column.filter.filterFn(row, filterValue.value)) {
            return false;
          }
          continue;
        }

        // Built-in filter logic
        if (!applyFilter(cellValue, filterValue)) {
          return false;
        }
      }
      return true;
    });
  }, [filters, columns, hasActiveFilters]);

  return {
    filters,
    setFilter,
    clearFilters,
    clearFilter,
    hasActiveFilters,
    activeFilterCount,
    filterData,
  };
}

// =============================================================================
// FILTER LOGIC
// =============================================================================

function applyFilter(cellValue: unknown, filter: FilterValue): boolean {
  const { type, operator = 'contains', value, valueTo } = filter;

  // Handle empty/notEmpty operators
  if (operator === 'empty') {
    return cellValue === null || cellValue === undefined || cellValue === '';
  }
  if (operator === 'notEmpty') {
    return cellValue !== null && cellValue !== undefined && cellValue !== '';
  }

  // Skip if no filter value
  if (value === undefined || value === null || value === '') {
    return true;
  }

  switch (type) {
    case 'text':
      return applyTextFilter(String(cellValue ?? ''), operator, String(value));

    case 'number':
      return applyNumberFilter(Number(cellValue), operator, Number(value), valueTo ? Number(valueTo) : undefined);

    case 'date':
      return applyDateFilter(cellValue as string | Date, operator, value as string, valueTo as string | undefined);

    case 'select':
      return applySelectFilter(cellValue, value as unknown[]);

    case 'boolean':
      return cellValue === value;

    default:
      return true;
  }
}

function applyTextFilter(cellValue: string, operator: string, filterValue: string): boolean {
  const cell = cellValue.toLowerCase();
  const filter = filterValue.toLowerCase();

  switch (operator) {
    case 'contains':
      return cell.includes(filter);
    case 'notContains':
      return !cell.includes(filter);
    case 'equals':
      return cell === filter;
    case 'notEquals':
      return cell !== filter;
    case 'startsWith':
      return cell.startsWith(filter);
    case 'endsWith':
      return cell.endsWith(filter);
    default:
      return true;
  }
}

function applyNumberFilter(cellValue: number, operator: string, filterValue: number, filterValueTo?: number): boolean {
  if (isNaN(cellValue)) return false;

  switch (operator) {
    case 'equals':
      return cellValue === filterValue;
    case 'notEquals':
      return cellValue !== filterValue;
    case 'greaterThan':
      return cellValue > filterValue;
    case 'greaterThanOrEqual':
      return cellValue >= filterValue;
    case 'lessThan':
      return cellValue < filterValue;
    case 'lessThanOrEqual':
      return cellValue <= filterValue;
    case 'between':
      return filterValueTo !== undefined && cellValue >= filterValue && cellValue <= filterValueTo;
    default:
      return true;
  }
}

function applyDateFilter(cellValue: string | Date, operator: string, filterValue: string, filterValueTo?: string): boolean {
  const cellDate = new Date(cellValue);
  const filterDate = new Date(filterValue);

  if (isNaN(cellDate.getTime())) return false;

  switch (operator) {
    case 'equals':
      return cellDate.toDateString() === filterDate.toDateString();
    case 'before':
      return cellDate < filterDate;
    case 'after':
      return cellDate > filterDate;
    case 'between':
      if (!filterValueTo) return true;
      const filterDateTo = new Date(filterValueTo);
      return cellDate >= filterDate && cellDate <= filterDateTo;
    default:
      return true;
  }
}

function applySelectFilter(cellValue: unknown, selectedValues: unknown[]): boolean {
  if (!Array.isArray(selectedValues) || selectedValues.length === 0) return true;
  return selectedValues.includes(cellValue);
}

// =============================================================================
// COMPONENTS
// =============================================================================

/**
 * Column filter button with popover
 */
export function ColumnFilterButton<TRow>({
  columnId,
  label,
  config,
  value,
  onChange,
  data,
  accessor,
}: ColumnFilterProps<TRow>) {
  const [open, setOpen] = useState(false);
  const hasFilter = value !== undefined;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            'h-6 w-6 p-0',
            hasFilter && 'text-primary'
          )}
        >
          <Filter className={cn('h-3 w-3', hasFilter && 'fill-current')} />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-3" align="start">
        <ColumnFilterContent
          columnId={columnId}
          label={label}
          config={config}
          value={value}
          onChange={(v) => {
            onChange(v);
            if (!v) setOpen(false);
          }}
          onClose={() => setOpen(false)}
          data={data}
          accessor={accessor}
        />
      </PopoverContent>
    </Popover>
  );
}

/**
 * Filter content inside popover
 */
function ColumnFilterContent<TRow>({
  columnId,
  label,
  config,
  value,
  onChange,
  onClose,
  data,
  accessor,
}: ColumnFilterProps<TRow> & { onClose: () => void }) {
  const [localValue, setLocalValue] = useState<FilterValue>(
    value ?? { type: config.type, operator: getDefaultOperator(config.type) }
  );

  const handleApply = () => {
    onChange(localValue);
    onClose();
  };

  const handleClear = () => {
    onChange(undefined);
    onClose();
  };

  // Get unique values for select filter
  const uniqueValues = useMemo(() => {
    if (config.type !== 'select' || !data || !accessor) return [];
    if (config.options) return config.options;

    const values = new Set<string>();
    data.forEach((row) => {
      const v = accessor(row);
      if (v !== null && v !== undefined) {
        values.add(String(v));
      }
    });
    return Array.from(values)
      .sort()
      .map((v) => ({ label: v, value: v }));
  }, [config, data, accessor]);

  return (
    <div className="space-y-3">
      <div className="font-medium text-sm">{label}</div>

      {config.type === 'text' && (
        <TextFilterInput
          value={localValue}
          onChange={setLocalValue}
        />
      )}

      {config.type === 'number' && (
        <NumberFilterInput
          value={localValue}
          onChange={setLocalValue}
        />
      )}

      {config.type === 'date' && (
        <DateFilterInput
          value={localValue}
          onChange={setLocalValue}
        />
      )}

      {config.type === 'select' && (
        <SelectFilterInput
          value={localValue}
          onChange={setLocalValue}
          options={uniqueValues}
        />
      )}

      {config.type === 'boolean' && (
        <BooleanFilterInput
          value={localValue}
          onChange={setLocalValue}
        />
      )}

      <div className="flex justify-between pt-2">
        <Button variant="ghost" size="sm" onClick={handleClear}>
          Clear
        </Button>
        <Button size="sm" onClick={handleApply}>
          Apply
        </Button>
      </div>
    </div>
  );
}

function getDefaultOperator(type: FilterType): string {
  switch (type) {
    case 'text':
      return 'contains';
    case 'number':
      return 'equals';
    case 'date':
      return 'equals';
    default:
      return 'equals';
  }
}

// =============================================================================
// FILTER INPUTS
// =============================================================================

function TextFilterInput({
  value,
  onChange,
}: {
  value: FilterValue;
  onChange: (value: FilterValue) => void;
}) {
  return (
    <div className="space-y-2">
      <Select
        value={value.operator ?? 'contains'}
        onValueChange={(op) => onChange({ ...value, operator: op })}
      >
        <SelectTrigger className="h-8 text-sm">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {TEXT_OPERATORS.map((op) => (
            <SelectItem key={op.value} value={op.value}>
              {op.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {!['empty', 'notEmpty'].includes(value.operator ?? '') && (
        <Input
          type="text"
          placeholder="Filter value..."
          value={String(value.value ?? '')}
          onChange={(e) => onChange({ ...value, value: e.target.value })}
          className="h-8 text-sm"
        />
      )}
    </div>
  );
}

function NumberFilterInput({
  value,
  onChange,
}: {
  value: FilterValue;
  onChange: (value: FilterValue) => void;
}) {
  return (
    <div className="space-y-2">
      <Select
        value={value.operator ?? 'equals'}
        onValueChange={(op) => onChange({ ...value, operator: op })}
      >
        <SelectTrigger className="h-8 text-sm">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {NUMBER_OPERATORS.map((op) => (
            <SelectItem key={op.value} value={op.value}>
              {op.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {!['empty', 'notEmpty'].includes(value.operator ?? '') && (
        <div className="flex gap-2">
          <Input
            type="number"
            placeholder={value.operator === 'between' ? 'From' : 'Value'}
            value={String(value.value ?? '')}
            onChange={(e) => onChange({ ...value, value: e.target.value })}
            className="h-8 text-sm"
          />
          {value.operator === 'between' && (
            <Input
              type="number"
              placeholder="To"
              value={String(value.valueTo ?? '')}
              onChange={(e) => onChange({ ...value, valueTo: e.target.value })}
              className="h-8 text-sm"
            />
          )}
        </div>
      )}
    </div>
  );
}

function DateFilterInput({
  value,
  onChange,
}: {
  value: FilterValue;
  onChange: (value: FilterValue) => void;
}) {
  return (
    <div className="space-y-2">
      <Select
        value={value.operator ?? 'equals'}
        onValueChange={(op) => onChange({ ...value, operator: op })}
      >
        <SelectTrigger className="h-8 text-sm">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {DATE_OPERATORS.map((op) => (
            <SelectItem key={op.value} value={op.value}>
              {op.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {!['empty', 'notEmpty'].includes(value.operator ?? '') && (
        <div className="flex gap-2">
          <Input
            type="date"
            value={String(value.value ?? '')}
            onChange={(e) => onChange({ ...value, value: e.target.value })}
            className="h-8 text-sm"
          />
          {value.operator === 'between' && (
            <Input
              type="date"
              value={String(value.valueTo ?? '')}
              onChange={(e) => onChange({ ...value, valueTo: e.target.value })}
              className="h-8 text-sm"
            />
          )}
        </div>
      )}
    </div>
  );
}

function SelectFilterInput({
  value,
  onChange,
  options,
}: {
  value: FilterValue;
  onChange: (value: FilterValue) => void;
  options: Array<{ label: string; value: string | number | boolean }>;
}) {
  const selected = Array.isArray(value.value) ? value.value : [];

  const toggleOption = (optValue: string | number | boolean) => {
    const newSelected = selected.includes(optValue)
      ? selected.filter((v) => v !== optValue)
      : [...selected, optValue];
    onChange({ ...value, value: newSelected });
  };

  return (
    <div className="space-y-2 max-h-48 overflow-auto">
      {options.map((opt) => (
        <label
          key={String(opt.value)}
          className="flex items-center gap-2 cursor-pointer hover:bg-muted/50 p-1 rounded"
        >
          <input
            type="checkbox"
            checked={selected.includes(opt.value)}
            onChange={() => toggleOption(opt.value)}
            className="h-4 w-4 rounded border-slate-300"
          />
          <span className="text-sm">{opt.label}</span>
        </label>
      ))}
    </div>
  );
}

function BooleanFilterInput({
  value,
  onChange,
}: {
  value: FilterValue;
  onChange: (value: FilterValue) => void;
}) {
  return (
    <div className="space-y-1">
      {[
        { label: 'All', value: undefined },
        { label: 'Yes', value: true },
        { label: 'No', value: false },
      ].map((opt) => (
        <label
          key={String(opt.value)}
          className="flex items-center gap-2 cursor-pointer hover:bg-muted/50 p-1 rounded"
        >
          <input
            type="radio"
            name="boolean-filter"
            checked={value.value === opt.value}
            onChange={() => onChange({ ...value, value: opt.value })}
            className="h-4 w-4"
          />
          <span className="text-sm">{opt.label}</span>
        </label>
      ))}
    </div>
  );
}

export default ColumnFilterButton;

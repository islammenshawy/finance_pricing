import { ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react';
import type { SortField, SortDirection } from '@/types/pricing';

interface SortableHeaderProps {
  label: string;
  field: SortField;
  currentField?: SortField;
  direction?: SortDirection;
  onSort?: (field: SortField) => void;
  align?: 'left' | 'right' | 'center';
}

/**
 * Sortable header cell for table columns
 * Displays sort indicator and handles sort toggle
 */
export function SortableHeader({
  label,
  field,
  currentField,
  direction,
  onSort,
  align = 'left',
}: SortableHeaderProps) {
  const isActive = currentField === field;
  const alignClass = align === 'right' ? 'justify-end' : align === 'center' ? 'justify-center' : 'justify-start';

  return (
    <div className={`px-3 flex ${alignClass}`}>
      <button
        className={`inline-flex items-center gap-1 text-[11px] uppercase tracking-wider font-semibold transition-colors hover:text-slate-900 dark:hover:text-slate-100 ${
          isActive ? 'text-slate-900 dark:text-slate-100' : 'text-slate-600 dark:text-slate-300'
        }`}
        onClick={() => onSort?.(field)}
      >
        {label}
        {isActive ? (
          direction === 'asc' ? (
            <ArrowUp className="h-3 w-3" />
          ) : (
            <ArrowDown className="h-3 w-3" />
          )
        ) : (
          <ArrowUpDown className="h-3 w-3 opacity-40" />
        )}
      </button>
    </div>
  );
}

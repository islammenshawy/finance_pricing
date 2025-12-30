interface CurrencyCellProps {
  value: number | null;
  currency?: string;
  locale?: string;
  showSign?: boolean;
  colorBySign?: boolean;
  compact?: boolean;
  className?: string;
}

/**
 * Reusable currency cell for displaying formatted monetary values
 */
export function CurrencyCell({
  value,
  currency = 'USD',
  locale = 'en-US',
  showSign = false,
  colorBySign = false,
  compact = false,
  className = '',
}: CurrencyCellProps) {
  if (value === null || value === undefined) {
    return <span className={`text-muted-foreground ${className}`}>-</span>;
  }

  const formatter = new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    notation: compact ? 'compact' : 'standard',
    maximumFractionDigits: compact ? 1 : 2,
  });

  let formatted = formatter.format(Math.abs(value));

  if (showSign && value !== 0) {
    formatted = (value > 0 ? '+' : '-') + formatted.replace(/^-/, '');
  }

  let colorClass = '';
  if (colorBySign) {
    if (value > 0) colorClass = 'text-green-600 dark:text-green-400';
    else if (value < 0) colorClass = 'text-red-600 dark:text-red-400';
  }

  return (
    <span className={`tabular-nums ${colorClass} ${className}`}>
      {value < 0 && !showSign ? '-' : ''}{formatted}
    </span>
  );
}

interface CurrencyChangeCellProps extends CurrencyCellProps {
  originalValue: number | null;
}

/**
 * Currency cell with change indicator showing before/after
 */
export function CurrencyChangeCell({
  value,
  originalValue,
  currency = 'USD',
  locale = 'en-US',
  className = '',
}: CurrencyChangeCellProps) {
  const hasChanged = value !== originalValue && value !== null && originalValue !== null;
  const change = hasChanged ? value - originalValue : null;

  const formatter = new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  });

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <span className={`tabular-nums ${hasChanged ? 'font-medium' : ''}`}>
        {value !== null ? formatter.format(value) : '-'}
      </span>
      {hasChanged && change !== null && (
        <span className={`text-xs tabular-nums ${change > 0 ? 'text-red-600' : 'text-green-600'}`}>
          ({change > 0 ? '+' : ''}{formatter.format(change)})
        </span>
      )}
    </div>
  );
}

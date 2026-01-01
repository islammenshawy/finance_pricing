import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { formatPercent } from '@/lib/utils';

interface EditableRateCellProps {
  value: number;
  isModified: boolean;
  originalValue: number | undefined;
  isLocked: boolean;
  readOnly?: boolean;
  onChange: (value: number) => void;
}

/**
 * Editable rate cell with inline editing and delta display
 * Used for base rate and spread columns in the loan pricing table
 */
export function EditableRateCell({
  value,
  isModified,
  originalValue,
  isLocked,
  readOnly = false,
  onChange,
}: EditableRateCellProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [localValue, setLocalValue] = useState((value * 100).toFixed(2));

  const handleBlur = () => {
    setIsEditing(false);
    const parsed = parseFloat(localValue);
    if (!isNaN(parsed)) {
      onChange(parsed / 100);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleBlur();
    } else if (e.key === 'Escape') {
      setLocalValue((value * 100).toFixed(2));
      setIsEditing(false);
    }
  };

  // Calculate delta for display
  const delta = isModified && originalValue !== undefined ? value - originalValue : 0;
  const deltaPercent = delta * 100;

  if (isLocked || readOnly) {
    return (
      <div className="inline-flex flex-col items-end">
        <span className={`font-mono ${isModified ? 'text-amber-600 font-semibold' : 'text-muted-foreground'}`}>
          {formatPercent(value)}
        </span>
        {isModified && originalValue !== undefined && (
          <div className="flex items-center gap-1 text-xs mt-0.5">
            <span className="text-muted-foreground line-through">{formatPercent(originalValue)}</span>
            <span className={deltaPercent > 0 ? 'text-green-600' : 'text-red-600'}>
              {deltaPercent > 0 ? '+' : ''}{deltaPercent.toFixed(2)}%
            </span>
          </div>
        )}
      </div>
    );
  }

  if (isEditing) {
    return (
      <Input
        type="number"
        step="0.01"
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        autoFocus
        className="w-20 h-7 text-right font-mono text-sm"
      />
    );
  }

  return (
    <div className="inline-flex flex-col items-end">
      <button
        onClick={() => {
          setLocalValue((value * 100).toFixed(2));
          setIsEditing(true);
        }}
        className={`font-mono px-2 py-0.5 rounded cursor-pointer transition-all ${
          isModified
            ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200 ring-1 ring-inset ring-amber-400 dark:ring-amber-600'
            : 'border border-dashed border-slate-300 dark:border-slate-600 hover:border-slate-400 dark:hover:border-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'
        }`}
        title="Click to edit"
      >
        {formatPercent(value)}
      </button>
      {isModified && originalValue !== undefined && (
        <div className="flex items-center gap-1 text-xs mt-0.5">
          <span className="text-muted-foreground line-through">{formatPercent(originalValue)}</span>
          <span className={deltaPercent > 0 ? 'text-green-600' : 'text-red-600'}>
            {deltaPercent > 0 ? '+' : ''}{deltaPercent.toFixed(2)}%
          </span>
        </div>
      )}
    </div>
  );
}

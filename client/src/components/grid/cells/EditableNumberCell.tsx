import { useState, useRef, useEffect, KeyboardEvent } from 'react';

interface EditableNumberCellProps {
  value: number | null;
  onChange: (newValue: number | null) => void;
  disabled?: boolean;
  placeholder?: string;
  min?: number;
  max?: number;
  step?: number;
  decimals?: number;
  suffix?: string;
  prefix?: string;
  className?: string;
  showChange?: boolean;
  originalValue?: number | null;
}

/**
 * Reusable editable number cell for inline editing with optional change indicator
 */
export function EditableNumberCell({
  value,
  onChange,
  disabled = false,
  placeholder = '0',
  min,
  max,
  step = 0.01,
  decimals = 2,
  suffix = '',
  prefix = '',
  className = '',
  showChange = false,
  originalValue,
}: EditableNumberCellProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value?.toFixed(decimals) ?? '');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  useEffect(() => {
    setEditValue(value?.toFixed(decimals) ?? '');
  }, [value, decimals]);

  const handleSave = () => {
    const parsed = parseFloat(editValue);
    if (!isNaN(parsed)) {
      let finalValue = parsed;
      if (min !== undefined) finalValue = Math.max(min, finalValue);
      if (max !== undefined) finalValue = Math.min(max, finalValue);
      if (finalValue !== value) {
        onChange(finalValue);
      }
    } else if (editValue === '') {
      onChange(null);
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditValue(value?.toFixed(decimals) ?? '');
    setIsEditing(false);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      handleCancel();
    } else if (e.key === 'Tab') {
      handleSave();
    }
  };

  const hasChanged = showChange && originalValue !== undefined && value !== originalValue;
  const changeAmount = hasChanged && value !== null && originalValue !== null
    ? value - originalValue
    : null;

  if (disabled) {
    return (
      <span className={`text-muted-foreground ${className}`}>
        {value !== null ? `${prefix}${value.toFixed(decimals)}${suffix}` : placeholder}
      </span>
    );
  }

  if (isEditing) {
    return (
      <div className="flex items-center gap-1">
        {prefix && <span className="text-muted-foreground text-sm">{prefix}</span>}
        <input
          ref={inputRef}
          type="number"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={handleSave}
          onKeyDown={handleKeyDown}
          min={min}
          max={max}
          step={step}
          className={`w-20 px-2 py-1 text-sm border border-blue-400 rounded focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${className}`}
          onClick={(e) => e.stopPropagation()}
        />
        {suffix && <span className="text-muted-foreground text-sm">{suffix}</span>}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span
        className={`cursor-pointer hover:bg-muted/50 px-2 py-1 rounded ${hasChanged ? 'bg-amber-100 dark:bg-amber-900/30' : ''} ${className}`}
        onClick={(e) => {
          e.stopPropagation();
          setIsEditing(true);
        }}
      >
        {value !== null ? `${prefix}${value.toFixed(decimals)}${suffix}` : <span className="text-muted-foreground">{placeholder}</span>}
      </span>
      {hasChanged && changeAmount !== null && (
        <span className={`text-xs ${changeAmount > 0 ? 'text-red-600' : 'text-green-600'}`}>
          ({changeAmount > 0 ? '+' : ''}{changeAmount.toFixed(decimals)})
        </span>
      )}
    </div>
  );
}

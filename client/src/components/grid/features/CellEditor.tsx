/**
 * @fileoverview Cell Editor Components
 *
 * Provides inline editing for grid cells with various editor types:
 * - Text input
 * - Number input (with min/max/step)
 * - Select dropdown
 * - Date picker
 * - Checkbox
 * - Custom editors
 *
 * @module grid/features/CellEditor
 */

import { useState, useRef, useEffect, useCallback, KeyboardEvent } from 'react';
import { Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { CellEditor as CellEditorConfig, EditorType } from '../types';

// =============================================================================
// TYPES
// =============================================================================

export interface CellEditorProps<TValue = unknown> {
  /** Current cell value */
  value: TValue;

  /** Editor configuration */
  config: CellEditorConfig<unknown, TValue>;

  /** Called when value changes */
  onChange: (value: TValue) => void;

  /** Called to save and close editor */
  onSave: () => void;

  /** Called to cancel editing */
  onCancel: () => void;

  /** Additional class names */
  className?: string;

  /** Auto-focus on mount */
  autoFocus?: boolean;
}

export interface UseCellEditingOptions<TRow> {
  /** Row data */
  row: TRow;

  /** Column ID */
  columnId: string;

  /** Initial value */
  initialValue: unknown;

  /** Editor config */
  editor?: CellEditorConfig<TRow>;

  /** Called when edit is saved */
  onSave?: (newValue: unknown, oldValue: unknown) => void | Promise<void>;

  /** Called when edit is cancelled */
  onCancel?: () => void;
}

export interface UseCellEditingReturn<TValue = unknown> {
  /** Whether currently editing */
  isEditing: boolean;

  /** Current editor value */
  value: TValue;

  /** Validation error message */
  error: string | null;

  /** Start editing */
  startEditing: () => void;

  /** Update value */
  setValue: (value: TValue) => void;

  /** Save changes */
  save: () => Promise<void>;

  /** Cancel editing */
  cancel: () => void;

  /** Whether save is in progress */
  isSaving: boolean;
}

// =============================================================================
// HOOK
// =============================================================================

/**
 * Hook for managing cell editing state
 */
export function useCellEditing<TRow, TValue = unknown>({
  row,
  columnId,
  initialValue,
  editor,
  onSave,
  onCancel,
}: UseCellEditingOptions<TRow>): UseCellEditingReturn<TValue> {
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState<TValue>(initialValue as TValue);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const startEditing = useCallback(() => {
    setValue(initialValue as TValue);
    setError(null);
    setIsEditing(true);
  }, [initialValue]);

  const save = useCallback(async () => {
    if (!editor) return;

    // Validate
    if (editor.validate) {
      const validationError = editor.validate(value, row);
      if (validationError) {
        setError(validationError);
        return;
      }
    }

    setIsSaving(true);
    setError(null);

    try {
      // Call editor's onSave if provided
      if (editor.onSave) {
        await editor.onSave(row, value, initialValue as TValue);
      }

      // Call external onSave
      await onSave?.(value, initialValue);

      setIsEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setIsSaving(false);
    }
  }, [editor, row, value, initialValue, onSave]);

  const cancel = useCallback(() => {
    setValue(initialValue as TValue);
    setError(null);
    setIsEditing(false);
    editor?.onCancel?.(row);
    onCancel?.();
  }, [initialValue, editor, row, onCancel]);

  return {
    isEditing,
    value,
    error,
    startEditing,
    setValue,
    save,
    cancel,
    isSaving,
  };
}

// =============================================================================
// TEXT EDITOR
// =============================================================================

interface TextEditorProps {
  value: string;
  onChange: (value: string) => void;
  onSave: () => void;
  onCancel: () => void;
  placeholder?: string;
  autoFocus?: boolean;
  className?: string;
}

export function TextEditor({
  value,
  onChange,
  onSave,
  onCancel,
  placeholder,
  autoFocus = true,
  className,
}: TextEditorProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (autoFocus) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [autoFocus]);

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      onSave();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onCancel();
    }
  };

  return (
    <Input
      ref={inputRef}
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={handleKeyDown}
      onBlur={onSave}
      placeholder={placeholder}
      className={cn('h-8 text-sm', className)}
    />
  );
}

// =============================================================================
// NUMBER EDITOR
// =============================================================================

interface NumberEditorProps {
  value: number;
  onChange: (value: number) => void;
  onSave: () => void;
  onCancel: () => void;
  min?: number;
  max?: number;
  step?: number;
  autoFocus?: boolean;
  className?: string;
}

export function NumberEditor({
  value,
  onChange,
  onSave,
  onCancel,
  min,
  max,
  step = 1,
  autoFocus = true,
  className,
}: NumberEditorProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [localValue, setLocalValue] = useState(String(value));

  useEffect(() => {
    if (autoFocus) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [autoFocus]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const str = e.target.value;
    setLocalValue(str);

    const num = parseFloat(str);
    if (!isNaN(num)) {
      onChange(num);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      onSave();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onCancel();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const newVal = Math.min(max ?? Infinity, value + step);
      setLocalValue(String(newVal));
      onChange(newVal);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      const newVal = Math.max(min ?? -Infinity, value - step);
      setLocalValue(String(newVal));
      onChange(newVal);
    }
  };

  return (
    <Input
      ref={inputRef}
      type="number"
      value={localValue}
      onChange={handleChange}
      onKeyDown={handleKeyDown}
      onBlur={onSave}
      min={min}
      max={max}
      step={step}
      className={cn('h-8 text-sm font-mono tabular-nums', className)}
    />
  );
}

// =============================================================================
// SELECT EDITOR
// =============================================================================

interface SelectEditorProps<TValue = string> {
  value: TValue;
  onChange: (value: TValue) => void;
  onSave: () => void;
  onCancel: () => void;
  options: Array<{ label: string; value: TValue }>;
  placeholder?: string;
  className?: string;
}

export function SelectEditor<TValue = string>({
  value,
  onChange,
  onSave,
  onCancel,
  options,
  placeholder = 'Select...',
  className,
}: SelectEditorProps<TValue>) {
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onCancel();
    }
  };

  return (
    <Select
      value={String(value)}
      onValueChange={(v) => {
        const option = options.find((o) => String(o.value) === v);
        if (option) {
          onChange(option.value);
          // Auto-save on select
          setTimeout(onSave, 0);
        }
      }}
    >
      <SelectTrigger
        className={cn('h-8 text-sm', className)}
        onKeyDown={handleKeyDown}
      >
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={String(option.value)} value={String(option.value)}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

// =============================================================================
// DATE EDITOR
// =============================================================================

interface DateEditorProps {
  value: string; // ISO date string
  onChange: (value: string) => void;
  onSave: () => void;
  onCancel: () => void;
  min?: string;
  max?: string;
  autoFocus?: boolean;
  className?: string;
}

export function DateEditor({
  value,
  onChange,
  onSave,
  onCancel,
  min,
  max,
  autoFocus = true,
  className,
}: DateEditorProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (autoFocus) {
      inputRef.current?.focus();
    }
  }, [autoFocus]);

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      onSave();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onCancel();
    }
  };

  // Convert ISO string to date input format (YYYY-MM-DD)
  const dateValue = value ? value.split('T')[0] : '';

  return (
    <Input
      ref={inputRef}
      type="date"
      value={dateValue}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={handleKeyDown}
      onBlur={onSave}
      min={min}
      max={max}
      className={cn('h-8 text-sm', className)}
    />
  );
}

// =============================================================================
// CHECKBOX EDITOR
// =============================================================================

interface CheckboxEditorProps {
  value: boolean;
  onChange: (value: boolean) => void;
  onSave: () => void;
  label?: string;
  className?: string;
}

export function CheckboxEditor({
  value,
  onChange,
  onSave,
  label,
  className,
}: CheckboxEditorProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.checked);
    // Auto-save on toggle
    setTimeout(onSave, 0);
  };

  return (
    <label className={cn('flex items-center gap-2 cursor-pointer', className)}>
      <input
        type="checkbox"
        checked={value}
        onChange={handleChange}
        className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary/20"
      />
      {label && <span className="text-sm">{label}</span>}
    </label>
  );
}

// =============================================================================
// INLINE EDITOR WRAPPER
// =============================================================================

interface InlineEditorProps<TValue = unknown> {
  value: TValue;
  config: CellEditorConfig<unknown, TValue>;
  onSave: (value: TValue) => void;
  onCancel: () => void;
  showActions?: boolean;
  error?: string | null;
  isSaving?: boolean;
}

/**
 * Universal inline editor that renders the appropriate editor based on config
 */
export function InlineEditor<TValue = unknown>({
  value,
  config,
  onSave,
  onCancel,
  showActions = false,
  error,
  isSaving,
}: InlineEditorProps<TValue>) {
  const [localValue, setLocalValue] = useState<TValue>(value);

  const handleSave = () => {
    onSave(localValue);
  };

  // Render custom editor if provided
  if (config.component) {
    return config.component({
      row: {} as unknown,
      value: localValue,
      onChange: setLocalValue,
      onSave: handleSave,
      onCancel,
      column: {} as unknown,
    });
  }

  // Render built-in editor based on type
  const renderEditor = () => {
    switch (config.type) {
      case 'text':
        return (
          <TextEditor
            value={String(localValue ?? '')}
            onChange={(v) => setLocalValue(v as TValue)}
            onSave={handleSave}
            onCancel={onCancel}
          />
        );

      case 'number':
        return (
          <NumberEditor
            value={Number(localValue ?? 0)}
            onChange={(v) => setLocalValue(v as TValue)}
            onSave={handleSave}
            onCancel={onCancel}
            min={config.min}
            max={config.max}
            step={config.step}
          />
        );

      case 'select':
        return (
          <SelectEditor
            value={localValue}
            onChange={setLocalValue}
            onSave={handleSave}
            onCancel={onCancel}
            options={config.options ?? []}
          />
        );

      case 'date':
        return (
          <DateEditor
            value={String(localValue ?? '')}
            onChange={(v) => setLocalValue(v as TValue)}
            onSave={handleSave}
            onCancel={onCancel}
          />
        );

      case 'checkbox':
        return (
          <CheckboxEditor
            value={Boolean(localValue)}
            onChange={(v) => setLocalValue(v as TValue)}
            onSave={handleSave}
          />
        );

      default:
        return (
          <TextEditor
            value={String(localValue ?? '')}
            onChange={(v) => setLocalValue(v as TValue)}
            onSave={handleSave}
            onCancel={onCancel}
          />
        );
    }
  };

  return (
    <div className="flex items-center gap-1">
      <div className="flex-1">{renderEditor()}</div>

      {showActions && (
        <div className="flex items-center gap-0.5">
          <Button
            size="sm"
            variant="ghost"
            className="h-6 w-6 p-0"
            onClick={handleSave}
            disabled={isSaving}
          >
            <Check className="h-3 w-3 text-green-600" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-6 w-6 p-0"
            onClick={onCancel}
            disabled={isSaving}
          >
            <X className="h-3 w-3 text-red-600" />
          </Button>
        </div>
      )}

      {error && (
        <span className="text-xs text-red-500 ml-1">{error}</span>
      )}
    </div>
  );
}

export default InlineEditor;

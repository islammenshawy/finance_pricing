/**
 * @fileoverview SearchBar Component - Standalone Search Input
 *
 * A reusable search bar component that can be consumed by any MFE.
 * Features:
 * - Debounced search input
 * - Keyboard shortcuts (Cmd/Ctrl+K to focus, Escape to clear)
 * - Clear button
 * - Loading state
 * - Customizable placeholder and styling
 *
 * @module components/ui/SearchBar
 *
 * @example Basic Usage
 * ```tsx
 * <SearchBar
 *   value={searchTerm}
 *   onChange={setSearchTerm}
 *   placeholder="Search..."
 * />
 * ```
 *
 * @example With Debounce and Loading
 * ```tsx
 * <SearchBar
 *   value={searchTerm}
 *   onChange={handleSearch}
 *   debounceMs={300}
 *   isLoading={isSearching}
 *   placeholder="Search loans..."
 *   shortcutKey="k"
 * />
 * ```
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { Search, X, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from './input';

// =============================================================================
// TYPES
// =============================================================================

export interface SearchBarProps {
  /** Current search value */
  value: string;

  /** Called when search value changes */
  onChange: (value: string) => void;

  /** Placeholder text */
  placeholder?: string;

  /** Debounce delay in ms (0 = no debounce) */
  debounceMs?: number;

  /** Show loading spinner */
  isLoading?: boolean;

  /** Keyboard shortcut key (used with Cmd/Ctrl) */
  shortcutKey?: string;

  /** Show keyboard shortcut hint */
  showShortcutHint?: boolean;

  /** Additional class names */
  className?: string;

  /** Input size variant */
  size?: 'sm' | 'md' | 'lg';

  /** Auto focus on mount */
  autoFocus?: boolean;

  /** Disabled state */
  disabled?: boolean;

  /** Called when search is cleared */
  onClear?: () => void;

  /** Called on Enter key */
  onSubmit?: (value: string) => void;

  /** Called when input is focused */
  onFocus?: () => void;

  /** Called when input is blurred */
  onBlur?: () => void;
}

// =============================================================================
// SIZE VARIANTS
// =============================================================================

const SIZE_CLASSES = {
  sm: 'h-8 text-sm pl-8 pr-8',
  md: 'h-10 text-sm pl-10 pr-10',
  lg: 'h-12 text-base pl-12 pr-12',
};

const ICON_CLASSES = {
  sm: 'h-3.5 w-3.5 left-2.5',
  md: 'h-4 w-4 left-3',
  lg: 'h-5 w-5 left-3.5',
};

const CLEAR_CLASSES = {
  sm: 'right-2 h-3.5 w-3.5',
  md: 'right-3 h-4 w-4',
  lg: 'right-3.5 h-5 w-5',
};

// =============================================================================
// COMPONENT
// =============================================================================

export function SearchBar({
  value,
  onChange,
  placeholder = 'Search...',
  debounceMs = 0,
  isLoading = false,
  shortcutKey = 'k',
  showShortcutHint = true,
  className,
  size = 'md',
  autoFocus = false,
  disabled = false,
  onClear,
  onSubmit,
  onFocus,
  onBlur,
}: SearchBarProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [localValue, setLocalValue] = useState(value);
  const [isFocused, setIsFocused] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Sync local value with controlled value
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  // Debounced onChange
  const handleChange = useCallback(
    (newValue: string) => {
      setLocalValue(newValue);

      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }

      if (debounceMs > 0) {
        debounceRef.current = setTimeout(() => {
          onChange(newValue);
        }, debounceMs);
      } else {
        onChange(newValue);
      }
    },
    [onChange, debounceMs]
  );

  // Clear handler
  const handleClear = useCallback(() => {
    setLocalValue('');
    onChange('');
    onClear?.();
    inputRef.current?.focus();
  }, [onChange, onClear]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Focus on Cmd/Ctrl + shortcutKey
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === shortcutKey.toLowerCase()) {
        e.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
      }

      // Clear on Escape when focused
      if (e.key === 'Escape' && isFocused) {
        if (localValue) {
          handleClear();
        } else {
          inputRef.current?.blur();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [shortcutKey, isFocused, localValue, handleClear]);

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  // Handle focus/blur
  const handleFocus = () => {
    setIsFocused(true);
    onFocus?.();
  };

  const handleBlur = () => {
    setIsFocused(false);
    onBlur?.();
  };

  // Handle Enter key
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && onSubmit) {
      e.preventDefault();
      onSubmit(localValue);
    }
  };

  const isMac = typeof navigator !== 'undefined' && navigator.platform.toLowerCase().includes('mac');
  const shortcutHint = `${isMac ? '⌘' : 'Ctrl+'}${shortcutKey.toUpperCase()}`;

  return (
    <div className={cn('relative', className)}>
      {/* Search Icon */}
      <Search
        className={cn(
          'absolute top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 pointer-events-none',
          ICON_CLASSES[size]
        )}
      />

      {/* Input */}
      <Input
        ref={inputRef}
        type="text"
        value={localValue}
        onChange={(e) => handleChange(e.target.value)}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        autoFocus={autoFocus}
        disabled={disabled}
        className={cn(
          SIZE_CLASSES[size],
          'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700',
          'focus:ring-2 focus:ring-primary/20 focus:border-primary',
          'placeholder:text-slate-400 dark:placeholder:text-slate-500',
          isFocused && 'ring-2 ring-primary/20 border-primary',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
      />

      {/* Right Side: Clear Button, Loading, or Shortcut Hint */}
      <div
        className={cn(
          'absolute top-1/2 -translate-y-1/2 flex items-center gap-1',
          CLEAR_CLASSES[size].split(' ')[0] // Get only the 'right-X' class
        )}
      >
        {isLoading ? (
          <Loader2
            className={cn(
              'animate-spin text-slate-400',
              CLEAR_CLASSES[size].split(' ').slice(1).join(' ')
            )}
          />
        ) : localValue ? (
          <button
            type="button"
            onClick={handleClear}
            className={cn(
              'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors',
              'focus:outline-none focus:text-slate-600 dark:focus:text-slate-300',
              CLEAR_CLASSES[size].split(' ').slice(1).join(' ')
            )}
            tabIndex={-1}
          >
            <X className="h-full w-full" />
          </button>
        ) : showShortcutHint && !isFocused ? (
          <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-medium text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700">
            {shortcutHint}
          </kbd>
        ) : null}
      </div>
    </div>
  );
}

export default SearchBar;

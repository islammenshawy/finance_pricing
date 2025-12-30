import { useState, useCallback } from 'react';

/**
 * Custom hook for managing a Set with toggle functionality
 * Consolidates the repeated Set toggle pattern used across components
 */
export function useToggleSet<T extends string | number>(
  initialValues?: Iterable<T>
) {
  const [items, setItems] = useState<Set<T>>(() => new Set(initialValues));

  /**
   * Toggle a single item in the set
   */
  const toggle = useCallback((item: T) => {
    setItems((prev) => {
      const next = new Set(prev);
      if (next.has(item)) {
        next.delete(item);
      } else {
        next.add(item);
      }
      return next;
    });
  }, []);

  /**
   * Add a single item to the set
   */
  const add = useCallback((item: T) => {
    setItems((prev) => {
      const next = new Set(prev);
      next.add(item);
      return next;
    });
  }, []);

  /**
   * Remove a single item from the set
   */
  const remove = useCallback((item: T) => {
    setItems((prev) => {
      const next = new Set(prev);
      next.delete(item);
      return next;
    });
  }, []);

  /**
   * Toggle all items in an array based on current selection state
   * If all are selected, deselect all; otherwise select all
   */
  const toggleAll = useCallback((itemsToToggle: T[]) => {
    setItems((prev) => {
      const allSelected = itemsToToggle.every((item) => prev.has(item));
      const next = new Set(prev);

      for (const item of itemsToToggle) {
        if (allSelected) {
          next.delete(item);
        } else {
          next.add(item);
        }
      }

      return next;
    });
  }, []);

  /**
   * Set all items at once (replace current set)
   */
  const setAll = useCallback((newItems: Iterable<T>) => {
    setItems(new Set(newItems));
  }, []);

  /**
   * Add multiple items at once
   */
  const addAll = useCallback((itemsToAdd: Iterable<T>) => {
    setItems((prev) => {
      const next = new Set(prev);
      for (const item of itemsToAdd) {
        next.add(item);
      }
      return next;
    });
  }, []);

  /**
   * Clear all items from the set
   */
  const clear = useCallback(() => {
    setItems(new Set());
  }, []);

  /**
   * Check if an item is in the set
   */
  const has = useCallback((item: T) => items.has(item), [items]);

  /**
   * Check if all items in an array are selected
   */
  const hasAll = useCallback(
    (itemsToCheck: T[]) => itemsToCheck.every((item) => items.has(item)),
    [items]
  );

  /**
   * Check if any items in an array are selected
   */
  const hasAny = useCallback(
    (itemsToCheck: T[]) => itemsToCheck.some((item) => items.has(item)),
    [items]
  );

  return {
    items,
    size: items.size,
    toggle,
    add,
    remove,
    toggleAll,
    setAll,
    addAll,
    clear,
    has,
    hasAll,
    hasAny,
  };
}

/**
 * Generic field update helper functions
 * Reduces boilerplate in update operations
 */

/**
 * Apply partial updates to a target object
 * Only applies values that are not undefined
 */
export function applyUpdates<T extends object>(
  target: T,
  updates: Partial<T>,
  fields: (keyof T)[]
): void {
  for (const field of fields) {
    if (updates[field] !== undefined) {
      target[field] = updates[field] as T[keyof T];
    }
  }
}

/**
 * Apply nested updates to a target object
 * Supports dot notation paths like 'pricing.baseRate'
 */
export function applyNestedUpdates<T extends Record<string, any>>(
  target: T,
  updates: Record<string, unknown>,
  prefix = ''
): void {
  for (const [key, value] of Object.entries(updates)) {
    if (value === undefined) continue;

    const path = prefix ? `${prefix}.${key}` : key;

    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      // Recursively apply nested object updates
      const nested = getNestedValue(target, key);
      if (nested && typeof nested === 'object') {
        applyNestedUpdates(nested as Record<string, any>, value as Record<string, unknown>);
      }
    } else {
      setNestedValue(target, key, value);
    }
  }
}

/**
 * Get a nested value from an object using dot notation
 */
export function getNestedValue<T>(obj: T, path: string): unknown {
  return path.split('.').reduce((current: any, key) => current?.[key], obj);
}

/**
 * Set a nested value on an object using dot notation
 */
export function setNestedValue<T extends Record<string, any>>(
  obj: T,
  path: string,
  value: unknown
): void {
  const keys = path.split('.');
  const lastKey = keys.pop()!;
  const target = keys.reduce((current: any, key) => {
    if (current[key] === undefined) {
      current[key] = {};
    }
    return current[key];
  }, obj);
  target[lastKey] = value;
}

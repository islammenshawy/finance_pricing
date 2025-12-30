import { Schema } from 'mongoose';

/**
 * Standard toJSON transform function
 * - Converts _id to id
 * - Removes __v field
 * - Removes _id from output
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function standardToJSONTransform(_doc: any, ret: any): any {
  ret.id = ret._id?.toString();
  delete ret._id;
  delete ret.__v;
  return ret;
}

/**
 * Apply standard JSON transformation to a schema
 * Use this to ensure consistent API responses across all models
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function applyStandardToJSON(schema: Schema<any>): void {
  schema.set('toJSON', {
    virtuals: true,
    versionKey: false,
    transform: standardToJSONTransform,
  });
}

/**
 * Create standard timestamps configuration
 */
export const standardTimestamps = {
  timestamps: true,
};

/**
 * Calculate total from an array of items with an amount field
 */
export function calculateTotal<T extends { amount: number }>(items: T[]): number {
  return items.reduce((sum, item) => sum + item.amount, 0);
}

/**
 * Round to 2 decimal places (for currency)
 */
export function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Round to 4 decimal places (for rates)
 */
export function round4(value: number): number {
  return Math.round(value * 10000) / 10000;
}

/**
 * Clone a subdocument for copying (removes mongoose internals)
 */
export function cloneSubdocument<T extends object>(doc: T): Partial<T> {
  const obj = JSON.parse(JSON.stringify(doc));
  delete obj._id;
  delete obj.__v;
  delete obj.id;
  return obj;
}

/**
 * Generate a unique identifier for a new entity
 * Combines a prefix with timestamp and random string
 */
export function generateUniqueId(prefix: string): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `${prefix}-${timestamp}-${random}`;
}

/**
 * Detect changes between two objects
 * Returns an object with only the changed fields
 */
export function detectChanges<T extends object>(
  original: T,
  updated: T,
  fieldsToCompare?: (keyof T)[]
): Partial<T> {
  const changes: Partial<T> = {};
  const fields = fieldsToCompare || (Object.keys(original) as (keyof T)[]);

  for (const field of fields) {
    const originalValue = JSON.stringify(original[field]);
    const updatedValue = JSON.stringify(updated[field]);
    if (originalValue !== updatedValue) {
      changes[field] = updated[field];
    }
  }

  return changes;
}

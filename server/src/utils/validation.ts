import { Model, Document } from 'mongoose';

/**
 * Loan state validation errors
 */
export class LoanLockedError extends Error {
  constructor(action: string) {
    super(`Cannot ${action} on a locked loan`);
    this.name = 'LoanLockedError';
  }
}

export class LoanNotFoundError extends Error {
  constructor(loanId: string) {
    super(`Loan with ID '${loanId}' not found`);
    this.name = 'LoanNotFoundError';
  }
}

export class EntityNotFoundError extends Error {
  constructor(entityName: string, id: string) {
    super(`${entityName} with ID '${id}' not found`);
    this.name = 'EntityNotFoundError';
  }
}

export class DuplicateEntityError extends Error {
  constructor(entityName: string, field: string, value: string) {
    super(`${entityName} with ${field} '${value}' already exists`);
    this.name = 'DuplicateEntityError';
  }
}

/**
 * Validate that a loan is not locked before performing an action
 * @throws LoanLockedError if loan is locked
 */
export function validateLoanNotLocked(
  loan: { pricingStatus: string },
  action: string
): void {
  if (loan.pricingStatus === 'locked') {
    throw new LoanLockedError(action);
  }
}

/**
 * Validate that an entity exists
 * @throws EntityNotFoundError if entity is null/undefined
 */
export function validateExists<T>(
  entity: T | null | undefined,
  entityName: string,
  id: string
): asserts entity is T {
  if (!entity) {
    throw new EntityNotFoundError(entityName, id);
  }
}

/**
 * Check if a document with the given field value already exists
 * @throws DuplicateEntityError if duplicate found
 */
export async function validateNoDuplicate<T extends Document>(
  model: Model<T>,
  field: string,
  value: string,
  entityName: string,
  excludeId?: string
): Promise<void> {
  const query: Record<string, unknown> = { [field]: value };
  if (excludeId) {
    query._id = { $ne: excludeId };
  }

  const existing = await model.findOne(query).exec();
  if (existing) {
    throw new DuplicateEntityError(entityName, field, value);
  }
}

/**
 * Validate required fields are present
 */
export function validateRequired(
  obj: Record<string, unknown>,
  fields: string[]
): void {
  const missing = fields.filter(
    (f) => obj[f] === undefined || obj[f] === null || obj[f] === ''
  );
  if (missing.length > 0) {
    throw new Error(`Missing required fields: ${missing.join(', ')}`);
  }
}

/**
 * Validate a number is within a range
 */
export function validateRange(
  value: number,
  min: number,
  max: number,
  fieldName: string
): void {
  if (value < min || value > max) {
    throw new Error(`${fieldName} must be between ${min} and ${max}`);
  }
}

/**
 * Validate a date is in the future
 */
export function validateFutureDate(date: Date | string, fieldName: string): void {
  const d = new Date(date);
  if (d <= new Date()) {
    throw new Error(`${fieldName} must be a future date`);
  }
}

/**
 * Validate a date range (start before end)
 */
export function validateDateRange(
  startDate: Date | string,
  endDate: Date | string,
  startFieldName: string,
  endFieldName: string
): void {
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (start >= end) {
    throw new Error(`${startFieldName} must be before ${endFieldName}`);
  }
}

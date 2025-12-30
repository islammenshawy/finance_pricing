/**
 * Audit tracking helper functions
 * Consolidates common audit patterns used across loan operations
 */

import { createAuditEntry, createBulkAuditEntries, detectChanges } from '../auditService';

export type EntityType = 'loan' | 'fee' | 'invoice';

interface AuditContext {
  userId: string;
  userName: string;
}

/**
 * Track entity creation in audit log
 */
export async function trackCreate(
  entityType: EntityType,
  entityId: string,
  loanId: string,
  newValue: unknown,
  context: AuditContext
): Promise<void> {
  await createAuditEntry({
    entityType,
    entityId,
    loanId,
    action: 'create',
    newValue,
    userId: context.userId,
    userName: context.userName,
  });
}

/**
 * Track entity update in audit log
 * Compares old and new values and creates audit entries for changes
 */
export async function trackUpdate(
  entityType: EntityType,
  entityId: string,
  loanId: string,
  oldValue: Record<string, unknown>,
  newValue: Record<string, unknown>,
  context: AuditContext
): Promise<void> {
  const changes = detectChanges(oldValue, newValue);
  if (changes.length > 0) {
    await createBulkAuditEntries(entityType, entityId, loanId, changes, context.userId, context.userName);
  }
}

/**
 * Track entity deletion in audit log
 */
export async function trackDelete(
  entityType: EntityType,
  entityId: string,
  loanId: string,
  oldValue: unknown,
  context: AuditContext
): Promise<void> {
  await createAuditEntry({
    entityType,
    entityId,
    loanId,
    action: 'delete',
    oldValue,
    userId: context.userId,
    userName: context.userName,
  });
}

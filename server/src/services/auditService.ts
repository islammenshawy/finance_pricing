import { AuditEntry } from '../models';
import type { AuditAction, EntityType } from '@loan-pricing/shared';

interface CreateAuditParams {
  entityType: EntityType;
  entityId: string;
  loanId?: string;
  action: AuditAction;
  fieldName?: string;
  oldValue?: unknown;
  newValue?: unknown;
  userId?: string;
  userName?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Create a single audit entry
 */
export async function createAuditEntry(params: CreateAuditParams): Promise<void> {
  await AuditEntry.create({
    entityType: params.entityType,
    entityId: params.entityId,
    loanId: params.loanId,
    action: params.action,
    fieldName: params.fieldName,
    oldValue: params.oldValue,
    newValue: params.newValue,
    userId: params.userId ?? 'system',
    userName: params.userName ?? 'System',
    timestamp: new Date(),
    metadata: params.metadata,
  });
}

/**
 * Create audit entries for multiple field changes
 */
export async function createBulkAuditEntries(
  entityType: EntityType,
  entityId: string,
  loanId: string | undefined,
  changes: Array<{ fieldName: string; oldValue: unknown; newValue: unknown }>,
  userId?: string,
  userName?: string
): Promise<void> {
  const entries = changes.map((change) => ({
    entityType,
    entityId,
    loanId,
    action: 'update' as const,
    fieldName: change.fieldName,
    oldValue: change.oldValue,
    newValue: change.newValue,
    userId: userId ?? 'system',
    userName: userName ?? 'System',
    timestamp: new Date(),
  }));

  await AuditEntry.insertMany(entries);
}

/**
 * Get audit history for a specific entity
 */
export async function getEntityAuditHistory(
  entityType: EntityType,
  entityId: string,
  options?: {
    limit?: number;
    skip?: number;
    startDate?: Date;
    endDate?: Date;
  }
) {
  const query: Record<string, unknown> = {
    entityType,
    entityId,
  };

  if (options?.startDate || options?.endDate) {
    query.timestamp = {};
    if (options.startDate) {
      (query.timestamp as Record<string, Date>).$gte = options.startDate;
    }
    if (options.endDate) {
      (query.timestamp as Record<string, Date>).$lte = options.endDate;
    }
  }

  const result = await AuditEntry.find(query)
    .sort({ timestamp: -1 })
    .skip(options?.skip ?? 0)
    .limit(options?.limit ?? 100)
    .exec();

  return result;
}

/**
 * Get audit history for a loan (includes all related entities)
 */
export async function getLoanAuditHistory(
  loanId: string,
  options?: {
    limit?: number;
    skip?: number;
    startDate?: Date;
    endDate?: Date;
    fieldName?: string;
  }
) {
  const query: Record<string, unknown> = {
    $or: [{ entityId: loanId }, { loanId }],
  };

  if (options?.startDate || options?.endDate) {
    query.timestamp = {};
    if (options.startDate) {
      (query.timestamp as Record<string, Date>).$gte = options.startDate;
    }
    if (options.endDate) {
      (query.timestamp as Record<string, Date>).$lte = options.endDate;
    }
  }

  if (options?.fieldName) {
    query.fieldName = options.fieldName;
  }

  const [entries, total] = await Promise.all([
    AuditEntry.find(query)
      .sort({ timestamp: -1 })
      .skip(options?.skip ?? 0)
      .limit(options?.limit ?? 100)
      .exec(),
    AuditEntry.countDocuments(query),
  ]);

  return { entries, total };
}

/**
 * Detect changes between two objects and return field-level diffs
 */
export function detectChanges(
  oldObj: Record<string, unknown>,
  newObj: Record<string, unknown>,
  prefix = ''
): Array<{ fieldName: string; oldValue: unknown; newValue: unknown }> {
  const changes: Array<{ fieldName: string; oldValue: unknown; newValue: unknown }> = [];

  const allKeys = new Set([...Object.keys(oldObj), ...Object.keys(newObj)]);

  for (const key of allKeys) {
    const fieldName = prefix ? `${prefix}.${key}` : key;
    const oldVal = oldObj[key];
    const newVal = newObj[key];

    // Skip internal fields
    if (key.startsWith('_') || key === 'updatedAt' || key === 'updatedBy') {
      continue;
    }

    if (typeof oldVal === 'object' && oldVal !== null && !Array.isArray(oldVal) &&
        typeof newVal === 'object' && newVal !== null && !Array.isArray(newVal)) {
      // Recursively detect nested object changes
      const nestedChanges = detectChanges(
        oldVal as Record<string, unknown>,
        newVal as Record<string, unknown>,
        fieldName
      );
      changes.push(...nestedChanges);
    } else if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
      changes.push({
        fieldName,
        oldValue: oldVal,
        newValue: newVal,
      });
    }
  }

  return changes;
}

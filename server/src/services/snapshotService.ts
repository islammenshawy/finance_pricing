import { gzip, gunzip } from 'zlib';
import { promisify } from 'util';
import { Snapshot, CurrencySummary, CurrencyDelta, SnapshotChanges } from '../models/Snapshot';
import type { Loan } from '@loan-pricing/shared';

const gzipAsync = promisify(gzip);
const gunzipAsync = promisify(gunzip);

// ============================================
// COMPRESSION UTILITIES
// ============================================

/**
 * Compress loans array to gzip buffer for storage
 */
async function compressLoans(loans: Loan[]): Promise<Buffer> {
  const json = JSON.stringify(loans);
  return gzipAsync(json);
}

/**
 * Decompress gzip buffer back to loans array
 */
async function decompressLoans(buffer: Buffer): Promise<Loan[]> {
  const json = await gunzipAsync(buffer);
  return JSON.parse(json.toString());
}

// ============================================
// SUMMARY CALCULATION
// ============================================

/**
 * Calculate summary totals grouped by currency
 */
function calculateSummary(loans: Loan[]): Record<string, CurrencySummary> {
  const summary: Record<string, CurrencySummary> = {};

  for (const loan of loans) {
    const currency = loan.currency;
    if (!summary[currency]) {
      summary[currency] = {
        loanCount: 0,
        totalAmount: 0,
        totalFees: 0,
        totalInterest: 0,
        netProceeds: 0,
        avgRate: 0,
      };
    }

    summary[currency].loanCount++;
    summary[currency].totalAmount += loan.totalAmount;
    summary[currency].totalFees += loan.totalFees;
    summary[currency].totalInterest += loan.interestAmount;
    summary[currency].netProceeds += loan.netProceeds;
  }

  // Calculate weighted average rate per currency
  for (const currency of Object.keys(summary)) {
    const currencyLoans = loans.filter((l) => l.currency === currency);
    const totalAmount = summary[currency].totalAmount;

    if (totalAmount > 0) {
      const weightedRate = currencyLoans.reduce((acc, loan) => {
        return acc + (loan.pricing.effectiveRate * loan.totalAmount);
      }, 0);
      summary[currency].avgRate = weightedRate / totalAmount;
    }
  }

  return summary;
}

/**
 * Calculate delta between two summaries
 */
function calculateDelta(
  currentSummary: Record<string, CurrencySummary>,
  previousSummary: Record<string, CurrencySummary> | null
): Record<string, CurrencyDelta> | null {
  if (!previousSummary) {
    return null;
  }

  const delta: Record<string, CurrencyDelta> = {};
  const allCurrencies = new Set([
    ...Object.keys(currentSummary),
    ...Object.keys(previousSummary),
  ]);

  for (const currency of allCurrencies) {
    const current = currentSummary[currency] || {
      loanCount: 0,
      totalAmount: 0,
      totalFees: 0,
      totalInterest: 0,
      netProceeds: 0,
      avgRate: 0,
    };
    const previous = previousSummary[currency] || {
      loanCount: 0,
      totalAmount: 0,
      totalFees: 0,
      totalInterest: 0,
      netProceeds: 0,
      avgRate: 0,
    };

    delta[currency] = {
      feesChange: current.totalFees - previous.totalFees,
      interestChange: current.totalInterest - previous.totalInterest,
      netProceedsChange: current.netProceeds - previous.netProceeds,
      // Convert rate change to basis points (1bp = 0.01%)
      avgRateChange: (current.avgRate - previous.avgRate) * 10000,
    };
  }

  return delta;
}

// ============================================
// SNAPSHOT CRUD OPERATIONS
// ============================================

export interface CreateSnapshotParams {
  customerId: string;
  loans: Loan[];
  userId?: string;
  userName?: string;
  changeCount?: number;
  description?: string;
  changes?: SnapshotChanges;
}

/**
 * Create a new snapshot after saving changes
 */
export async function createSnapshot(params: CreateSnapshotParams) {
  const { customerId, loans, userId, userName, changeCount, description, changes } = params;

  // Get previous snapshot for delta calculation
  const previousSnapshot = await getLatestSnapshot(customerId);

  // Convert Mongoose Map to plain object for comparison
  let previousSummary: Record<string, CurrencySummary> | null = null;
  if (previousSnapshot?.summary) {
    const summaryMap = previousSnapshot.summary as Map<string, CurrencySummary> | Record<string, CurrencySummary>;
    // Handle both Map and plain object (depending on how Mongoose returns it)
    if (summaryMap instanceof Map) {
      previousSummary = Object.fromEntries(summaryMap);
    } else {
      previousSummary = summaryMap;
    }
  }

  // Calculate current summary
  const summary = calculateSummary(loans);

  // Calculate delta from previous
  const delta = calculateDelta(summary, previousSummary);

  // Compress loans for storage
  const loansCompressed = await compressLoans(loans);

  // Create snapshot
  const snapshot = await Snapshot.create({
    customerId,
    timestamp: new Date(),
    userId: userId ?? 'system',
    userName: userName ?? 'System',
    loansCompressed,
    summary,
    delta,
    changes: changes ?? { fees: [], rates: [], invoices: [], statuses: [] },
    changeCount: changeCount ?? 0,
    description,
  });

  return snapshot;
}

/**
 * Get snapshots for customer (timeline display - no loan data)
 */
export async function getSnapshotsForCustomer(
  customerId: string,
  options?: {
    limit?: number;
    skip?: number;
  }
) {
  const snapshots = await Snapshot.find({ customerId })
    .sort({ timestamp: -1 })
    .skip(options?.skip ?? 0)
    .limit(options?.limit ?? 50)
    .select('-loansCompressed') // Exclude compressed data for timeline
    .exec();

  return snapshots;
}

/**
 * Get latest snapshot for a customer
 */
export async function getLatestSnapshot(customerId: string) {
  return Snapshot.findOne({ customerId })
    .sort({ timestamp: -1 })
    .select('-loansCompressed')
    .exec();
}

/**
 * Get full snapshot by ID with decompressed loans
 */
export async function getSnapshotById(snapshotId: string) {
  const snapshot = await Snapshot.findById(snapshotId).exec();

  if (!snapshot) {
    return null;
  }

  // Decompress loans
  const loans = await decompressLoans(snapshot.loansCompressed);

  // Return snapshot data with decompressed loans
  return {
    id: snapshot._id.toString(),
    customerId: snapshot.customerId.toString(),
    timestamp: snapshot.timestamp,
    userId: snapshot.userId,
    userName: snapshot.userName,
    summary: snapshot.summary,
    delta: snapshot.delta,
    changes: snapshot.changes ?? { fees: [], rates: [], invoices: [], statuses: [] },
    changeCount: snapshot.changeCount,
    description: snapshot.description,
    loans,
  };
}

/**
 * Get snapshot by ID without decompressing (for checking existence)
 */
export async function snapshotExists(snapshotId: string): Promise<boolean> {
  const count = await Snapshot.countDocuments({ _id: snapshotId });
  return count > 0;
}

/**
 * Get count of snapshots for a customer
 */
export async function getSnapshotCount(customerId: string): Promise<number> {
  return Snapshot.countDocuments({ customerId });
}

/**
 * Delete old snapshots beyond retention limit
 */
export async function pruneOldSnapshots(
  customerId: string,
  retentionLimit: number = 100
): Promise<number> {
  const count = await getSnapshotCount(customerId);

  if (count <= retentionLimit) {
    return 0;
  }

  // Find snapshots to delete (oldest beyond limit)
  const toDelete = await Snapshot.find({ customerId })
    .sort({ timestamp: -1 })
    .skip(retentionLimit)
    .select('_id')
    .exec();

  if (toDelete.length > 0) {
    const ids = toDelete.map((s) => s._id);
    await Snapshot.deleteMany({ _id: { $in: ids } });
  }

  return toDelete.length;
}

/**
 * Delete all snapshots (for test cleanup)
 */
export async function deleteAllSnapshots(): Promise<{ deletedCount: number }> {
  const result = await Snapshot.deleteMany({});
  return { deletedCount: result.deletedCount ?? 0 };
}

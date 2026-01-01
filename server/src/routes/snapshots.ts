import { Router, Request, Response } from 'express';
import { z } from 'zod';
import {
  createSnapshot,
  getSnapshotsForCustomer,
  getSnapshotById,
  getSnapshotCount,
  deleteAllSnapshots,
} from '../services/snapshotService';
import { handleError, notFound } from '../utils/errorHandler';
import { getUserContext } from '../middleware/userContext';

const router = Router();

// ============================================
// SCHEMAS
// ============================================

const FeeChangeDetailSchema = z.object({
  action: z.enum(['added', 'deleted', 'modified', 'moved']),
  loanId: z.string(),
  loanNumber: z.string(),
  feeId: z.string(),
  feeName: z.string(),
  feeCode: z.string(),
  currency: z.string(),
  oldAmount: z.number().optional(),
  newAmount: z.number().optional(),
});

const RateChangeDetailSchema = z.object({
  action: z.literal('modified'),
  loanId: z.string(),
  loanNumber: z.string(),
  currency: z.string(),
  field: z.enum(['baseRate', 'spread']),
  oldValue: z.number(),
  newValue: z.number(),
  oldEffectiveRate: z.number(),
  newEffectiveRate: z.number(),
});

const InvoiceChangeDetailSchema = z.object({
  action: z.enum(['added', 'deleted', 'modified', 'moved']),
  invoiceId: z.string(),
  invoiceNumber: z.string(),
  amount: z.number(),
  currency: z.string(),
  sourceLoanId: z.string().optional(),
  sourceLoanNumber: z.string().optional(),
  targetLoanId: z.string().optional(),
  targetLoanNumber: z.string().optional(),
  loanId: z.string().optional(),
  loanNumber: z.string().optional(),
});

const StatusChangeDetailSchema = z.object({
  action: z.literal('modified'),
  loanId: z.string(),
  loanNumber: z.string(),
  field: z.enum(['status', 'pricingStatus']),
  oldValue: z.string(),
  newValue: z.string(),
});

const SnapshotChangesSchema = z.object({
  fees: z.array(FeeChangeDetailSchema),
  rates: z.array(RateChangeDetailSchema),
  invoices: z.array(InvoiceChangeDetailSchema),
  statuses: z.array(StatusChangeDetailSchema),
});

const CreateSnapshotSchema = z.object({
  customerId: z.string(),
  loans: z.array(z.any()), // Accept any loan structure for schema flexibility
  changes: SnapshotChangesSchema.optional(),
  changeCount: z.number().optional(),
  description: z.string().optional(),
});

const ListSnapshotsQuerySchema = z.object({
  customerId: z.string(),
  limit: z.string().optional().transform((v) => (v ? parseInt(v, 10) : 50)),
  skip: z.string().optional().transform((v) => (v ? parseInt(v, 10) : 0)),
});

// ============================================
// ROUTES
// ============================================

/**
 * GET /api/snapshots
 * List snapshots for a customer (timeline data without loan data)
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const query = ListSnapshotsQuerySchema.parse(req.query);

    const [snapshots, total] = await Promise.all([
      getSnapshotsForCustomer(query.customerId, {
        limit: query.limit,
        skip: query.skip,
      }),
      getSnapshotCount(query.customerId),
    ]);

    res.json({
      snapshots,
      total,
      limit: query.limit,
      skip: query.skip,
    });
  } catch (error) {
    handleError(res, error);
  }
});

/**
 * GET /api/snapshots/:id
 * Get full snapshot with decompressed loans (for playback)
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const snapshot = await getSnapshotById(req.params.id);

    if (!snapshot) {
      return notFound(res, 'Snapshot not found');
    }

    res.json(snapshot);
  } catch (error) {
    handleError(res, error);
  }
});

/**
 * POST /api/snapshots
 * Create a new snapshot after saving changes
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const data = CreateSnapshotSchema.parse(req.body);
    const { userId, userName } = getUserContext(req);

    const snapshot = await createSnapshot({
      customerId: data.customerId,
      loans: data.loans,
      userId,
      userName,
      changeCount: data.changeCount,
      description: data.description,
      changes: data.changes,
    });

    // Return without loansCompressed (handled by toJSON)
    res.status(201).json(snapshot);
  } catch (error) {
    handleError(res, error);
  }
});

/**
 * DELETE /api/snapshots/all
 * Delete all snapshots (for test cleanup)
 */
router.delete('/all', async (_req: Request, res: Response) => {
  try {
    const result = await deleteAllSnapshots();
    res.json({ deleted: result.deletedCount, message: 'All snapshots deleted' });
  } catch (error) {
    handleError(res, error);
  }
});

export default router;

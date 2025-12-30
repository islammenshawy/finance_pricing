import { Router, Request, Response } from 'express';
import {
  getLoans,
  getLoanById,
  updateLoan,
  previewLoanPricing,
  previewFullLoanState,
  addFeeToLoan,
  updateFee,
  removeFee,
  splitLoan,
  addInvoiceToLoan,
  updateInvoice,
  removeInvoice,
  moveInvoice,
} from '../services/loanService';
import { getLoanAuditHistory } from '../services/auditService';
import {
  UpdateLoanSchema,
  AddFeeToLoanSchema,
  UpdateFeeSchema,
  SplitLoanSchema,
  CalculatePricingRequestSchema,
  LoanPricingSchema,
  AddInvoiceToLoanSchema,
  UpdateInvoiceSchema,
  MoveInvoiceSchema,
} from '@loan-pricing/shared';
import { z } from 'zod';
import { handleError, notFound } from '../utils/errorHandler';
import { getUserContext } from '../middleware/userContext';

// Batch schemas
const BatchPreviewSchema = z.array(z.object({
  loanId: z.string(),
  pricing: LoanPricingSchema.partial(),
}));

// Full preview schema (includes fee changes)
const FullPreviewSchema = z.object({
  pricing: LoanPricingSchema.partial().optional(),
  feeChanges: z.object({
    adds: z.array(z.object({ feeConfigId: z.string() })).optional(),
    updates: z.array(z.object({ feeId: z.string(), calculatedAmount: z.number() })).optional(),
    deletes: z.array(z.object({ feeId: z.string() })).optional(),
  }).optional(),
});

const BatchUpdateSchema = z.array(z.object({
  loanId: z.string(),
  updates: UpdateLoanSchema,
}));

const router = Router();

// ============================================
// BATCH ROUTES (must come before :id routes)
// ============================================

/**
 * POST /api/loans/batch-preview-pricing
 * Preview pricing for multiple loans at once (for bulk operations)
 */
router.post('/batch-preview-pricing', async (req: Request, res: Response) => {
  try {
    const items = BatchPreviewSchema.parse(req.body);

    // Process all previews in parallel
    const results = await Promise.all(
      items.map(async ({ loanId, pricing }) => {
        try {
          const preview = await previewLoanPricing(loanId, pricing);
          return { loanId, success: true, preview };
        } catch (error) {
          return {
            loanId,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          };
        }
      })
    );

    res.json({ results });
  } catch (error) {
    handleError(res, error);
  }
});

/**
 * PUT /api/loans/batch
 * Update multiple loans at once (for bulk operations)
 */
router.put('/batch', async (req: Request, res: Response) => {
  try {
    const items = BatchUpdateSchema.parse(req.body);
    const { userId, userName } = getUserContext(req);

    // Process all updates in parallel
    const results = await Promise.all(
      items.map(async ({ loanId, updates }) => {
        try {
          const loan = await updateLoan(loanId, updates, userId, userName);
          return { loanId, success: true, loan };
        } catch (error) {
          return {
            loanId,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          };
        }
      })
    );

    // Check if any failed
    const failures = results.filter((r) => !r.success);
    if (failures.length > 0) {
      return res.status(207).json({ results }); // Multi-Status
    }

    res.json({ results });
  } catch (error) {
    handleError(res, error);
  }
});

// ============================================
// LOAN ROUTES
// ============================================

/**
 * GET /api/loans
 * List all loans with pagination and filtering
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const { status, pricingStatus, page, pageSize } = req.query;

    const result = await getLoans({
      status: status as string | undefined,
      pricingStatus: pricingStatus as string | undefined,
      page: page ? parseInt(page as string, 10) : undefined,
      pageSize: pageSize ? parseInt(pageSize as string, 10) : undefined,
    });

    res.json(result);
  } catch (error) {
    handleError(res, error);
  }
});

/**
 * GET /api/loans/:id
 * Get a single loan with all details
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const loan = await getLoanById(req.params.id);
    if (!loan) {
      return res.status(404).json({ error: 'Loan not found' });
    }
    res.json(loan);
  } catch (error) {
    handleError(res, error);
  }
});

/**
 * PUT /api/loans/:id
 * Update a loan (pricing, status, dates)
 */
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const updates = UpdateLoanSchema.parse(req.body);
    const userId = (req.headers['x-user-id'] as string) || 'system';
    const userName = (req.headers['x-user-name'] as string) || 'System';

    const loan = await updateLoan(req.params.id, updates, userId, userName);
    if (!loan) {
      return res.status(404).json({ error: 'Loan not found' });
    }
    res.json(loan);
  } catch (error) {
    handleError(res, error);
  }
});

/**
 * POST /api/loans/:id/preview-pricing
 * Preview pricing calculations without saving
 */
router.post('/:id/preview-pricing', async (req: Request, res: Response) => {
  try {
    const { pricing } = CalculatePricingRequestSchema.parse({
      loanId: req.params.id,
      ...req.body,
    });

    const preview = await previewLoanPricing(req.params.id, pricing);
    if (!preview) {
      return res.status(404).json({ error: 'Loan not found' });
    }
    res.json(preview);
  } catch (error) {
    handleError(res, error);
  }
});

/**
 * POST /api/loans/:id/preview-full
 * Preview full loan state including fee changes
 * Returns calculated totals for before/after comparison
 */
router.post('/:id/preview-full', async (req: Request, res: Response) => {
  try {
    const { pricing, feeChanges } = FullPreviewSchema.parse(req.body);

    const preview = await previewFullLoanState(req.params.id, pricing, feeChanges);
    if (!preview) {
      return res.status(404).json({ error: 'Loan not found' });
    }
    res.json(preview);
  } catch (error) {
    handleError(res, error);
  }
});

/**
 * POST /api/loans/:id/split
 * Split a loan into multiple child loans
 */
router.post('/:id/split', async (req: Request, res: Response) => {
  try {
    const splitRequest = SplitLoanSchema.parse(req.body);
    const userId = (req.headers['x-user-id'] as string) || 'system';
    const userName = (req.headers['x-user-name'] as string) || 'System';

    const childLoans = await splitLoan(req.params.id, splitRequest, userId, userName);
    res.status(201).json(childLoans);
  } catch (error) {
    handleError(res, error);
  }
});

/**
 * GET /api/loans/:id/audit
 * Get audit history for a loan
 */
router.get('/:id/audit', async (req: Request, res: Response) => {
  try {
    const { limit, skip, startDate, endDate, fieldName } = req.query;

    const result = await getLoanAuditHistory(req.params.id, {
      limit: limit ? parseInt(limit as string, 10) : undefined,
      skip: skip ? parseInt(skip as string, 10) : undefined,
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
      fieldName: fieldName as string | undefined,
    });

    res.json(result);
  } catch (error) {
    handleError(res, error);
  }
});

// ============================================
// FEE ROUTES (nested under loans)
// ============================================

/**
 * POST /api/loans/:id/fees
 * Add a fee to a loan
 */
router.post('/:id/fees', async (req: Request, res: Response) => {
  try {
    const feeRequest = AddFeeToLoanSchema.parse(req.body);
    const userId = (req.headers['x-user-id'] as string) || 'system';
    const userName = (req.headers['x-user-name'] as string) || 'System';

    const loan = await addFeeToLoan(req.params.id, feeRequest, userId, userName);
    if (!loan) {
      return res.status(404).json({ error: 'Loan or Fee Config not found' });
    }
    res.status(201).json(loan);
  } catch (error) {
    handleError(res, error);
  }
});

/**
 * PUT /api/loans/:loanId/fees/:feeId
 * Update a fee on a loan
 */
router.put('/:loanId/fees/:feeId', async (req: Request, res: Response) => {
  try {
    const updates = UpdateFeeSchema.parse(req.body);
    const userId = (req.headers['x-user-id'] as string) || 'system';
    const userName = (req.headers['x-user-name'] as string) || 'System';

    const loan = await updateFee(req.params.loanId, req.params.feeId, updates, userId, userName);
    if (!loan) {
      return res.status(404).json({ error: 'Loan or Fee not found' });
    }
    res.json(loan);
  } catch (error) {
    handleError(res, error);
  }
});

/**
 * DELETE /api/loans/:loanId/fees/:feeId
 * Remove a fee from a loan
 */
router.delete('/:loanId/fees/:feeId', async (req: Request, res: Response) => {
  try {
    const userId = (req.headers['x-user-id'] as string) || 'system';
    const userName = (req.headers['x-user-name'] as string) || 'System';

    const loan = await removeFee(req.params.loanId, req.params.feeId, userId, userName);
    if (!loan) {
      return res.status(404).json({ error: 'Loan or Fee not found' });
    }
    res.json(loan);
  } catch (error) {
    handleError(res, error);
  }
});

// ============================================
// INVOICE ROUTES (nested under loans)
// ============================================

/**
 * POST /api/loans/:id/invoices
 * Add an invoice to a loan
 */
router.post('/:id/invoices', async (req: Request, res: Response) => {
  try {
    const invoiceData = AddInvoiceToLoanSchema.parse(req.body);
    const userId = (req.headers['x-user-id'] as string) || 'system';
    const userName = (req.headers['x-user-name'] as string) || 'System';

    const loan = await addInvoiceToLoan(req.params.id, invoiceData, userId, userName);
    if (!loan) {
      return res.status(404).json({ error: 'Loan not found' });
    }
    res.status(201).json(loan);
  } catch (error) {
    handleError(res, error);
  }
});

/**
 * PUT /api/loans/:loanId/invoices/:invoiceId
 * Update an invoice on a loan
 */
router.put('/:loanId/invoices/:invoiceId', async (req: Request, res: Response) => {
  try {
    const updates = UpdateInvoiceSchema.parse(req.body);
    const userId = (req.headers['x-user-id'] as string) || 'system';
    const userName = (req.headers['x-user-name'] as string) || 'System';

    const loan = await updateInvoice(req.params.loanId, req.params.invoiceId, updates, userId, userName);
    if (!loan) {
      return res.status(404).json({ error: 'Loan or Invoice not found' });
    }
    res.json(loan);
  } catch (error) {
    handleError(res, error);
  }
});

/**
 * DELETE /api/loans/:loanId/invoices/:invoiceId
 * Remove an invoice from a loan
 */
router.delete('/:loanId/invoices/:invoiceId', async (req: Request, res: Response) => {
  try {
    const userId = (req.headers['x-user-id'] as string) || 'system';
    const userName = (req.headers['x-user-name'] as string) || 'System';

    const loan = await removeInvoice(req.params.loanId, req.params.invoiceId, userId, userName);
    if (!loan) {
      return res.status(404).json({ error: 'Loan or Invoice not found' });
    }
    res.json(loan);
  } catch (error) {
    handleError(res, error);
  }
});

/**
 * POST /api/loans/:loanId/invoices/:invoiceId/move
 * Move an invoice to another loan
 */
router.post('/:loanId/invoices/:invoiceId/move', async (req: Request, res: Response) => {
  try {
    const { targetLoanId } = MoveInvoiceSchema.parse(req.body);
    const userId = (req.headers['x-user-id'] as string) || 'system';
    const userName = (req.headers['x-user-name'] as string) || 'System';

    const result = await moveInvoice(req.params.loanId, req.params.invoiceId, targetLoanId, userId, userName);
    res.json(result);
  } catch (error) {
    handleError(res, error);
  }
});

export default router;

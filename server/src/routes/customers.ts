import { Router, Request, Response } from 'express';
import { Customer, Loan } from '../models';
import type { LoanDocument } from '../models';

const router = Router();

/**
 * GET /api/customers
 * List all customers
 */
router.get('/', async (_req: Request, res: Response) => {
  try {
    const customers = await Customer.find({ isActive: true })
      .sort({ name: 1 })
      .exec();
    res.json(customers);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

/**
 * GET /api/customers/:id
 * Get a single customer with all their loans
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const customer = await Customer.findById(req.params.id).exec();
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    // Get all loans for this customer
    const loans = await Loan.find({ customerId: customer._id })
      .sort({ createdAt: -1 })
      .exec();

    // Calculate totals
    const totals = calculateCustomerTotals(loans);

    res.json({
      customer,
      loans,
      totals,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

/**
 * GET /api/customers/:id/summary
 * Get customer summary with aggregated totals
 */
router.get('/:id/summary', async (req: Request, res: Response) => {
  try {
    const customer = await Customer.findById(req.params.id).exec();
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    const loans = await Loan.find({ customerId: customer._id }).exec();
    const totals = calculateCustomerTotals(loans);

    res.json({
      customer: {
        id: customer._id,
        code: customer.code,
        name: customer.name,
      },
      loanCount: loans.length,
      totals,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

function calculateCustomerTotals(loans: LoanDocument[]) {
  const byCurrency: Record<string, {
    totalAmount: number;
    totalFees: number;
    totalInterest: number;
    netProceeds: number;
    loanCount: number;
  }> = {};

  for (const loan of loans) {
    if (!byCurrency[loan.currency]) {
      byCurrency[loan.currency] = {
        totalAmount: 0,
        totalFees: 0,
        totalInterest: 0,
        netProceeds: 0,
        loanCount: 0,
      };
    }

    byCurrency[loan.currency].totalAmount += loan.totalAmount;
    byCurrency[loan.currency].totalFees += loan.totalFees;
    byCurrency[loan.currency].totalInterest += loan.interestAmount;
    byCurrency[loan.currency].netProceeds += loan.netProceeds;
    byCurrency[loan.currency].loanCount += 1;
  }

  return byCurrency;
}

export default router;

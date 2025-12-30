import { Router, Request, Response } from 'express';
import { Currency, FxRate } from '../models';
import { CreateCurrencySchema, CreateFxRateSchema } from '@loan-pricing/shared';
import { handleError, notFound, conflict } from '../utils/errorHandler';

const router = Router();

// ============================================
// CURRENCY ROUTES
// ============================================

/**
 * GET /api/currencies
 * List all active currencies
 */
router.get('/', async (_req: Request, res: Response) => {
  try {
    const currencies = await Currency.find({ isActive: true })
      .sort({ code: 1 })
      .exec();
    res.json(currencies);
  } catch (error) {
    handleError(res, error);
  }
});

/**
 * POST /api/currencies
 * Add a new currency
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const data = CreateCurrencySchema.parse(req.body);

    const existing = await Currency.findOne({ code: data.code }).exec();
    if (existing) {
      return res.status(409).json({ error: 'Currency with this code already exists' });
    }

    const currency = new Currency({
      ...data,
      isActive: true,
    });

    await currency.save();
    res.status(201).json(currency);
  } catch (error) {
    handleError(res, error);
  }
});

/**
 * PUT /api/currencies/:code
 * Update a currency
 */
router.put('/:code', async (req: Request, res: Response) => {
  try {
    const { name, symbol, decimalPlaces, isActive } = req.body;

    const currency = await Currency.findOneAndUpdate(
      { code: req.params.code.toUpperCase() },
      { $set: { name, symbol, decimalPlaces, isActive } },
      { new: true, runValidators: true }
    ).exec();

    if (!currency) {
      return res.status(404).json({ error: 'Currency not found' });
    }

    res.json(currency);
  } catch (error) {
    handleError(res, error);
  }
});

// ============================================
// FX RATE ROUTES
// ============================================

/**
 * GET /api/currencies/rates
 * Get latest FX rates
 */
router.get('/rates', async (req: Request, res: Response) => {
  try {
    const { baseCurrency } = req.query;

    const query: Record<string, unknown> = {};
    if (baseCurrency) {
      query.fromCurrency = (baseCurrency as string).toUpperCase();
    }

    // Get latest rate for each currency pair
    const rates = await FxRate.aggregate([
      { $match: query },
      { $sort: { effectiveDate: -1 } },
      {
        $group: {
          _id: { from: '$fromCurrency', to: '$toCurrency' },
          rate: { $first: '$rate' },
          effectiveDate: { $first: '$effectiveDate' },
          source: { $first: '$source' },
          id: { $first: '$_id' },
        },
      },
      {
        $project: {
          _id: 0,
          id: '$id',
          fromCurrency: '$_id.from',
          toCurrency: '$_id.to',
          rate: 1,
          effectiveDate: 1,
          source: 1,
        },
      },
    ]);

    res.json(rates);
  } catch (error) {
    handleError(res, error);
  }
});

/**
 * POST /api/currencies/rates
 * Add a new FX rate
 */
router.post('/rates', async (req: Request, res: Response) => {
  try {
    const data = CreateFxRateSchema.parse(req.body);

    const fxRate = new FxRate(data);
    await fxRate.save();

    res.status(201).json(fxRate);
  } catch (error) {
    handleError(res, error);
  }
});

/**
 * GET /api/currencies/rates/:from/:to
 * Get FX rate for a specific currency pair
 */
router.get('/rates/:from/:to', async (req: Request, res: Response) => {
  try {
    const { from, to } = req.params;
    const { date } = req.query;

    const effectiveDate = date ? new Date(date as string) : new Date();

    const rate = await FxRate.findOne({
      fromCurrency: from.toUpperCase(),
      toCurrency: to.toUpperCase(),
      effectiveDate: { $lte: effectiveDate },
    })
      .sort({ effectiveDate: -1 })
      .exec();

    if (!rate) {
      // Try inverse
      const inverseRate = await FxRate.findOne({
        fromCurrency: to.toUpperCase(),
        toCurrency: from.toUpperCase(),
        effectiveDate: { $lte: effectiveDate },
      })
        .sort({ effectiveDate: -1 })
        .exec();

      if (inverseRate) {
        return res.json({
          fromCurrency: from.toUpperCase(),
          toCurrency: to.toUpperCase(),
          rate: 1 / inverseRate.rate,
          effectiveDate: inverseRate.effectiveDate,
          source: `inverse of ${inverseRate.source}`,
        });
      }

      return res.status(404).json({ error: 'FX rate not found' });
    }

    res.json(rate);
  } catch (error) {
    handleError(res, error);
  }
});

/**
 * GET /api/currencies/rates/history/:from/:to
 * Get FX rate history for a currency pair
 */
router.get('/rates/history/:from/:to', async (req: Request, res: Response) => {
  try {
    const { from, to } = req.params;
    const { limit, startDate, endDate } = req.query;

    const query: Record<string, unknown> = {
      fromCurrency: from.toUpperCase(),
      toCurrency: to.toUpperCase(),
    };

    if (startDate || endDate) {
      query.effectiveDate = {};
      if (startDate) {
        (query.effectiveDate as Record<string, Date>).$gte = new Date(startDate as string);
      }
      if (endDate) {
        (query.effectiveDate as Record<string, Date>).$lte = new Date(endDate as string);
      }
    }

    const rates = await FxRate.find(query)
      .sort({ effectiveDate: -1 })
      .limit(limit ? parseInt(limit as string, 10) : 100)
      .exec();

    res.json(rates);
  } catch (error) {
    handleError(res, error);
  }
});

export default router;

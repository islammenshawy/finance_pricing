import { Router, Request, Response } from 'express';
import { FeeConfig } from '../models';
import { CreateFeeConfigSchema, UpdateFeeConfigSchema } from '@loan-pricing/shared';
import { handleError, notFound, conflict } from '../utils/errorHandler';

const router = Router();

/**
 * GET /api/fee-configs
 * List all fee configurations
 */
router.get('/', async (_req: Request, res: Response) => {
  try {
    const configs = await FeeConfig.find({ isActive: true })
      .sort({ sortOrder: 1, name: 1 })
      .exec();
    res.json(configs);
  } catch (error) {
    handleError(res, error);
  }
});

/**
 * GET /api/fee-configs/:id
 * Get a single fee configuration
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const config = await FeeConfig.findById(req.params.id).exec();
    if (!config) {
      return res.status(404).json({ error: 'Fee Config not found' });
    }
    res.json(config);
  } catch (error) {
    handleError(res, error);
  }
});

/**
 * POST /api/fee-configs
 * Create a new fee configuration
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const data = CreateFeeConfigSchema.parse(req.body);

    // Check for duplicate code
    const existing = await FeeConfig.findOne({ code: data.code }).exec();
    if (existing) {
      return res.status(409).json({ error: 'Fee config with this code already exists' });
    }

    const config = new FeeConfig({
      ...data,
      isActive: true,
    });

    await config.save();
    res.status(201).json(config);
  } catch (error) {
    handleError(res, error);
  }
});

/**
 * PUT /api/fee-configs/:id
 * Update a fee configuration
 */
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const updates = UpdateFeeConfigSchema.parse(req.body);

    const config = await FeeConfig.findByIdAndUpdate(
      req.params.id,
      { $set: updates },
      { new: true, runValidators: true }
    ).exec();

    if (!config) {
      return res.status(404).json({ error: 'Fee Config not found' });
    }

    res.json(config);
  } catch (error) {
    handleError(res, error);
  }
});

/**
 * DELETE /api/fee-configs/:id
 * Soft delete a fee configuration (mark as inactive)
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const config = await FeeConfig.findByIdAndUpdate(
      req.params.id,
      { $set: { isActive: false } },
      { new: true }
    ).exec();

    if (!config) {
      return res.status(404).json({ error: 'Fee Config not found' });
    }

    res.json({ message: 'Fee Config deactivated', config });
  } catch (error) {
    handleError(res, error);
  }
});

export default router;

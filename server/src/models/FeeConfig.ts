import mongoose, { Schema, Document } from 'mongoose';
import type { FeeConfig as IFeeConfig, FeeTier } from '@loan-pricing/shared';

export interface FeeConfigDocument extends Omit<IFeeConfig, 'id'>, Document {}

const FeeTierSchema = new Schema<FeeTier>(
  {
    minAmount: { type: Number, required: true, min: 0 },
    maxAmount: { type: Number, default: null },
    rate: { type: Number, required: true, min: 0, max: 1 },
  },
  { _id: false }
);

const FeeConfigSchema = new Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      match: /^[A-Z0-9_]+$/,
    },
    name: { type: String, required: true },
    type: {
      type: String,
      required: true,
      enum: ['arrangement', 'commitment', 'facility', 'late_payment', 'custom'],
    },
    // Level at which this fee applies
    applicableLevel: {
      type: String,
      required: true,
      enum: ['customer', 'facility', 'loan', 'invoice'],
      default: 'loan',
    },
    // Frequency for recurring fees
    frequency: {
      type: String,
      enum: ['one_time', 'monthly', 'quarterly', 'annually', 'per_transaction'],
      default: 'one_time',
    },
    calculationType: {
      type: String,
      required: true,
      enum: ['flat', 'percentage', 'tiered'],
    },
    defaultRate: { type: Number, min: 0, max: 1 },
    defaultFlatAmount: { type: Number, min: 0 },
    defaultBasisAmount: {
      type: String,
      enum: ['principal', 'outstanding', 'total_invoices'],
    },
    defaultTiers: [FeeTierSchema],
    isRequired: { type: Boolean, default: false },
    isEditable: { type: Boolean, default: true },
    applicableCurrencies: [{ type: String, uppercase: true }],
    minAmount: { type: Number, min: 0 },
    maxAmount: { type: Number, min: 0 },
    isActive: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_doc: unknown, ret: Record<string, unknown>) => {
        ret.id = (ret._id as { toString(): string }).toString();
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

export const FeeConfig = mongoose.model<FeeConfigDocument>('FeeConfig', FeeConfigSchema);

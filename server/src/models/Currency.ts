import mongoose, { Schema, Document } from 'mongoose';
import type { Currency as ICurrency, FxRate as IFxRate } from '@loan-pricing/shared';

// ============================================
// CURRENCY MODEL
// ============================================

export interface CurrencyDocument extends Omit<ICurrency, 'id'>, Document {}

const CurrencySchema = new Schema<CurrencyDocument>(
  {
    code: { type: String, required: true, unique: true, uppercase: true, minlength: 3, maxlength: 3 },
    name: { type: String, required: true },
    symbol: { type: String, required: true },
    decimalPlaces: { type: Number, required: true, default: 2, min: 0, max: 4 },
    isActive: { type: Boolean, required: true, default: true },
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

export const Currency = mongoose.model<CurrencyDocument>('Currency', CurrencySchema);

// ============================================
// FX RATE MODEL
// ============================================

export interface FxRateDocument extends Omit<IFxRate, 'id'>, Document {}

const FxRateSchema = new Schema(
  {
    fromCurrency: { type: String, required: true, uppercase: true },
    toCurrency: { type: String, required: true, uppercase: true },
    rate: { type: Number, required: true, min: 0 },
    effectiveDate: { type: Date, required: true },
    source: { type: String, required: true, default: 'manual' },
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

// Index for efficient lookups
FxRateSchema.index({ fromCurrency: 1, toCurrency: 1, effectiveDate: -1 });

export const FxRate = mongoose.model<FxRateDocument>('FxRate', FxRateSchema);

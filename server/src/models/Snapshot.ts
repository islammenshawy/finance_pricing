import mongoose, { Schema, Document, Types } from 'mongoose';

// ============================================
// CURRENCY SUMMARY SUBDOCUMENT
// ============================================

export interface CurrencySummary {
  loanCount: number;
  totalAmount: number;
  totalFees: number;
  totalInterest: number;
  netProceeds: number;
  avgRate: number; // Average effective rate
}

export interface CurrencyDelta {
  feesChange: number;
  interestChange: number;
  netProceedsChange: number;
  avgRateChange: number; // In basis points
}

// Detailed change types (matches shared types)
export interface FeeChangeDetail {
  action: 'added' | 'deleted' | 'modified' | 'moved';
  loanId: string;
  loanNumber: string;
  feeId: string;
  feeName: string;
  feeCode: string;
  currency: string;
  oldAmount?: number;
  newAmount?: number;
}

export interface RateChangeDetail {
  action: 'modified';
  loanId: string;
  loanNumber: string;
  currency: string;
  field: 'baseRate' | 'spread';
  oldValue: number;
  newValue: number;
  oldEffectiveRate: number;
  newEffectiveRate: number;
}

export interface InvoiceChangeDetail {
  action: 'added' | 'deleted' | 'modified' | 'moved';
  invoiceId: string;
  invoiceNumber: string;
  amount: number;
  currency: string;
  sourceLoanId?: string;
  sourceLoanNumber?: string;
  targetLoanId?: string;
  targetLoanNumber?: string;
  loanId?: string;
  loanNumber?: string;
}

export interface StatusChangeDetail {
  action: 'modified';
  loanId: string;
  loanNumber: string;
  field: 'status' | 'pricingStatus';
  oldValue: string;
  newValue: string;
}

export interface SnapshotChanges {
  fees: FeeChangeDetail[];
  rates: RateChangeDetail[];
  invoices: InvoiceChangeDetail[];
  statuses: StatusChangeDetail[];
}

// ============================================
// SNAPSHOT INTERFACE
// ============================================

export interface ISnapshot {
  id: string;
  customerId: string;
  timestamp: Date;
  userId: string;
  userName: string;
  loansCompressed: Buffer;
  summary: Record<string, CurrencySummary>;
  delta: Record<string, CurrencyDelta> | null;
  changes: SnapshotChanges;
  changeCount: number;
  description?: string;
}

export interface SnapshotDocument extends Omit<ISnapshot, 'id' | 'customerId'>, Document {
  customerId: Types.ObjectId;
}

// ============================================
// SCHEMA
// ============================================

const CurrencySummarySchema = new Schema<CurrencySummary>(
  {
    loanCount: { type: Number, required: true, default: 0 },
    totalAmount: { type: Number, required: true, default: 0 },
    totalFees: { type: Number, required: true, default: 0 },
    totalInterest: { type: Number, required: true, default: 0 },
    netProceeds: { type: Number, required: true, default: 0 },
    avgRate: { type: Number, required: true, default: 0 },
  },
  { _id: false }
);

const CurrencyDeltaSchema = new Schema<CurrencyDelta>(
  {
    feesChange: { type: Number, required: true, default: 0 },
    interestChange: { type: Number, required: true, default: 0 },
    netProceedsChange: { type: Number, required: true, default: 0 },
    avgRateChange: { type: Number, required: true, default: 0 },
  },
  { _id: false }
);

// Default empty changes object
const emptyChanges: SnapshotChanges = {
  fees: [],
  rates: [],
  invoices: [],
  statuses: [],
};

const SnapshotSchema = new Schema(
  {
    customerId: { type: Schema.Types.ObjectId, ref: 'Customer', required: true, index: true },
    timestamp: { type: Date, required: true, default: Date.now, index: true },
    userId: { type: String, required: true, default: 'system' },
    userName: { type: String, required: true, default: 'System' },

    // Compressed loan data (gzip JSON buffer)
    loansCompressed: { type: Buffer, required: true },

    // Pre-computed summary for timeline display (no need to decompress)
    summary: { type: Map, of: CurrencySummarySchema, required: true },

    // Delta from previous snapshot (null for first snapshot)
    delta: { type: Schema.Types.Mixed, default: null },

    // Detailed change tracking
    changes: {
      type: Schema.Types.Mixed,
      default: () => emptyChanges,
    },

    // Metadata
    changeCount: { type: Number, required: true, default: 0 },
    description: { type: String },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_doc: unknown, ret: Record<string, unknown>) => {
        ret.id = (ret._id as { toString(): string }).toString();
        delete ret._id;
        delete ret.__v;
        // Don't include loansCompressed in JSON by default (too large)
        // It will be fetched separately when needed
        delete ret.loansCompressed;
        return ret;
      },
    },
  }
);

// Compound index for efficient timeline queries
SnapshotSchema.index({ customerId: 1, timestamp: -1 });

export const Snapshot = mongoose.model<SnapshotDocument>('Snapshot', SnapshotSchema);

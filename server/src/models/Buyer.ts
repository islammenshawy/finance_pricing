import mongoose, { Schema, Document, Types } from 'mongoose';

// ============================================
// BUYER/OBLIGOR TYPES
// ============================================

export type BuyerStatus = 'pending_approval' | 'approved' | 'suspended' | 'blocked';
export type CreditRating = 'AAA' | 'AA' | 'A' | 'BBB' | 'BB' | 'B' | 'CCC' | 'CC' | 'C' | 'D' | 'NR';

export interface IBuyer {
  id: string;
  code: string;                      // Unique buyer code
  name: string;
  customerId: string;                // Parent customer (seller) this buyer is approved for

  // Company Info
  country: string;
  industry: string;
  registrationNumber?: string;       // Company registration / tax ID
  dunsNumber?: string;               // D&B number

  // Credit Assessment
  creditRating: CreditRating;
  internalRating?: string;           // Internal risk score
  ratingDate?: Date;
  ratingSource?: string;             // e.g., "S&P", "Moody's", "Internal"

  // Limits
  approvedLimit: number;             // Max exposure to this buyer
  currentExposure: number;           // Current outstanding
  availableLimit: number;            // approvedLimit - currentExposure
  currency: string;

  // Concentration
  concentrationLimit: number;        // Max % of facility this buyer can represent
  currentConcentration: number;      // Current % of facility

  // Payment Behavior
  averagePaymentDays: number;        // Historical average
  paymentTerms: number;              // Standard payment terms in days
  historicalDilution: number;        // % of disputes/returns historically

  // Insurance
  insuredLimit?: number;             // Credit insurance limit for this buyer
  insuranceProvider?: string;
  insuranceExpiryDate?: Date;

  // Status
  status: BuyerStatus;
  approvedBy?: string;
  approvedAt?: Date;
  suspendedReason?: string;

  // Contact Info
  address?: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;

  // Metadata
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  updatedBy: string;
}

export interface BuyerDocument extends Omit<IBuyer, 'id' | 'customerId'>, Document {
  customerId: Types.ObjectId;
}

// ============================================
// BUYER SCHEMA
// ============================================

const BuyerSchema = new Schema<BuyerDocument>(
  {
    code: { type: String, required: true, uppercase: true },
    name: { type: String, required: true },
    customerId: { type: Schema.Types.ObjectId, ref: 'Customer', required: true },

    // Company Info
    country: { type: String, required: true },
    industry: { type: String },
    registrationNumber: { type: String },
    dunsNumber: { type: String },

    // Credit Assessment
    creditRating: {
      type: String,
      required: true,
      enum: ['AAA', 'AA', 'A', 'BBB', 'BB', 'B', 'CCC', 'CC', 'C', 'D', 'NR'],
      default: 'NR',
    },
    internalRating: { type: String },
    ratingDate: { type: Date },
    ratingSource: { type: String },

    // Limits
    approvedLimit: { type: Number, required: true, min: 0 },
    currentExposure: { type: Number, required: true, min: 0, default: 0 },
    availableLimit: { type: Number, required: true, min: 0 },
    currency: { type: String, required: true, uppercase: true },

    // Concentration
    concentrationLimit: { type: Number, min: 0, max: 1, default: 0.25 },
    currentConcentration: { type: Number, min: 0, max: 1, default: 0 },

    // Payment Behavior
    averagePaymentDays: { type: Number, min: 0, default: 30 },
    paymentTerms: { type: Number, min: 0, default: 30 },
    historicalDilution: { type: Number, min: 0, max: 1, default: 0 },

    // Insurance
    insuredLimit: { type: Number, min: 0 },
    insuranceProvider: { type: String },
    insuranceExpiryDate: { type: Date },

    // Status
    status: {
      type: String,
      required: true,
      enum: ['pending_approval', 'approved', 'suspended', 'blocked'],
      default: 'pending_approval',
    },
    approvedBy: { type: String },
    approvedAt: { type: Date },
    suspendedReason: { type: String },

    // Contact Info
    address: { type: String },
    contactName: { type: String },
    contactEmail: { type: String },
    contactPhone: { type: String },

    // Metadata
    notes: { type: String },
    createdBy: { type: String, required: true, default: 'system' },
    updatedBy: { type: String, required: true, default: 'system' },
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

// Indexes
BuyerSchema.index({ customerId: 1 });
BuyerSchema.index({ code: 1, customerId: 1 }, { unique: true }); // Unique code per customer
BuyerSchema.index({ status: 1 });
BuyerSchema.index({ creditRating: 1 });
BuyerSchema.index({ country: 1 });

export const Buyer = mongoose.model<BuyerDocument>('Buyer', BuyerSchema);

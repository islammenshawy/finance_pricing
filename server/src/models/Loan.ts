import mongoose, { Schema, Document, Types } from 'mongoose';
import type {
  Loan as ILoan,
  Invoice as IInvoice,
  Fee as IFee,
  LoanPricing,
  FeeTier,
} from '@loan-pricing/shared';

// ============================================
// INVOICE SUBDOCUMENT
// ============================================

export interface InvoiceSubdocument extends Omit<IInvoice, 'id' | 'loanId' | 'buyerId'> {
  _id: Types.ObjectId;
  buyerId?: Types.ObjectId;
}

const InvoiceSchema = new Schema(
  {
    invoiceNumber: { type: String, required: true },
    buyerId: { type: Schema.Types.ObjectId, ref: 'Buyer' },  // Reference to Buyer entity
    buyerName: { type: String, required: true },             // Denormalized for display
    debtorName: { type: String },                            // Alias for buyerName (trade finance terminology)
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, required: true, uppercase: true },
    issueDate: { type: Date, required: true },
    dueDate: { type: Date, required: true },
    status: {
      type: String,
      required: true,
      enum: ['pending', 'verified', 'financed', 'collected', 'defaulted', 'disputed'],
      default: 'pending',
    },
    // Verification
    verificationStatus: {
      type: String,
      enum: ['pending', 'verified', 'rejected'],
      default: 'pending',
    },
    verificationDate: { type: Date },
    verifiedBy: { type: String },
    // Collection tracking
    collectionDate: { type: Date },
    actualPaymentAmount: { type: Number, min: 0 },  // May differ from face value
    // Dilution/Disputes
    disputeStatus: {
      type: String,
      enum: ['none', 'partial', 'full'],
      default: 'none',
    },
    disputeAmount: { type: Number, min: 0, default: 0 },
    disputeReason: { type: String },
    dilutionAmount: { type: Number, min: 0, default: 0 },  // Deductions, returns
    description: String,
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_doc: unknown, ret: Record<string, unknown>) => {
        ret.id = (ret._id as { toString(): string }).toString();
        delete ret._id;
        return ret;
      },
    },
  }
);

// ============================================
// FEE SUBDOCUMENT
// ============================================

export interface FeeSubdocument extends Omit<IFee, 'id' | 'loanId'> {
  _id: Types.ObjectId;
}

const FeeTierSubSchema = new Schema<FeeTier>(
  {
    minAmount: { type: Number, required: true, min: 0 },
    maxAmount: { type: Number, default: null },
    rate: { type: Number, required: true, min: 0, max: 1 },
  },
  { _id: false }
);

const FeeSchema = new Schema(
  {
    feeConfigId: { type: String, required: true },
    code: { type: String, required: true, uppercase: true },
    type: {
      type: String,
      required: true,
      enum: ['arrangement', 'commitment', 'facility', 'late_payment', 'custom'],
    },
    name: { type: String, required: true },
    calculationType: {
      type: String,
      required: true,
      enum: ['flat', 'percentage', 'tiered'],
    },
    flatAmount: { type: Number, min: 0 },
    rate: { type: Number, min: 0, max: 1 },
    basisAmount: {
      type: String,
      enum: ['principal', 'outstanding', 'total_invoices'],
    },
    tiers: [FeeTierSubSchema],
    calculatedAmount: { type: Number, required: true, default: 0 },
    currency: { type: String, required: true, uppercase: true },
    dueDate: Date,
    isPaid: { type: Boolean, default: false },
    isWaived: { type: Boolean, default: false },
    waivedReason: String,
    isOverridden: { type: Boolean, default: false },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_doc: unknown, ret: Record<string, unknown>) => {
        ret.id = (ret._id as { toString(): string }).toString();
        delete ret._id;
        return ret;
      },
    },
  }
);

// ============================================
// PRICING SUBDOCUMENT
// ============================================

const PricingSchema = new Schema<LoanPricing>(
  {
    baseRate: { type: Number, required: true, min: 0, max: 1, default: 0.05 },
    spread: { type: Number, required: true, min: -0.5, max: 1, default: 0.015 },
    effectiveRate: { type: Number, required: true, default: 0.065 },
    dayCountConvention: {
      type: String,
      required: true,
      enum: ['30/360', 'actual/360', 'actual/365'],
      default: 'actual/360',
    },
    accrualMethod: {
      type: String,
      required: true,
      enum: ['simple', 'compound'],
      default: 'simple',
    },
  },
  { _id: false }
);

// ============================================
// LOAN MODEL
// ============================================

export interface LoanDocument extends Omit<ILoan, 'id' | 'invoices' | 'fees' | 'customerId' | 'facilityId' | 'parentLoanId'>, Document {
  invoices: Types.DocumentArray<InvoiceSubdocument>;
  fees: Types.DocumentArray<FeeSubdocument>;
  customerId: Types.ObjectId;
  facilityId?: Types.ObjectId;
  parentLoanId?: Types.ObjectId;
}

const LoanSchema = new Schema(
  {
    loanNumber: { type: String, required: true, unique: true },
    parentLoanId: { type: Schema.Types.ObjectId, ref: 'Loan' },
    customerId: { type: Schema.Types.ObjectId, ref: 'Customer', required: true },
    facilityId: { type: Schema.Types.ObjectId, ref: 'Facility' },  // Link to facility/program
    borrowerId: { type: String, required: true },
    borrowerName: { type: String, required: true },

    // Amounts
    totalAmount: { type: Number, required: true, min: 0 },          // Total invoice face value
    currency: { type: String, required: true, uppercase: true },
    outstandingAmount: { type: Number, required: true, min: 0 },

    // Trade Finance: Advance & Holdback
    advanceRate: { type: Number, min: 0, max: 1, default: 0.85 },   // % of invoices financed
    advanceAmount: { type: Number, min: 0 },                         // Actual amount advanced
    holdbackAmount: { type: Number, min: 0, default: 0 },           // Reserve held back
    holdbackRate: { type: Number, min: 0, max: 1, default: 0 },     // % held as reserve

    // Trade Finance: Dilution & Reserves
    dilutionReserve: { type: Number, min: 0, default: 0 },          // Amount held for dilution
    dilutionReserveRate: { type: Number, min: 0, max: 1, default: 0.05 },
    rebateOnCollection: { type: Number, min: 0, default: 0 },       // Released after collection

    // Trade Finance: Recourse
    recourseType: {
      type: String,
      enum: ['full_recourse', 'limited_recourse', 'non_recourse'],
      default: 'full_recourse',
    },
    recourseExpiryDate: { type: Date },                              // When recourse expires

    // Status
    status: {
      type: String,
      required: true,
      enum: ['draft', 'in_review', 'approved', 'funded', 'collected', 'closed'],
      default: 'draft',
    },
    pricingStatus: {
      type: String,
      required: true,
      enum: ['pending', 'priced', 'locked'],
      default: 'pending',
    },

    // Pricing
    pricing: { type: PricingSchema, required: true },

    // Calculated fields (computed by backend)
    totalFees: { type: Number, required: true, default: 0 },
    totalInvoiceAmount: { type: Number, required: true, default: 0 },
    netProceeds: { type: Number, required: true, default: 0 },       // After all deductions
    interestAmount: { type: Number, required: true, default: 0 },
    totalDilution: { type: Number, default: 0 },                     // Sum of invoice dilutions
    collectedAmount: { type: Number, default: 0 },                   // Amount collected from buyers

    // Dates
    startDate: { type: Date, required: true },
    maturityDate: { type: Date, required: true },
    fundingDate: { type: Date },                                     // When funds disbursed
    collectionDate: { type: Date },                                  // When fully collected

    // Relations (embedded)
    invoices: [InvoiceSchema],
    fees: [FeeSchema],

    // Metadata
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
LoanSchema.index({ customerId: 1 });
LoanSchema.index({ facilityId: 1 });
LoanSchema.index({ status: 1, pricingStatus: 1 });
LoanSchema.index({ parentLoanId: 1 });
LoanSchema.index({ fundingDate: 1 });
LoanSchema.index({ 'invoices.buyerId': 1 });

export const Loan = mongoose.model<LoanDocument>('Loan', LoanSchema);

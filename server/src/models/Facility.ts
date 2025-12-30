import mongoose, { Schema, Document, Types } from 'mongoose';

// ============================================
// FACILITY TYPES
// ============================================

export type ProgramType =
  | 'receivables_financing'    // Seller sells receivables
  | 'payables_financing'       // Buyer extends payment terms (reverse factoring)
  | 'inventory_financing'      // Finance against inventory
  | 'purchase_order_financing' // Finance against POs
  | 'distributor_financing';   // Channel/distributor finance

export type RecourseType = 'full_recourse' | 'limited_recourse' | 'non_recourse';

export interface IFacility {
  id: string;
  facilityNumber: string;
  customerId: string;
  name: string;

  // Program Details
  programType: ProgramType;
  recourseType: RecourseType;

  // Credit Limits
  creditLimit: number;
  availableAmount: number;
  utilizedAmount: number;
  currency: string;

  // Advance Parameters
  defaultAdvanceRate: number;        // % of invoice value (e.g., 0.85 = 85%)
  maxAdvanceRate: number;
  minAdvanceRate: number;

  // Risk Parameters
  dilutionReserveRate: number;       // % held for disputes/returns
  concentrationLimit: number;        // Max % per buyer
  maxTenorDays: number;              // Maximum financing tenor

  // Insurance
  insuranceRequired: boolean;
  insuranceProvider?: string;
  insuranceCoverage?: number;        // % covered
  insurancePolicyNumber?: string;

  // Pricing Defaults (can be overridden at loan level)
  defaultBaseRate: number;
  defaultSpread: number;
  dayCountConvention: '30/360' | 'actual/360' | 'actual/365';

  // Dates
  effectiveDate: Date;
  expiryDate: Date;
  renewalDate?: Date;

  // Status
  status: 'draft' | 'active' | 'suspended' | 'expired' | 'terminated';

  // Metadata
  approvedBy?: string;
  approvedAt?: Date;
  covenants?: string[];              // Key covenants/conditions
  notes?: string;

  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  updatedBy: string;
}

export interface FacilityDocument extends Omit<IFacility, 'id' | 'customerId'>, Document {
  customerId: Types.ObjectId;
}

// ============================================
// FACILITY SCHEMA
// ============================================

const FacilitySchema = new Schema<FacilityDocument>(
  {
    facilityNumber: { type: String, required: true, unique: true },
    customerId: { type: Schema.Types.ObjectId, ref: 'Customer', required: true },
    name: { type: String, required: true },

    // Program Details
    programType: {
      type: String,
      required: true,
      enum: [
        'receivables_financing',
        'payables_financing',
        'inventory_financing',
        'purchase_order_financing',
        'distributor_financing',
      ],
    },
    recourseType: {
      type: String,
      required: true,
      enum: ['full_recourse', 'limited_recourse', 'non_recourse'],
      default: 'full_recourse',
    },

    // Credit Limits
    creditLimit: { type: Number, required: true, min: 0 },
    availableAmount: { type: Number, required: true, min: 0 },
    utilizedAmount: { type: Number, required: true, min: 0, default: 0 },
    currency: { type: String, required: true, uppercase: true },

    // Advance Parameters
    defaultAdvanceRate: { type: Number, required: true, min: 0, max: 1, default: 0.85 },
    maxAdvanceRate: { type: Number, required: true, min: 0, max: 1, default: 0.95 },
    minAdvanceRate: { type: Number, required: true, min: 0, max: 1, default: 0.70 },

    // Risk Parameters
    dilutionReserveRate: { type: Number, min: 0, max: 1, default: 0.05 },
    concentrationLimit: { type: Number, min: 0, max: 1, default: 0.25 },
    maxTenorDays: { type: Number, min: 1, default: 180 },

    // Insurance
    insuranceRequired: { type: Boolean, default: false },
    insuranceProvider: { type: String },
    insuranceCoverage: { type: Number, min: 0, max: 1 },
    insurancePolicyNumber: { type: String },

    // Pricing Defaults
    defaultBaseRate: { type: Number, required: true, min: 0, max: 1, default: 0.05 },
    defaultSpread: { type: Number, required: true, min: -0.5, max: 1, default: 0.02 },
    dayCountConvention: {
      type: String,
      required: true,
      enum: ['30/360', 'actual/360', 'actual/365'],
      default: 'actual/360',
    },

    // Dates
    effectiveDate: { type: Date, required: true },
    expiryDate: { type: Date, required: true },
    renewalDate: { type: Date },

    // Status
    status: {
      type: String,
      required: true,
      enum: ['draft', 'active', 'suspended', 'expired', 'terminated'],
      default: 'draft',
    },

    // Metadata
    approvedBy: { type: String },
    approvedAt: { type: Date },
    covenants: [{ type: String }],
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
FacilitySchema.index({ customerId: 1 });
FacilitySchema.index({ status: 1 });
FacilitySchema.index({ expiryDate: 1 });
FacilitySchema.index({ programType: 1 });

export const Facility = mongoose.model<FacilityDocument>('Facility', FacilitySchema);

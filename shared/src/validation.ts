import { z } from 'zod';

// ============================================
// ENUMS
// ============================================

export const LoanStatusSchema = z.enum(['draft', 'in_review', 'approved', 'funded']);
export const PricingStatusSchema = z.enum(['pending', 'priced', 'locked']);
export const InvoiceStatusSchema = z.enum(['pending', 'financed', 'paid']);
export const FeeTypeSchema = z.enum(['arrangement', 'commitment', 'facility', 'late_payment', 'custom']);
export const FeeCalculationTypeSchema = z.enum(['flat', 'percentage', 'tiered']);
export const DayCountConventionSchema = z.enum(['30/360', 'actual/360', 'actual/365']);
export const AccrualMethodSchema = z.enum(['simple', 'compound']);
export const BasisAmountSchema = z.enum(['principal', 'outstanding', 'total_invoices']);

// ============================================
// FEE CONFIG VALIDATION
// ============================================

export const FeeTierSchema = z.object({
  minAmount: z.number().min(0),
  maxAmount: z.number().min(0).nullable(),
  rate: z.number().min(0).max(1), // 0-100% as decimal
});

const FeeConfigBaseSchema = z.object({
  code: z.string().min(1).max(10).regex(/^[A-Z0-9_]+$/, 'Code must be uppercase alphanumeric'),
  name: z.string().min(1).max(100),
  type: FeeTypeSchema,
  calculationType: FeeCalculationTypeSchema,
  defaultRate: z.number().min(0).max(1).optional(),
  defaultFlatAmount: z.number().min(0).optional(),
  defaultBasisAmount: BasisAmountSchema.optional(),
  defaultTiers: z.array(FeeTierSchema).optional(),
  isRequired: z.boolean().default(false),
  isEditable: z.boolean().default(true),
  applicableCurrencies: z.array(z.string()).default([]),
  minAmount: z.number().min(0).optional(),
  maxAmount: z.number().min(0).optional(),
  sortOrder: z.number().int().default(0),
});

export const CreateFeeConfigSchema = FeeConfigBaseSchema.refine(
  (data) => {
    if (data.calculationType === 'flat' && data.defaultFlatAmount === undefined) {
      return false;
    }
    if (data.calculationType === 'percentage' && data.defaultRate === undefined) {
      return false;
    }
    if (data.calculationType === 'tiered' && (!data.defaultTiers || data.defaultTiers.length === 0)) {
      return false;
    }
    return true;
  },
  { message: 'Must provide default values matching calculation type' }
);

export const UpdateFeeConfigSchema = FeeConfigBaseSchema.partial().omit({ code: true });

// ============================================
// FEE VALIDATION
// ============================================

export const AddFeeToLoanSchema = z.object({
  feeConfigId: z.string().min(1),
  flatAmount: z.number().min(0).optional(),
  rate: z.number().min(0).max(1).optional(),
  basisAmount: BasisAmountSchema.optional(),
  tiers: z.array(FeeTierSchema).optional(),
  currency: z.string().length(3).optional(),
  dueDate: z.coerce.date().optional(),
});

export const UpdateFeeSchema = z.object({
  flatAmount: z.number().min(0).optional(),
  rate: z.number().min(0).max(1).optional(),
  basisAmount: BasisAmountSchema.optional(),
  tiers: z.array(FeeTierSchema).optional(),
  currency: z.string().length(3).optional(),
  dueDate: z.coerce.date().optional(),
  isPaid: z.boolean().optional(),
  isWaived: z.boolean().optional(),
  waivedReason: z.string().max(500).optional(),
});

// ============================================
// PRICING VALIDATION
// ============================================

export const LoanPricingSchema = z.object({
  baseRate: z.number().min(0).max(1),
  spread: z.number().min(-0.5).max(1), // Can be negative for discounts
  dayCountConvention: DayCountConventionSchema.default('actual/360'),
  accrualMethod: AccrualMethodSchema.default('simple'),
});

export const UpdateLoanSchema = z.object({
  pricing: LoanPricingSchema.partial().optional(),
  status: LoanStatusSchema.optional(),
  pricingStatus: PricingStatusSchema.optional(),
  startDate: z.coerce.date().optional(),
  maturityDate: z.coerce.date().optional(),
}).refine(
  (data) => {
    if (data.startDate && data.maturityDate) {
      return data.maturityDate > data.startDate;
    }
    return true;
  },
  { message: 'Maturity date must be after start date' }
);

// ============================================
// SPLIT LOAN VALIDATION
// ============================================

export const SplitLoanSchema = z.object({
  splits: z.array(z.object({
    invoiceIds: z.array(z.string()).min(1),
    percentage: z.number().min(0).max(1).optional(),
  })).min(2, 'Must split into at least 2 loans'),
}).refine(
  (data) => {
    const percentages = data.splits.filter(s => s.percentage !== undefined).map(s => s.percentage!);
    if (percentages.length > 0 && percentages.length !== data.splits.length) {
      return false; // Must provide percentage for all or none
    }
    if (percentages.length > 0) {
      const total = percentages.reduce((sum, p) => sum + p, 0);
      return Math.abs(total - 1) < 0.0001; // Must sum to 100%
    }
    return true;
  },
  { message: 'Split percentages must sum to 100% if provided' }
);

// ============================================
// CURRENCY VALIDATION
// ============================================

export const CreateCurrencySchema = z.object({
  code: z.string().length(3).regex(/^[A-Z]+$/, 'Must be 3 uppercase letters'),
  name: z.string().min(1).max(100),
  symbol: z.string().min(1).max(5),
  decimalPlaces: z.number().int().min(0).max(4).default(2),
});

export const CreateFxRateSchema = z.object({
  fromCurrency: z.string().length(3),
  toCurrency: z.string().length(3),
  rate: z.number().positive(),
  effectiveDate: z.coerce.date(),
  source: z.string().default('manual'),
});

// ============================================
// INVOICE VALIDATION
// ============================================

export const CreateInvoiceSchema = z.object({
  invoiceNumber: z.string().min(1).max(50),
  buyerName: z.string().min(1).max(200),
  amount: z.number().positive(),
  currency: z.string().length(3),
  issueDate: z.coerce.date(),
  dueDate: z.coerce.date(),
  description: z.string().max(500).optional(),
}).refine(
  (data) => data.dueDate >= data.issueDate,
  { message: 'Due date must be on or after issue date' }
);

// Add invoice to loan (used in loan routes)
export const AddInvoiceToLoanSchema = z.object({
  invoiceNumber: z.string().min(1).max(50),
  debtorName: z.string().min(1).max(200),
  amount: z.number().positive(),
  dueDate: z.coerce.date(),
  description: z.string().max(500).optional(),
  issueDate: z.coerce.date().optional(),
});

export const UpdateInvoiceSchema = z.object({
  invoiceNumber: z.string().min(1).max(50).optional(),
  debtorName: z.string().min(1).max(200).optional(),
  amount: z.number().positive().optional(),
  dueDate: z.coerce.date().optional(),
  description: z.string().max(500).optional(),
  status: z.enum(['pending', 'verified', 'financed', 'collected', 'defaulted', 'disputed']).optional(),
  verificationStatus: z.enum(['pending', 'verified', 'rejected']).optional(),
  disputeStatus: z.enum(['none', 'partial', 'full']).optional(),
  disputeAmount: z.number().min(0).optional(),
  disputeReason: z.string().max(500).optional(),
});

// Move invoice between loans
export const MoveInvoiceSchema = z.object({
  targetLoanId: z.string().min(1),
});

// ============================================
// CALCULATE PRICING REQUEST
// ============================================

export const CalculatePricingRequestSchema = z.object({
  loanId: z.string().min(1),
  pricing: LoanPricingSchema.partial(),
});

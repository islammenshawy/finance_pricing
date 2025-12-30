// ============================================
// CORE DOMAIN TYPES
// ============================================

export type LoanStatus = 'draft' | 'in_review' | 'approved' | 'funded' | 'collected' | 'closed';
export type PricingStatus = 'pending' | 'priced' | 'locked';
export type InvoiceStatus = 'pending' | 'verified' | 'financed' | 'collected' | 'defaulted' | 'disputed';
export type VerificationStatus = 'pending' | 'verified' | 'rejected';
export type DisputeStatus = 'none' | 'partial' | 'full';
export type FeeType = 'arrangement' | 'commitment' | 'facility' | 'late_payment' | 'custom';
export type FeeCalculationType = 'flat' | 'percentage' | 'tiered';
export type FeeApplicableLevel = 'customer' | 'facility' | 'loan' | 'invoice';
export type FeeFrequency = 'one_time' | 'monthly' | 'quarterly' | 'annually' | 'per_transaction';
export type AuditAction = 'create' | 'update' | 'delete' | 'split' | 'move';
export type EntityType = 'loan' | 'fee' | 'invoice' | 'currency' | 'facility' | 'buyer';

// Trade Finance Types
export type ProgramType =
  | 'receivables_financing'
  | 'payables_financing'
  | 'inventory_financing'
  | 'purchase_order_financing'
  | 'distributor_financing';

export type RecourseType = 'full_recourse' | 'limited_recourse' | 'non_recourse';
export type BuyerStatus = 'pending_approval' | 'approved' | 'suspended' | 'blocked';
export type CreditRating = 'AAA' | 'AA' | 'A' | 'BBB' | 'BB' | 'B' | 'CCC' | 'CC' | 'C' | 'D' | 'NR';
export type FacilityStatus = 'draft' | 'active' | 'suspended' | 'expired' | 'terminated';

// ============================================
// CURRENCY
// ============================================

export interface Currency {
  id: string;
  code: string;           // ISO 4217 code (USD, EUR, etc.)
  name: string;
  symbol: string;
  decimalPlaces: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface FxRate {
  id: string;
  fromCurrency: string;
  toCurrency: string;
  rate: number;
  effectiveDate: Date;
  source: string;         // e.g., "manual", "api", "snapshot"
  createdAt: Date;
}

// ============================================
// FACILITY (Credit Line / Program)
// ============================================

export interface Facility {
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
  defaultAdvanceRate: number;     // % of invoice value (e.g., 0.85 = 85%)
  maxAdvanceRate: number;
  minAdvanceRate: number;

  // Risk Parameters
  dilutionReserveRate: number;    // % held for disputes/returns
  concentrationLimit: number;     // Max % per buyer
  maxTenorDays: number;           // Maximum financing tenor

  // Insurance
  insuranceRequired: boolean;
  insuranceProvider?: string;
  insuranceCoverage?: number;     // % covered
  insurancePolicyNumber?: string;

  // Pricing Defaults
  defaultBaseRate: number;
  defaultSpread: number;
  dayCountConvention: '30/360' | 'actual/360' | 'actual/365';

  // Dates
  effectiveDate: Date;
  expiryDate: Date;
  renewalDate?: Date;

  // Status
  status: FacilityStatus;
  approvedBy?: string;
  approvedAt?: Date;
  covenants?: string[];
  notes?: string;

  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  updatedBy: string;
}

// ============================================
// BUYER / OBLIGOR
// ============================================

export interface Buyer {
  id: string;
  code: string;
  name: string;
  customerId: string;             // Parent customer (seller)

  // Company Info
  country: string;
  industry?: string;
  registrationNumber?: string;
  dunsNumber?: string;

  // Credit Assessment
  creditRating: CreditRating;
  internalRating?: string;
  ratingDate?: Date;
  ratingSource?: string;

  // Limits
  approvedLimit: number;
  currentExposure: number;
  availableLimit: number;
  currency: string;

  // Concentration
  concentrationLimit: number;     // Max % of facility
  currentConcentration: number;

  // Payment Behavior
  averagePaymentDays: number;
  paymentTerms: number;           // Standard payment terms in days
  historicalDilution: number;     // % of disputes/returns historically

  // Insurance
  insuredLimit?: number;
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

  notes?: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  updatedBy: string;
}

// ============================================
// INVOICE
// ============================================

export interface Invoice {
  id: string;
  loanId: string;
  invoiceNumber: string;
  buyerId?: string;                  // Reference to Buyer entity
  buyerName: string;                 // Denormalized for display
  debtorName?: string;               // Alias for buyerName (trade finance terminology)
  amount: number;
  currency: string;
  issueDate: Date;
  dueDate: Date;
  status: InvoiceStatus;
  // Verification
  verificationStatus: VerificationStatus;
  verificationDate?: Date;
  verifiedBy?: string;
  // Collection tracking
  collectionDate?: Date;
  actualPaymentAmount?: number;      // May differ from face value
  // Dilution/Disputes
  disputeStatus: DisputeStatus;
  disputeAmount?: number;
  disputeReason?: string;
  dilutionAmount?: number;           // Deductions, returns
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================
// FEE CONFIGURATION (Admin-configurable templates)
// ============================================

export interface FeeTier {
  minAmount: number;
  maxAmount: number | null;   // null = unlimited
  rate: number;               // percentage as decimal (0.01 = 1%)
}

export interface FeeConfig {
  id: string;
  code: string;               // Unique code: "ARR", "COMM", "FAC", "LATE", etc.
  name: string;               // Display name: "Arrangement Fee"
  type: FeeType;
  applicableLevel: FeeApplicableLevel;  // customer, facility, loan, or invoice
  frequency: FeeFrequency;              // one_time, monthly, quarterly, annually, per_transaction
  calculationType: FeeCalculationType;
  // Default values (can be overridden per loan)
  defaultRate?: number;       // as decimal (0.01 = 1%)
  defaultFlatAmount?: number;
  defaultBasisAmount?: 'principal' | 'outstanding' | 'total_invoices';
  defaultTiers?: FeeTier[];
  // Configuration
  isRequired: boolean;        // Must be added to every loan
  isEditable: boolean;        // Can be modified per loan
  applicableCurrencies: string[];  // Empty = all currencies
  minAmount?: number;
  maxAmount?: number;
  isActive: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================
// FEE (Applied to a loan, derived from FeeConfig)
// ============================================

export interface Fee {
  id: string;
  loanId: string;
  feeConfigId: string;        // Reference to FeeConfig
  code: string;               // Copied from FeeConfig for quick access
  type: FeeType;
  name: string;
  calculationType: FeeCalculationType;
  // For flat fees
  flatAmount?: number;
  // For percentage fees
  rate?: number;              // as decimal (0.01 = 1%)
  basisAmount?: 'principal' | 'outstanding' | 'total_invoices';
  // For tiered fees
  tiers?: FeeTier[];
  // Calculated amount (computed by backend)
  calculatedAmount: number;
  currency: string;
  dueDate?: Date;
  isPaid: boolean;
  isWaived: boolean;
  waivedReason?: string;
  // Override tracking
  isOverridden: boolean;      // True if values differ from FeeConfig defaults
  createdAt: Date;
  updatedAt: Date;
}

// ============================================
// LOAN
// ============================================

export interface LoanPricing {
  baseRate: number;           // as decimal (0.05 = 5%)
  spread: number;             // as decimal (0.015 = 1.5%)
  effectiveRate: number;      // calculated: baseRate + spread
  dayCountConvention: '30/360' | 'actual/360' | 'actual/365';
  accrualMethod: 'simple' | 'compound';
}

export interface Loan {
  id: string;
  loanNumber: string;
  parentLoanId?: string;      // For split loans
  customerId?: string;
  facilityId?: string;        // Link to facility/program
  borrowerId: string;
  borrowerName: string;

  // Amounts
  totalAmount: number;        // Total invoice face value
  currency: string;
  outstandingAmount: number;

  // Trade Finance: Advance & Holdback
  advanceRate: number;        // % of invoices financed (e.g., 0.85 = 85%)
  advanceAmount?: number;     // Actual amount advanced
  holdbackAmount: number;     // Reserve held back
  holdbackRate: number;       // % held as reserve

  // Trade Finance: Dilution & Reserves
  dilutionReserve: number;    // Amount held for dilution
  dilutionReserveRate: number;
  rebateOnCollection: number; // Released after collection

  // Trade Finance: Recourse
  recourseType: RecourseType;
  recourseExpiryDate?: Date;

  // Status
  status: LoanStatus;
  pricingStatus: PricingStatus;

  // Pricing (calculated on backend)
  pricing: LoanPricing;

  // Calculated fields
  totalFees: number;          // Sum of all fee amounts
  totalInvoiceAmount: number; // Sum of all invoice amounts
  netProceeds: number;        // After all deductions
  interestAmount: number;     // Calculated based on pricing
  totalDilution?: number;     // Sum of invoice dilutions
  collectedAmount?: number;   // Amount collected from buyers

  // Dates
  startDate: Date;
  maturityDate: Date;
  fundingDate?: Date;         // When funds disbursed
  collectionDate?: Date;      // When fully collected

  // Relations (populated)
  invoices: Invoice[];
  fees: Fee[];

  // Metadata
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  updatedBy: string;
}

// ============================================
// AUDIT
// ============================================

export interface AuditEntry {
  id: string;
  entityType: EntityType;
  entityId: string;
  loanId?: string;            // For quick loan-level queries
  action: AuditAction;
  fieldName?: string;
  oldValue?: unknown;
  newValue?: unknown;
  userId: string;
  userName: string;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

// ============================================
// CHANGE TRACKING (Client-side)
// ============================================

export interface InflightChange {
  id: string;
  fieldPath: string;          // e.g., "pricing.baseRate" or "fees[0].flatAmount"
  fieldLabel: string;         // Human-readable: "Base Rate" or "Arrangement Fee Amount"
  entityType: EntityType;
  entityId?: string;          // For fee/invoice changes
  originalValue: unknown;
  currentValue: unknown;
  timestamp: Date;
}

export interface ChangeSet {
  loanId: string;
  changes: InflightChange[];
  createdAt: Date;
}

// ============================================
// API REQUEST/RESPONSE TYPES
// ============================================

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface LoanListItem {
  id: string;
  loanNumber: string;
  borrowerName: string;
  totalAmount: number;
  currency: string;
  status: LoanStatus;
  pricingStatus: PricingStatus;
  effectiveRate: number;
  invoiceCount: number;
  feeCount: number;
  startDate: Date;
  maturityDate: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface UpdateLoanRequest {
  pricing?: Partial<LoanPricing>;
  status?: LoanStatus;
  pricingStatus?: PricingStatus;
  startDate?: Date;
  maturityDate?: Date;
}

// Fee Config (Admin) Requests
export interface CreateFeeConfigRequest {
  code: string;
  name: string;
  type: FeeType;
  calculationType: FeeCalculationType;
  defaultRate?: number;
  defaultFlatAmount?: number;
  defaultBasisAmount?: 'principal' | 'outstanding' | 'total_invoices';
  defaultTiers?: FeeTier[];
  isRequired?: boolean;
  isEditable?: boolean;
  applicableCurrencies?: string[];
  minAmount?: number;
  maxAmount?: number;
  sortOrder?: number;
}

export interface UpdateFeeConfigRequest {
  name?: string;
  calculationType?: FeeCalculationType;
  defaultRate?: number;
  defaultFlatAmount?: number;
  defaultBasisAmount?: 'principal' | 'outstanding' | 'total_invoices';
  defaultTiers?: FeeTier[];
  isRequired?: boolean;
  isEditable?: boolean;
  applicableCurrencies?: string[];
  minAmount?: number;
  maxAmount?: number;
  isActive?: boolean;
  sortOrder?: number;
}

// Fee (Loan-level) Requests
export interface AddFeeToLoanRequest {
  feeConfigId: string;        // Select from available fee configs
  // Optional overrides
  flatAmount?: number;
  rate?: number;
  basisAmount?: 'principal' | 'outstanding' | 'total_invoices';
  tiers?: FeeTier[];
  currency?: string;
  dueDate?: Date;
}

export interface UpdateFeeRequest {
  flatAmount?: number;
  rate?: number;
  basisAmount?: 'principal' | 'outstanding' | 'total_invoices';
  tiers?: FeeTier[];
  currency?: string;
  dueDate?: Date;
  isPaid?: boolean;
  isWaived?: boolean;
  waivedReason?: string;
}

export interface SplitLoanRequest {
  splits: {
    invoiceIds: string[];
    percentage?: number;      // Optional: for proportional fee allocation
  }[];
}

export interface CalculatePricingRequest {
  loanId: string;
  pricing: Partial<LoanPricing>;
}

export interface CalculatePricingResponse {
  effectiveRate: number;
  interestAmount: number;
  netProceeds: number;
  totalFees: number;
}

// ============================================
// CALCULATION FORMULAS (for reference)
// ============================================

/**
 * Backend Calculation Formulas:
 *
 * 1. Effective Rate = baseRate + spread
 *
 * 2. Interest Calculation (Simple):
 *    interest = principal * effectiveRate * (days / dayCountBasis)
 *    where dayCountBasis = 360 or 365 depending on convention
 *
 * 3. Fee Calculations:
 *    - Flat: calculatedAmount = flatAmount
 *    - Percentage: calculatedAmount = basisAmount * percentage
 *    - Tiered: calculatedAmount = sum of (tierAmount * tierRate) for each tier
 *
 * 4. Net Proceeds = totalAmount - totalFees
 *
 * 5. Total Invoice Amount = sum(invoice.amount) with FX conversion
 */

/**
 * @fileoverview Calculation Service - Core Financial Calculations
 *
 * This service handles all financial calculations for the loan pricing system.
 * It is the single source of truth for:
 * - Interest calculations (simple and compound)
 * - Fee calculations (flat, percentage, tiered)
 * - Net proceeds calculations
 * - Day count conventions (30/360, actual/360, actual/365)
 *
 * @module services/calculationService
 * @requires models - Database models for loans and fees
 * @requires @loan-pricing/shared - Shared type definitions
 *
 * @example
 * // Recalculate a loan after pricing change
 * await recalculateLoan(loan);
 *
 * @example
 * // Preview pricing without saving
 * const preview = previewPricing(loan, { baseRate: 0.05, spread: 0.02 });
 *
 * @example
 * // Preview full loan state with fee changes
 * const fullPreview = await previewFullLoanState(loan, pricingUpdates, feeChanges);
 */

import type { LoanDocument, FeeSubdocument } from '../models';
import type { LoanPricing, FeeTier } from '@loan-pricing/shared';
import { FxRate, FeeConfig } from '../models';

// ============================================
// UTILITY FUNCTIONS
// ============================================

/** Round to 2 decimal places (currency amounts) */
export function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

/** Round to 4 decimal places (rates) */
export function round4(value: number): number {
  return Math.round(value * 10000) / 10000;
}

// ============================================
// PRICING CALCULATIONS
// ============================================

/**
 * Calculate effective rate from base rate and spread
 * Formula: effectiveRate = baseRate + spread
 */
export function calculateEffectiveRate(baseRate: number, spread: number): number {
  return round4(baseRate + spread);
}

/**
 * Calculate day count fraction based on convention
 * @param startDate - Start date of period
 * @param endDate - End date of period
 * @param convention - Day count convention
 */
export function calculateDayCountFraction(
  startDate: Date,
  endDate: Date,
  convention: LoanPricing['dayCountConvention']
): number {
  const start = new Date(startDate);
  const end = new Date(endDate);

  switch (convention) {
    case '30/360': {
      // 30/360 (Bond Basis)
      let d1 = start.getDate();
      let d2 = end.getDate();
      const m1 = start.getMonth();
      const m2 = end.getMonth();
      const y1 = start.getFullYear();
      const y2 = end.getFullYear();

      // Adjust end of month
      if (d1 === 31) d1 = 30;
      if (d2 === 31 && d1 >= 30) d2 = 30;

      const days = (y2 - y1) * 360 + (m2 - m1) * 30 + (d2 - d1);
      return days / 360;
    }

    case 'actual/360': {
      const diffTime = Math.abs(end.getTime() - start.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays / 360;
    }

    case 'actual/365': {
      const diffTime = Math.abs(end.getTime() - start.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays / 365;
    }

    default:
      return 0;
  }
}

/**
 * Calculate simple interest
 * Formula: interest = principal * rate * dayCountFraction
 */
export function calculateSimpleInterest(
  principal: number,
  rate: number,
  dayCountFraction: number
): number {
  return round2(principal * rate * dayCountFraction);
}

/**
 * Calculate compound interest
 * Formula: interest = principal * ((1 + rate)^periods - 1)
 * For simplicity, we use annual compounding
 */
export function calculateCompoundInterest(
  principal: number,
  rate: number,
  dayCountFraction: number
): number {
  const periods = dayCountFraction; // Treat day count fraction as portion of year
  const compoundAmount = principal * Math.pow(1 + rate, periods);
  return round2(compoundAmount - principal);
}

/**
 * Calculate interest amount for a loan
 */
export function calculateInterestAmount(loan: LoanDocument): number {
  const { pricing, totalAmount, startDate, maturityDate } = loan;
  const dayCountFraction = calculateDayCountFraction(
    startDate,
    maturityDate,
    pricing.dayCountConvention
  );

  if (pricing.accrualMethod === 'compound') {
    return calculateCompoundInterest(totalAmount, pricing.effectiveRate, dayCountFraction);
  }

  return calculateSimpleInterest(totalAmount, pricing.effectiveRate, dayCountFraction);
}

// ============================================
// FEE CALCULATIONS
// ============================================

/**
 * Get basis amount for percentage fee calculation
 */
function getBasisAmount(
  loan: LoanDocument,
  basisType: 'principal' | 'outstanding' | 'total_invoices'
): number {
  switch (basisType) {
    case 'principal':
      return loan.totalAmount;
    case 'outstanding':
      return loan.outstandingAmount;
    case 'total_invoices':
      return loan.totalInvoiceAmount;
    default:
      return loan.totalAmount;
  }
}

/**
 * Calculate tiered fee amount
 * Each tier applies to the portion of the amount within that tier
 */
function calculateTieredAmount(amount: number, tiers: FeeTier[]): number {
  if (!tiers || tiers.length === 0) return 0;

  // Sort tiers by minAmount
  const sortedTiers = [...tiers].sort((a, b) => a.minAmount - b.minAmount);
  let totalFee = 0;
  let remainingAmount = amount;

  for (const tier of sortedTiers) {
    if (remainingAmount <= 0) break;

    const tierMax = tier.maxAmount ?? Infinity;
    const tierRange = tierMax - tier.minAmount;
    const amountInTier = Math.min(remainingAmount, tierRange);

    if (amountInTier > 0) {
      totalFee += amountInTier * tier.rate;
      remainingAmount -= amountInTier;
    }
  }

  return round2(totalFee);
}

/**
 * Calculate fee amount based on calculation type
 */
export function calculateFeeAmount(fee: FeeSubdocument, loan: LoanDocument): number {
  if (fee.isWaived) return 0;

  switch (fee.calculationType) {
    case 'flat':
      return fee.flatAmount ?? 0;

    case 'percentage': {
      const basisAmount = getBasisAmount(loan, fee.basisAmount ?? 'principal');
      const rate = fee.rate ?? 0;
      return round2(basisAmount * rate);
    }

    case 'tiered': {
      const basisAmount = getBasisAmount(loan, fee.basisAmount ?? 'principal');
      return calculateTieredAmount(basisAmount, fee.tiers ?? []);
    }

    default:
      return 0;
  }
}

/**
 * Calculate total fees for a loan
 */
export function calculateTotalFees(loan: LoanDocument): number {
  let total = 0;
  for (const fee of loan.fees) {
    fee.calculatedAmount = calculateFeeAmount(fee, loan);
    total += fee.calculatedAmount;
  }
  return round2(total);
}

// ============================================
// NET PROCEEDS CALCULATION
// ============================================

/**
 * Calculate net proceeds
 * Formula: netProceeds = principal - interest - fees
 */
export function calculateNetProceeds(
  principal: number,
  interestAmount: number,
  totalFees: number
): number {
  return round2(principal - interestAmount - totalFees);
}

// ============================================
// INVOICE CALCULATIONS
// ============================================

/**
 * Calculate total invoice amount with FX conversion
 */
export async function calculateTotalInvoiceAmount(
  loan: LoanDocument
): Promise<number> {
  let total = 0;

  for (const invoice of loan.invoices) {
    if (invoice.currency === loan.currency) {
      total += invoice.amount;
    } else {
      // Get FX rate for conversion
      const rate = await getLatestFxRate(invoice.currency, loan.currency);
      total += invoice.amount * rate;
    }
  }

  return round2(total);
}

/**
 * Get latest FX rate between two currencies
 */
async function getLatestFxRate(
  fromCurrency: string,
  toCurrency: string
): Promise<number> {
  if (fromCurrency === toCurrency) return 1;

  const fxRate = await FxRate.findOne({
    fromCurrency,
    toCurrency,
    effectiveDate: { $lte: new Date() },
  })
    .sort({ effectiveDate: -1 })
    .exec();

  if (fxRate) {
    return fxRate.rate;
  }

  // Try inverse rate
  const inverseRate = await FxRate.findOne({
    fromCurrency: toCurrency,
    toCurrency: fromCurrency,
    effectiveDate: { $lte: new Date() },
  })
    .sort({ effectiveDate: -1 })
    .exec();

  if (inverseRate) {
    return 1 / inverseRate.rate;
  }

  // Default to 1:1 if no rate found (should log warning in production)
  console.warn(`No FX rate found for ${fromCurrency}/${toCurrency}, using 1:1`);
  return 1;
}

// ============================================
// LOAN RECALCULATION
// ============================================

/**
 * Recalculate all derived fields for a loan
 * This should be called whenever pricing, fees, or invoices change
 */
export async function recalculateLoan(loan: LoanDocument): Promise<void> {
  // 1. Calculate effective rate
  loan.pricing.effectiveRate = calculateEffectiveRate(
    loan.pricing.baseRate,
    loan.pricing.spread
  );

  // 2. Calculate total invoice amount
  loan.totalInvoiceAmount = await calculateTotalInvoiceAmount(loan);

  // 3. Calculate all fee amounts and total
  loan.totalFees = calculateTotalFees(loan);

  // 4. Calculate interest amount
  loan.interestAmount = calculateInterestAmount(loan);

  // 5. Calculate net proceeds
  loan.netProceeds = calculateNetProceeds(
    loan.totalAmount,
    loan.interestAmount,
    loan.totalFees
  );
}

/**
 * Preview pricing calculation without saving
 */
export function previewPricing(
  loan: LoanDocument,
  newPricing: Partial<LoanPricing>
): {
  effectiveRate: number;
  interestAmount: number;
  netProceeds: number;
  totalFees: number;
} {
  // Create a temporary copy with new pricing (with safe defaults)
  const baseRate = newPricing.baseRate ?? loan.pricing?.baseRate ?? 0;
  const spread = newPricing.spread ?? loan.pricing?.spread ?? 0;
  const dayCountConvention = loan.pricing?.dayCountConvention ?? 'actual/360';
  const accrualMethod = loan.pricing?.accrualMethod ?? 'simple';

  const effectiveRate = calculateEffectiveRate(baseRate, spread);

  // Ensure valid dates (fallback to loan's current interest if dates invalid)
  const startDate = loan.startDate ? new Date(loan.startDate) : null;
  const maturityDate = loan.maturityDate ? new Date(loan.maturityDate) : null;

  let interestAmount: number;

  if (!startDate || !maturityDate || isNaN(startDate.getTime()) || isNaN(maturityDate.getTime())) {
    // If dates are invalid, use the loan's existing interest as fallback
    interestAmount = loan.interestAmount ?? 0;
  } else {
    const dayCountFraction = calculateDayCountFraction(
      startDate,
      maturityDate,
      dayCountConvention
    );

    interestAmount =
      accrualMethod === 'compound'
        ? calculateCompoundInterest(loan.totalAmount, effectiveRate, dayCountFraction)
        : calculateSimpleInterest(loan.totalAmount, effectiveRate, dayCountFraction);

    // Guard against NaN results
    if (isNaN(interestAmount)) {
      interestAmount = loan.interestAmount ?? 0;
    }
  }

  // Net proceeds changes when interest changes
  const netProceeds = calculateNetProceeds(
    loan.totalAmount,
    interestAmount,
    loan.totalFees
  );

  return {
    effectiveRate,
    interestAmount,
    netProceeds,
    totalFees: loan.totalFees, // Fees don't change with pricing-only preview
  };
}

// ============================================
// FEE PREVIEW CALCULATION (for full preview)
// ============================================

export interface FeeChangePreview {
  adds?: Array<{ feeConfigId: string }>;
  updates?: Array<{ feeId: string; calculatedAmount: number }>;
  deletes?: Array<{ feeId: string }>;
}

/**
 * Calculate fee amount from a fee config (for preview of adding fees)
 */
export function calculateFeeFromConfig(
  config: { calculationType: string; defaultFlatAmount?: number; defaultRate?: number },
  loanAmount: number
): number {
  if (config.calculationType === 'flat') {
    return config.defaultFlatAmount ?? 0;
  } else if (config.calculationType === 'percentage') {
    return round2(loanAmount * (config.defaultRate ?? 0));
  }
  // Tiered fees require more complex config - return 0 for now
  return 0;
}

/**
 * Preview full loan calculations including fee changes
 * This consolidates all preview logic into calculationService
 */
export async function previewFullLoanState(
  loan: LoanDocument,
  pricingUpdates?: Partial<LoanPricing>,
  feeChanges?: FeeChangePreview
): Promise<{
  effectiveRate: number;
  interestAmount: number;
  totalFees: number;
  originalTotalFees: number;
  netProceeds: number;
  originalNetProceeds: number;
}> {
  const originalTotalFees = loan.totalFees;
  const originalNetProceeds = loan.netProceeds;

  // Start with current fee total
  let totalFees = loan.totalFees;

  // Apply fee deletes
  if (feeChanges?.deletes) {
    for (const del of feeChanges.deletes) {
      const fee = loan.fees.find((f) => f.id === del.feeId);
      if (fee) {
        totalFees -= fee.calculatedAmount;
      }
    }
  }

  // Apply fee updates
  if (feeChanges?.updates) {
    for (const upd of feeChanges.updates) {
      const fee = loan.fees.find((f) => f.id === upd.feeId);
      if (fee) {
        totalFees = totalFees - fee.calculatedAmount + upd.calculatedAmount;
      }
    }
  }

  // Apply fee adds (need to fetch fee configs and calculate)
  if (feeChanges?.adds && feeChanges.adds.length > 0) {
    const configIds = feeChanges.adds.map((a) => a.feeConfigId);
    const configs = await FeeConfig.find({ _id: { $in: configIds } }).exec();

    for (const add of feeChanges.adds) {
      const config = configs.find((c) => c.id === add.feeConfigId);
      if (config) {
        totalFees += calculateFeeFromConfig(config, loan.totalAmount);
      }
    }
  }

  totalFees = round2(totalFees);

  // Get pricing preview if pricing changes
  let effectiveRate = loan.pricing.effectiveRate;
  let interestAmount = loan.interestAmount;

  if (pricingUpdates) {
    const pricingPreview = previewPricing(loan, pricingUpdates);
    effectiveRate = pricingPreview.effectiveRate;
    interestAmount = pricingPreview.interestAmount;
  }

  // Calculate net proceeds
  const netProceeds = calculateNetProceeds(
    loan.totalAmount,
    interestAmount,
    totalFees
  );

  return {
    effectiveRate,
    interestAmount,
    totalFees,
    originalTotalFees,
    netProceeds,
    originalNetProceeds,
  };
}

/**
 * @fileoverview Loan Service - Core Loan Operations
 *
 * This service handles all loan-related business operations including:
 * - CRUD operations for loans
 * - Fee management (add, update, remove)
 * - Invoice management (add, update, remove, move)
 * - Loan splitting operations
 * - Preview calculations for UI feedback
 *
 * All operations automatically:
 * - Trigger recalculations via calculationService
 * - Create audit trails via auditService
 * - Validate business rules
 *
 * @module services/loanService
 *
 * @example
 * // Update a loan's pricing
 * const loan = await updateLoan(loanId, { pricing: { baseRate: 0.05 } }, userId, userName);
 *
 * @example
 * // Add a fee to a loan
 * const loan = await addFeeToLoan(loanId, { feeConfigId: 'fee-123' }, userId, userName);
 *
 * @example
 * // Split a loan into child loans
 * const childLoans = await splitLoan(parentId, { splits: [...] }, userId, userName);
 *
 * @see calculationService - For pricing/fee calculations
 * @see auditService - For audit trail creation
 */

import { Loan, FeeConfig } from '../models';
import type { LoanDocument } from '../models';
import type {
  UpdateLoanRequest,
  AddFeeToLoanRequest,
  UpdateFeeRequest,
  SplitLoanRequest,
  LoanListItem,
} from '@loan-pricing/shared';
import {
  recalculateLoan,
  previewPricing,
  previewFullLoanState as calcPreviewFullLoanState,
  type FeeChangePreview,
} from './calculationService';
import { createAuditEntry, createBulkAuditEntries, detectChanges } from './auditService';
import { trackCreate, trackUpdate, trackDelete, applyUpdates } from './helpers';

// ============================================
// LOAN CRUD
// ============================================

/**
 * Get all loans for grid display
 */
export async function getLoans(options?: {
  status?: string;
  pricingStatus?: string;
  page?: number;
  pageSize?: number;
}): Promise<{ data: LoanListItem[]; total: number }> {
  const query: Record<string, unknown> = {};

  if (options?.status) {
    query.status = options.status;
  }
  if (options?.pricingStatus) {
    query.pricingStatus = options.pricingStatus;
  }

  const page = options?.page ?? 1;
  const pageSize = options?.pageSize ?? 50;
  const skip = (page - 1) * pageSize;

  const [loans, total] = await Promise.all([
    Loan.find(query)
      .select({
        loanNumber: 1,
        borrowerName: 1,
        totalAmount: 1,
        currency: 1,
        status: 1,
        pricingStatus: 1,
        'pricing.effectiveRate': 1,
        invoices: 1,
        fees: 1,
        startDate: 1,
        maturityDate: 1,
        createdAt: 1,
        updatedAt: 1,
      })
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(pageSize)
      .lean()
      .exec(),
    Loan.countDocuments(query),
  ]);

  const data: LoanListItem[] = loans.map((loan) => ({
    id: loan._id.toString(),
    loanNumber: loan.loanNumber,
    borrowerName: loan.borrowerName,
    totalAmount: loan.totalAmount,
    currency: loan.currency,
    status: loan.status,
    pricingStatus: loan.pricingStatus,
    effectiveRate: loan.pricing.effectiveRate,
    invoiceCount: loan.invoices?.length ?? 0,
    feeCount: loan.fees?.length ?? 0,
    startDate: loan.startDate,
    maturityDate: loan.maturityDate,
    createdAt: loan.createdAt,
    updatedAt: loan.updatedAt,
  }));

  return { data, total };
}

/**
 * Get a single loan with all details
 */
export async function getLoanById(id: string): Promise<LoanDocument | null> {
  return Loan.findById(id).exec();
}

/**
 * Update loan and create audit trail
 */
export async function updateLoan(
  id: string,
  updates: UpdateLoanRequest,
  userId = 'system',
  userName = 'System'
): Promise<LoanDocument | null> {
  const loan = await Loan.findById(id).exec();
  if (!loan) return null;

  // Capture old values for audit
  const oldLoan = loan.toObject();

  // Apply pricing updates
  if (updates.pricing) {
    if (updates.pricing.baseRate !== undefined) {
      loan.pricing.baseRate = updates.pricing.baseRate;
    }
    if (updates.pricing.spread !== undefined) {
      loan.pricing.spread = updates.pricing.spread;
    }
    if (updates.pricing.dayCountConvention !== undefined) {
      loan.pricing.dayCountConvention = updates.pricing.dayCountConvention;
    }
    if (updates.pricing.accrualMethod !== undefined) {
      loan.pricing.accrualMethod = updates.pricing.accrualMethod;
    }
  }

  // Apply other updates
  if (updates.status !== undefined) {
    loan.status = updates.status;
  }
  if (updates.pricingStatus !== undefined) {
    loan.pricingStatus = updates.pricingStatus;
  }
  if (updates.startDate !== undefined) {
    loan.startDate = updates.startDate;
  }
  if (updates.maturityDate !== undefined) {
    loan.maturityDate = updates.maturityDate;
  }

  loan.updatedBy = userId;

  // Recalculate all derived fields
  await recalculateLoan(loan);

  await loan.save();

  // Create audit entries for changes
  const newLoan = loan.toObject();
  const changes = detectChanges(oldLoan as unknown as Record<string, unknown>, newLoan as unknown as Record<string, unknown>);

  if (changes.length > 0) {
    await createBulkAuditEntries('loan', id, id, changes, userId, userName);
  }

  return loan;
}

/**
 * Preview pricing changes without saving
 */
export async function previewLoanPricing(
  id: string,
  pricingUpdates: UpdateLoanRequest['pricing']
) {
  const loan = await Loan.findById(id).exec();
  if (!loan || !pricingUpdates) return null;

  return previewPricing(loan, pricingUpdates);
}

/**
 * Preview full loan calculations including fee changes
 * This allows the frontend to show accurate before/after without saving
 * Delegates to calculationService for actual calculations
 */
export { FeeChangePreview };

export async function previewFullLoanState(
  id: string,
  pricingUpdates?: UpdateLoanRequest['pricing'],
  feeChanges?: FeeChangePreview
) {
  const loan = await Loan.findById(id).exec();
  if (!loan) return null;

  // Use consolidated calculation from calculationService
  return calcPreviewFullLoanState(loan, pricingUpdates, feeChanges);
}

// ============================================
// FEE MANAGEMENT
// ============================================

/**
 * Add a fee to a loan
 */
export async function addFeeToLoan(
  loanId: string,
  request: AddFeeToLoanRequest,
  userId = 'system',
  userName = 'System'
): Promise<LoanDocument | null> {
  const [loan, feeConfig] = await Promise.all([
    Loan.findById(loanId).exec(),
    FeeConfig.findById(request.feeConfigId).exec(),
  ]);

  if (!loan || !feeConfig) return null;

  // Check if fee with same feeConfigId already exists on loan - skip silently
  const existingFee = loan.fees.find(
    (f) => f.feeConfigId === request.feeConfigId
  );
  if (existingFee) {
    // Return the loan unchanged - fee already exists
    return loan;
  }

  // Create fee from config with optional overrides
  const newFee = {
    feeConfigId: feeConfig._id.toString(),
    code: feeConfig.code,
    type: feeConfig.type,
    name: feeConfig.name,
    calculationType: feeConfig.calculationType,
    flatAmount: request.flatAmount ?? feeConfig.defaultFlatAmount,
    rate: request.rate ?? feeConfig.defaultRate,
    basisAmount: request.basisAmount ?? feeConfig.defaultBasisAmount,
    tiers: request.tiers ?? feeConfig.defaultTiers,
    calculatedAmount: 0, // Will be calculated
    currency: request.currency ?? loan.currency,
    dueDate: request.dueDate,
    isPaid: false,
    isWaived: false,
    isOverridden:
      request.flatAmount !== undefined ||
      request.rate !== undefined ||
      request.basisAmount !== undefined ||
      request.tiers !== undefined,
  };

  loan.fees.push(newFee as any);
  loan.updatedBy = userId;

  // Recalculate totals
  await recalculateLoan(loan);
  await loan.save();

  // Audit
  const addedFee = loan.fees[loan.fees.length - 1];
  await trackCreate('fee', addedFee._id.toString(), loanId, addedFee.toObject(), { userId, userName });

  return loan;
}

/**
 * Update a fee on a loan
 */
export async function updateFee(
  loanId: string,
  feeId: string,
  updates: UpdateFeeRequest,
  userId = 'system',
  userName = 'System'
): Promise<LoanDocument | null> {
  const loan = await Loan.findById(loanId).exec();
  if (!loan) return null;

  const fee = loan.fees.id(feeId);
  if (!fee) return null;

  // Capture old values for audit
  const oldFee = fee.toObject();

  // Apply updates using helper
  applyUpdates(fee, updates, [
    'flatAmount', 'rate', 'basisAmount', 'currency', 'dueDate', 'isPaid', 'isWaived', 'waivedReason'
  ]);
  if (updates.tiers !== undefined) fee.tiers = updates.tiers as any;

  fee.isOverridden = true;
  loan.updatedBy = userId;

  // Recalculate
  await recalculateLoan(loan);
  await loan.save();

  // Audit changes
  const newFee = fee.toObject();
  await trackUpdate('fee', feeId, loanId, oldFee as unknown as Record<string, unknown>, newFee as unknown as Record<string, unknown>, { userId, userName });

  return loan;
}

/**
 * Remove a fee from a loan
 */
export async function removeFee(
  loanId: string,
  feeId: string,
  userId = 'system',
  userName = 'System'
): Promise<LoanDocument | null> {
  const loan = await Loan.findById(loanId).exec();
  if (!loan) return null;

  const fee = loan.fees.id(feeId);
  if (!fee) return null;

  const oldFee = fee.toObject();
  loan.fees.pull(feeId);
  loan.updatedBy = userId;

  await recalculateLoan(loan);
  await loan.save();

  await trackDelete('fee', feeId, loanId, oldFee, { userId, userName });

  return loan;
}

// ============================================
// LOAN SPLITTING
// ============================================

/**
 * Split a loan into multiple child loans
 */
export async function splitLoan(
  parentLoanId: string,
  request: SplitLoanRequest,
  userId = 'system',
  userName = 'System'
): Promise<LoanDocument[]> {
  const parentLoan = await Loan.findById(parentLoanId).exec();
  if (!parentLoan) throw new Error('Parent loan not found');

  const childLoans: LoanDocument[] = [];

  for (let i = 0; i < request.splits.length; i++) {
    const split = request.splits[i];
    const childInvoices = parentLoan.invoices.filter((inv) =>
      split.invoiceIds.includes(inv._id.toString())
    );

    if (childInvoices.length === 0) {
      throw new Error(`Split ${i + 1} has no valid invoices`);
    }

    // Calculate child loan amount
    const childAmount = childInvoices.reduce((sum, inv) => sum + inv.amount, 0);

    // Calculate fee allocation (proportional or by percentage)
    const allocationRatio = split.percentage ?? childAmount / parentLoan.totalAmount;

    // Create child loan
    const childLoan = new Loan({
      loanNumber: `${parentLoan.loanNumber}-${i + 1}`,
      parentLoanId: parentLoan._id,
      borrowerId: parentLoan.borrowerId,
      borrowerName: parentLoan.borrowerName,
      totalAmount: childAmount,
      currency: parentLoan.currency,
      outstandingAmount: childAmount,
      status: 'draft',
      pricingStatus: 'pending',
      pricing: { ...parentLoan.pricing },
      startDate: parentLoan.startDate,
      maturityDate: parentLoan.maturityDate,
      invoices: childInvoices.map((inv) => ({
        invoiceNumber: inv.invoiceNumber,
        buyerName: inv.buyerName,
        amount: inv.amount,
        currency: inv.currency,
        issueDate: inv.issueDate,
        dueDate: inv.dueDate,
        status: inv.status,
        description: inv.description,
      })),
      fees: parentLoan.fees.map((fee) => ({
        feeConfigId: fee.feeConfigId,
        code: fee.code,
        type: fee.type,
        name: fee.name,
        calculationType: fee.calculationType,
        flatAmount: fee.flatAmount ? fee.flatAmount * allocationRatio : undefined,
        rate: fee.rate,
        basisAmount: fee.basisAmount,
        tiers: fee.tiers,
        calculatedAmount: 0,
        currency: fee.currency,
        isPaid: false,
        isWaived: false,
        isOverridden: fee.isOverridden,
      })),
      createdBy: userId,
      updatedBy: userId,
    });

    await recalculateLoan(childLoan);
    await childLoan.save();
    childLoans.push(childLoan);

    // Audit child creation
    await createAuditEntry({
      entityType: 'loan',
      entityId: childLoan._id.toString(),
      loanId: childLoan._id.toString(),
      action: 'create',
      newValue: { parentLoanId, splitIndex: i + 1, invoiceIds: split.invoiceIds },
      userId,
      userName,
      metadata: { parentLoanId, splitFromParent: true },
    });
  }

  // Mark parent as split
  parentLoan.status = 'funded'; // or a 'split' status if you add one
  await parentLoan.save();

  await createAuditEntry({
    entityType: 'loan',
    entityId: parentLoanId,
    loanId: parentLoanId,
    action: 'split',
    newValue: { childLoanIds: childLoans.map((l) => l._id.toString()) },
    userId,
    userName,
  });

  return childLoans;
}

// ============================================
// INVOICE OPERATIONS
// ============================================

export interface AddInvoiceRequest {
  invoiceNumber: string;
  debtorName: string;
  amount: number;
  dueDate: Date;
  description?: string;
  issueDate?: Date;
}

export interface UpdateInvoiceRequest {
  invoiceNumber?: string;
  debtorName?: string;
  amount?: number;
  dueDate?: Date;
  description?: string;
  status?: 'pending' | 'verified' | 'financed' | 'collected' | 'defaulted' | 'disputed';
  verificationStatus?: 'pending' | 'verified' | 'rejected';
  disputeStatus?: 'none' | 'partial' | 'full';
  disputeAmount?: number;
  disputeReason?: string;
}

/**
 * Add an invoice to a loan
 */
export async function addInvoiceToLoan(
  loanId: string,
  invoiceData: AddInvoiceRequest,
  userId: string,
  userName: string
): Promise<LoanDocument | null> {
  const loan = await Loan.findById(loanId);
  if (!loan) return null;

  // Check if loan is locked
  if (loan.pricingStatus === 'locked') {
    throw new Error('Cannot add invoice to a locked loan');
  }

  // Create new invoice subdocument
  const newInvoice = {
    invoiceNumber: invoiceData.invoiceNumber,
    debtorName: invoiceData.debtorName,
    buyerName: invoiceData.debtorName, // Alias for compatibility
    amount: invoiceData.amount,
    currency: loan.currency,
    dueDate: invoiceData.dueDate,
    issueDate: invoiceData.issueDate || new Date(),
    description: invoiceData.description,
    status: 'pending' as const,
    verificationStatus: 'pending' as const,
    disputeStatus: 'none' as const,
  };

  loan.invoices.push(newInvoice as any);

  // Recalculate loan totals
  loan.totalAmount = loan.invoices.reduce((sum, inv) => sum + inv.amount, 0);

  // Recalculate interest and net proceeds
  await recalculateLoan(loan);

  loan.updatedBy = userName;
  await loan.save();

  // Audit
  const addedInvoice = loan.invoices[loan.invoices.length - 1];
  await trackCreate('invoice', addedInvoice._id.toString(), loanId, newInvoice, { userId, userName });

  return loan;
}

/**
 * Update an invoice on a loan
 */
export async function updateInvoice(
  loanId: string,
  invoiceId: string,
  updates: UpdateInvoiceRequest,
  userId: string,
  userName: string
): Promise<LoanDocument | null> {
  const loan = await Loan.findById(loanId);
  if (!loan) return null;

  const invoice = loan.invoices.id(invoiceId);
  if (!invoice) return null;

  // Check if loan is locked (allow status updates but not amount changes)
  if (loan.pricingStatus === 'locked' && updates.amount !== undefined) {
    throw new Error('Cannot change invoice amount on a locked loan');
  }

  const oldValue = { ...invoice.toObject() };

  // Apply updates
  if (updates.invoiceNumber !== undefined) invoice.invoiceNumber = updates.invoiceNumber;
  if (updates.debtorName !== undefined) {
    (invoice as any).debtorName = updates.debtorName;
    invoice.buyerName = updates.debtorName;
  }
  if (updates.amount !== undefined) invoice.amount = updates.amount;
  if (updates.dueDate !== undefined) invoice.dueDate = updates.dueDate;
  if (updates.description !== undefined) invoice.description = updates.description;
  if (updates.status !== undefined) invoice.status = updates.status;
  if (updates.verificationStatus !== undefined) {
    invoice.verificationStatus = updates.verificationStatus;
    if (updates.verificationStatus === 'verified') {
      invoice.verificationDate = new Date();
      invoice.verifiedBy = userName;
    }
  }
  if (updates.disputeStatus !== undefined) invoice.disputeStatus = updates.disputeStatus;
  if (updates.disputeAmount !== undefined) invoice.disputeAmount = updates.disputeAmount;
  if (updates.disputeReason !== undefined) invoice.disputeReason = updates.disputeReason;

  // Recalculate loan totals if amount changed
  if (updates.amount !== undefined) {
    loan.totalAmount = loan.invoices.reduce((sum, inv) => sum + inv.amount, 0);
    await recalculateLoan(loan);
  }

  loan.updatedBy = userName;
  await loan.save();

  // Audit changes
  const newValue = invoice.toObject();
  await trackUpdate('invoice', invoiceId, loanId, oldValue as unknown as Record<string, unknown>, newValue as unknown as Record<string, unknown>, { userId, userName });

  return loan;
}

/**
 * Remove an invoice from a loan
 */
export async function removeInvoice(
  loanId: string,
  invoiceId: string,
  userId: string,
  userName: string
): Promise<LoanDocument | null> {
  const loan = await Loan.findById(loanId);
  if (!loan) return null;

  const invoice = loan.invoices.id(invoiceId);
  if (!invoice) return null;

  // Check if loan is locked
  if (loan.pricingStatus === 'locked') {
    throw new Error('Cannot remove invoice from a locked loan');
  }

  // Cannot remove last invoice
  if (loan.invoices.length === 1) {
    throw new Error('Cannot remove the last invoice from a loan');
  }

  const oldValue = invoice.toObject();

  // Remove invoice using pull
  loan.invoices.pull(invoiceId);

  // Recalculate loan totals
  loan.totalAmount = loan.invoices.reduce((sum, inv) => sum + inv.amount, 0);
  await recalculateLoan(loan);

  loan.updatedBy = userName;
  await loan.save();

  await trackDelete('invoice', invoiceId, loanId, oldValue, { userId, userName });

  return loan;
}

/**
 * Move an invoice from one loan to another
 */
export async function moveInvoice(
  sourceLoanId: string,
  invoiceId: string,
  targetLoanId: string,
  userId: string,
  userName: string
): Promise<{ sourceLoan: LoanDocument; targetLoan: LoanDocument }> {
  // Get both loans
  const sourceLoan = await Loan.findById(sourceLoanId);
  const targetLoan = await Loan.findById(targetLoanId);

  if (!sourceLoan) throw new Error('Source loan not found');
  if (!targetLoan) throw new Error('Target loan not found');

  // Validate loans
  if (sourceLoan.pricingStatus === 'locked') {
    throw new Error('Cannot move invoice from a locked loan');
  }
  if (targetLoan.pricingStatus === 'locked') {
    throw new Error('Cannot move invoice to a locked loan');
  }
  if (sourceLoan.currency !== targetLoan.currency) {
    throw new Error('Cannot move invoice between loans with different currencies');
  }
  if (sourceLoan.invoices.length === 1) {
    throw new Error('Cannot move the last invoice from a loan');
  }

  // Find and remove invoice from source
  const invoice = sourceLoan.invoices.id(invoiceId);
  if (!invoice) throw new Error('Invoice not found');

  const invoiceData = invoice.toObject();
  sourceLoan.invoices.pull(invoiceId);

  // Add invoice to target (create new subdocument)
  targetLoan.invoices.push({
    invoiceNumber: invoiceData.invoiceNumber,
    debtorName: (invoiceData as any).debtorName,
    buyerName: invoiceData.buyerName,
    amount: invoiceData.amount,
    currency: invoiceData.currency,
    dueDate: invoiceData.dueDate,
    issueDate: invoiceData.issueDate,
    description: invoiceData.description,
    status: invoiceData.status,
    verificationStatus: invoiceData.verificationStatus,
    verificationDate: invoiceData.verificationDate,
    verifiedBy: invoiceData.verifiedBy,
    disputeStatus: invoiceData.disputeStatus,
    disputeAmount: invoiceData.disputeAmount,
    disputeReason: invoiceData.disputeReason,
  } as any);

  // Recalculate both loans
  sourceLoan.totalAmount = sourceLoan.invoices.reduce((sum, inv) => sum + inv.amount, 0);
  targetLoan.totalAmount = targetLoan.invoices.reduce((sum, inv) => sum + inv.amount, 0);

  await recalculateLoan(sourceLoan);
  await recalculateLoan(targetLoan);

  sourceLoan.updatedBy = userName;
  targetLoan.updatedBy = userName;

  await Promise.all([sourceLoan.save(), targetLoan.save()]);

  // Create audit entries for both loans
  await createAuditEntry({
    entityType: 'invoice',
    entityId: invoiceId,
    loanId: sourceLoanId,
    action: 'move',
    oldValue: { loanId: sourceLoanId },
    newValue: { loanId: targetLoanId },
    userId,
    userName,
    metadata: { movedTo: targetLoanId, invoiceNumber: invoiceData.invoiceNumber },
  });

  await createAuditEntry({
    entityType: 'invoice',
    entityId: targetLoan.invoices[targetLoan.invoices.length - 1]._id.toString(),
    loanId: targetLoanId,
    action: 'move',
    oldValue: { loanId: sourceLoanId },
    newValue: { loanId: targetLoanId },
    userId,
    userName,
    metadata: { movedFrom: sourceLoanId, invoiceNumber: invoiceData.invoiceNumber },
  });

  return {
    sourceLoan,
    targetLoan,
  };
}

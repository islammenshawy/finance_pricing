import type { Loan } from '@loan-pricing/shared';

/**
 * Shared calculation utilities for loan pricing
 * All complex calculations should be centralized here
 */

export interface GroupTotals {
  totalAmount: number;
  totalFees: number;
  totalInterest: number;
  netProceeds: number;
  loanCount: number;
}

export interface PreviewDeltas {
  feesDelta: number;
  interestDelta: number;
  netDelta: number;
}

export interface CurrencyGroupTotals extends GroupTotals {
  currency: string;
  avgRate: number;
}

/**
 * Calculate aggregate totals for a group of loans
 */
export function calculateGroupTotals(loans: Loan[]): GroupTotals {
  return {
    totalAmount: loans.reduce((sum, l) => sum + l.totalAmount, 0),
    totalFees: loans.reduce((sum, l) => sum + l.totalFees, 0),
    totalInterest: loans.reduce((sum, l) => sum + l.interestAmount, 0),
    netProceeds: loans.reduce((sum, l) => sum + l.netProceeds, 0),
    loanCount: loans.length,
  };
}

/**
 * Calculate average effective rate for a group of loans
 */
export function calculateAvgRate(loans: Loan[]): number {
  if (loans.length === 0) return 0;
  const totalRate = loans.reduce((sum, l) => sum + l.pricing.effectiveRate, 0);
  return totalRate / loans.length;
}

/**
 * Calculate deltas between original and preview values
 */
export function calculatePreviewDeltas(
  original: { totalFees: number; interestAmount: number; netProceeds: number },
  preview?: { totalFees: number; interestAmount: number; netProceeds: number }
): PreviewDeltas {
  if (!preview) {
    return { feesDelta: 0, interestDelta: 0, netDelta: 0 };
  }
  return {
    feesDelta: preview.totalFees - original.totalFees,
    interestDelta: preview.interestAmount - original.interestAmount,
    netDelta: preview.netProceeds - original.netProceeds,
  };
}

/**
 * Calculate group preview totals with deltas
 */
export function calculateGroupPreviewTotals(
  loans: Loan[],
  previews: Map<string, { totalFees: number; interestAmount: number; netProceeds: number }>
): {
  previewFees: number;
  previewInterest: number;
  previewNet: number;
  feesDelta: number;
  interestDelta: number;
  netDelta: number;
} {
  const original = calculateGroupTotals(loans);

  let previewFees = original.totalFees;
  let previewInterest = original.totalInterest;
  let previewNet = original.netProceeds;

  for (const loan of loans) {
    const preview = previews.get(loan.id);
    if (preview) {
      previewFees += (preview.totalFees - loan.totalFees);
      previewInterest += (preview.interestAmount - loan.interestAmount);
      previewNet += (preview.netProceeds - loan.netProceeds);
    }
  }

  return {
    previewFees,
    previewInterest,
    previewNet,
    feesDelta: previewFees - original.totalFees,
    interestDelta: previewInterest - original.totalInterest,
    netDelta: previewNet - original.netProceeds,
  };
}

/**
 * Group loans by a specific field and calculate totals per group
 */
export function groupLoansBy<K extends keyof Loan>(
  loans: Loan[],
  field: K
): Map<Loan[K], Loan[]> {
  const groups = new Map<Loan[K], Loan[]>();

  for (const loan of loans) {
    const key = loan[field];
    const existing = groups.get(key) || [];
    existing.push(loan);
    groups.set(key, existing);
  }

  return groups;
}

/**
 * Calculate totals grouped by currency
 */
export function calculateTotalsByCurrency(loans: Loan[]): CurrencyGroupTotals[] {
  const byCurrency = groupLoansBy(loans, 'currency');
  const results: CurrencyGroupTotals[] = [];

  for (const [currency, currencyLoans] of byCurrency) {
    const totals = calculateGroupTotals(currencyLoans);
    results.push({
      currency: currency as string,
      ...totals,
      avgRate: calculateAvgRate(currencyLoans),
    });
  }

  return results;
}

/**
 * Calculate days until a target date (with time zeroed for consistency)
 */
export function getDaysUntil(date: Date | string): number {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const targetDate = new Date(date);
  targetDate.setHours(0, 0, 0, 0);
  return Math.ceil((targetDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

/**
 * Calculate days to loan maturity
 */
export function getDaysToMaturity(maturityDate: Date | string): number {
  return getDaysUntil(maturityDate);
}

/**
 * Determine maturity bucket based on days until maturity
 */
export type MaturityBucket = 'overdue' | 'this_week' | 'this_month' | 'next_month' | 'next_quarter' | 'later';

export function getMaturityBucket(maturityDate: Date | string): MaturityBucket {
  const days = getDaysUntil(maturityDate);

  if (days < 0) return 'overdue';
  if (days <= 7) return 'this_week';
  if (days <= 30) return 'this_month';
  if (days <= 60) return 'next_month';
  if (days <= 90) return 'next_quarter';
  return 'later';
}

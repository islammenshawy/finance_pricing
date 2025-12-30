/**
 * Shared pricing types for the loan pricing application
 */

/**
 * Preview data returned from pricing calculations
 * Used across components for displaying calculated vs original values
 */
export interface PreviewData {
  effectiveRate: number;
  interestAmount: number;
  totalFees: number;
  originalTotalFees?: number;
  netProceeds: number;
  originalNetProceeds?: number;
  /** Indicates if this is a local optimistic calculation vs server-confirmed */
  isOptimistic?: boolean;
}

/**
 * Currency impact summary for the impact panel
 */
export interface CurrencyImpact {
  currency: string;
  loanCount: number;
  before: {
    totalAmount: number;
    avgRate: number;
    totalInterest: number;
    totalFees: number;
    netProceeds: number;
  };
  after: {
    totalAmount: number;
    avgRate: number;
    totalInterest: number;
    totalFees: number;
    netProceeds: number;
  };
}

/**
 * Sort configuration for loan tables
 */
export type SortField = 'loanNumber' | 'totalAmount' | 'effectiveRate' | 'totalFees' | 'netProceeds' | null;
export type SortDirection = 'asc' | 'desc';

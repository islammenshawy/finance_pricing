import { useState, useMemo, useCallback } from 'react';
import type { Loan } from '@loan-pricing/shared';
import { getDaysUntil } from '@/lib/calculations';

export interface LoanFilters {
  search: string;
  currency: string | null;
  status: string | null;
  pricingStatus: string | null;
  minAmount: number | null;
  maxAmount: number | null;
  maturityBucket: string | null;
  dateRange: {
    start: Date | null;
    end: Date | null;
  };
}

const defaultFilters: LoanFilters = {
  search: '',
  currency: null,
  status: null,
  pricingStatus: null,
  minAmount: null,
  maxAmount: null,
  maturityBucket: null,
  dateRange: {
    start: null,
    end: null,
  },
};

export interface UseFilteredLoansReturn {
  filters: LoanFilters;
  setFilter: <K extends keyof LoanFilters>(key: K, value: LoanFilters[K]) => void;
  setFilters: (filters: Partial<LoanFilters>) => void;
  resetFilters: () => void;
  filteredLoans: Loan[];
  filterCounts: {
    total: number;
    filtered: number;
    currencies: Record<string, number>;
    statuses: Record<string, number>;
    pricingStatuses: Record<string, number>;
  };
  hasActiveFilters: boolean;
}

/**
 * Hook for filtering and searching loans
 * Provides efficient memoized filtering with counts
 */
export function useFilteredLoans(loans: Loan[]): UseFilteredLoansReturn {
  const [filters, setFiltersState] = useState<LoanFilters>(defaultFilters);

  const setFilter = useCallback(<K extends keyof LoanFilters>(
    key: K,
    value: LoanFilters[K]
  ) => {
    setFiltersState((prev) => ({ ...prev, [key]: value }));
  }, []);

  const setFilters = useCallback((newFilters: Partial<LoanFilters>) => {
    setFiltersState((prev) => ({ ...prev, ...newFilters }));
  }, []);

  const resetFilters = useCallback(() => {
    setFiltersState(defaultFilters);
  }, []);

  // Calculate filter counts from all loans (before filtering)
  const filterCounts = useMemo(() => {
    const currencies: Record<string, number> = {};
    const statuses: Record<string, number> = {};
    const pricingStatuses: Record<string, number> = {};

    for (const loan of loans) {
      currencies[loan.currency] = (currencies[loan.currency] || 0) + 1;
      statuses[loan.status] = (statuses[loan.status] || 0) + 1;
      pricingStatuses[loan.pricingStatus] = (pricingStatuses[loan.pricingStatus] || 0) + 1;
    }

    return { currencies, statuses, pricingStatuses };
  }, [loans]);

  // Apply filters
  const filteredLoans = useMemo(() => {
    return loans.filter((loan) => {
      // Search filter (searches across multiple fields)
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const searchableFields = [
          loan.loanNumber,
          loan.borrowerName,
          loan.currency,
          loan.status,
          loan.pricingStatus,
          ...loan.invoices.map((i) => i.invoiceNumber),
          ...loan.invoices.map((i) => i.buyerName),
        ];
        const matches = searchableFields.some(
          (field) => field && field.toLowerCase().includes(searchLower)
        );
        if (!matches) return false;
      }

      // Currency filter
      if (filters.currency && loan.currency !== filters.currency) {
        return false;
      }

      // Status filter
      if (filters.status && loan.status !== filters.status) {
        return false;
      }

      // Pricing status filter
      if (filters.pricingStatus && loan.pricingStatus !== filters.pricingStatus) {
        return false;
      }

      // Amount range filter
      if (filters.minAmount !== null && loan.totalAmount < filters.minAmount) {
        return false;
      }
      if (filters.maxAmount !== null && loan.totalAmount > filters.maxAmount) {
        return false;
      }

      // Maturity bucket filter
      if (filters.maturityBucket) {
        const days = getDaysUntil(loan.maturityDate);
        const bucket = filters.maturityBucket;

        if (bucket === 'overdue' && days >= 0) return false;
        if (bucket === 'this_week' && (days < 0 || days > 7)) return false;
        if (bucket === 'this_month' && (days < 0 || days > 30)) return false;
        if (bucket === 'next_month' && (days <= 30 || days > 60)) return false;
        if (bucket === 'next_quarter' && (days <= 60 || days > 90)) return false;
        if (bucket === 'later' && days <= 90) return false;
      }

      // Date range filter (maturity date)
      if (filters.dateRange.start || filters.dateRange.end) {
        const maturityDate = new Date(loan.maturityDate);
        if (filters.dateRange.start && maturityDate < filters.dateRange.start) {
          return false;
        }
        if (filters.dateRange.end && maturityDate > filters.dateRange.end) {
          return false;
        }
      }

      return true;
    });
  }, [loans, filters]);

  const hasActiveFilters = useMemo(() => {
    return (
      filters.search !== '' ||
      filters.currency !== null ||
      filters.status !== null ||
      filters.pricingStatus !== null ||
      filters.minAmount !== null ||
      filters.maxAmount !== null ||
      filters.maturityBucket !== null ||
      filters.dateRange.start !== null ||
      filters.dateRange.end !== null
    );
  }, [filters]);

  return {
    filters,
    setFilter,
    setFilters,
    resetFilters,
    filteredLoans,
    filterCounts: {
      total: loans.length,
      filtered: filteredLoans.length,
      ...filterCounts,
    },
    hasActiveFilters,
  };
}

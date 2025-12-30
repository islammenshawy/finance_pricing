import { useState, useRef, useEffect } from 'react';
import type { LoanFilters } from '@/hooks/useFilteredLoans';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Search,
  X,
  DollarSign,
  XCircle,
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface FilterToolbarProps {
  filters: LoanFilters;
  setFilter: <K extends keyof LoanFilters>(key: K, value: LoanFilters[K]) => void;
  resetFilters: () => void;
  filterCounts: {
    total: number;
    filtered: number;
    currencies: Record<string, number>;
    statuses: Record<string, number>;
    pricingStatuses: Record<string, number>;
  };
  hasActiveFilters: boolean;
}

const STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  in_review: 'In Review',
  approved: 'Approved',
  funded: 'Funded',
};

const PRICING_STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  priced: 'Priced',
  locked: 'Locked',
};

const MATURITY_LABELS: Record<string, string> = {
  overdue: 'Overdue',
  this_week: 'This Week',
  this_month: 'This Month',
  next_month: 'Next Month',
  next_quarter: 'Next Quarter',
  later: '90+ Days',
};

export function FilterToolbar({
  filters,
  setFilter,
  resetFilters,
  filterCounts,
  hasActiveFilters,
}: FilterToolbarProps) {
  const [searchFocused, setSearchFocused] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  // Keyboard shortcut for search (Cmd/Ctrl + K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        searchRef.current?.focus();
      }
      if (e.key === 'Escape' && searchFocused) {
        searchRef.current?.blur();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [searchFocused]);

  return (
    <div className="space-y-3">
      {/* Main toolbar row */}
      <div className="flex items-center gap-3">
        {/* Search input */}
        <div className={`relative flex-1 max-w-md transition-all ${searchFocused ? 'max-w-lg' : ''}`}>
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            ref={searchRef}
            type="text"
            placeholder="Search loans, invoices, borrowers..."
            value={filters.search}
            onChange={(e) => setFilter('search', e.target.value)}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            className="pl-9 pr-20 h-9 bg-background border-muted-foreground/20 focus:border-primary transition-colors"
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
            {filters.search && (
              <button
                onClick={() => setFilter('search', '')}
                className="p-1 hover:bg-muted rounded"
              >
                <X className="h-3 w-3 text-muted-foreground" />
              </button>
            )}
            <kbd className="hidden sm:inline-flex h-5 items-center gap-1 rounded border bg-muted px-1.5 text-[10px] font-medium text-muted-foreground">
              <span className="text-xs">⌘</span>K
            </kbd>
          </div>
        </div>

        {/* Currency filter */}
        <Select
          value={filters.currency || 'all'}
          onValueChange={(v) => setFilter('currency', v === 'all' ? null : v)}
        >
          <SelectTrigger className={`w-28 h-9 ${filters.currency ? 'bg-primary/10 text-primary border-primary/30' : ''}`}>
            <SelectValue placeholder="Currency" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Currencies</SelectItem>
            {Object.entries(filterCounts.currencies).map(([code, count]) => (
              <SelectItem key={code} value={code}>
                {code} ({count})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Status filter */}
        <Select
          value={filters.status || 'all'}
          onValueChange={(v) => setFilter('status', v === 'all' ? null : v)}
        >
          <SelectTrigger className={`w-32 h-9 ${filters.status ? 'bg-primary/10 text-primary border-primary/30' : ''}`}>
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {Object.entries(filterCounts.statuses).map(([status, count]) => (
              <SelectItem key={status} value={status}>
                {STATUS_LABELS[status] || status} ({count})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Pricing Status filter */}
        <Select
          value={filters.pricingStatus || 'all'}
          onValueChange={(v) => setFilter('pricingStatus', v === 'all' ? null : v)}
        >
          <SelectTrigger className={`w-28 h-9 ${filters.pricingStatus ? 'bg-primary/10 text-primary border-primary/30' : ''}`}>
            <SelectValue placeholder="Pricing" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Pricing</SelectItem>
            {Object.entries(filterCounts.pricingStatuses).map(([status, count]) => (
              <SelectItem key={status} value={status}>
                {PRICING_STATUS_LABELS[status] || status} ({count})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Maturity filter */}
        <Select
          value={filters.maturityBucket || 'all'}
          onValueChange={(v) => setFilter('maturityBucket', v === 'all' ? null : v)}
        >
          <SelectTrigger className={`w-32 h-9 ${filters.maturityBucket ? 'bg-primary/10 text-primary border-primary/30' : ''}`}>
            <SelectValue placeholder="Maturity" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Maturities</SelectItem>
            {Object.entries(MATURITY_LABELS).map(([bucket, label]) => (
              <SelectItem key={bucket} value={bucket}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Amount quick filters */}
        <div className="flex items-center gap-1">
          <Button
            variant={filters.minAmount === 100000 ? 'default' : 'outline'}
            size="sm"
            className="h-9 text-xs"
            onClick={() => {
              if (filters.minAmount === 100000) {
                setFilter('minAmount', null);
                setFilter('maxAmount', null);
              } else {
                setFilter('minAmount', 100000);
                setFilter('maxAmount', 500000);
              }
            }}
          >
            <DollarSign className="h-3 w-3 mr-1" />
            100K-500K
          </Button>
          <Button
            variant={filters.minAmount === 500000 ? 'default' : 'outline'}
            size="sm"
            className="h-9 text-xs"
            onClick={() => {
              if (filters.minAmount === 500000) {
                setFilter('minAmount', null);
                setFilter('maxAmount', null);
              } else {
                setFilter('minAmount', 500000);
                setFilter('maxAmount', 1000000);
              }
            }}
          >
            500K-1M
          </Button>
          <Button
            variant={filters.minAmount === 1000000 && filters.maxAmount === null ? 'default' : 'outline'}
            size="sm"
            className="h-9 text-xs"
            onClick={() => {
              if (filters.minAmount === 1000000 && filters.maxAmount === null) {
                setFilter('minAmount', null);
              } else {
                setFilter('minAmount', 1000000);
                setFilter('maxAmount', null);
              }
            }}
          >
            &gt; 1M
          </Button>
        </div>

        {/* Clear all */}
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={resetFilters}
            className="h-9 px-3 text-muted-foreground hover:text-foreground"
          >
            <XCircle className="h-4 w-4 mr-1" />
            Clear
          </Button>
        )}
      </div>

      {/* Active filters chips + results count */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Results count */}
          <span className="text-sm text-muted-foreground">
            {filterCounts.filtered === filterCounts.total ? (
              <span>{filterCounts.total} loans</span>
            ) : (
              <span>
                <span className="font-medium text-foreground">{filterCounts.filtered}</span>
                {' '}of {filterCounts.total} loans
              </span>
            )}
          </span>

          {/* Active filter chips */}
          {filters.currency && (
            <FilterChip
              label={`Currency: ${filters.currency}`}
              onRemove={() => setFilter('currency', null)}
            />
          )}
          {filters.status && (
            <FilterChip
              label={`Status: ${STATUS_LABELS[filters.status] || filters.status}`}
              onRemove={() => setFilter('status', null)}
            />
          )}
          {filters.pricingStatus && (
            <FilterChip
              label={`Pricing: ${PRICING_STATUS_LABELS[filters.pricingStatus] || filters.pricingStatus}`}
              onRemove={() => setFilter('pricingStatus', null)}
            />
          )}
          {filters.maturityBucket && (
            <FilterChip
              label={`Maturity: ${MATURITY_LABELS[filters.maturityBucket]}`}
              onRemove={() => setFilter('maturityBucket', null)}
            />
          )}
          {(filters.minAmount !== null || filters.maxAmount !== null) && (
            <FilterChip
              label={`Amount: ${filters.minAmount ? formatCurrency(filters.minAmount, 'USD') : '$0'} - ${filters.maxAmount ? formatCurrency(filters.maxAmount, 'USD') : '∞'}`}
              onRemove={() => {
                setFilter('minAmount', null);
                setFilter('maxAmount', null);
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// Filter chip component
function FilterChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <Badge
      variant="secondary"
      className="pl-2 pr-1 py-1 gap-1 bg-primary/10 text-primary hover:bg-primary/20 cursor-default"
    >
      {label}
      <button
        onClick={onRemove}
        className="ml-1 p-0.5 rounded-full hover:bg-primary/20"
      >
        <X className="h-3 w-3" />
      </button>
    </Badge>
  );
}

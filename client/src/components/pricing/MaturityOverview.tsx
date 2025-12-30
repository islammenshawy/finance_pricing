import { useMemo, useState } from 'react';
import type { Loan } from '@loan-pricing/shared';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Calendar,
  TrendingUp,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Clock,
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface MaturityOverviewProps {
  loans: Loan[];
  selectedBucket?: string | null;
  onFilterByMaturity?: (bucket: string | null) => void;
}

type MaturityBucket = 'overdue' | 'this_week' | 'this_month' | 'next_month' | 'next_quarter' | 'later';
type GroupBy = 'none' | 'currency';

interface BucketData {
  label: string;
  shortLabel: string;
  count: number;
  totalAmount: number;
  byCurrency: Record<string, { count: number; amount: number }>;
  loans: Loan[];
  color: string;
  bgColor: string;
  icon: typeof AlertTriangle;
}

function getDaysUntil(date: Date | string): number {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const targetDate = new Date(date);
  targetDate.setHours(0, 0, 0, 0);
  return Math.ceil((targetDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function getMaturityBucket(maturityDate: Date | string): MaturityBucket {
  const days = getDaysUntil(maturityDate);

  if (days < 0) return 'overdue';
  if (days <= 7) return 'this_week';
  if (days <= 30) return 'this_month';
  if (days <= 60) return 'next_month';
  if (days <= 90) return 'next_quarter';
  return 'later';
}

const bucketConfig: Record<MaturityBucket, { label: string; shortLabel: string; color: string; bgColor: string; icon: typeof AlertTriangle }> = {
  overdue: {
    label: 'Overdue',
    shortLabel: 'Overdue',
    color: 'text-red-600 dark:text-red-400',
    bgColor: 'bg-red-50 border-red-200 dark:bg-red-950/50 dark:border-red-800',
    icon: AlertTriangle,
  },
  this_week: {
    label: 'This Week',
    shortLabel: '7 days',
    color: 'text-slate-700 dark:text-slate-300',
    bgColor: 'bg-slate-100 border-slate-300 dark:bg-slate-800 dark:border-slate-600',
    icon: Clock,
  },
  this_month: {
    label: 'This Month',
    shortLabel: '30 days',
    color: 'text-slate-600 dark:text-slate-400',
    bgColor: 'bg-slate-50 border-slate-200 dark:bg-slate-800/50 dark:border-slate-700',
    icon: Calendar,
  },
  next_month: {
    label: 'Next Month',
    shortLabel: '60 days',
    color: 'text-slate-500 dark:text-slate-400',
    bgColor: 'bg-slate-50 border-slate-200 dark:bg-slate-800/50 dark:border-slate-700',
    icon: Calendar,
  },
  next_quarter: {
    label: 'Next Quarter',
    shortLabel: '90 days',
    color: 'text-slate-400 dark:text-slate-500',
    bgColor: 'bg-slate-50/50 border-slate-200 dark:bg-slate-900/50 dark:border-slate-700',
    icon: TrendingUp,
  },
  later: {
    label: 'Later',
    shortLabel: '90+ days',
    color: 'text-slate-400 dark:text-slate-500',
    bgColor: 'bg-slate-50/50 border-slate-200 dark:bg-slate-900/50 dark:border-slate-700',
    icon: TrendingUp,
  },
};

export function MaturityOverview({ loans, selectedBucket: externalBucket, onFilterByMaturity }: MaturityOverviewProps) {
  const [expanded, setExpanded] = useState(false);
  const [groupBy, setGroupBy] = useState<GroupBy>('currency');
  // Use external bucket if provided, otherwise use internal state
  const selectedBucket = externalBucket as MaturityBucket | null;

  const buckets = useMemo(() => {
    const result: Record<MaturityBucket, BucketData> = {
      overdue: { ...bucketConfig.overdue, count: 0, totalAmount: 0, byCurrency: {}, loans: [] },
      this_week: { ...bucketConfig.this_week, count: 0, totalAmount: 0, byCurrency: {}, loans: [] },
      this_month: { ...bucketConfig.this_month, count: 0, totalAmount: 0, byCurrency: {}, loans: [] },
      next_month: { ...bucketConfig.next_month, count: 0, totalAmount: 0, byCurrency: {}, loans: [] },
      next_quarter: { ...bucketConfig.next_quarter, count: 0, totalAmount: 0, byCurrency: {}, loans: [] },
      later: { ...bucketConfig.later, count: 0, totalAmount: 0, byCurrency: {}, loans: [] },
    };

    for (const loan of loans) {
      const bucket = getMaturityBucket(loan.maturityDate);
      result[bucket].count++;
      result[bucket].totalAmount += loan.totalAmount;
      result[bucket].loans.push(loan);

      if (!result[bucket].byCurrency[loan.currency]) {
        result[bucket].byCurrency[loan.currency] = { count: 0, amount: 0 };
      }
      result[bucket].byCurrency[loan.currency].count++;
      result[bucket].byCurrency[loan.currency].amount += loan.totalAmount;
    }

    return result;
  }, [loans]);

  const urgentCount = buckets.overdue.count + buckets.this_week.count;
  const totalAmount = Object.values(buckets).reduce((sum, b) => sum + b.totalAmount, 0);

  const handleBucketClick = (bucket: MaturityBucket) => {
    if (selectedBucket === bucket) {
      onFilterByMaturity?.(null);
    } else {
      onFilterByMaturity?.(bucket);
    }
  };

  if (!loans.length) return null;

  return (
    <div className="border-y border-slate-200 dark:border-slate-700 bg-gradient-to-r from-slate-50 to-white dark:from-slate-900 dark:to-slate-800/50">
      {/* Header */}
      <div
        className={`px-4 py-2 flex items-center justify-between cursor-pointer hover:bg-muted/30 ${
          expanded ? 'border-b border-slate-200 dark:border-slate-700' : ''
        }`}
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3">
          {expanded ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium text-sm">Maturity Overview</span>

          {urgentCount > 0 && (
            <Badge variant="destructive" className="text-xs">
              {urgentCount} urgent
            </Badge>
          )}
        </div>

        {!expanded && (
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            {Object.entries(buckets).slice(0, 4).map(([key, bucket]) => (
              bucket.count > 0 && (
                <span key={key} className={bucket.color}>
                  {bucket.shortLabel}: {bucket.count}
                </span>
              )
            ))}
          </div>
        )}

        <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
          <Select value={groupBy} onValueChange={(v) => setGroupBy(v as GroupBy)}>
            <SelectTrigger className="w-28 h-7 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No Split</SelectItem>
              <SelectItem value="currency">By Currency</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Content - Bar + Compact cards */}
      {expanded && (
        <div className="px-4 pb-2 space-y-2">
          {/* Stacked Bar Chart */}
          <div className="h-5 flex rounded overflow-hidden border border-slate-300 dark:border-slate-600 bg-card">
            {(Object.entries(buckets) as [MaturityBucket, BucketData][]).map(([key, bucket]) => {
              const percentage = totalAmount > 0 ? (bucket.totalAmount / totalAmount) * 100 : 0;
              const isSelected = selectedBucket === key;
              if (percentage < 0.5) return null;

              // Grayscale with red accent for overdue only - works in both light and dark
              const bgColor = key === 'overdue' ? 'bg-red-500 dark:bg-red-600' :
                key === 'this_week' ? 'bg-slate-600 dark:bg-slate-500' :
                key === 'this_month' ? 'bg-slate-500 dark:bg-slate-400' :
                key === 'next_month' ? 'bg-slate-400 dark:bg-slate-500' :
                key === 'next_quarter' ? 'bg-slate-300 dark:bg-slate-600' : 'bg-slate-200 dark:bg-slate-700';

              // Text needs to be light on dark segments
              const textColor = key === 'overdue' || key === 'this_week' || key === 'this_month'
                ? 'text-white'
                : 'text-slate-700 dark:text-slate-200';

              // Determine what to show based on available width
              const showFull = percentage > 12;
              const showShort = percentage > 5;
              const label = showFull
                ? `${bucket.shortLabel} (${bucket.count})`
                : showShort
                  ? `${bucket.shortLabel.replace(' days', 'd').replace('Overdue', 'OD').replace('+', '')} ${bucket.count}`
                  : `${bucket.count}`;

              return (
                <div
                  key={key}
                  className={`flex items-center justify-center cursor-pointer transition-all ${bgColor} ${
                    isSelected ? 'ring-2 ring-white dark:ring-slate-300 ring-inset' : 'hover:opacity-90'
                  }`}
                  style={{ width: `${percentage}%`, minWidth: '16px' }}
                  onClick={() => bucket.count > 0 && handleBucketClick(key)}
                  title={`${bucket.label}: ${bucket.count} loans (${percentage.toFixed(0)}%)`}
                >
                  <span className={`text-[10px] font-medium truncate px-1 ${textColor}`}>
                    {label}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Compact Cards */}
          <div className="grid grid-cols-6 gap-1.5">
            {(Object.entries(buckets) as [MaturityBucket, BucketData][]).map(([key, bucket]) => {
              const Icon = bucket.icon;
              const isSelected = selectedBucket === key;

              return (
                <div
                  key={key}
                  className={`cursor-pointer transition-all rounded ${bucket.bgColor} border ${
                    isSelected ? 'ring-2 ring-primary' : 'hover:shadow-sm'
                  } ${bucket.count === 0 ? 'opacity-40' : ''}`}
                  onClick={() => bucket.count > 0 && handleBucketClick(key)}
                >
                  <div className="px-2 py-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        <Icon className={`h-3 w-3 ${bucket.color}`} />
                        <span className={`text-[10px] font-medium ${bucket.color}`}>{bucket.shortLabel}</span>
                      </div>
                      <span className="text-sm font-bold">{bucket.count}</span>
                    </div>

                    {groupBy === 'currency' && bucket.count > 0 && (
                      <div className="mt-1 space-y-0.5">
                        {Object.entries(bucket.byCurrency).slice(0, 2).map(([currency, data]) => (
                          <div key={currency} className="flex items-center justify-between text-[10px]">
                            <span className="font-medium text-muted-foreground">{currency}</span>
                            <span className="font-mono">{formatCurrency(data.amount, currency)}</span>
                          </div>
                        ))}
                        {Object.keys(bucket.byCurrency).length > 2 && (
                          <div className="text-[9px] text-muted-foreground">
                            +{Object.keys(bucket.byCurrency).length - 2} more
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

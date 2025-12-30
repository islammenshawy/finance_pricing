import { useState, useEffect } from 'react';
import type { AuditEntry, Loan } from '@loan-pricing/shared';
import { getLoanAudit } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatPercent } from '@/lib/utils';
import {
  X,
  History,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Plus,
  Minus,
  Pencil,
  DollarSign,
  Percent,
  Clock,
  User
} from 'lucide-react';

interface AuditPanelProps {
  loans: Loan[];
  isOpen: boolean;
  onClose: () => void;
}

export function AuditPanel({ loans, isOpen, onClose }: AuditPanelProps) {
  const [auditEntries, setAuditEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'rates' | 'fees'>('all');

  // Load audit history for all loans
  const loadAuditHistory = async () => {
    if (loans.length === 0) return;

    setLoading(true);
    setError(null);

    try {
      const results = await Promise.all(
        loans.map((loan) => getLoanAudit(loan.id, { limit: 50 }))
      );

      const allEntries = results
        .flatMap((r) => r.entries)
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      setAuditEntries(allEntries);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load audit history');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadAuditHistory();
    }
  }, [isOpen, loans.length]);

  if (!isOpen) return null;

  // Filter entries
  const filteredEntries = auditEntries.filter((entry) => {
    if (filter === 'all') return true;
    if (filter === 'rates') {
      return entry.fieldName?.toLowerCase().includes('rate') ||
             entry.fieldName?.toLowerCase().includes('spread');
    }
    if (filter === 'fees') {
      return entry.entityType === 'fee' || entry.fieldName?.toLowerCase().includes('fee');
    }
    return true;
  });

  // Group by date
  const groupedByDate: Record<string, AuditEntry[]> = {};
  for (const entry of filteredEntries) {
    const date = new Date(entry.timestamp).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
    if (!groupedByDate[date]) {
      groupedByDate[date] = [];
    }
    groupedByDate[date].push(entry);
  }

  const getLoanNumber = (loanId?: string) => {
    if (!loanId) return 'Unknown';
    const loan = loans.find((l) => l.id === loanId);
    return loan?.loanNumber || loanId.slice(-6);
  };

  // Count by type for stats
  const stats = {
    rates: auditEntries.filter(e =>
      e.fieldName?.toLowerCase().includes('rate') ||
      e.fieldName?.toLowerCase().includes('spread')
    ).length,
    fees: auditEntries.filter(e =>
      e.entityType === 'fee' || e.fieldName?.toLowerCase().includes('fee')
    ).length,
  };

  return (
    <div className="fixed inset-y-0 right-0 w-[420px] bg-gradient-to-b from-slate-50 to-white dark:from-slate-900 dark:to-slate-950 border-l shadow-2xl z-50 flex flex-col">
      {/* Header */}
      <div className="px-5 py-4 border-b bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <History className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h2 className="font-semibold text-lg">Change History</h2>
              <p className="text-xs text-muted-foreground">{auditEntries.length} recorded changes</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={loadAuditHistory}
              disabled={loading}
              className="h-8 w-8 p-0"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
            <Button variant="ghost" size="sm" onClick={onClose} className="h-8 w-8 p-0">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="flex gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`flex-1 p-2 rounded-lg border text-left transition-all ${
              filter === 'all'
                ? 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800'
                : 'bg-muted/30 hover:bg-muted/50'
            }`}
          >
            <div className="text-xl font-bold">{auditEntries.length}</div>
            <div className="text-xs text-muted-foreground">All Changes</div>
          </button>
          <button
            onClick={() => setFilter('rates')}
            className={`flex-1 p-2 rounded-lg border text-left transition-all ${
              filter === 'rates'
                ? 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800'
                : 'bg-muted/30 hover:bg-muted/50'
            }`}
          >
            <div className="text-xl font-bold text-green-600">{stats.rates}</div>
            <div className="text-xs text-muted-foreground">Rate Changes</div>
          </button>
          <button
            onClick={() => setFilter('fees')}
            className={`flex-1 p-2 rounded-lg border text-left transition-all ${
              filter === 'fees'
                ? 'bg-purple-50 border-purple-200 dark:bg-purple-900/20 dark:border-purple-800'
                : 'bg-muted/30 hover:bg-muted/50'
            }`}
          >
            <div className="text-xl font-bold text-purple-600">{stats.fees}</div>
            <div className="text-xs text-muted-foreground">Fee Changes</div>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {loading && auditEntries.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <RefreshCw className="h-8 w-8 animate-spin mb-3" />
            <div>Loading history...</div>
          </div>
        )}

        {error && (
          <div className="m-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-center text-red-600">
            {error}
          </div>
        )}

        {!loading && auditEntries.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <div className="p-4 bg-muted/30 rounded-full mb-4">
              <History className="h-10 w-10 opacity-30" />
            </div>
            <div className="font-medium">No changes recorded yet</div>
            <div className="text-xs mt-1">Changes will appear here after you save</div>
          </div>
        )}

        {Object.entries(groupedByDate).map(([date, entries]) => (
          <div key={date} className="relative">
            {/* Date Header */}
            <div className="sticky top-0 z-10 px-5 py-2 bg-gradient-to-r from-slate-100 to-transparent dark:from-slate-800/50">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Clock className="h-3.5 w-3.5" />
                {date}
                <Badge variant="secondary" className="ml-auto text-xs">
                  {entries.length}
                </Badge>
              </div>
            </div>

            {/* Timeline */}
            <div className="px-5 pb-4">
              <div className="relative">
                {/* Timeline line */}
                <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gradient-to-b from-blue-200 via-slate-200 to-transparent dark:from-blue-800 dark:via-slate-700" />

                {/* Entries */}
                <div className="space-y-3">
                  {entries.map((entry, idx) => (
                    <TimelineEntry
                      key={entry.id}
                      entry={entry}
                      loanNumber={getLoanNumber(entry.loanId)}
                      isLast={idx === entries.length - 1}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TimelineEntry({
  entry,
  loanNumber,
}: {
  entry: AuditEntry;
  loanNumber: string;
  isLast?: boolean;
}) {
  const time = new Date(entry.timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  // Determine icon and colors based on entry type
  const getEntryStyle = () => {
    const isRate = entry.fieldName?.toLowerCase().includes('rate') ||
                   entry.fieldName?.toLowerCase().includes('spread');
    const isFee = entry.entityType === 'fee' || entry.fieldName?.toLowerCase().includes('fee');

    if (entry.action === 'create') {
      return {
        icon: Plus,
        iconBg: 'bg-green-100 dark:bg-green-900/30',
        iconColor: 'text-green-600',
        borderColor: 'border-green-200 dark:border-green-800',
        bgColor: 'bg-green-50/50 dark:bg-green-900/10',
      };
    }
    if (entry.action === 'delete') {
      return {
        icon: Minus,
        iconBg: 'bg-red-100 dark:bg-red-900/30',
        iconColor: 'text-red-600',
        borderColor: 'border-red-200 dark:border-red-800',
        bgColor: 'bg-red-50/50 dark:bg-red-900/10',
      };
    }
    if (isRate) {
      return {
        icon: Percent,
        iconBg: 'bg-blue-100 dark:bg-blue-900/30',
        iconColor: 'text-blue-600',
        borderColor: 'border-blue-200 dark:border-blue-800',
        bgColor: 'bg-blue-50/50 dark:bg-blue-900/10',
      };
    }
    if (isFee) {
      return {
        icon: DollarSign,
        iconBg: 'bg-purple-100 dark:bg-purple-900/30',
        iconColor: 'text-purple-600',
        borderColor: 'border-purple-200 dark:border-purple-800',
        bgColor: 'bg-purple-50/50 dark:bg-purple-900/10',
      };
    }
    return {
      icon: Pencil,
      iconBg: 'bg-amber-100 dark:bg-amber-900/30',
      iconColor: 'text-amber-600',
      borderColor: 'border-amber-200 dark:border-amber-800',
      bgColor: 'bg-amber-50/50 dark:bg-amber-900/10',
    };
  };

  const style = getEntryStyle();
  const Icon = style.icon;

  // Determine if value went up or down
  const getTrend = () => {
    if (entry.action !== 'update') return null;
    const oldNum = typeof entry.oldValue === 'number' ? entry.oldValue : null;
    const newNum = typeof entry.newValue === 'number' ? entry.newValue : null;
    if (oldNum !== null && newNum !== null) {
      return newNum > oldNum ? 'up' : newNum < oldNum ? 'down' : null;
    }
    return null;
  };

  const trend = getTrend();

  return (
    <div className="relative pl-10">
      {/* Timeline dot */}
      <div className={`absolute left-0 top-3 w-8 h-8 rounded-full ${style.iconBg} flex items-center justify-center ring-4 ring-white dark:ring-slate-950`}>
        <Icon className={`h-4 w-4 ${style.iconColor}`} />
      </div>

      {/* Card */}
      <div className={`rounded-xl border ${style.borderColor} ${style.bgColor} p-3 transition-all hover:shadow-md`}>
        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs font-mono bg-white dark:bg-slate-900">
              {loanNumber}
            </Badge>
            <span className="text-xs text-muted-foreground">{time}</span>
          </div>
          {trend && (
            <div className={`flex items-center gap-1 text-xs font-medium ${
              trend === 'up' ? 'text-green-600' : 'text-red-600'
            }`}>
              {trend === 'up' ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              {trend === 'up' ? 'Increased' : 'Decreased'}
            </div>
          )}
        </div>

        {/* Field name */}
        <div className="font-medium text-sm mb-2">
          {entry.fieldName || entry.entityType}
        </div>

        {/* Value change */}
        {entry.action === 'update' && (
          <div className="flex items-center gap-3 p-2 bg-white dark:bg-slate-900 rounded-lg">
            <div className="flex-1 text-center">
              <div className="text-xs text-muted-foreground mb-1">Before</div>
              <div className="font-mono text-sm text-red-600 line-through">
                {formatValue(entry.oldValue)}
              </div>
            </div>
            <div className="text-muted-foreground">→</div>
            <div className="flex-1 text-center">
              <div className="text-xs text-muted-foreground mb-1">After</div>
              <div className="font-mono text-sm text-green-600 font-semibold">
                {formatValue(entry.newValue)}
              </div>
            </div>
          </div>
        )}

        {entry.action === 'create' && entry.newValue !== undefined && entry.newValue !== null && (
          <div className="p-2 bg-green-100/50 dark:bg-green-900/20 rounded-lg text-sm text-green-700 dark:text-green-300">
            Created: {formatValue(entry.newValue)}
          </div>
        )}

        {entry.action === 'delete' && entry.oldValue !== undefined && entry.oldValue !== null && (
          <div className="p-2 bg-red-100/50 dark:bg-red-900/20 rounded-lg text-sm text-red-700 dark:text-red-300">
            Removed: {formatValue(entry.oldValue)}
          </div>
        )}

        {/* User */}
        <div className="flex items-center gap-1.5 mt-2 text-xs text-muted-foreground">
          <User className="h-3 w-3" />
          {entry.userName}
        </div>
      </div>
    </div>
  );
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return '—';

  if (typeof value === 'number') {
    if (value > 0 && value < 1) {
      return formatPercent(value);
    }
    return value.toLocaleString();
  }

  if (typeof value === 'object') {
    if ('name' in (value as object)) {
      return (value as { name: string }).name;
    }
    const keys = Object.keys(value as object);
    if (keys.length > 3) {
      return `{${keys.length} fields}`;
    }
    return JSON.stringify(value).slice(0, 50);
  }

  return String(value);
}

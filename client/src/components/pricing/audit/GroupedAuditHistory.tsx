import { useState } from 'react';
import type { AuditEntry } from '@loan-pricing/shared';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, ChevronRight, Percent, DollarSign, FileText, Pencil } from 'lucide-react';
import { MiniAuditEntry } from './MiniAuditEntry';

interface GroupedAuditHistoryProps {
  entries: AuditEntry[];
  currency: string;
}

const CATEGORY_CONFIG: Record<string, { label: string; icon: typeof Percent; color: string }> = {
  pricing: { label: 'Pricing', icon: Percent, color: 'text-blue-600' },
  fees: { label: 'Fees', icon: DollarSign, color: 'text-purple-600' },
  invoices: { label: 'Invoices', icon: FileText, color: 'text-emerald-600' },
  other: { label: 'Other', icon: Pencil, color: 'text-gray-600' },
};

/**
 * Categorize an audit entry into a group
 */
function categorizeEntry(entry: AuditEntry): string {
  const field = entry.fieldName?.toLowerCase() || '';
  if (field.includes('rate') || field.includes('spread')) return 'pricing';
  if (entry.entityType === 'fee' || field.includes('fee')) return 'fees';
  if (entry.entityType === 'invoice' || field.includes('invoice')) return 'invoices';
  return 'other';
}

/**
 * Grouped audit history with collapsible sections
 * Groups entries by type (pricing, fees, invoices, other)
 */
export function GroupedAuditHistory({ entries, currency }: GroupedAuditHistoryProps) {
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  // Categorize entries
  const grouped = entries.reduce((acc, entry) => {
    const cat = categorizeEntry(entry);
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(entry);
    return acc;
  }, {} as Record<string, AuditEntry[]>);

  const toggleGroup = (cat: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  };

  const orderedCategories = ['pricing', 'fees', 'invoices', 'other'].filter((c) => grouped[c]?.length > 0);

  const expandAll = () => setExpandedGroups(new Set(orderedCategories));
  const collapseAll = () => setExpandedGroups(new Set());

  const allExpanded = orderedCategories.every((c) => expandedGroups.has(c));
  const allCollapsed = expandedGroups.size === 0;

  if (orderedCategories.length === 0) return null;

  return (
    <div className="max-h-48 overflow-auto">
      {/* Expand/Collapse All Header */}
      {orderedCategories.length > 1 && (
        <div className="flex items-center justify-end gap-2 px-3 py-1.5 border-b bg-muted/5">
          <button
            onClick={expandAll}
            disabled={allExpanded}
            className="text-[10px] text-muted-foreground hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Expand All
          </button>
          <span className="text-muted-foreground">|</span>
          <button
            onClick={collapseAll}
            disabled={allCollapsed}
            className="text-[10px] text-muted-foreground hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Collapse All
          </button>
        </div>
      )}
      {orderedCategories.map((cat) => {
        const config = CATEGORY_CONFIG[cat];
        const Icon = config.icon;
        const isExpanded = expandedGroups.has(cat);
        const catEntries = grouped[cat];

        return (
          <div key={cat} className="border-b last:border-b-0">
            {/* Category Header */}
            <div
              className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-muted/30 bg-muted/10"
              onClick={() => toggleGroup(cat)}
            >
              {isExpanded ? (
                <ChevronDown className="h-3 w-3 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-3 w-3 text-muted-foreground" />
              )}
              <Icon className={`h-3.5 w-3.5 ${config.color}`} />
              <span className="text-xs font-medium">{config.label}</span>
              <Badge variant="secondary" className="text-[10px] h-4 px-1.5">{catEntries.length}</Badge>
              {!isExpanded && (
                <span className="text-[10px] text-muted-foreground ml-auto">
                  {catEntries[0]?.action} {catEntries.length > 1 && `+${catEntries.length - 1} more`}
                </span>
              )}
            </div>

            {/* Expanded Entries */}
            {isExpanded && (
              <div className="divide-y">
                {catEntries.map((entry) => (
                  <MiniAuditEntry key={entry.id} entry={entry} currency={currency} />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

import { useChangeStore, type Change } from '@/stores/changeStore';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';

interface InflightChangesPanelProps {
  onSave: () => void;
  saving?: boolean;
}

export function InflightChangesPanel({ onSave, saving }: InflightChangesPanelProps) {
  const { changes, revertChange, clearAllChanges } = useChangeStore();

  if (changes.length === 0) return null;

  // Group changes by loan
  const changesByLoan = changes.reduce<Record<string, Change[]>>((acc, change) => {
    if (!acc[change.loanId]) {
      acc[change.loanId] = [];
    }
    acc[change.loanId].push(change);
    return acc;
  }, {});

  return (
    <div className="h-full flex flex-col bg-amber-50/50">
      {/* Header */}
      <div className="p-4 border-b bg-amber-100/50">
        <div className="flex items-center gap-2">
          <svg
            className="h-4 w-4 text-amber-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          <span className="font-medium text-amber-900">Unsaved Changes</span>
          <span className="ml-auto bg-amber-500 text-white text-xs px-2 py-0.5 rounded-full">
            {changes.length}
          </span>
        </div>
      </div>

      {/* Changes List */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {Object.entries(changesByLoan).map(([loanId, loanChanges]) => (
            <div key={loanId}>
              <div className="text-xs font-medium text-muted-foreground mb-2">
                Loan: {loanId.slice(-6)}
              </div>
              <div className="space-y-2">
                {loanChanges.map((change) => (
                  <ChangeItem
                    key={change.id}
                    change={change}
                    onRevert={() => revertChange(change.id)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>

      {/* Actions */}
      <div className="p-4 border-t bg-amber-100/50 space-y-2">
        <Button onClick={onSave} className="w-full" size="sm" disabled={saving}>
          <svg
            className="h-4 w-4 mr-2"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"
            />
          </svg>
          {saving ? 'Saving...' : 'Save All Changes'}
        </Button>
        <Button
          onClick={clearAllChanges}
          variant="outline"
          className="w-full"
          size="sm"
          disabled={saving}
        >
          <svg
            className="h-4 w-4 mr-2"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
          Revert All
        </Button>
      </div>
    </div>
  );
}

function ChangeItem({
  change,
  onRevert,
}: {
  change: Change;
  onRevert: () => void;
}) {
  const formatValue = (value: unknown): string => {
    if (typeof value === 'number') {
      // Check if it looks like a rate/percentage (decimal between 0 and 1)
      if (value < 1 && value > 0) {
        return `${(value * 100).toFixed(2)}%`;
      }
      return value.toLocaleString(undefined, { minimumFractionDigits: 2 });
    }
    if (value === null || value === undefined) {
      return '-';
    }
    if (typeof value === 'boolean') {
      return value ? 'Yes' : 'No';
    }
    return String(value);
  };

  return (
    <div className="p-3 bg-white border border-amber-200 rounded-lg shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-amber-900">
          {change.fieldLabel}
        </span>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0"
          onClick={onRevert}
        >
          <svg
            className="h-3 w-3"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"
            />
          </svg>
        </Button>
      </div>
      <div className="flex items-center gap-2 text-sm">
        <span className="text-muted-foreground line-through">
          {formatValue(change.originalValue)}
        </span>
        <span className="text-muted-foreground">→</span>
        <span className="font-medium text-amber-700">
          {formatValue(change.newValue)}
        </span>
      </div>
    </div>
  );
}

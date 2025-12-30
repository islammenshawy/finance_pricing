import { useState } from 'react';
import type { Fee } from '@loan-pricing/shared';
import { formatCurrency, formatPercent } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Pencil, Trash2, X, Check, Undo2 } from 'lucide-react';

interface FeeRowProps {
  fee: Fee;
  currency: string;
  isLocked: boolean;
  isPending: boolean;
  isDeleted?: boolean;
  updates?: Partial<Fee>;
  onUpdate: (updates: Partial<Fee>) => void;
  onRemove: () => void;
  onRevert?: () => void;
}

/**
 * Individual fee row with edit/delete capabilities
 * Shows fee details, amount, and allows inline editing
 */
export function FeeRow({
  fee,
  currency,
  isLocked,
  isPending,
  isDeleted,
  updates,
  onUpdate,
  onRemove,
  onRevert,
}: FeeRowProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(fee.calculatedAmount.toString());

  // Get display amount (from updates if present)
  const displayAmount = updates?.calculatedAmount ?? fee.calculatedAmount;
  const hasAmountChange = updates?.calculatedAmount !== undefined && updates.calculatedAmount !== fee.calculatedAmount;

  const handleSave = () => {
    const newAmount = parseFloat(editValue);
    if (!isNaN(newAmount) && newAmount !== fee.calculatedAmount) {
      onUpdate({ calculatedAmount: newAmount, isOverridden: true });
    }
    setIsEditing(false);
  };

  // Deleted fee styling
  if (isDeleted) {
    return (
      <div className="flex items-center gap-3 p-2 bg-red-50 dark:bg-red-950/30 border border-red-300 dark:border-red-800 rounded-md opacity-75">
        <div className="flex-1">
          <div className="font-medium text-sm text-red-800 dark:text-red-200 line-through">
            {fee.name}
            <Badge className="ml-2 bg-red-500 text-white text-xs">Removing</Badge>
          </div>
          <div className="text-xs text-red-600 dark:text-red-400 line-through">
            {fee.code} - Will be removed on save
          </div>
        </div>
        <div className="text-right">
          <span className="font-mono font-medium text-red-600 line-through">
            {formatCurrency(fee.calculatedAmount, currency)}
          </span>
        </div>
        {onRevert && (
          <Button
            size="sm"
            variant="ghost"
            className="h-7 w-7 p-0 text-red-600 hover:text-green-600"
            onClick={onRevert}
            title="Undo delete"
          >
            <Undo2 className="h-3 w-3" />
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-3 p-2 border rounded-md transition-colors ${
      isPending ? 'opacity-50' : ''
    } ${
      hasAmountChange
        ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-300 dark:border-amber-800'
        : 'bg-card'
    }`}>
      <div className="flex-1">
        <div className="font-medium text-sm">{fee.name}</div>
        <div className="text-xs text-muted-foreground">
          {fee.code} - {fee.calculationType === 'percentage' ? formatPercent(fee.rate || 0) : 'Fixed'}
          {fee.isOverridden && <Badge variant="outline" className="ml-2 text-xs">Overridden</Badge>}
          {hasAmountChange && <Badge className="ml-2 bg-amber-500 text-white text-xs">Modified</Badge>}
        </div>
      </div>
      <div className="text-right">
        {isEditing ? (
          <div className="flex items-center gap-1">
            <Input
              type="number"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              className="w-24 h-7 text-right font-mono text-sm"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSave();
                if (e.key === 'Escape') setIsEditing(false);
              }}
            />
            <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={handleSave}>
              <Check className="h-3 w-3" />
            </Button>
            <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setIsEditing(false)}>
              <X className="h-3 w-3" />
            </Button>
          </div>
        ) : (
          <div className="flex flex-col items-end">
            <span className={`font-mono font-medium ${hasAmountChange ? 'text-amber-700 dark:text-amber-300' : ''}`}>
              {formatCurrency(displayAmount, currency)}
            </span>
            {hasAmountChange && (
              <span className="text-xs text-muted-foreground line-through">
                {formatCurrency(fee.calculatedAmount, currency)}
              </span>
            )}
          </div>
        )}
      </div>
      {!isLocked && !isEditing && (
        <div className="flex items-center gap-1">
          {onRevert && hasAmountChange ? (
            <Button
              size="sm"
              variant="ghost"
              className="h-7 w-7 p-0 text-amber-600 hover:text-green-600"
              onClick={onRevert}
              title="Undo change"
            >
              <Undo2 className="h-3 w-3" />
            </Button>
          ) : (
            <Button
              size="sm"
              variant="ghost"
              className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
              onClick={() => {
                setEditValue(displayAmount.toString());
                setIsEditing(true);
              }}
              disabled={isPending}
            >
              <Pencil className="h-3 w-3" />
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
            onClick={onRemove}
            disabled={isPending}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      )}
    </div>
  );
}

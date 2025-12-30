import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { Fee } from '@loan-pricing/shared';
import { getFeeConfigs, addFeeToLoan, updateFee, removeFee } from '@/lib/api';
import { formatCurrency, formatPercent } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Plus, Trash2, Edit2, Check, X } from 'lucide-react';

interface FeeScheduleGridProps {
  loanId: string;
  fees: Fee[];
  currency: string;
}

export function FeeScheduleGrid({ loanId, fees, currency }: FeeScheduleGridProps) {
  const queryClient = useQueryClient();
  const [editingFeeId, setEditingFeeId] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState<string>('');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [selectedConfigId, setSelectedConfigId] = useState<string>('');

  const { data: feeConfigs } = useQuery({
    queryKey: ['feeConfigs'],
    queryFn: getFeeConfigs,
  });

  const handleAddFee = async () => {
    if (!selectedConfigId) return;

    try {
      await addFeeToLoan(loanId, { feeConfigId: selectedConfigId });
      queryClient.invalidateQueries({ queryKey: ['loan', loanId] });
      setShowAddDialog(false);
      setSelectedConfigId('');
    } catch (error) {
      console.error('Failed to add fee:', error);
    }
  };

  const handleRemoveFee = async (feeId: string) => {
    try {
      await removeFee(loanId, feeId);
      queryClient.invalidateQueries({ queryKey: ['loan', loanId] });
    } catch (error) {
      console.error('Failed to remove fee:', error);
    }
  };

  const handleStartEdit = (fee: Fee) => {
    setEditingFeeId(fee.id);
    if (fee.calculationType === 'flat') {
      setEditingValue(String(fee.flatAmount ?? 0));
    } else if (fee.calculationType === 'percentage') {
      setEditingValue(String((fee.rate ?? 0) * 100));
    }
  };

  const handleSaveEdit = async (fee: Fee) => {
    try {
      const updates: Record<string, unknown> = {};
      if (fee.calculationType === 'flat') {
        updates.flatAmount = parseFloat(editingValue);
      } else if (fee.calculationType === 'percentage') {
        updates.rate = parseFloat(editingValue) / 100;
      }

      await updateFee(loanId, fee.id, updates);
      queryClient.invalidateQueries({ queryKey: ['loan', loanId] });
      setEditingFeeId(null);
    } catch (error) {
      console.error('Failed to update fee:', error);
    }
  };

  const handleToggleWaived = async (fee: Fee) => {
    try {
      await updateFee(loanId, fee.id, { isWaived: !fee.isWaived });
      queryClient.invalidateQueries({ queryKey: ['loan', loanId] });
    } catch (error) {
      console.error('Failed to toggle waiver:', error);
    }
  };

  // Get available fee configs (not already added)
  const availableConfigs = feeConfigs?.filter(
    (config) => !fees.some((fee) => fee.feeConfigId === config.id)
  );

  return (
    <div className="border rounded-lg overflow-hidden">
      <table className="data-table">
        <thead>
          <tr>
            <th>Code</th>
            <th>Name</th>
            <th>Type</th>
            <th>Rate/Amount</th>
            <th>Calculated</th>
            <th>Status</th>
            <th className="w-20">Actions</th>
          </tr>
        </thead>
        <tbody>
          {fees.length === 0 ? (
            <tr>
              <td colSpan={7} className="text-center text-muted-foreground py-8">
                No fees configured
              </td>
            </tr>
          ) : (
            fees.map((fee) => (
              <tr key={fee.id} className={fee.isWaived ? 'opacity-50' : ''}>
                <td>
                  <Badge variant="outline">{fee.code}</Badge>
                </td>
                <td>{fee.name}</td>
                <td className="capitalize">{fee.calculationType}</td>
                <td>
                  {editingFeeId === fee.id ? (
                    <div className="flex items-center gap-1">
                      <Input
                        type="number"
                        value={editingValue}
                        onChange={(e) => setEditingValue(e.target.value)}
                        className="w-24 h-8"
                        autoFocus
                      />
                      <span className="text-xs text-muted-foreground">
                        {fee.calculationType === 'percentage' ? '%' : currency}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => handleSaveEdit(fee)}
                      >
                        <Check className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => setEditingFeeId(null)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="font-mono">
                        {fee.calculationType === 'flat'
                          ? formatCurrency(fee.flatAmount ?? 0, fee.currency)
                          : fee.calculationType === 'percentage'
                          ? formatPercent(fee.rate ?? 0)
                          : 'Tiered'}
                      </span>
                      {fee.isOverridden && (
                        <Badge variant="outline" className="text-xs">
                          Override
                        </Badge>
                      )}
                    </div>
                  )}
                </td>
                <td className="font-mono">
                  {fee.isWaived ? (
                    <span className="text-muted-foreground line-through">
                      {formatCurrency(fee.calculatedAmount, fee.currency)}
                    </span>
                  ) : (
                    formatCurrency(fee.calculatedAmount, fee.currency)
                  )}
                </td>
                <td>
                  {fee.isPaid ? (
                    <Badge variant="approved">Paid</Badge>
                  ) : fee.isWaived ? (
                    <Badge variant="secondary">Waived</Badge>
                  ) : (
                    <Badge variant="pending">Pending</Badge>
                  )}
                </td>
                <td>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => handleStartEdit(fee)}
                      disabled={fee.calculationType === 'tiered'}
                    >
                      <Edit2 className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => handleToggleWaived(fee)}
                    >
                      {fee.isWaived ? (
                        <Check className="h-3 w-3" />
                      ) : (
                        <X className="h-3 w-3" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive"
                      onClick={() => handleRemoveFee(fee.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
        <tfoot>
          <tr className="bg-muted/30">
            <td colSpan={4} className="text-right font-medium">
              Total Fees
            </td>
            <td className="font-mono font-semibold">
              {formatCurrency(
                fees.reduce((sum, fee) => sum + (fee.isWaived ? 0 : fee.calculatedAmount), 0),
                currency
              )}
            </td>
            <td></td>
            <td>
              <Button variant="outline" size="sm" onClick={() => setShowAddDialog(true)}>
                <Plus className="h-3 w-3 mr-1" />
                Add
              </Button>
            </td>
          </tr>
        </tfoot>
      </table>

      {/* Add Fee Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Fee</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <label className="text-sm font-medium">Select Fee Type</label>
            <div className="mt-2 space-y-2">
              {availableConfigs?.map((config) => (
                <label
                  key={config.id}
                  className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-muted/50 ${
                    selectedConfigId === config.id ? 'border-primary bg-primary/5' : ''
                  }`}
                >
                  <input
                    type="radio"
                    name="feeConfig"
                    value={config.id}
                    checked={selectedConfigId === config.id}
                    onChange={(e) => setSelectedConfigId(e.target.value)}
                    className="sr-only"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{config.code}</Badge>
                      <span className="font-medium">{config.name}</span>
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">
                      {config.calculationType === 'flat'
                        ? `Flat: ${formatCurrency(config.defaultFlatAmount ?? 0, currency)}`
                        : config.calculationType === 'percentage'
                        ? `Rate: ${formatPercent(config.defaultRate ?? 0)}`
                        : 'Tiered calculation'}
                    </div>
                  </div>
                </label>
              ))}
              {(!availableConfigs || availableConfigs.length === 0) && (
                <div className="text-center text-muted-foreground py-4">
                  All available fee types have been added
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddFee} disabled={!selectedConfigId}>
              Add Fee
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

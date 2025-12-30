import { useState, useMemo } from 'react';
import type { Loan, FeeConfig, LoanStatus, PricingStatus } from '@loan-pricing/shared';
import type { FeeChange } from '@/stores/changeStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Combobox, type ComboboxOption } from '@/components/ui/combobox';
import { X, Check, Plus, Lock, FileCheck } from 'lucide-react';

interface BulkActionBarProps {
  selectedLoans: Loan[];
  feeConfigs: FeeConfig[];
  onApplyRate: (field: 'baseRate' | 'spread', value: number) => void;
  onAddFee: (feeConfigId: string) => void;
  onChangeStatus: (status: LoanStatus) => void;
  onChangePricingStatus: (status: PricingStatus) => void;
  onClearSelection: () => void;
  getPendingFeeAdds?: (loanId: string) => FeeChange[];
}

export function BulkActionBar({
  selectedLoans,
  feeConfigs,
  onApplyRate,
  onAddFee,
  onChangeStatus,
  onChangePricingStatus,
  onClearSelection,
  getPendingFeeAdds,
}: BulkActionBarProps) {
  const [baseRateValue, setBaseRateValue] = useState('');
  const [spreadValue, setSpreadValue] = useState('');
  const [selectedFeeConfig, setSelectedFeeConfig] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [selectedPricingStatus, setSelectedPricingStatus] = useState<string>('');

  const handleApplyBaseRate = () => {
    const value = parseFloat(baseRateValue);
    if (!isNaN(value)) {
      onApplyRate('baseRate', value / 100);
      setBaseRateValue('');
    }
  };

  const handleApplySpread = () => {
    const value = parseFloat(spreadValue);
    if (!isNaN(value)) {
      onApplyRate('spread', value / 100);
      setSpreadValue('');
    }
  };

  const handleAddFee = () => {
    if (selectedFeeConfig) {
      onAddFee(selectedFeeConfig);
      setSelectedFeeConfig('');
    }
  };

  // Get available fee configs (ones not on all selected loans, including pending adds)
  const availableFeeConfigs = feeConfigs.filter((config) => {
    // Fee is available if at least one selected loan doesn't have it (saved or pending)
    return selectedLoans.some((loan) => {
      const hasSavedFee = loan.fees.some((f) => f.feeConfigId === config.id);
      const hasPendingFee = getPendingFeeAdds?.(loan.id).some((f) => f.feeConfigId === config.id) ?? false;
      return !hasSavedFee && !hasPendingFee;
    });
  });

  // Combobox options
  const feeOptions: ComboboxOption[] = useMemo(() =>
    availableFeeConfigs.map((config) => ({
      value: config.id,
      label: config.code,
      description: config.name,
    })),
    [availableFeeConfigs]
  );

  const statusOptions: ComboboxOption[] = [
    { value: 'draft', label: 'Draft' },
    { value: 'in_review', label: 'In Review' },
    { value: 'approved', label: 'Approved' },
    { value: 'funded', label: 'Funded' },
    { value: 'collected', label: 'Collected' },
    { value: 'closed', label: 'Closed' },
  ];

  const pricingStatusOptions: ComboboxOption[] = [
    { value: 'pending', label: 'Pending' },
    { value: 'priced', label: 'Priced' },
    { value: 'locked', label: '🔒 Locked' },
  ];

  // Check if any selected loans are locked
  const hasLockedLoans = selectedLoans.some((l) => l.pricingStatus === 'locked');
  const allLocked = selectedLoans.every((l) => l.pricingStatus === 'locked');
  const unlockedCount = selectedLoans.filter((l) => l.pricingStatus !== 'locked').length;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50" data-testid="bulk-action-bar">
      <div className="bg-card border shadow-xl rounded-xl p-4 flex items-center gap-6">
        {/* Selection count */}
        <div className="flex items-center gap-3">
          <Badge variant="secondary" className="text-base px-3 py-1" data-testid="selected-count">
            {selectedLoans.length}
          </Badge>
          <div>
            <div className="font-medium">loans selected</div>
            {hasLockedLoans && (
              <div className="text-xs text-muted-foreground">
                {unlockedCount} editable
              </div>
            )}
          </div>
          <Button variant="ghost" size="icon" onClick={onClearSelection}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="h-10 w-px bg-border" />

        {/* Base Rate */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Base Rate</span>
          <div className="flex items-center gap-1">
            <Input
              type="number"
              step="0.01"
              placeholder="5.00"
              value={baseRateValue}
              onChange={(e) => setBaseRateValue(e.target.value)}
              className="w-20 h-8"
              disabled={allLocked}
              data-testid="bulk-base-rate-input"
            />
            <span className="text-sm text-muted-foreground">%</span>
          </div>
          <Button
            size="sm"
            variant="secondary"
            onClick={handleApplyBaseRate}
            disabled={!baseRateValue || allLocked}
            data-testid="bulk-base-rate-apply"
          >
            <Check className="h-3 w-3 mr-1" />
            Apply
          </Button>
        </div>

        <div className="h-10 w-px bg-border" />

        {/* Spread */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Spread</span>
          <div className="flex items-center gap-1">
            <Input
              type="number"
              step="0.01"
              placeholder="1.50"
              value={spreadValue}
              onChange={(e) => setSpreadValue(e.target.value)}
              className="w-20 h-8"
              disabled={allLocked}
            />
            <span className="text-sm text-muted-foreground">%</span>
          </div>
          <Button
            size="sm"
            variant="secondary"
            onClick={handleApplySpread}
            disabled={!spreadValue || allLocked}
          >
            <Check className="h-3 w-3 mr-1" />
            Apply
          </Button>
        </div>

        <div className="h-10 w-px bg-border" />

        {/* Add Fee */}
        <div className="flex items-center gap-2">
          <Combobox
            options={feeOptions}
            value={selectedFeeConfig}
            onValueChange={setSelectedFeeConfig}
            placeholder="Select fee..."
            searchPlaceholder="Search fees..."
            emptyMessage={availableFeeConfigs.length === 0 ? "All fees applied" : "No matching fees"}
            className="w-40"
            position="top"
            disabled={allLocked}
          />
          <Button
            size="sm"
            variant="secondary"
            onClick={handleAddFee}
            disabled={!selectedFeeConfig || allLocked}
          >
            <Plus className="h-3 w-3 mr-1" />
            Add
          </Button>
        </div>

        <div className="h-10 w-px bg-border" />

        {/* Loan Status */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Status</span>
          <Combobox
            options={statusOptions}
            value={selectedStatus}
            onValueChange={setSelectedStatus}
            placeholder="Select..."
            searchPlaceholder="Search status..."
            emptyMessage="No matching status"
            className="w-32"
            position="top"
          />
          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              if (selectedStatus) {
                onChangeStatus(selectedStatus as LoanStatus);
                setSelectedStatus('');
              }
            }}
            disabled={!selectedStatus}
          >
            <Check className="h-3 w-3 mr-1" />
            Apply
          </Button>
        </div>

        <div className="h-10 w-px bg-border" />

        {/* Pricing Status */}
        <div className="flex items-center gap-2">
          <Combobox
            options={pricingStatusOptions}
            value={selectedPricingStatus}
            onValueChange={setSelectedPricingStatus}
            placeholder="Pricing..."
            searchPlaceholder="Search..."
            emptyMessage="No matching status"
            className="w-32"
            position="top"
          />
          <Button
            size="sm"
            onClick={() => {
              if (selectedPricingStatus) {
                onChangePricingStatus(selectedPricingStatus as PricingStatus);
                setSelectedPricingStatus('');
              }
            }}
            disabled={!selectedPricingStatus || (selectedPricingStatus === 'locked' && allLocked)}
            className={selectedPricingStatus === 'locked' ? 'bg-purple-600 hover:bg-purple-700' : ''}
            variant={selectedPricingStatus === 'locked' ? 'default' : 'secondary'}
          >
            {selectedPricingStatus === 'locked' ? (
              <>
                <Lock className="h-3 w-3 mr-1" />
                Lock
              </>
            ) : (
              <>
                <FileCheck className="h-3 w-3 mr-1" />
                Apply
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
